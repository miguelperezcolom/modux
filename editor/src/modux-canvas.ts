import { LitElement, html, svg, css, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import type { Scene, SceneNode, SceneEdge, Point } from './scene.js';
import { CONTAINER_HEADER, CONTAINER_INSET, containerMinSize } from './scene.js';
import { orthogonalRoute } from './edge-routing.js';
import { snapDragged, snapValue } from './snap.js';
import { LanguageController, t } from './i18n/index.js';

/** Segment intersection with parameter t on (a→b); endpoints excluded. */
function segIntersect(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
): (Point & { t: number }) | null {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const denom = rx * sy - ry * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / denom;
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / denom;
  if (t <= 0.02 || t >= 0.98 || u <= 0.02 || u >= 0.98) return null;
  return { x: a.x + t * rx, y: a.y + t * ry, t };
}

/** Distance from point p to segment a→b, plus the projection parameter. */
function pointToSegment(p: Point, a: Point, b: Point): { dist: number; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const qx = a.x + t * dx;
  const qy = a.y + t * dy;
  return { dist: Math.hypot(p.x - qx, p.y - qy), t };
}

/**
 * SVG path along `pts`, hopping over earlier edges with a small arc wherever
 * they cross — the classic wire "bridge".
 */
/** The point halfway along a polyline's total length — where note threads anchor on edges. */
function polylineMidpoint(pts: Point[]): Point {
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  let remaining = total / 2;
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    if (seg >= remaining && seg > 0) {
      const t = remaining / seg;
      return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t };
    }
    remaining -= seg;
  }
  return pts[Math.floor(pts.length / 2)];
}

/** Perpendicular distance of point b from the line through a and c. */
function perpDist(a: Point, b: Point, c: Point): number {
  const dx = c.x - a.x, dy = c.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return Math.hypot(b.x - a.x, b.y - a.y);
  return Math.abs((b.x - a.x) * dy - (b.y - a.y) * dx) / len;
}

/** Orthogonal polyline with rounded corners (ArchiMate mode) — quadratic fillet per vertex. */
function roundedOrthoPath(pts: Point[], radius = 10): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    const l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
    const rr = Math.min(radius, l1 / 2, l2 / 2);
    const a = { x: p1.x - ((p1.x - p0.x) / l1) * rr, y: p1.y - ((p1.y - p0.y) / l1) * rr };
    const b = { x: p1.x + ((p2.x - p1.x) / l2) * rr, y: p1.y + ((p2.y - p1.y) / l2) * rr };
    d += ` L ${a.x} ${a.y} Q ${p1.x} ${p1.y} ${b.x} ${b.y}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function pathWithBridges(pts: Point[], priorSegments: [Point, Point][], radius = 7): string {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    const crossings = priorSegments
      .map(([c, e]) => segIntersect(a, b, c, e))
      .filter((p): p is Point & { t: number } => p !== null)
      .filter((p) => p.t * len > radius + 2 && (1 - p.t) * len > radius + 2)
      .sort((p, q) => p.t - q.t);
    let lastEnd = -Infinity;
    for (const p of crossings) {
      const start = p.t * len - radius;
      if (start <= lastEnd + 2) continue; // merged with the previous hop
      d += ` L ${p.x - ux * radius} ${p.y - uy * radius}`;
      d += ` A ${radius} ${radius} 0 0 1 ${p.x + ux * radius} ${p.y + uy * radius}`;
      lastEnd = p.t * len + radius;
    }
    d += ` L ${b.x} ${b.y}`;
  }
  return d;
}

/**
 * ArchiMate-inspired glyphs drawn in the node's top-right corner, keyed by
 * SceneNode.symbol. Each fits a 12×12 box, stroke-only. Exported so the
 * palette (and future legends) can speak the same visual language.
 */
export const SYMBOLS: Record<string, ReturnType<typeof svg>> = {
  component: svg`<rect x="3.5" y="0.5" width="8" height="11" rx="1"></rect>
    <rect x="0.5" y="2.5" width="6" height="2.6"></rect>
    <rect x="0.5" y="6.9" width="6" height="2.6"></rect>`,
  // ArchiMate-accurate type icons (top-right badge), transcribed from Archi's figure source.
  'am-component': svg`<rect x="3" y="1" width="8.5" height="10"></rect>
    <rect x="0.5" y="2.8" width="4" height="2.4"></rect>
    <rect x="0.5" y="6.8" width="4" height="2.4"></rect>`,
  'am-object': svg`<rect x="0.8" y="1.5" width="10.4" height="9"></rect>
    <line x1="0.8" y1="4" x2="11.2" y2="4"></line>`,
  // Aggregate (DDD): a cluster — stacked rectangles (root + its members).
  'am-aggregate': svg`<path d="M3.4 3.4 V1 H11 V8.6 H8.6"></path>
    <rect x="1" y="3.4" width="7.6" height="7.2" rx="0.6"></rect>
    <line x1="1" y1="5.6" x2="8.6" y2="5.6"></line>`,
  'am-event': svg`<path d="M2.5 2.5 H8.5 Q11 2.5 11 6 Q11 9.5 8.5 9.5 H2.5 Q4.3 6 2.5 2.5 Z"></path>`,
  'am-function': svg`<path d="M1.5 11 V4 L6 1 L10.5 4 V11 L6 8.5 Z"></path>`,
  'am-actor': svg`<circle cx="6" cy="2.6" r="1.8"></circle>
    <line x1="6" y1="4.4" x2="6" y2="8.4"></line>
    <line x1="2.6" y1="5.8" x2="9.4" y2="5.8"></line>
    <line x1="6" y1="8.4" x2="3.4" y2="11.4"></line>
    <line x1="6" y1="8.4" x2="8.6" y2="11.4"></line>`,
  'am-service': svg`<rect x="0.8" y="3" width="10.4" height="6" rx="3"></rect>`,
  // ACL (Anti-Corruption Layer): a barrier/translation layer between two contexts.
  'am-acl': svg`<rect x="0.5" y="2.5" width="3.4" height="7"></rect>
    <rect x="8.1" y="2.5" width="3.4" height="7"></rect>
    <line x1="6" y1="1" x2="6" y2="11"></line>`,
  // API Gateway: a funnel that routes many in to one out.
  'am-gateway': svg`<path d="M0.8 1.2 H11.2 L7.4 6 V11 H4.6 V6 Z"></path>`,
  // Deployment service: a server/rack (the runtime unit that holds modules).
  'am-deployment': svg`<rect x="0.8" y="1.5" width="10.4" height="9" rx="1"></rect>
    <line x1="0.8" y1="4.3" x2="11.2" y2="4.3"></line>
    <line x1="0.8" y1="7.1" x2="11.2" y2="7.1"></line>
    <circle cx="2.6" cy="2.9" r="0.5"></circle><circle cx="2.6" cy="5.7" r="0.5"></circle>`,
  aggregate: svg`<path d="M6 0.5 L11.5 6 L6 11.5 L0.5 6 Z"></path>`,
  shield: svg`<path d="M6 0.5 L11 2.5 V6 C11 9 8.8 11 6 11.8 C3.2 11 1 9 1 6 V2.5 Z"></path>`,
  note: svg`<path d="M1.5 0.5 H10.5 V7.5 L7 11.5 H1.5 Z"></path><path d="M10.5 7.5 H7 V11.5"></path>`,
  area: svg`<rect x="0.5" y="1.5" width="11" height="9" rx="1" stroke-dasharray="2.4 1.8"></rect>`,
  entity: svg`<rect x="0.5" y="1.5" width="11" height="9" rx="1"></rect>
    <line x1="0.5" y1="4.6" x2="11.5" y2="4.6"></line>`,
  // A value object: a rounded card (immutable value) with its fields stacked inside.
  'value-object': svg`<rect x="1.5" y="1.5" width="9" height="9" rx="2.6"></rect>
    <line x1="3.6" y1="4.6" x2="8.4" y2="4.6"></line>
    <line x1="3.6" y1="7.4" x2="8.4" y2="7.4"></line>`,
  // A field (attribute): a bullet and its value line — one row of a shape.
  field: svg`<circle cx="2.4" cy="6" r="1.3"></circle><line x1="5" y1="6" x2="11" y2="6"></line>`,
  // An operation: a rounded «play/gear» — a behaviour with input→output.
  operation: svg`<circle cx="6" cy="6" r="2.4"></circle>
    <path d="M6 0.8 V2.6 M6 9.4 V11.2 M0.8 6 H2.6 M9.4 6 H11.2" stroke-linecap="round"></path>`,
  flow: svg`<path d="M0.5 6 H8"></path><path d="M5.5 2.5 L9.5 6 L5.5 9.5"></path>`,
  process: svg`<path d="M0.5 3 H7 V0.8 L11.5 6 L7 11.2 V9 H0.5 Z"></path>`,
  person: svg`<circle cx="6" cy="3.2" r="2.4"></circle>
    <path d="M1.5 11.5 C1.5 7.6, 10.5 7.6, 10.5 11.5"></path>`,
  clock: svg`<circle cx="6" cy="6" r="4.4" fill="none"></circle>
    <path d="M6 3.4 L6 6 L7.9 7.4" fill="none" stroke-linecap="round"></path>`,
  key: svg`<circle cx="4.2" cy="4.2" r="2.6" fill="none"></circle>
    <path d="M6 6 L10 10 M8 8 L9.6 6.4 M9 9 L10.6 7.4" fill="none" stroke-linecap="round"></path>`,
  gear: svg`<circle cx="6" cy="6" r="2.6"></circle>
    <line x1="6" y1="0.5" x2="6" y2="2.6"></line><line x1="6" y1="9.4" x2="6" y2="11.5"></line>
    <line x1="0.5" y1="6" x2="2.6" y2="6"></line><line x1="9.4" y1="6" x2="11.5" y2="6"></line>`,
  event: svg`<circle cx="6" cy="6" r="5"></circle><circle cx="6" cy="6" r="2.6"></circle>`,
  readmodel: svg`<path d="M1.5 3 C1.5 1.2 10.5 1.2 10.5 3 V9 C10.5 10.8 1.5 10.8 1.5 9 Z"></path>
    <path d="M1.5 3 C1.5 4.8 10.5 4.8 10.5 3"></path>`,
  lens: svg`<circle cx="5" cy="5" r="3.8"></circle>
    <line x1="7.8" y1="7.8" x2="11.2" y2="11.2"></line>`,
  robot: svg`<rect x="2" y="4" width="8" height="6.5" rx="1.5"></rect>
    <line x1="6" y1="4" x2="6" y2="1.5"></line><circle cx="6" cy="1.2" r="0.9"></circle>
    <circle cx="4.4" cy="7" r="0.8"></circle><circle cx="7.6" cy="7" r="0.8"></circle>`,
  usecase: svg`<ellipse cx="6" cy="6" rx="5.5" ry="3.6"></ellipse>`,
  // ArchiMate application interface: the lollipop (a line ending in a circle).
  interface: svg`<line x1="0.5" y1="6" x2="5.6" y2="6"></line>
    <circle cx="8.9" cy="6" r="2.8"></circle>`,
  undo: svg`<path d="M10.5 8.5 A4.7 4.7 0 1 0 9.4 2.7"></path>
    <path d="M9.6 0.5 L9.4 3.2 L6.8 2.6"></path>`,
  // An MCP gateway: a plug — many things connect behind one socket.
  plug: svg`<path d="M4 0.5 V3.5"></path><path d="M8 0.5 V3.5"></path>
    <path d="M2.5 3.5 H9.5 V6 A3.5 3.5 0 0 1 2.5 6 Z"></path>
    <path d="M6 9.5 V11.5"></path>`,
};

// Container inner margins (CONTAINER_HEADER/CONTAINER_INSET) are shared with the
// view adapters through scene.ts, so drag clamps and child placement agree.

/**
 * Generic, fully editable diagram canvas. Semantics-free: renders a Scene and
 * emits gestures as events. The embedding shell (modux-editor) translates
 * gestures into model commands.
 *
 * Events (all CustomEvent, composed, bubbling):
 *  - node-moved        { id, x, y }             after a drag ends
 *  - nodes-moved       { moves: [{id, x, y}] }   multi-selection drag ended
 *  - node-reparent-requested { id, targetId, x, y }  Shift-drag dropped an API on a new home
 *  - node-proxy-requested { id, targetId, x, y }  Ctrl-drag: create a proxy of the API there
 *  - connect-requested { sourceId, targetId }   edge-drawing gesture completed
 *  - element-selected  { elementType, id, kind }  click on node or edge
 *  - element-activated { elementType, id, kind }  double click
 *  - selection-cleared                          click on empty canvas
 */
/** Archi-style drawing tool selected in the palette; drives direct manipulation on the canvas. */
export type CanvasTool =
  | { kind: 'select' }
  | { kind: 'place'; nodeKind: string; w: number; h: number }
  | { kind: 'connect'; rel: string | null };

@customElement('modux-canvas')
export class ModuxCanvas extends LitElement {
  readonly _i18n = new LanguageController(this);
  @property({ attribute: false }) scene: Scene = { nodes: [], edges: [] };
  @property({ attribute: false }) selectedId: string | null = null;
  /** Additional highlighted nodes (multi-selection, host-owned). */
  @property({ attribute: false }) selectedIds: string[] = [];
  /** Whether the connect gesture (drag from node handles) is available. */
  @property({ type: Boolean }) connectable = true;

  /**
   * ArchiMate notation mode (opt-in): rounds orthogonal edge corners and moves the
   * type icon to the top-right of every node with a centred label — the Archi look.
   * Default off leaves the production editor's rendering untouched.
   */
  @property({ type: Boolean }) archimate = false;

  /**
   * Active drawing tool (Archi-style direct manipulation). 'select' (default) is
   * the normal editor. 'place' drops a node on click; 'connect' does click-source
   * → click-target with a live rubber line and green/red target feedback.
   */
  @property({ attribute: false }) tool: CanvasTool = { kind: 'select' };

  /**
   * Host-supplied relationship-validity oracle (the canvas is semantics-agnostic):
   * given source/target kinds and the tool's relationship (null = magic connector),
   * returns whether the connection is allowed — drives the hover colour and gating.
   */
  @property({ attribute: false }) connectValidator?: (srcKind: string, tgtKind: string, rel: string | null) => boolean;
  /** Manual bend points per edge id (host-owned geometry, like node positions). */
  @property({ attribute: false }) edgePoints: Record<string, Point[]> = {};

  /**
   * The pan/zoom transform. NOT reactive: a wheel gesture fires many events, and re-rendering the
   * whole scene (every node/edge template) per tick is what made zoom crawl on the big unified
   * canvas. Instead the zoom handler moves ONE `<g class="viewport">` transform imperatively, and a
   * debounced re-render refreshes the minimap. Reads (hit-testing, sceneFromClient) see it live.
   */
  private _t: ZoomTransform = zoomIdentity;
  /** Cached reference to the world <g> so the hot zoom path never hits querySelector. */
  private _viewportEl: SVGGElement | null = null;
  /** True between a zoom/pan gesture's start and end — freezes hover so it can't re-render per frame. */
  private _zoomingActive = false;
  /**
   * Minimap projection (scene→minimap), captured on render so the zoom path can move the minimap's
   * viewport box imperatively — without a full scene re-render. Null until the minimap is drawn.
   */
  private _minimapGeom: { minX: number; minY: number; scale: number } | null = null;
  @state() private _dragPos: { id: string; x: number; y: number } | null = null;
  /** Dragging a menu row: every landing slot, with the one under the pointer lit. */
  @state() private _menuSlots: {
    slots: { x1: number; x2: number; y: number; appId: string; beforeId: string | null }[];
    active: number | null;
    nestRowId: string | null;
  } | null = null;
  /** Live positions of every node in a multi-selection drag. */
  @state() private _dragGroup: Map<string, { x: number; y: number }> | null = null;
  /** Active alignment guides while dragging (drawing-program smart guides). */
  @state() private _guides: { v: number[]; h: number[] } | null = null;
  @state() private _pendingLink: { sourceId: string; x: number; y: number } | null = null;
  @state() private _hoverNodeId: string | null = null;
  /** Hovered node whose neighbourhood is spotlit (everything else fades). */
  @state() private _focusNodeId: string | null = null;
  private _focusNodes = new Set<string>();
  private _focusEdges = new Set<string>();
  @state() private _editingId: string | null = null;
  @state() private _spaceDown = false;
  /** Alt held: gates the hover spotlight (fade unrelated nodes) so it isn't always on. */
  @state() private _altDown = false;
  @state() private _wpDrag: { edgeId: string; points: Point[]; index: number } | null = null;
  @state() private _selectedWaypoint: { edgeId: string; index: number } | null = null;
  @state() private _resize: { id: string; x: number; y: number; w: number; h: number } | null = null;
  @state() private _rubber: { a: Point; b: Point } | null = null;
  /** Tool-mode transient state: the chosen connect source, the hovered node, the place ghost. */
  @state() private _connectSource: string | null = null;
  @state() private _toolHover: string | null = null;
  @state() private _ghost: { x: number; y: number } | null = null;
  @state() private _placeDrag: { x0: number; y0: number; x1: number; y1: number } | null = null;
  private _connectMove?: (ev: PointerEvent) => void;

  private _zoomBehavior?: ZoomBehavior<SVGSVGElement, unknown>;
  private _fitted = false;

  static styles = css`
    /* Lines keep their width on screen whatever the zoom (like Archi): the viewport scales the
       geometry, not the pen. Hit areas stay a constant size to grab, too. */
    .viewport path, .viewport line, .viewport polyline, .viewport polygon,
    .viewport rect, .viewport circle, .viewport ellipse {
      vector-effect: non-scaling-stroke;
    }
    :host {
      display: block;
      width: 100%;
      height: 100%;
      background: var(--modux-canvas-bg, #fafafa);
      overflow: hidden;
      outline: none;
      position: relative;
    }
    svg.main {
      display: block;
      width: 100%;
      height: 100%;
      cursor: default;
      user-select: none;
      -webkit-user-select: none;
    }
    /*
     * Pan/zoom is driven through the compositor, not by re-rasterizing vectors. The transform is a
     * CSS property (set imperatively), and "transform-box: view-box; transform-origin: 0 0" makes it
     * line up exactly with the equivalent SVG transform attribute (the main svg has no viewBox and is
     * 100% x 100%, so 1px == 1 user unit from the top-left). will-change is toggled ON only while a
     * gesture is live: it promotes the group to its own layer so the browser scales a cached raster
     * (buttery under JCEF's offscreen software rendering) instead of repainting every node and edge
     * per wheel tick. It's removed on gesture end so the layer re-rasterizes crisp at rest.
     */
    svg.main g.viewport {
      transform-box: view-box;
      transform-origin: 0 0;
    }
    svg.main g.viewport.zooming {
      will-change: transform;
    }
    svg.main.linking {
      cursor: crosshair;
    }
    svg.main.placing {
      cursor: copy;
    }
    svg.main.forbidden {
      cursor: not-allowed;
    }
    svg.main.panning {
      cursor: grab;
    }
    .minimap {
      position: absolute;
      right: 10px;
      bottom: 10px;
      width: 160px;
      height: 110px;
      background: var(--modux-surface, rgba(255, 255, 255, 0.85));
      border: 1px solid var(--modux-border, #cbd5e1);
      border-radius: 6px;
      cursor: pointer;
      overflow: hidden;
    }
    .minimap svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    g[data-node-id] {
      cursor: move;
    }
    g[data-node-id] text {
      pointer-events: none;
    }
    circle[data-handle] {
      cursor: crosshair;
    }
    .edge-hit {
      cursor: pointer;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.tabIndex = 0;
    this.addEventListener('keydown', this._onKeyDown);
    this.addEventListener('keyup', this._onKeyUp);
    this.addEventListener('blur', this._onBlur);
    // Space-to-pan must work WITHOUT clicking the canvas first: listen at the
    // window (nothing to focus), but never steal the key from a control the
    // user is typing in or operating.
    window.addEventListener('keydown', this._onWindowSpace, true);
    window.addEventListener('keyup', this._onWindowSpaceUp, true);
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this._onKeyDown);
    this.removeEventListener('keyup', this._onKeyUp);
    this.removeEventListener('blur', this._onBlur);
    window.removeEventListener('keydown', this._onWindowSpace, true);
    window.removeEventListener('keyup', this._onWindowSpaceUp, true);
    super.disconnectedCallback();
  }

  private _onWindowSpace = (e: KeyboardEvent): void => {
    if (e.key === 'Alt') this._altDown = true;
    if (e.key !== ' ') return;
    const target = e.composedPath()[0];
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLButtonElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }
    e.preventDefault();
    this._spaceDown = true;
  };

  private _onWindowSpaceUp = (e: KeyboardEvent): void => {
    if (e.key === ' ') this._spaceDown = false;
    if (e.key === 'Alt') this._altDown = false;
  };

  private _onKeyUp = (e: KeyboardEvent): void => {
    if (e.key === ' ') this._spaceDown = false;
  };

  // Losing focus while space is held would otherwise leave pan mode stuck on,
  // silently disabling rubber-band selection.
  private _onBlur = (): void => {
    this._spaceDown = false;
    this._altDown = false;
  };

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (this._editingId) return; // the inline input handles its own keys
    if (e.key === ' ') {
      // hold space: pan from anywhere, even over nodes
      e.preventDefault();
      this._spaceDown = true;
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      this.emit(e.shiftKey ? 'redo-requested' : 'undo-requested');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      this.emit('redo-requested');
      return;
    }
    if (e.key === 'F2' && this.selectedId) {
      const node = this.scene.nodes.find((x) => x.id === this.selectedId);
      if (node) {
        e.preventDefault();
        this._editingId = node.id;
      }
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // A live multi-selection takes over: delete every selected node (each goes
      // through the host's per-kind rules), never a stale single selection.
      if (this.selectedIds.length > 0) {
        e.preventDefault();
        const items = this.scene.nodes
          .filter((n) => this.selectedIds.includes(n.id))
          .map((n) => ({ id: n.id, kind: n.kind }));
        if (items.length) this.emit('delete-selection-requested', { items });
        return;
      }
      // A selected waypoint takes precedence: remove the bend, keep the edge.
      if (this._selectedWaypoint) {
        const edge = this.scene.edges.find((x) => x.id === this._selectedWaypoint!.edgeId);
        if (edge) {
          e.preventDefault();
          this.removeWaypoint(edge, this._selectedWaypoint.index);
          this._selectedWaypoint = null;
        }
        return;
      }
      if (!this.selectedId) return;
      const edge = this.scene.edges.find((x) => x.id === this.selectedId);
      const node = this.scene.nodes.find((x) => x.id === this.selectedId);
      // Nested aggregates/use cases are a projection here — deleting them
      // belongs to their own view, not Supr. Domain events, read models and
      // domain services ARE managed from this view, so they are exceptions.
      if (
        node?.parentId &&
        !edge &&
        node.kind !== 'domain-event' &&
        node.kind !== 'application-event' &&
        node.kind !== 'read-model' &&
        node.kind !== 'domain-service' &&
        node.kind !== 'query-service' &&
        node.kind !== 'use-case' &&
        node.kind !== 'external-use-case' &&
        node.kind !== 'external-system' &&
        node.kind !== 'external-table' &&
        node.kind !== 'mcp-server' &&
        node.kind !== 'api' &&
        node.kind !== 'proxy-api' &&
        node.kind !== 'api-operation'
      )
        return;
      const el = edge ?? node;
      if (el) {
        e.preventDefault();
        this.emit('delete-requested', {
          elementType: edge ? 'edge' : 'node',
          id: el.id,
          kind: el.kind,
        });
      }
    }
  };

  private commitRename(node: SceneNode, value: string): void {
    if (this._editingId !== node.id) return;
    this._editingId = null;
    const name = value.trim();
    if (name && name !== node.label) {
      this.emit('node-renamed', { id: node.id, kind: node.kind, name });
    }
  }

  protected firstUpdated(): void {
    const svgEl = this.renderRoot.querySelector('svg.main') as SVGSVGElement;
    this._zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .wheelDelta((event: WheelEvent) => {
        // Map a wheel/trackpad event to a zoom step (used as the exponent of 2). d3's default is a
        // plain linear 0.002·deltaY, which does not survive a macOS trackpad: JBR delivers the
        // two-finger *pinch* not as a pinch (ctrlKey is never set) but as ordinary wheel events with
        // momentum spikes up to ~2600, so a single event became a ~38× jump ("da un salto"), while a
        // gentle two-finger scroll emits deltas of ~0–4 that barely zoomed ("empieza lento").
        // Clamping the delta kills the lurch (no event can move the zoom by more than one clamped
        // step); the higher factor keeps gentle scrolls responsive. Non-pixel modes (a real mouse
        // wheel) are normalized to pixels first so a notch still zooms.
        const px =
          event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 400 : event.deltaY;
        const clamped = Math.max(-40, Math.min(40, px));
        return -clamped * 0.005;
      })
      .filter((event: Event) => {
        // Wheel zooms anywhere. Panning is a deliberate gesture: hold space and
        // drag with the left button. A plain drag is a rubber-band selection,
        // and nodes/handles/waypoints/edges manage their own drags (they stop
        // propagation), so they never reach this filter unless space is held.
        if (event.type === 'wheel') return true;
        return this._spaceDown && (event as MouseEvent).button === 0;
      })
      .on('start', () => {
        // Promote the group to its own compositor layer for the duration of the gesture.
        this._viewportEl?.classList.add('zooming');
        // Freeze hover/spotlight while zooming. As the scene scales under a stationary cursor, nodes
        // slide across it and fire pointerenter/leave every frame — each recomputes the spotlight and
        // triggers a full re-render (and a visible dim/undim flicker). Clear any active spotlight once
        // here; setFocusNode() then ignores hover until the gesture ends.
        this._zoomingActive = true;
        if (this._focusNodeId) this._focusNodeId = null;
      })
      .on('zoom', (event) => {
        this._t = event.transform;
        this.applyViewportTransform();
      })
      .on('end', () => {
        // Drop the layer so the vectors re-rasterize crisp at the final scale. No requestUpdate here:
        // re-rendering the whole scene on every pause in scrolling was a visible hitch. The minimap
        // is kept in sync imperatively (applyViewportTransform), so nothing else needs a re-render.
        this._viewportEl?.classList.remove('zooming');
        this._zoomingActive = false;
      });
    select(svgEl).call(this._zoomBehavior);
    this._viewportEl = this.renderRoot.querySelector('svg.main > g.viewport') as SVGGElement | null;
    this.applyViewportTransform();
  }

  /**
   * Move the world group to the current pan/zoom, imperatively — no scene re-render. The transform
   * is set as a CSS property (not the SVG attribute) so it goes through the compositor: while the
   * `.zooming` layer is live the browser scales a cached raster instead of repainting every vector.
   */
  private applyViewportTransform(): void {
    const g = this._viewportEl ?? (this._viewportEl = this.renderRoot.querySelector('svg.main > g.viewport') as SVGGElement | null);
    if (g) g.style.transform = `translate(${this._t.x}px, ${this._t.y}px) scale(${this._t.k})`;
    this.syncMinimapViewport();
  }

  /** Move the minimap's viewport box to match the current pan/zoom — no scene re-render. */
  private syncMinimapViewport(): void {
    const geom = this._minimapGeom;
    if (!geom) return;
    const box = this.renderRoot.querySelector('rect.minimap-viewport') as SVGRectElement | null;
    if (!box) return;
    const rect = this.getBoundingClientRect();
    const vx = -this._t.x / this._t.k;
    const vy = -this._t.y / this._t.k;
    box.setAttribute('x', String((vx - geom.minX) * geom.scale));
    box.setAttribute('y', String((vy - geom.minY) * geom.scale));
    box.setAttribute('width', String((rect.width / this._t.k) * geom.scale));
    box.setAttribute('height', String((rect.height / this._t.k) * geom.scale));
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('scene')) {
      // The host is the source of truth for geometry once it re-emits the scene.
      this._dragPos = null;
      this._dragGroup = null;
    }
    // A waypoint only stays selected while its edge is the selected element and
    // it still exists; otherwise drop the sub-selection so Supr targets the edge.
    if (this._selectedWaypoint && (changed.has('selectedId') || changed.has('edgePoints'))) {
      const wp = this._selectedWaypoint;
      const stillValid =
        this.selectedId === wp.edgeId && wp.index < (this.edgePoints[wp.edgeId]?.length ?? 0);
      if (!stillValid) this._selectedWaypoint = null;
    }
    // Switching away from connect/place cancels any half-drawn gesture cleanly.
    if (changed.has('tool')) {
      if (this.tool.kind !== 'connect') this.endConnectTracking();
      if (this.tool.kind !== 'place') this._ghost = null;
    }
  }

  protected updated(): void {
    if (!this._fitted && this.scene.nodes.length > 0 && this._zoomBehavior) {
      this._fitted = true;
      this.fit();
    }
    if (this._editingId) {
      const input = this.renderRoot.querySelector('foreignObject input') as HTMLInputElement | null;
      if (input && this.shadowRoot?.activeElement !== input) {
        input.focus();
        input.select();
      }
    }
    this.pruneCollinearWaypoints();
  }

  /**
   * Space along the edges occupied by overlays (palette, catalog tree): fit()
   * centers the scene in what remains visible, not under them.
   */
  @property({ attribute: false }) fitInsets: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  } = {};

  /**
   * Center and scale the viewport so the scene is visible (and unobscured).
   * With a selection, only the selected nodes and the lines that join them are
   * framed; a selected edge frames its polyline and the nodes it connects.
   */
  fit(padding = 60): void {
    const svgEl = this.renderRoot.querySelector('svg.main') as SVGSVGElement | null;
    if (!this.scene.nodes.length || !svgEl || !this._zoomBehavior) return;
    const rect = this.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const selectedNodeIds = new Set(
      this.selectedIds.filter((id) => this.scene.nodes.some((n) => n.id === id)),
    );
    if (this.scene.nodes.some((n) => n.id === this.selectedId)) {
      selectedNodeIds.add(this.selectedId as string);
    }
    const selectedEdge = this.scene.edges.find((e) => e.id === this.selectedId) ?? null;
    const selectionActive = selectedNodeIds.size > 0 || selectedEdge !== null;
    const nodes = selectionActive
      ? this.scene.nodes.filter(
          (n) =>
            selectedNodeIds.has(n.id) ||
            (selectedEdge !== null &&
              (n.id === selectedEdge.sourceId || n.id === selectedEdge.targetId)),
        )
      : this.scene.nodes;
    if (!nodes.length) return;
    const left = this.fitInsets.left ?? 0;
    const right = this.fitInsets.right ?? 0;
    const top = this.fitInsets.top ?? 0;
    const bottom = this.fitInsets.bottom ?? 0;
    const availW = Math.max(80, rect.width - left - right);
    const availH = Math.max(80, rect.height - top - bottom);
    let minX = Math.min(...nodes.map((n) => n.x - n.w / 2)) - padding;
    let maxX = Math.max(...nodes.map((n) => n.x + n.w / 2)) + padding;
    let minY = Math.min(...nodes.map((n) => n.y - n.h / 2)) - padding;
    let maxY = Math.max(...nodes.map((n) => n.y + n.h / 2)) + padding;
    if (selectionActive) {
      // The lines that join the selection may wander outside the nodes' boxes
      // (manual bends, sibling spread): grow the frame to hold their geometry.
      for (const edge of this.scene.edges) {
        const joins =
          edge.id === selectedEdge?.id ||
          (selectedNodeIds.has(edge.sourceId) && selectedNodeIds.has(edge.targetId));
        if (!joins) continue;
        const pts = this.edgePolyline(edge);
        if (!pts) continue;
        for (const p of pts) {
          minX = Math.min(minX, p.x - padding);
          maxX = Math.max(maxX, p.x + padding);
          minY = Math.min(minY, p.y - padding);
          maxY = Math.max(maxY, p.y + padding);
        }
      }
    }
    const k = Math.max(0.15, Math.min(availW / (maxX - minX), availH / (maxY - minY), 1.25));
    const t = zoomIdentity
      .translate(
        left + availW / 2 - (k * (minX + maxX)) / 2,
        top + availH / 2 - (k * (minY + maxY)) / 2,
      )
      .scale(k);
    select(svgEl).call(this._zoomBehavior.transform, t);
  }

  /** Zoom in/out around the viewport centre (keyboard shortcuts, external buttons). */
  zoomBy(factor: number): void {
    const svgEl = this.renderRoot.querySelector('svg.main') as SVGSVGElement | null;
    if (!svgEl || !this._zoomBehavior) return;
    this._zoomBehavior.scaleBy(select(svgEl), factor);
  }

  /** Client coordinates → scene coordinates (undo pan/zoom). */
  private toScene(e: PointerEvent | MouseEvent): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - this._t.x) / this._t.k,
      y: (e.clientY - rect.top - this._t.y) / this._t.k,
    };
  }

  private nodePos(node: SceneNode): { x: number; y: number } {
    if (this._dragPos && this._dragPos.id === node.id) {
      return { x: this._dragPos.x, y: this._dragPos.y };
    }
    const grouped = this._dragGroup?.get(node.id);
    if (grouped) return grouped;
    // An anchored resize moves the centre; children stay put (they are absolute here).
    if (this._resize && this._resize.id === node.id) {
      return { x: this._resize.x, y: this._resize.y };
    }
    // A child follows live while any of its ancestors is being dragged (an API's
    // operations must track both the API and the system containing it).
    for (
      let ancestorId = node.parentId;
      ancestorId;
      ancestorId = this.scene.nodes.find((n) => n.id === ancestorId)?.parentId
    ) {
      const ancestor = this.scene.nodes.find((n) => n.id === ancestorId);
      if (!ancestor) break;
      if (this._dragPos && this._dragPos.id === ancestorId) {
        return { x: node.x + (this._dragPos.x - ancestor.x), y: node.y + (this._dragPos.y - ancestor.y) };
      }
      const grouped = this._dragGroup?.get(ancestorId);
      if (grouped) {
        return { x: node.x + (grouped.x - ancestor.x), y: node.y + (grouped.y - ancestor.y) };
      }
    }
    return { x: node.x, y: node.y };
  }

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  // ---- node dragging ------------------------------------------------------

  /** Keep a dragged child inside its container's inner area (below the header). */
  private clampToParent(node: SceneNode, x: number, y: number): { id: string; x: number; y: number } {
    if (node.parentId) {
      const parent = this.scene.nodes.find((n) => n.id === node.parentId);
      if (parent) {
        const pp = this.nodePos(parent);
        const minX = pp.x - parent.w / 2 + CONTAINER_INSET + node.w / 2;
        const maxX = pp.x + parent.w / 2 - CONTAINER_INSET - node.w / 2;
        const minY = pp.y - parent.h / 2 + CONTAINER_HEADER + node.h / 2;
        const maxY = pp.y + parent.h / 2 - CONTAINER_INSET - node.h / 2;
        x = Math.min(Math.max(x, minX), maxX);
        y = Math.min(Math.max(y, minY), maxY);
      }
    }
    return { id: node.id, x, y };
  }

  /**
   * An area's cargo: the frame plus every top-level node whose box sits fully
   * inside it. Children ride with their container, so only top-level counts.
   */
  private areaCargo(area: SceneNode): SceneNode[] {
    const inside = this.scene.nodes.filter((n) => {
      if (n.id === area.id || n.parentId) return false;
      const p = this.nodePos(n);
      return (
        p.x - n.w / 2 >= area.x - area.w / 2 &&
        p.x + n.w / 2 <= area.x + area.w / 2 &&
        p.y - n.h / 2 >= area.y - area.h / 2 &&
        p.y + n.h / 2 <= area.y + area.h / 2
      );
    });
    return [area, ...inside];
  }

  /**
   * Topmost node under the pointer. elementFromPoint alone is not enough: an
   * edge's fat invisible hit-line can sit on top of a node and swallow the hit.
   */
  private nodeIdAt(ev: PointerEvent): string | null {
    return this.nodeIdAtClient(ev.clientX, ev.clientY);
  }

  /** True while a node is hovered and no gesture is in progress. */
  private get spotlighting(): boolean {
    // Only while Alt is held — otherwise plain hover never dims unrelated nodes.
    return !!this._focusNodeId && this._altDown && !this.gestureActive();
  }

  /** A gesture owns the pointer — don't spotlight a neighbourhood mid-drag. */
  private gestureActive(): boolean {
    return !!(
      this._dragPos ||
      this._dragGroup ||
      this._pendingLink ||
      this._wpDrag ||
      this._resize ||
      this._rubber ||
      this._spaceDown ||
      this._zoomingActive
    );
  }

  /**
   * Spotlight a node's neighbourhood: hovering it keeps the node, the nodes one
   * edge away and those connecting edges at full strength, and fades everything
   * else back. A node's container/nested chips ride along so a chip and its box
   * stay lit together. Passing null (pointer left) clears the spotlight.
   */
  private setFocusNode(id: string | null): void {
    if (this._zoomingActive) return; // hover is frozen mid-zoom (see the zoom 'start' handler)
    if (id && this.gestureActive()) return;
    if (id === this._focusNodeId) return;
    this._focusNodeId = id;
    const nodes = new Set<string>();
    const edges = new Set<string>();
    if (id) {
      nodes.add(id);
      const focus = this.scene.nodes.find((n) => n.id === id);
      if (focus?.parentId) nodes.add(focus.parentId);
      for (const n of this.scene.nodes) if (n.parentId === id) nodes.add(n.id);
      for (const e of this.scene.edges) {
        if (e.sourceId === id || e.targetId === id) {
          edges.add(e.id);
          nodes.add(e.sourceId);
          nodes.add(e.targetId);
        }
      }
    }
    this._focusNodes = nodes;
    this._focusEdges = edges;
  }

  /** Topmost node at a client-space point (also used by palette drops). */
  nodeIdAtClient(clientX: number, clientY: number): string | null {
    const els = this.shadowRoot?.elementsFromPoint(clientX, clientY) ?? [];
    for (const el of els) {
      const g = el.closest?.('[data-node-id]');
      if (g) return g.getAttribute('data-node-id');
    }
    return null;
  }

  /**
   * The node whose box is nearest to a client point, within maxPx screen pixels — a
   * forgiving fallback for palette drops when the exact hit-test misses a small node
   * (SVG fill hit-testing is finicky, and boxes shrink when zoomed out).
   */
  nodeIdNearClient(clientX: number, clientY: number, maxPx = 44): string | null {
    const p = this.sceneFromClient(clientX, clientY);
    let best: string | null = null;
    let bestD = Infinity;
    for (const n of this.scene.nodes) {
      if (n.kind === 'area') continue;
      const c = this.nodePos(n);
      const dx = Math.max(Math.abs(p.x - c.x) - (n.w ?? 0) / 2, 0);
      const dy = Math.max(Math.abs(p.y - c.y) - (n.h ?? 0) / 2, 0);
      const d = Math.hypot(dx, dy);
      if (d < bestD) {
        bestD = d;
        best = n.id;
      }
    }
    return best && bestD * this._t.k <= maxPx ? best : null;
  }

  /** Topmost edge at a client-space point — note threads can land on relations. */
  private edgeIdAtClient(clientX: number, clientY: number): string | null {
    const els = this.shadowRoot?.elementsFromPoint(clientX, clientY) ?? [];
    for (const el of els) {
      const g = el.closest?.('[data-edge-id]');
      if (g) return g.getAttribute('data-edge-id');
    }
    return null;
  }

  /**
   * For a palette drop over a mockup component chip (`cmp:…`): whether it lands BEFORE, AFTER or
   * INTO it — from the cursor's vertical position within the box (a container's middle band nests;
   * the top/bottom, or a leaf, slot as a sibling). Null when not over a component chip, so plain
   * node drops are unaffected.
   */
  dropSlotAtClient(
    clientX: number, clientY: number,
  ): { nodeId: string; pos: 'before' | 'after' | 'into' } | null {
    const id = this.nodeIdAtClient(clientX, clientY) ?? this.nodeIdNearClient(clientX, clientY);
    if (!id || !id.startsWith('cmp:')) return null;
    const n = this.scene.nodes.find((x) => x.id === id);
    if (!n) return null;
    const c = this.nodePos(n);
    const h = n.h || 1;
    const relY = (this.sceneFromClient(clientX, clientY).y - (c.y - h / 2)) / h;
    if (n.collapsible && relY > 0.34 && relY < 0.66) return { nodeId: id, pos: 'into' };
    return { nodeId: id, pos: relY < 0.5 ? 'before' : 'after' };
  }

  /** Scene coordinates for a client-space point (palette drops). */
  sceneFromClient(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this._t.x) / this._t.k,
      y: (clientY - rect.top - this._t.y) / this._t.k,
    };
  }

  /** Scene coordinates → client coordinates (apply pan/zoom). Inverse of sceneFromClient. */
  clientFromScene(x: number, y: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return {
      x: x * this._t.k + this._t.x + rect.left,
      y: y * this._t.k + this._t.y + rect.top,
    };
  }

  private onNodePointerDown(e: PointerEvent, node: SceneNode): void {
    if (e.button !== 0 || (e.buttons & 1) === 0) return;
    if (this._spaceDown) return; // let the zoom behavior pan instead
    e.stopPropagation();
    this.focus();
    if (this.tool.kind !== 'select' && this.handleToolPointer(node, e)) return;
    const start = this.toScene(e);
    const origin = this.nodePos(node);
    let moved = false;

    // Grabbing a node of the multi-selection drags the whole selection. Nodes whose
    // container is also selected are left out: they follow their container anyway.
    // Grabbing an AREA drags its cargo: membership is geometric, so everything
    // fully inside the frame travels with it.
    const selectedSet = new Set(this.selectedIds);
    const group =
      selectedSet.has(node.id) && this.selectedIds.length > 1
        ? this.scene.nodes.filter(
            (n) => selectedSet.has(n.id) && !(n.parentId && selectedSet.has(n.parentId)),
          )
        : node.kind === 'area'
          ? this.areaCargo(node)
          : null;
    const groupOrigins = group ? new Map(group.map((n) => [n.id, this.nodePos(n)])) : null;

    // Shift/Ctrl while dragging an API chip frees it from its container: dropping it
    // on another external system re-homes the API (the handle stays for relations).
    const freeDrag = (ev: PointerEvent) =>
      ((ev.shiftKey || ev.ctrlKey) && (node.kind === 'api' || node.kind === 'proxy-api') && !group)
      // A top-level external system shift-drags INTO another one (subsystem) or out.
      || (ev.shiftKey && node.kind === 'external-system' && !group)
      // A system nests into another system, and a context into a system, by shift-drag (or out).
      || (ev.shiftKey && (node.kind === 'system' || node.kind === 'boundedContext') && !group);
    // Row nodes drag FREE, landing on explicit slots between their siblings: menu
    // entries travel across apps; wizard steps reorder inside their own wizard.
    const rowFamily = group
      ? null
      : node.kind === 'menu-item' || node.kind === 'menu-group'
        ? 'menu'
        : node.kind === 'wizard-step-row'
          ? 'wizard'
          : null;
    const menuRow = rowFamily !== null;
    const rowKinds = rowFamily === 'menu' ? ['menu-item', 'menu-group'] : ['wizard-step-row'];
    const menuSlotsOf = () => {
      const slots: { x1: number; x2: number; y: number; appId: string; beforeId: string | null }[] = [];
      const containers =
        rowFamily === 'menu'
          ? this.scene.nodes.filter((n) => n.kind === 'ui-app')
          : this.scene.nodes.filter((n) => n.id === (node.ownerId ?? node.parentId));
      for (const app of containers) {
        const rows = this.scene.nodes
          .filter((n) => (n.ownerId ?? n.parentId) === app.id && rowKinds.includes(n.kind ?? '') && n.id !== node.id)
          .sort((r1, r2) => r1.y - r2.y);
        const x1 = app.x - app.w / 2 + CONTAINER_INSET;
        const x2 = app.x + app.w / 2 - CONTAINER_INSET;
        for (const r of rows) slots.push({ x1, x2, y: r.y - r.h / 2 - 3, appId: app.id, beforeId: r.id });
        const last = rows[rows.length - 1];
        slots.push({
          x1,
          x2,
          y: last ? last.y + last.h / 2 + 3 : app.y - app.h / 2 + CONTAINER_HEADER + 8,
          appId: app.id,
          beforeId: null,
        });
      }
      return slots;
    };
    const dropHome = (ev: PointerEvent): string | null => {
      const targetId = this.nodeIdAt(ev);
      const target =
        targetId && targetId !== node.id
          ? this.scene.nodes.find((n) => n.id === targetId)
          : undefined;
      if (!target) return null;
      if (target.kind === 'external-system') return target.id;
      return target.parentId ?? null;
    };
    const onMove = (ev: PointerEvent) => {
      // Lost pointerup (native popup, window switch): settle the drag where it is.
      if ((ev.buttons & 1) === 0) {
        onUp(ev);
        return;
      }
      const p = this.toScene(ev);
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      if (!moved && Math.hypot(dx, dy) < 3 / this._t.k) return;
      moved = true;
      if (group && groupOrigins) {
        const positions = new Map<string, { x: number; y: number }>();
        for (const n of group) {
          const o = groupOrigins.get(n.id)!;
          const c = this.clampToParent(n, o.x + dx, o.y + dy);
          positions.set(n.id, { x: c.x, y: c.y });
        }
        if (!ev.altKey) {
          // Snap the grabbed node to the grid and shift the whole group by the same
          // correction (guides are a single-node affair; Alt frees the pointer).
          const me = positions.get(node.id)!;
          const correction = { x: snapValue(me.x) - me.x, y: snapValue(me.y) - me.y };
          if (correction.x !== 0 || correction.y !== 0) {
            for (const p of positions.values()) {
              p.x += correction.x;
              p.y += correction.y;
            }
          }
        }
        this._dragGroup = positions;
      } else if (menuRow) {
        this._dragPos = { id: node.id, x: origin.x + dx, y: origin.y + dy };
        if (!this._menuSlots) this._menuSlots = { slots: menuSlotsOf(), active: null, nestRowId: null };
        // The pointer decides: the middle of another row nests; otherwise the
        // nearest slot line (within reach) takes the drop.
        const rows = this.scene.nodes.filter(
          (n) =>
            rowKinds.includes(n.kind ?? '') &&
            n.id !== node.id &&
            Math.abs(p.x - n.x) <= n.w / 2 + 8,
        );
        const nest = rowFamily === 'menu' ? rows.find((n) => Math.abs(p.y - n.y) < n.h * 0.28) : undefined;
        if (nest) {
          this._menuSlots = { ...this._menuSlots, active: null, nestRowId: nest.id };
          this._hoverNodeId = nest.id;
        } else {
          let best = -1;
          let bestD = 14;
          this._menuSlots.slots.forEach((s, i) => {
            if (p.x < s.x1 - 24 || p.x > s.x2 + 24) return;
            const d = Math.abs(p.y - s.y);
            if (d < bestD) {
              bestD = d;
              best = i;
            }
          });
          this._menuSlots = { ...this._menuSlots, active: best >= 0 ? best : null, nestRowId: null };
          this._hoverNodeId = null;
        }
      } else if (freeDrag(ev)) {
        this._dragPos = { id: node.id, x: origin.x + dx, y: origin.y + dy };
        this._hoverNodeId = dropHome(ev);
        this._guides = null;
      } else {
        const raw = this.clampToParent(node, origin.x + dx, origin.y + dy);
        if (ev.altKey) {
          this._dragPos = { id: node.id, x: raw.x, y: raw.y };
          this._guides = null;
        } else {
          // Snap to alignment guides with the other nodes (edges/centers), falling
          // back to the grid — the drawing-program behavior. Descendants follow the
          // drag anyway, so they can't be alignment targets.
          const others = this.scene.nodes.filter((n) => {
            if (n.id === node.id) return false;
            for (let a = n.parentId; a; a = this.scene.nodes.find((x) => x.id === a)?.parentId) {
              if (a === node.id) return false;
            }
            return true;
          });
          const snapped = snapDragged({ ...raw, w: node.w, h: node.h }, others, {
            threshold: 5 / this._t.k,
          });
          this._dragPos = { id: node.id, x: snapped.x, y: snapped.y };
          this._guides = snapped.guides.v.length || snapped.guides.h.length ? snapped.guides : null;
        }
        this._hoverNodeId = null;
      }
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this._guides = null;
      if (moved && this._dragGroup) {
        this.emit('nodes-moved', {
          moves: [...this._dragGroup.entries()].map(([id, p]) => ({ id, x: p.x, y: p.y })),
        });
      } else if (moved && this._dragPos && menuRow) {
        const state = this._menuSlots;
        this._menuSlots = null;
        this._dragPos = null;
        this._hoverNodeId = null;
        const slotEvent = rowFamily === 'wizard' ? 'wizard-slot-requested' : 'menu-slot-requested';
        if (state?.nestRowId) {
          this.emit(slotEvent, { id: node.id, nestRowId: state.nestRowId });
        } else if (state && state.active !== null) {
          const slot = state.slots[state.active];
          this.emit(slotEvent, { id: node.id, appId: slot.appId, beforeId: slot.beforeId });
        }
        return;
      } else if (moved && this._dragPos) {
        // A value object / entity / aggregate dropped ON an aggregate is associated with
        // it, or ON a field sets that field's type — both route through the connect gesture.
        if (node.kind === 'value-object' || node.kind === 'entity' || node.kind === 'aggregate') {
          const overId = this.nodeIdAt(ev);
          const over = overId && overId !== node.id ? this.scene.nodes.find((n) => n.id === overId) : null;
          const alreadyOwned = over
            ? this.scene.edges.some(
                (e) => e.kind === 'containment' && e.sourceId === over.id && e.targetId === node.id,
              )
            : false;
          if ((over?.kind === 'field' || (over?.kind === 'aggregate' && node.kind !== 'aggregate')) && !alreadyOwned) {
            this.emit('connect-requested', {
              sourceId: node.id,
              targetId: over.id,
              x: ev.clientX,
              y: ev.clientY,
            });
            this._dragPos = null;
            this._hoverNodeId = null;
            return;
          }
        }
        if (freeDrag(ev)) {
          const home = dropHome(ev);
          // Ctrl over a system CREATES A PROXY of the API there (the API stays put);
          // Shift moves the API itself.
          if (ev.ctrlKey && node.kind === 'api') {
            if (home && home !== (node.parentId ?? null)) {
              this.emit('node-proxy-requested', {
                id: node.id,
                targetId: home,
                x: this._dragPos.x,
                y: this._dragPos.y,
              });
            }
            this._dragPos = null;
            this._hoverNodeId = null;
            return;
          }
          if (home !== (node.parentId ?? null)) {
            this.emit('node-reparent-requested', {
              id: node.id,
              targetId: home,
              x: this._dragPos.x,
              y: this._dragPos.y,
            });
            this._hoverNodeId = null;
            return;
          }
          // Same home after all — settle it back inside like a normal move.
          this._dragPos = this.clampToParent(node, this._dragPos.x, this._dragPos.y);
        }
        this.emit('node-moved', { id: node.id, x: this._dragPos.x, y: this._dragPos.y });
      } else if (e.shiftKey) {
        this.emit('element-multi-toggled', { id: node.id, kind: node.kind });
      } else {
        this.emit('element-selected', { elementType: 'node', id: node.id, kind: node.kind });
      }
      this._hoverNodeId = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // ---- container resize ----------------------------------------------------

  /**
   * Corner-handle drag resizes a container. The dragged corner follows the
   * pointer while the opposite corner stays anchored; with Shift held the
   * resize is symmetric about the centre. Children never leave the box: they
   * keep their absolute position, so each edge stops at the outermost child.
   */
  private onResizePointerDown(e: PointerEvent, node: SceneNode, sx: -1 | 0 | 1, sy: -1 | 0 | 1): void {
    if (e.button !== 0 || (e.buttons & 1) === 0) return;
    e.stopPropagation();
    this.focus();
    // Top-level containers keep their roomy floor; CHIPS — plain or with their
    // own nested chips — can go down to chip size (their content still clamps).
    // An AREA is a bare rectangle (no title, no glyph) — it may shrink to a sliver.
    const isArea = node.kind === 'area';
    const topContainer = node.container && !node.parentId;
    const MIN_W = isArea ? 30 : topContainer ? 160 : 90;
    const MIN_H = isArea ? 20 : topContainer ? 90 : 30;
    const start = { x: node.x, y: node.y, w: node.w, h: node.h };
    // A chip-container's nested chips reflow on every render (they are auto-laid),
    // so they never clamp the resize; the scene's own minimum size protects them.
    const kids = topContainer ? this.scene.nodes.filter((n) => n.parentId === node.id) : [];
    const kidsLeft = Math.min(...kids.map((c) => c.x - c.w / 2));
    const kidsRight = Math.max(...kids.map((c) => c.x + c.w / 2));
    const kidsTop = Math.min(...kids.map((c) => c.y - c.h / 2));
    const kidsBottom = Math.max(...kids.map((c) => c.y + c.h / 2));
    const symMin = containerMinSize(
      kids.map((c) => ({ dx: c.x - start.x, dy: c.y - start.y, w: c.w, h: c.h })),
      { w: MIN_W, h: MIN_H },
    );
    const onMove = (ev: PointerEvent) => {
      if ((ev.buttons & 1) === 0) {
        onUp();
        return;
      }
      const p = this.toScene(ev);
      if (ev.shiftKey) {
        this._resize = {
          id: node.id,
          x: start.x,
          y: start.y,
          w: sx === 0 ? start.w : ev.altKey
            ? Math.max(symMin.w, 2 * Math.abs(p.x - start.x))
            : Math.max(symMin.w, snapValue(2 * Math.abs(p.x - start.x))),
          h: sy === 0 ? start.h : ev.altKey
            ? Math.max(symMin.h, 2 * Math.abs(p.y - start.y))
            : Math.max(symMin.h, snapValue(2 * Math.abs(p.y - start.y))),
        };
        return;
      }
      // Anchor = the opposite edge/corner; a side handle (0 on an axis) leaves that
      // dimension untouched. Dragged edges stop at the floor size and outermost child.
      const pg = ev.altKey ? p : { x: snapValue(p.x), y: snapValue(p.y) };
      const ax = start.x - (sx * start.w) / 2;
      const ay = start.y - (sy * start.h) / 2;
      let nx = start.x, ny = start.y, nw = start.w, nh = start.h;
      if (sx !== 0) {
        const px = sx > 0
          ? Math.max(pg.x, ax + MIN_W, kids.length ? kidsRight + CONTAINER_INSET : -Infinity)
          : Math.min(pg.x, ax - MIN_W, kids.length ? kidsLeft - CONTAINER_INSET : Infinity);
        nx = (ax + px) / 2; nw = Math.abs(px - ax);
      }
      if (sy !== 0) {
        const py = sy > 0
          ? Math.max(pg.y, ay + MIN_H, kids.length ? kidsBottom + CONTAINER_INSET : -Infinity)
          : Math.min(pg.y, ay - MIN_H, kids.length ? kidsTop - CONTAINER_HEADER : Infinity);
        ny = (ay + py) / 2; nh = Math.abs(py - ay);
      }
      this._resize = { id: node.id, x: nx, y: ny, w: nw, h: nh };
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (this._resize && this._resize.id === node.id) {
        this.emit('node-resized', { ...this._resize });
      }
      this._resize = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // ---- edge drawing (connect gesture) -------------------------------------

  private onHandlePointerDown(e: PointerEvent, node: SceneNode, connectKind?: string): void {
    if (e.button !== 0 || (e.buttons & 1) === 0) return;
    e.stopPropagation();
    const p = this.toScene(e);
    this._pendingLink = { sourceId: node.id, x: p.x, y: p.y };

    const onMove = (ev: PointerEvent) => {
      // Lost pointerup: connecting to whatever is under a ghost pointer would be
      // wrong — drop the pending link instead.
      if ((ev.buttons & 1) === 0) {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        this._pendingLink = null;
        this._hoverNodeId = null;
        return;
      }
      const q = this.toScene(ev);
      this._pendingLink = { sourceId: node.id, x: q.x, y: q.y };
      this._hoverNodeId = this.nodeIdAt(ev);
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const targetId = this.nodeIdAt(ev);
      if (targetId && targetId !== node.id) {
        this.emit('connect-requested', {
          sourceId: node.id,
          targetId,
          x: ev.clientX,
          y: ev.clientY,
          connectKind,
        });
      } else if (node.kind === 'note') {
        // A note dropped on empty space may still land on a RELATION: notes annotate
        // edges too, so the drop hit-tests the edge ink before giving up.
        const edgeId = this.edgeIdAtClient(ev.clientX, ev.clientY);
        if (edgeId && !edgeId.startsWith('note:')) {
          this.emit('connect-requested', {
            sourceId: node.id,
            targetId: `edge:${edgeId}`,
            x: ev.clientX,
            y: ev.clientY,
            connectKind,
          });
        }
      }
      this._pendingLink = null;
      this._hoverNodeId = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // ---- tool-mode interaction (Archi-style direct manipulation) -------------

  private nodeById(id: string | null): SceneNode | undefined {
    return id ? this.scene.nodes.find((n) => n.id === id) : undefined;
  }

  /** True while hovering an INVALID target during a connect gesture — drives the no-drop cursor. */
  private toolForbidden(): boolean {
    if (this.tool.kind !== 'connect' || !this._connectSource || !this._toolHover) return false;
    const src = this.nodeById(this._connectSource), tgt = this.nodeById(this._toolHover);
    if (!src || !tgt || tgt.id === src.id) return false;
    return !!this.connectValidator && !this.connectValidator(src.kind, tgt.kind, this.tool.rel);
  }

  /** A pointerdown landed on `node` while a place/connect tool is active. Returns true if handled. */
  private handleToolPointer(node: SceneNode, e: PointerEvent): boolean {
    if (this.tool.kind === 'place') {
      const p = this.toScene(e);
      this.emit('place-requested', { nodeKind: this.tool.nodeKind, w: this.tool.w, h: this.tool.h, x: snapValue(p.x), y: snapValue(p.y) });
      return true;
    }
    if (this.tool.kind === 'connect') {
      if (!this._connectSource) {
        this._connectSource = node.id;
        const p = this.toScene(e);
        this._pendingLink = { sourceId: node.id, x: p.x, y: p.y };
        this.startConnectTracking();
      } else if (node.id !== this._connectSource) {
        const src = this.nodeById(this._connectSource)!;
        const rel = this.tool.rel;
        const ok = rel === null || !this.connectValidator || this.connectValidator(src.kind, node.kind, rel);
        this.emit(ok ? 'connect-committed' : 'connect-rejected', {
          sourceId: this._connectSource, targetId: node.id, rel, x: e.clientX, y: e.clientY,
        });
        this.endConnectTracking();
      }
      return true;
    }
    return false;
  }

  private startConnectTracking(): void {
    this._connectMove = (ev: PointerEvent) => {
      if (!this._connectSource) return;
      const p = this.toScene(ev);
      this._pendingLink = { sourceId: this._connectSource, x: p.x, y: p.y };
      this._toolHover = this.nodeIdAt(ev);
    };
    window.addEventListener('pointermove', this._connectMove);
  }

  private endConnectTracking(): void {
    if (this._connectMove) window.removeEventListener('pointermove', this._connectMove);
    this._connectMove = undefined;
    this._connectSource = null;
    this._pendingLink = null;
    this._toolHover = null;
  }

  // ---- geometry helpers ----------------------------------------------------

  /** Point on the border of `node` along the line towards (tx, ty). */
  private borderPoint(node: SceneNode, tx: number, ty: number): { x: number; y: number } {
    const { x, y } = this.nodePos(node);
    const dx = tx - x;
    const dy = ty - y;
    const hw = node.w / 2;
    const hh = node.h / 2;
    if (dx === 0 && dy === 0) return { x, y };
    const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
    return { x: x + dx * scale, y: y + dy * scale };
  }

  /**
   * Border exit for a routed edge: when the first/last waypoint sits beside the
   * node (its perpendicular coordinate falls within the node's span), leave the
   * facing side aligned to it, so the end segment is horizontal/vertical — this
   * is what keeps ELK's and the auto-router's orthogonal routes orthogonal right
   * up to the box. Otherwise fall back to the plain centre-ray border point.
   */
  private orthoBorderPoint(node: SceneNode, tx: number, ty: number): { x: number; y: number } {
    const { x, y } = this.nodePos(node);
    const dx = tx - x;
    const dy = ty - y;
    const hw = node.w / 2;
    const hh = node.h / 2;
    if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dy) <= hh) {
      return { x: x + Math.sign(dx) * hw, y: ty };
    }
    if (Math.abs(dy) >= Math.abs(dx) && Math.abs(dx) <= hw) {
      return { x: tx, y: y + Math.sign(dy) * hh };
    }
    return this.borderPoint(node, tx, ty);
  }

  // ---- rendering -----------------------------------------------------------

  /** Perpendicular offset so edges sharing a node pair don't overlap. */
  private edgeOffset(edge: SceneEdge): number {
    const key = [edge.sourceId, edge.targetId].sort().join('|');
    const siblings = this.scene.edges.filter(
      (e) => [e.sourceId, e.targetId].sort().join('|') === key,
    );
    if (siblings.length < 2) return 0;
    const index = siblings.findIndex((e) => e.id === edge.id);
    return (index - (siblings.length - 1) / 2) * 20;
  }

  /** Full polyline of an edge: border point → waypoints → border point. */
  private edgePolyline(edge: SceneEdge): Point[] | null {
    const source = this.scene.nodes.find((n) => n.id === edge.sourceId);
    // A note thread may target a RELATION: it anchors at that edge's midpoint.
    if (edge.targetId.startsWith('edgeanchor:')) {
      if (!source) return null;
      const hostId = edge.targetId.slice('edgeanchor:'.length);
      const host = this.scene.edges.find((e) => e.id === hostId);
      const hostPts = host && host.id !== edge.id ? this.edgePolyline(host) : null;
      if (!hostPts || hostPts.length < 2) return null;
      const mid = polylineMidpoint(hostPts);
      return [this.borderPoint(source, mid.x, mid.y), mid];
    }
    const target = this.scene.nodes.find((n) => n.id === edge.targetId);
    if (!source || !target) return null;
    const waypoints =
      this._wpDrag && this._wpDrag.edgeId === edge.id
        ? this._wpDrag.points
        : this.edgePoints[edge.id] ?? [];
    const sp = this.nodePos(source);
    const tp = this.nodePos(target);
    if (!waypoints.length) {
      // ArchiMate mode uses Archi's default "Manual" router: a straight line between
      // the two boxes (clipped to their borders), even if it crosses other figures.
      if (this.archimate) {
        return [this.borderPoint(source, tp.x, tp.y), this.borderPoint(target, sp.x, sp.y)];
      }
      // Otherwise route orthogonally — horizontal/vertical segments, a straight
      // diagonal only when the boxes leave no clean path.
      return orthogonalRoute(
        { x: sp.x, y: sp.y, w: source.w, h: source.h },
        { x: tp.x, y: tp.y, w: target.w, h: target.h },
        this.edgeOffset(edge),
      );
    }
    const firstTowards = waypoints[0];
    const lastTowards = waypoints[waypoints.length - 1];
    const a = this.orthoBorderPoint(source, firstTowards.x, firstTowards.y);
    const b = this.orthoBorderPoint(target, lastTowards.x, lastTowards.y);
    return [a, ...waypoints, b];
  }

  // ---- edge waypoints (split & adjust) -------------------------------------

  private startWaypointDrag(edge: SceneEdge, points: Point[], index: number): void {
    this._wpDrag = { edgeId: edge.id, points, index };
    const origin = points[index];
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      if (!this._wpDrag) return;
      const p = this.toScene(ev);
      // Same threshold as creating a bend: the jitter of a click (or of a
      // double click heading for removeWaypoint) must not count as a drag.
      if (!moved && Math.hypot(p.x - origin.x, p.y - origin.y) < 4 / this._t.k) return;
      moved = true;
      const next = [...this._wpDrag.points];
      next[this._wpDrag.index] = p;
      this._wpDrag = { ...this._wpDrag, points: next };
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      // Only a genuine drag rewrites geometry; a plain click that merely selects
      // an existing waypoint changes nothing.
      if (this._wpDrag && moved) {
        this.emit('edge-points-changed', { id: this._wpDrag.edgeId, points: this._wpDrag.points });
      }
      this._wpDrag = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  /** Index of the polyline segment nearest to point `p`. */
  private nearestSegment(pts: Point[], p: Point): number {
    let best = { seg: 0, dist: Infinity };
    for (let i = 0; i < pts.length - 1; i++) {
      const { dist } = pointToSegment(p, pts[i], pts[i + 1]);
      if (dist < best.dist) best = { seg: i, dist };
    }
    return best.seg;
  }

  /**
   * Archi's bend-point creation handle: grabbing the hollow midpoint circle of
   * segment `seg` births a bend once the pointer moves, then drags it. A plain
   * click leaves the line straight (so the handle just previews where a bend goes).
   */
  private beginBendDrag(e: PointerEvent, edge: SceneEdge, seg: number): void {
    if (e.button !== 0) return;
    e.stopPropagation();
    const start = this.toScene(e);
    let created = false;
    const onMove = (ev: PointerEvent) => {
      if ((ev.buttons & 1) === 0) { onUp(); return; }
      const p = this.toScene(ev);
      if (!created) {
        if (Math.hypot(p.x - start.x, p.y - start.y) < 4 / this._t.k) return;
        created = true;
        this.focus();
        const waypoints = [...(this.edgePoints[edge.id] ?? [])];
        waypoints.splice(seg, 0, p);
        this._selectedWaypoint = { edgeId: edge.id, index: seg };
        this._wpDrag = { edgeId: edge.id, points: waypoints, index: seg };
      } else if (this._wpDrag) {
        const next = [...this._wpDrag.points];
        next[seg] = p;
        this._wpDrag = { ...this._wpDrag, points: next };
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (this._wpDrag && created) this.emit('edge-points-changed', { id: this._wpDrag.edgeId, points: this._wpDrag.points });
      this._wpDrag = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  /** Drop bendpoints that ended up on a straight segment (after moving a node or waypoints). */
  private pruneCollinearWaypoints(): void {
    if (this._wpDrag || this._dragPos || this._dragGroup || this._resize) return;
    const TOL = 3;
    for (const edge of this.scene.edges) {
      let list = this.edgePoints[edge.id];
      if (!list?.length) continue;
      const source = this.scene.nodes.find((n) => n.id === edge.sourceId);
      const target = this.scene.nodes.find((n) => n.id === edge.targetId);
      if (!source || !target) continue;
      let changed = false;
      for (;;) {
        if (!list.length) break;
        const a = this.orthoBorderPoint(source, list[0].x, list[0].y);
        const b = this.orthoBorderPoint(target, list[list.length - 1].x, list[list.length - 1].y);
        const poly = [a, ...list, b];
        let rm = -1;
        for (let i = 0; i < list.length; i++) {
          if (perpDist(poly[i], poly[i + 1], poly[i + 2]) < TOL) { rm = i; break; }
        }
        if (rm < 0) break;
        list = list.filter((_, j) => j !== rm);
        changed = true;
      }
      if (changed) this.emit('edge-points-changed', { id: edge.id, points: list, auto: true });
    }
  }

  /** Insert a new bend on `edge` at scene point `at`, selecting it. */
  private addWaypointAt(edge: SceneEdge, pts: Point[], at: Point): void {
    const seg = this.nearestSegment(pts, at);
    const waypoints = [...(this.edgePoints[edge.id] ?? [])];
    waypoints.splice(seg, 0, at); // a waypoint at index w sits between pts[w] and pts[w+1]
    this._selectedWaypoint = { edgeId: edge.id, index: seg };
    this.emit('edge-points-changed', { id: edge.id, points: waypoints });
  }

  /**
   * Dragging along a selected edge splits it: a bend is born once the pointer
   * actually moves, then follows the cursor. A plain click (no movement) leaves
   * the line alone so it just selects — and so a double-click can add a point.
   */
  private onEdgeHitPointerDown(e: PointerEvent, edge: SceneEdge, pts: Point[]): void {
    if (e.button !== 0 || (e.buttons & 1) === 0 || this.selectedId !== edge.id) return;
    e.stopPropagation();
    const start = this.toScene(e);
    const seg = this.nearestSegment(pts, start);
    let created = false;
    const onMove = (ev: PointerEvent) => {
      if ((ev.buttons & 1) === 0) {
        onUp();
        return;
      }
      const p = this.toScene(ev);
      if (!created) {
        if (Math.hypot(p.x - start.x, p.y - start.y) < 4 / this._t.k) return;
        created = true;
        this.focus();
        const waypoints = [...(this.edgePoints[edge.id] ?? [])];
        waypoints.splice(seg, 0, p);
        this._selectedWaypoint = { edgeId: edge.id, index: seg };
        this._wpDrag = { edgeId: edge.id, points: waypoints, index: seg };
      } else if (this._wpDrag) {
        const next = [...this._wpDrag.points];
        next[seg] = p;
        this._wpDrag = { ...this._wpDrag, points: next };
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (created && this._wpDrag) {
        this.emit('edge-points-changed', { id: this._wpDrag.edgeId, points: this._wpDrag.points });
      }
      this._wpDrag = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  private removeWaypoint(edge: SceneEdge, index: number): void {
    const points = [...(this.edgePoints[edge.id] ?? [])];
    points.splice(index, 1);
    this.emit('edge-points-changed', { id: edge.id, points });
  }

  /** The interactive half of an edge: the fat invisible hit line (select, bend, drag). */
  private renderEdgeHit(edge: SceneEdge, pts: Point[]): TemplateResult | typeof svg.prototype {
    const hitPoints = pts.map((p) => `${p.x},${p.y}`).join(' ');
    return svg`
      <g data-edge-id=${edge.id}>
        <polyline class="edge-hit" points=${hitPoints}
              fill="none" stroke="transparent" stroke-width="14"
              pointer-events=${this.tool.kind === 'select' ? 'stroke' : 'none'}
              @click=${(e: MouseEvent) => {
                e.stopPropagation();
                this.focus();
                this.emit('element-selected', { elementType: 'edge', id: edge.id, kind: edge.kind });
              }}
              @dblclick=${(e: MouseEvent) => {
                e.stopPropagation();
                this.focus();
                this.addWaypointAt(edge, pts, this.toScene(e));
              }}
              @pointerdown=${(e: PointerEvent) => this.onEdgeHitPointerDown(e, edge, pts)}>
          ${edge.tooltip ? svg`<title>${edge.tooltip}</title>` : ''}
        </polyline>
      </g>`;
  }

  /**
   * The visible half (stroke, arrow, label, waypoint handles), painted in a layer
   * ABOVE every node so a line is never hidden — without stealing the nodes'
   * pointer events: only the label and the waypoint handles are interactive.
   */
  private renderEdgeInk(
    edge: SceneEdge,
    pts: Point[],
    priorSegments: [Point, Point][],
  ): TemplateResult | typeof svg.prototype {
    const color = this.edgeColor(edge);
    const selected = this.selectedId === edge.id;
    // A line belongs to a rubber-band selection when both its endpoints do, so
    // boxing a region highlights the sub-graph, not just its nodes.
    const highlighted =
      selected ||
      (this.selectedIds.includes(edge.sourceId) && this.selectedIds.includes(edge.targetId));
    const midIndex = Math.floor((pts.length - 1) / 2);
    const mid = {
      x: (pts[midIndex].x + pts[midIndex + 1].x) / 2,
      y: (pts[midIndex].y + pts[midIndex + 1].y) / 2,
    };
    const waypoints = pts.slice(1, -1);
    // Spotlight in effect and this edge isn't one of the hovered node's own.
    const faded = this.spotlighting && !this._focusEdges.has(edge.id);
    return svg`
      <g data-edge-ink=${edge.id} pointer-events="none" opacity=${edge.dim ? 0.18 : faded ? 0.1 : edge.faint ? 0.4 : 1}>
        <path d=${this.archimate ? roundedOrthoPath(pts) : pathWithBridges(pts, priorSegments)}
              fill="none"
              stroke=${color} stroke-width=${highlighted ? 3 : 1.6}
              stroke-dasharray=${edge.dashArray ?? (edge.dashed ? '6 4' : '')}
              opacity="0.92"
              marker-start=${edge.markerStart
                ? `url(#${edge.markerStart}-${this.markerId(color)})`
                : edge.kind === 'contains' ? `url(#diamond-${this.markerId(color)})` : ''}
              marker-end=${edge.markerEnd
                ? `url(#${edge.markerEnd}-${this.markerId(color)})`
                : edge.arrow ? `url(#arrow-${this.markerId(color)})` : ''}></path>
        ${edge.kind === 'influence'
          ? svg`<text x=${mid.x + 11} y=${mid.y + 4} text-anchor="middle" font-size="12" font-weight="700"
                  fill=${color} paint-order="stroke" stroke="var(--modux-canvas-bg, #fafafa)" stroke-width="3"
                  pointer-events="none">±</text>`
          : ''}
        ${edge.label
          ? svg`<text x=${mid.x} y=${mid.y - 6} text-anchor="middle"
                  style="cursor: pointer" pointer-events="all"
                  font-size="11" font-family="ui-sans-serif, system-ui" fill=${color}
                  paint-order="stroke" stroke="var(--modux-canvas-bg, #fafafa)" stroke-width="3"
                  @click=${(e: MouseEvent) => {
                    e.stopPropagation();
                    this.focus();
                    this.emit('element-selected', { elementType: 'edge', id: edge.id, kind: edge.kind });
                  }}
                  @dblclick=${(e: MouseEvent) => {
                    e.stopPropagation();
                    this.emit('element-activated', {
                      elementType: 'edge',
                      id: edge.id,
                      kind: edge.kind,
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}>
                  ${edge.label}
                </text>`
          : ''}
        ${selected
          ? waypoints.map((p, i) => {
              const wpSelected =
                this._selectedWaypoint?.edgeId === edge.id && this._selectedWaypoint.index === i;
              return svg`
                <circle data-waypoint cx=${p.x} cy=${p.y} r=${wpSelected ? 6 : 5}
                        style=${'cursor: move; fill: ' + (this.archimate ? '#0000FF' : 'var(--modux-primary, #2563eb)')
                          + '; stroke: ' + (wpSelected ? '#1e293b' : 'var(--modux-surface, #ffffff)')}
                        stroke-width="1.6" pointer-events="all"
                        @pointerdown=${(e: PointerEvent) => {
                          if (e.button !== 0) return;
                          e.stopPropagation();
                          this.focus();
                          this._selectedWaypoint = { edgeId: edge.id, index: i };
                          this.startWaypointDrag(edge, [...(this.edgePoints[edge.id] ?? [])], i);
                        }}
                        @dblclick=${(e: MouseEvent) => {
                          e.stopPropagation();
                          this.removeWaypoint(edge, i);
                        }}>
                  <title>${t('canvas.waypoint.tooltip')}</title>
                </circle>`;
            })
          : ''}
        ${selected && this.archimate
          ? pts.slice(0, -1).map((_p, i) => {
              const mx = (pts[i].x + pts[i + 1].x) / 2;
              const my = (pts[i].y + pts[i + 1].y) / 2;
              return svg`<circle data-bend-create cx=${mx} cy=${my} r="4.5"
                  fill="var(--modux-canvas-bg, #ffffff)" stroke="#0000FF" stroke-width="1.4"
                  pointer-events="all" style="cursor: crosshair"
                  @pointerdown=${(e: PointerEvent) => this.beginBendDrag(e, edge, i)}>
                  <title>${t('canvas.bendpoint.tooltip')}</title></circle>`;
            })
          : ''}
      </g>
    `;
  }

  private markerId(color: string): string {
    return color.replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * The edge's concrete color: its authored color, or the theme's --modux-edge
   * resolved through getComputedStyle — a var() can't feed markerId() or the
   * url(#…) marker references.
   */
  private edgeColor(edge: SceneEdge): string {
    return (
      edge.color ?? (getComputedStyle(this).getPropertyValue('--modux-edge').trim() || '#64748b')
    );
  }

  private _measureCtx: CanvasRenderingContext2D | null | undefined;
  private measureLabel(text: string, font: string): number {
    if (this._measureCtx === undefined) this._measureCtx = document.createElement('canvas').getContext('2d');
    if (!this._measureCtx) return text.length * 7.3; // headless fallback
    this._measureCtx.font = font;
    return this._measureCtx.measureText(text).width;
  }

  /** Tooltip of a node's connect handle: what dragging it to another element does. */
  private handleTooltip(node: SceneNode, isChild: boolean): string {
    if (!isChild) {
      switch (node.kind) {
        case 'note': return t('canvas.handle.note');
        case 'service': return t('canvas.handle.service');
        case 'boundedContext': return t('canvas.handle.boundedContext');
        case 'actor': return t('canvas.handle.actor');
        case 'ai-agent': return t('canvas.handle.aiAgent');
        case 'mcp-gateway': return t('canvas.handle.mcpGateway');
        case 'rag': return t('canvas.handle.rag');
        case 'workflow-step': return t('canvas.handle.workflowStep');
        case 'external-system': return t('canvas.handle.externalSystem');
        case 'api': return t('canvas.handle.api');
        case 'proxy-api': return t('canvas.handle.proxyApi');
        case 'workflow': return t('canvas.handle.workflow');
        default: return t('canvas.handle.default');
      }
    }
    switch (node.kind) {
      case 'api': return t('canvas.handle.childApi');
      case 'proxy-api': return t('canvas.handle.childProxyApi');
      case 'domain-event':
      case 'application-event': return t('canvas.handle.childEvent');
      case 'external-use-case':
      case 'external-table': return t('canvas.handle.childExternalSource');
      case 'api-operation': return t('canvas.handle.childApiOperation');
      case 'api-op-occurrence': return t('canvas.handle.childApiOpOccurrence');
      case 'use-case': return t('canvas.handle.childUseCase');
      default: return t('canvas.handle.childDefault');
    }
  }

  /** Label clipped with an ellipsis so it never spills past `maxW` px of its box. */
  private fitLabel(label: string, maxW: number, font = '600 13px ui-sans-serif, system-ui'): string {
    if (maxW <= 0 || this.measureLabel(label, font) <= maxW) return label;
    let lo = 0;
    let hi = label.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.measureLabel(`${label.slice(0, mid)}…`, font) <= maxW) lo = mid;
      else hi = mid - 1;
    }
    return lo > 0 ? `${label.slice(0, lo)}…` : '…';
  }

  private renderNode(node: SceneNode): TemplateResult | typeof svg.prototype {
    const { x, y } = this.nodePos(node);
    const selected = this.selectedId === node.id || this.selectedIds.includes(node.id);
    const hovered = this._hoverNodeId === node.id;
    // Tool-mode target feedback. Archi highlights the source and any VALID hovered
    // target in pure blue; an invalid target isn't highlighted (the cursor turns to
    // "no-drop" instead). Off-notation mode keeps the green/red affordance.
    const hl = this.archimate ? '#0000FF' : '#2563eb';
    let toolStroke: string | null = null;
    if (this.tool.kind === 'connect') {
      if (node.id === this._connectSource) toolStroke = hl;
      else if (node.id === this._toolHover) {
        const src = this.nodeById(this._connectSource);
        const ok = !src || !this.connectValidator || this.connectValidator(src.kind, node.kind, this.tool.rel);
        toolStroke = ok ? (this.archimate ? hl : '#16a34a') : (this.archimate ? null : '#dc2626');
      }
    }
    // Spotlight in effect and this node is outside the hovered neighbourhood.
    const faded = this.spotlighting && !this._focusNodes.has(node.id);
    const isContainer = !!node.container;
    const isChild = !!node.parentId;
    // A container previews its in-progress size while being resized.
    const rw = this._resize?.id === node.id ? this._resize.w : node.w;
    const rh = this._resize?.id === node.id ? this._resize.h : node.h;
    const hw = rw / 2;
    const hh = rh / 2;
    const childLabel =
      isChild && node.label.length > 14 ? `${node.label.slice(0, 13)}…` : node.label;
    // Derived nodes (machine-made stubs) carry the ✦ mark and say so in their tooltip.
    const tooltip = node.derived
      ? `${node.tooltip ? `${node.tooltip} — ` : ''}${t('canvas.node.derivedTooltip')}`
      : node.tooltip;
    // Archi's "boxed" notation: EVERY element is a plain rectangle with its type icon
    // in the top-right corner and the name at the top — no distinctive silhouettes.
    const nodeFill = node.fill ?? (node.kind === 'note' ? 'var(--modux-note-fill, #fef9c3)' : 'var(--modux-node-fill, #ffffff)');
    const nodeStroke = toolStroke ?? (hovered || selected ? hl : this.archimate ? '#5C5C5C' : (node.stroke ?? 'var(--modux-node-stroke, #94a3b8)'));
    const nodeStrokeW = toolStroke ? 2 : selected || hovered ? 2 : this.archimate ? 1 : 1.4;
    const amRx = this.archimate ? 2 : isChild ? 6 : 10;
    const amLabelY = -hh + 17;
    // ArchiMate Junction: a small filled dot (AND) or hollow dot (OR) — no label/icon.
    if (this.archimate && node.kind === 'junction') {
      const jStroke = toolStroke ?? (hovered || selected ? hl : '#5C5C5C');
      return svg`
        <g data-node-id=${node.id} transform="translate(${x}, ${y})"
           @pointerenter=${() => this.setFocusNode(node.id)}
           @pointerleave=${() => this.setFocusNode(null)}
           @pointerdown=${(e: PointerEvent) => this.onNodePointerDown(e, node)}>
          <circle r="7" fill=${node.tooltip === 'or' ? '#ffffff' : '#000000'}
                  stroke=${jStroke} stroke-width=${selected || hovered ? 2 : 1}></circle>
          ${selected ? svg`<rect x="-11" y="-11" width="22" height="22" fill="none" stroke=${hl} stroke-width="1" stroke-dasharray="3 2"></rect>` : ''}
        </g>`;
    }
    return svg`
      <g data-node-id=${node.id}
         opacity=${node.dim ? 0.25 : faded ? 0.16 : 1}
         transform="translate(${x}, ${y})${hovered ? ' scale(1.06)' : ''}"
         pointer-events=${(this._dragPos && this._dragPos.id === node.id) ||
           this._dragGroup?.has(node.id)
             ? 'none'
             : 'auto'}
         @pointerenter=${() => this.setFocusNode(node.id)}
         @pointerleave=${() => this.setFocusNode(null)}
         @pointerdown=${(e: PointerEvent) => this.onNodePointerDown(e, node)}
         @dblclick=${(e: MouseEvent) => {
           e.stopPropagation();
           this.emit('element-activated', { elementType: 'node', id: node.id, kind: node.kind });
         }}>
        ${node.diffKind
          ? svg`<rect x=${-hw - 4} y=${-hh - 4} width=${rw + 8} height=${rh + 8}
                  rx=${isChild ? 9 : 13} fill="none" pointer-events="none"
                  stroke=${node.diffKind === 'ADDED' ? '#16a34a' : '#d97706'}
                  stroke-width="2" stroke-dasharray="7 4" opacity="0.9">
                <title>${node.diffKind === 'ADDED'
                  ? t('canvas.node.diffAdded')
                  : t('canvas.node.diffModified')}</title>
              </rect>`
          : ''}
        <rect x=${-hw} y=${-hh} width=${rw} height=${rh} rx=${amRx}
              style=${`fill: ${nodeFill}; stroke: ${nodeStroke}`}
              stroke-width=${nodeStrokeW} stroke-dasharray=${node.dashed ? '6 4' : ''}>
          ${tooltip ? svg`<title>${tooltip}</title>` : ''}</rect>
        ${node.derived
          ? svg`<text x=${-hw + 5} y=${-hh + 13} font-size="10" style="fill: var(--modux-derive, #a855f7)"
                  pointer-events="none">✦</text>`
          : ''}
        ${node.badge
          ? svg`<text x=${-hw} y=${-hh - 7} font-size="10" font-family="ui-sans-serif, system-ui"
                  style="fill: var(--modux-text-dim, #64748b)" letter-spacing="0.08em">${node.badge}</text>`
          : ''}
        ${node.collapsible
          ? svg`<g transform="translate(${hw - 13}, ${-hh + 13})"
                  style="cursor: pointer" pointer-events="all"
                  @pointerdown=${(e: PointerEvent) => {
                    e.stopPropagation();
                    this.emit('node-collapse-toggled', { id: node.id });
                  }}
                  @click=${(e: MouseEvent) => e.stopPropagation()}>
                  <rect data-collapse-toggle x="-10" y="-11" width="20" height="20" rx="4"
                        fill="transparent"></rect>
                  <text text-anchor="middle" y="4" font-size="12" style="fill: var(--modux-text-dim, #475569)"
                        pointer-events="none">${node.collapsed ? '▸' : '▾'}</text>
                  <title>${node.collapsed
                    ? t('canvas.node.expand')
                    : t('canvas.node.collapse')}</title>
                </g>`
          : ''}
        ${node.symbol && SYMBOLS[node.symbol] && (!isChild || isContainer || this.archimate)
          ? svg`<g transform="translate(${hw - (node.collapsible ? 40 : 22)}, ${-hh + 5}) scale(${this.archimate ? 1.45 : 1})" fill="none"
                  style=${'stroke: ' + (this.archimate ? '#475569' : (node.stroke ?? 'var(--modux-node-stroke, #64748b)'))}
                  stroke-width=${this.archimate ? 1 : 1.1} stroke-linejoin="round"
                  stroke-linecap="round" pointer-events="none">
                ${SYMBOLS[node.symbol]}
              </g>`
          : ''}
        ${isChild && !isContainer && !this.archimate && node.symbol && SYMBOLS[node.symbol]
          ? svg`<g transform="translate(${-hw + 8}, -6)" fill="none"
                  style=${'stroke: ' + (node.stroke ?? 'var(--modux-node-stroke, #64748b)')}
                  stroke-width="1.2" stroke-linejoin="round"
                  stroke-linecap="round" pointer-events="none">
                ${SYMBOLS[node.symbol]}
              </g>`
          : ''}
        ${this._editingId === node.id
          ? svg`
              <foreignObject x=${-hw + 6} y=${isContainer ? -hh + 6 : -14} width=${node.w - 12} height="28">
                <input
                  style="width: 100%; box-sizing: border-box; font: 600 13px ui-sans-serif, system-ui; text-align: ${isContainer ? 'left' : 'center'}; border: 1px solid var(--modux-primary, #2563eb); border-radius: 4px; padding: 3px; background: var(--modux-input-bg, #ffffff); color: var(--modux-text, #334155);"
                  .value=${node.label}
                  @pointerdown=${(e: PointerEvent) => e.stopPropagation()}
                  @keydown=${(e: KeyboardEvent) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') this.commitRename(node, (e.target as HTMLInputElement).value);
                    if (e.key === 'Escape') this._editingId = null;
                  }}
                  @blur=${(e: FocusEvent) =>
                    this.commitRename(node, (e.target as HTMLInputElement).value)}
                />
              </foreignObject>`
          : isChild && !isContainer && !this.archimate
            ? svg`<text x=${-hw + 24} y="4" text-anchor="start" font-size="12" font-weight="600"
                font-family="ui-sans-serif, system-ui" style="fill: var(--modux-text, #1e293b)" pointer-events="none">${childLabel}</text>`
            : isContainer
              ? svg`<text x=${-hw + 12} y=${-hh + 21} text-anchor="start" font-size="13"
                  font-weight="700" font-family="ui-sans-serif, system-ui" style="fill: var(--modux-text, #1e293b)">${node.label}</text>`
              : node.kind === 'area'
                ? '' // a bare rectangle: its name only shows as tooltip (F2 still edits it)
                : svg`<text x="0" y=${this.archimate ? amLabelY : 4} text-anchor="middle"
                  font-size=${this.archimate ? 12 : 13} font-weight=${this.archimate ? '400' : '600'}
                  font-family="ui-sans-serif, system-ui" style="fill: var(--modux-text, #1e293b)">${this.fitLabel(node.label, rw - 22)}</text>`}
        ${isContainer
          ? svg`<line x1=${-hw + 8} y1=${-hh + 28} x2=${hw - 8} y2=${-hh + 28}
                style=${`stroke: ${this.archimate ? nodeStroke : 'var(--modux-border, #e2e8f0)'}`} stroke-width="1" pointer-events="none"></line>`
          : ''}
        ${this.archimate && isContainer && node.kind === 'component'
          ? svg`<g pointer-events="none" style=${`fill: ${nodeFill}; stroke: ${nodeStroke}`} stroke-width="1">
              <rect x=${-hw - 5} y=${-hh + 13} width="12" height="8"></rect>
              <rect x=${-hw - 5} y=${-hh + 27} width="12" height="8"></rect>
            </g>`
          : ''}
        ${selected &&
        this.connectable &&
        !this.archimate &&
        (isChild
          ? node.kind === 'menu-item' ||
            node.kind === 'menu-group' ||
            node.kind === 'wizard-step-row' ||
            node.kind === 'etl-flow' ||
            node.kind === 'scheduled-trigger' ||
            node.kind === 'aggregate' ||
            node.kind === 'domain-service' ||
            node.kind === 'use-case' ||
            node.kind === 'domain-event' ||
            node.kind === 'application-event' ||
            node.kind === 'integration-event' ||
            node.kind === 'external-use-case' ||
            node.kind === 'external-system' ||
            node.kind === 'system' ||
            node.kind === 'boundedContext' ||
            node.kind === 'external-table' ||
            node.kind === 'api-operation' ||
            node.kind === 'api-op-occurrence' ||
            node.kind === 'api' ||
            node.kind === 'api-impl' ||
            node.kind === 'proxy-api'
          : node.kind === 'note' ||
            node.kind === 'model' ||
            node.kind === 'identity-provider' ||
            node.kind === 'etl-flow' ||
            node.kind === 'boundedContext' ||
            node.kind === 'system' ||
            node.kind === 'cdc' ||
            node.kind === 'ui' ||
            node.kind === 'ui-app' ||
            node.kind === 'external-system' ||
            node.kind === 'actor' ||
            node.kind === 'ai-agent' ||
            node.kind === 'rag' ||
            node.kind === 'mcp-gateway' ||
            node.kind === 'api' ||
            node.kind === 'proxy-api' ||
            node.kind === 'workflow' ||
            node.kind === 'workflow-step' ||
            node.kind === 'page' ||
            node.kind === 'menu-item' ||
            // Archi style: the ex-nested kinds are free boxes now — same handles.
            node.kind === 'aggregate' ||
            node.kind === 'domain-service' ||
            node.kind === 'use-case' ||
            node.kind === 'domain-event' ||
            node.kind === 'application-event' ||
            node.kind === 'integration-event' ||
            node.kind === 'read-model' ||
            node.kind === 'query-service' ||
            node.kind === 'scheduled-trigger' ||
            node.kind === 'external-use-case' ||
            node.kind === 'external-table' ||
            node.kind === 'api-operation' ||
            node.kind === 'api-op-occurrence' ||
            node.kind === 'api-impl' ||
            node.kind === 'service')
          ? [
              [hw, 0],
              [-hw, 0],
              [0, hh],
              [0, -hh],
            ].map(
              ([cx, cy]) => svg`
                <circle data-handle cx=${cx} cy=${cy} r="6"
                        style="fill: var(--modux-primary, #2563eb); stroke: var(--modux-surface, #ffffff)"
                        stroke-width="1.5"
                        @pointerdown=${(e: PointerEvent) => this.onHandlePointerDown(e, node)}>
                  <title>${this.handleTooltip(node, isChild)}</title>
                </circle>`,
            )
          : ''}
        ${selected && this.connectable && node.extraHandles?.length
          ? node.extraHandles.map(
              (h, i) => svg`
                <g transform="translate(${-hw + 24 + i * 20}, ${-hh})">
                  <circle data-handle r="7" style=${'fill: ' + h.color + '; stroke: var(--modux-surface, #ffffff)'}
                          stroke-width="1.5"
                          @pointerdown=${(e: PointerEvent) => this.onHandlePointerDown(e, node, h.kind)}>
                    <title>${h.title}</title>
                  </circle>
                  <circle r="2.4" style="fill: var(--modux-surface, #ffffff)" pointer-events="none"></circle>
                </g>`,
            )
          : ''}
        ${(isContainer || node.resizable || this.archimate) && selected
          ? ((this.archimate
              ? [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]]
              : [[-1, -1], [1, -1], [-1, 1], [1, 1]]) as readonly (readonly [-1 | 0 | 1, -1 | 0 | 1])[]).map(
              ([sx, sy]) => {
                const hs = this.archimate ? 8 : 13;
                const cur = sx === 0 ? 'ns' : sy === 0 ? 'ew' : sx * sy > 0 ? 'nwse' : 'nesw';
                return svg`
                <rect data-resize x=${sx * hw - hs / 2} y=${sy * hh - hs / 2} width=${hs} height=${hs} rx=${this.archimate ? 1 : 2.5}
                      style=${'cursor: ' + cur + '-resize; fill: '
                        + (this.archimate ? (this.selectedId === node.id ? '#1e293b' : '#ffffff') : 'var(--modux-primary, #2563eb)')
                        + '; stroke: ' + (this.archimate ? '#5C5C5C' : 'var(--modux-surface, #ffffff)')}
                      stroke-width=${this.archimate ? 1 : 1.5}
                      @pointerdown=${(e: PointerEvent) => this.onResizePointerDown(e, node, sx, sy)}>
                  <title>${t('canvas.resize.tooltip')}</title>
                </rect>`;
              },
            )
          : ''}
      </g>
    `;
  }

  private renderPendingLink(): TemplateResult | typeof svg.prototype {
    if (!this._pendingLink) return svg``;
    const source = this.scene.nodes.find((n) => n.id === this._pendingLink!.sourceId);
    if (!source) return svg``;
    // No line while the pointer is still inside the source element.
    const sp = this.nodePos(source);
    if (Math.abs(this._pendingLink.x - sp.x) <= source.w / 2 && Math.abs(this._pendingLink.y - sp.y) <= source.h / 2) return svg``;
    const a = this.borderPoint(source, this._pendingLink.x, this._pendingLink.y);
    return svg`
      <line x1=${a.x} y1=${a.y} x2=${this._pendingLink.x} y2=${this._pendingLink.y}
            style="stroke: var(--modux-primary, #2563eb)" stroke-width="2" stroke-dasharray="4 4" pointer-events="none"></line>
    `;
  }

  // ---- rubber-band multi-selection ------------------------------------------

  private startRubberBand(e: PointerEvent): void {
    const origin = this.toScene(e);
    this._rubber = { a: origin, b: origin };
    let moved = false;
    const cancel = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', cancel);
      this._rubber = null;
    };
    const onMove = (ev: PointerEvent) => {
      // The button is no longer held: the pointerup was swallowed (a native popup,
      // window switch). End the gesture instead of chasing the mouse forever.
      if ((ev.buttons & 1) === 0) {
        cancel();
        return;
      }
      const p = this.toScene(ev);
      if (!moved && Math.hypot(p.x - origin.x, p.y - origin.y) < 4 / this._t.k) return;
      moved = true;
      this._rubber = { a: origin, b: p };
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', cancel);
      if (moved && this._rubber) {
        const { a, b } = this._rubber;
        const minX = Math.min(a.x, b.x);
        const maxX = Math.max(a.x, b.x);
        const minY = Math.min(a.y, b.y);
        const maxY = Math.max(a.y, b.y);
        const ids = this.scene.nodes
          .filter((n) => {
            const p = this.nodePos(n);
            return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
          })
          .map((n) => n.id);
        this.emit('nodes-boxed', { ids });
      } else {
        // A plain click on empty canvas clears the selection.
        this.emit('selection-cleared');
      }
      this._rubber = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', cancel);
  }

  private renderRubber(): TemplateResult | typeof svg.prototype {
    if (!this._rubber) return svg``;
    const { a, b } = this._rubber;
    return svg`
      <rect x=${Math.min(a.x, b.x)} y=${Math.min(a.y, b.y)}
            width=${Math.abs(b.x - a.x)} height=${Math.abs(b.y - a.y)}
            style="fill: var(--modux-primary-soft, rgba(37, 99, 235, 0.06)); stroke: var(--modux-primary, #2563eb)"
            stroke-width="1"
            stroke-dasharray="4 3" pointer-events="none"></rect>
    `;
  }

  // ---- minimap -------------------------------------------------------------

  private sceneBounds(padding = 40) {
    const nodes = this.scene.nodes;
    if (!nodes.length) return null;
    const minX = Math.min(...nodes.map((n) => n.x - n.w / 2)) - padding;
    const maxX = Math.max(...nodes.map((n) => n.x + n.w / 2)) + padding;
    const minY = Math.min(...nodes.map((n) => n.y - n.h / 2)) - padding;
    const maxY = Math.max(...nodes.map((n) => n.y + n.h / 2)) + padding;
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  }

  private centerViewportOn(sceneX: number, sceneY: number): void {
    const svgEl = this.renderRoot.querySelector('svg.main') as SVGSVGElement | null;
    if (!svgEl || !this._zoomBehavior) return;
    const rect = this.getBoundingClientRect();
    const k = this._t.k;
    const t = zoomIdentity.translate(rect.width / 2 - k * sceneX, rect.height / 2 - k * sceneY).scale(k);
    select(svgEl).call(this._zoomBehavior.transform, t);
  }

  private onMinimapPointer(e: PointerEvent, bounds: NonNullable<ReturnType<typeof this.sceneBounds>>, scale: number): void {
    const box = (e.currentTarget as Element).getBoundingClientRect();
    const sceneX = bounds.minX + (e.clientX - box.left) / scale;
    const sceneY = bounds.minY + (e.clientY - box.top) / scale;
    this.centerViewportOn(sceneX, sceneY);
  }

  private renderMinimap(): TemplateResult | typeof svg.prototype {
    const bounds = this.sceneBounds();
    if (!bounds || this.scene.nodes.length < 2) return html``;
    const MW = 160;
    const MH = 110;
    const scale = Math.min(MW / bounds.w, MH / bounds.h);
    // Remember the projection so applyViewportTransform() can move the viewport box on its own.
    this._minimapGeom = { minX: bounds.minX, minY: bounds.minY, scale };
    const rect = this.getBoundingClientRect();
    // visible scene area under the current transform
    const vx = (0 - this._t.x) / this._t.k;
    const vy = (0 - this._t.y) / this._t.k;
    const vw = rect.width / this._t.k;
    const vh = rect.height / this._t.k;
    return html`
      <div
        class="minimap"
        title=${t('canvas.minimap.tooltip')}
        @pointerdown=${(e: PointerEvent) => {
          e.stopPropagation();
          try {
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
          } catch {
            /* synthetic or stale pointer id — dragging just won't track */
          }
          this.onMinimapPointer(e, bounds, scale);
        }}
        @pointermove=${(e: PointerEvent) => {
          if ((e.currentTarget as Element).hasPointerCapture?.(e.pointerId)) {
            this.onMinimapPointer(e, bounds, scale);
          }
        }}
      >
        <svg viewBox="0 0 ${MW} ${MH}">
          ${this.scene.nodes.map((n) => {
            const p = this.nodePos(n);
            return svg`<rect
              x=${(p.x - n.w / 2 - bounds.minX) * scale}
              y=${(p.y - n.h / 2 - bounds.minY) * scale}
              width=${Math.max(2, n.w * scale)}
              height=${Math.max(2, n.h * scale)}
              rx="1" style=${'fill: ' + (n.fill ?? 'var(--modux-border, #e2e8f0)') + '; stroke: var(--modux-node-stroke, #94a3b8)'}
              stroke-width="0.4"></rect>`;
          })}
          <rect
            class="minimap-viewport"
            x=${(vx - bounds.minX) * scale}
            y=${(vy - bounds.minY) * scale}
            width=${vw * scale}
            height=${vh * scale}
            style="fill: var(--modux-primary-soft, rgba(37, 99, 235, 0.08)); stroke: var(--modux-primary, #2563eb)"
            stroke-width="1"></rect>
        </svg>
      </div>
    `;
  }

  render() {
    const colors = [...new Set(this.scene.edges.map((e) => this.edgeColor(e)))];
    // Edges render in order; each one bridges over the segments drawn before it.
    const priorSegments: [Point, Point][] = [];
    const edgeHits: (TemplateResult | typeof svg.prototype)[] = [];
    const edgeInks: (TemplateResult | typeof svg.prototype)[] = [];
    this.scene.edges.forEach((edge) => {
      const pts = this.edgePolyline(edge);
      if (!pts) return;
      edgeHits.push(this.renderEdgeHit(edge, pts));
      edgeInks.push(this.renderEdgeInk(edge, pts, [...priorSegments]));
      for (let i = 0; i < pts.length - 1; i++) priorSegments.push([pts[i], pts[i + 1]]);
    });
    // Paint by nesting depth so every container stays BEHIND its descendants
    // (a parent can never cover its children, at any nesting level).
    const byId = new Map(this.scene.nodes.map((n) => [n.id, n]));
    const depthOf = (n: SceneNode) => {
      let d = 0;
      for (let p = n.parentId; p; p = byId.get(p)?.parentId) { if (++d > 50) break; }
      return d;
    };
    const orderedNodes = this.scene.nodes
      .map((n, i) => ({ n, i, d: depthOf(n) }))
      .sort((a, b) => a.d - b.d || a.i - b.i)
      .map((x) => x.n);
    return html`
      <svg
        class="main ${this._pendingLink || this.tool.kind === 'connect' ? 'linking' : ''} ${this.tool.kind === 'place' ? 'placing' : ''} ${this.toolForbidden() ? 'forbidden' : ''} ${this._spaceDown ? 'panning' : ''}"
        @pointermove=${(e: PointerEvent) => {
          if (this.tool.kind === 'connect') this._toolHover = this.nodeIdAt(e);
          else if (this.tool.kind === 'place') this._ghost = this.toScene(e);
        }}
        @pointerdown=${(e: PointerEvent) => {
          const target = e.target as Element;
          if (target.closest('[data-node-id]') || target.closest('[data-edge-id]')) return;
          if (this._spaceDown || e.button !== 0) return; // space+drag pans (d3-zoom)
          // A native <select> popup over the canvas can leak a ghost pointerdown with
          // no button actually held — it must not start a gesture that never ends.
          if ((e.buttons & 1) === 0) return;
          if (this.tool.kind === 'place') {
            // Click drops at default size; drag defines the box size (Archi's gesture).
            const { nodeKind, w: dw, h: dh } = this.tool;
            const s = this.toScene(e);
            this._placeDrag = { x0: s.x, y0: s.y, x1: s.x, y1: s.y };
            const onMove = (ev: PointerEvent) => {
              const q = this.toScene(ev);
              if (this._placeDrag) this._placeDrag = { ...this._placeDrag, x1: q.x, y1: q.y };
            };
            const onUp = () => {
              window.removeEventListener('pointermove', onMove);
              window.removeEventListener('pointerup', onUp);
              const d = this._placeDrag;
              this._placeDrag = null;
              if (!d) return;
              const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
              if (w > 12 && h > 12) {
                this.emit('place-requested', { nodeKind, w: Math.round(w), h: Math.round(h), x: snapValue((d.x0 + d.x1) / 2), y: snapValue((d.y0 + d.y1) / 2) });
              } else {
                this.emit('place-requested', { nodeKind, w: dw, h: dh, x: snapValue(d.x0), y: snapValue(d.y0) });
              }
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            return;
          }
          if (this.tool.kind === 'connect') {
            if (this._connectSource && this.tool.rel === null)
              this.emit('connect-on-empty', { sourceId: this._connectSource, x: e.clientX, y: e.clientY, sceneX: this.toScene(e).x, sceneY: this.toScene(e).y });
            this.endConnectTracking();
            return;
          }
          this.startRubberBand(e);
        }}
      >
        <defs>
          <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" style="fill: var(--modux-dots, #e2e8f0)"></circle>
          </pattern>
          ${colors.map(
            (c) => svg`
              <marker id="arrow-${this.markerId(c)}" viewBox="0 0 10 10" refX="9" refY="5"
                      markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill=${c}></path>
              </marker>
              <marker id="diamond-${this.markerId(c)}" viewBox="0 0 12 8" refX="1" refY="4"
                      markerWidth="12" markerHeight="8" orient="auto">
                <path d="M 1 4 L 6 1 L 11 4 L 6 7 z" fill=${c}></path>
              </marker>
              <marker id="diamond-hollow-${this.markerId(c)}" viewBox="0 0 12 8" refX="1" refY="4"
                      markerWidth="12" markerHeight="8" orient="auto">
                <path d="M 1 4 L 6 1 L 11 4 L 6 7 z" fill="var(--modux-canvas-bg, #fafafa)" stroke=${c} stroke-width="1"></path>
              </marker>
              <marker id="ball-${this.markerId(c)}" viewBox="0 0 8 8" refX="4" refY="4"
                      markerWidth="7" markerHeight="7" orient="auto">
                <circle cx="4" cy="4" r="3" fill=${c}></circle>
              </marker>
              <marker id="open-arrow-${this.markerId(c)}" viewBox="0 0 10 10" refX="9" refY="5"
                      markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 1 1 L 9 5 L 1 9" fill="none" stroke=${c} stroke-width="1.4"></path>
              </marker>
              <marker id="hollow-triangle-${this.markerId(c)}" viewBox="0 0 10 10" refX="9" refY="5"
                      markerWidth="9" markerHeight="9" orient="auto-start-reverse">
                <path d="M 1 1 L 9 5 L 1 9 z" fill="var(--modux-canvas-bg, #fafafa)" stroke=${c} stroke-width="1.2"></path>
              </marker>`,
          )}
        </defs>
        <g class="viewport" transform="translate(${this._t.x}, ${this._t.y}) scale(${this._t.k})">
          <rect x="-100000" y="-100000" width="200000" height="200000"
                fill=${this.archimate ? '#ffffff' : 'url(#dots)'}
                pointer-events="none"></rect>
          ${orderedNodes.map((n) => this.renderNode(n))}
          ${edgeHits}
          ${edgeInks}
          ${this.tool.kind === 'place' && this._placeDrag
            ? svg`<rect x=${Math.min(this._placeDrag.x0, this._placeDrag.x1)} y=${Math.min(this._placeDrag.y0, this._placeDrag.y1)}
                    width=${Math.abs(this._placeDrag.x1 - this._placeDrag.x0)} height=${Math.abs(this._placeDrag.y1 - this._placeDrag.y0)}
                    rx="2" pointer-events="none" fill="rgba(37,99,235,0.08)" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="6 4"></rect>`
            : this.tool.kind === 'place' && this._ghost
            ? svg`<rect x=${this._ghost.x - this.tool.w / 2} y=${this._ghost.y - this.tool.h / 2}
                    width=${this.tool.w} height=${this.tool.h} rx="10" pointer-events="none"
                    fill="rgba(37,99,235,0.08)" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="6 4"></rect>`
            : ''}
          ${this._menuSlots
            ? svg`<g pointer-events="none">
                ${this._menuSlots.slots.map(
                  (s, i) => svg`
                    <line x1=${s.x1} y1=${s.y} x2=${s.x2} y2=${s.y}
                          stroke=${i === this._menuSlots!.active ? '#0284c7' : '#bae6fd'}
                          stroke-width=${i === this._menuSlots!.active ? 3.5 : 1.5}
                          stroke-linecap="round"></line>
                    ${i === this._menuSlots!.active
                      ? svg`<circle cx=${s.x1} cy=${s.y} r="3.5" fill="#0284c7"></circle>
                          <circle cx=${s.x2} cy=${s.y} r="3.5" fill="#0284c7"></circle>`
                      : ''}`,
                )}
              </g>`
            : ''}
          ${this._guides
            ? svg`
                ${this._guides.v.map(
                  (x) => svg`<line x1=${x} y1="-100000" x2=${x} y2="100000"
                        style="stroke: var(--modux-guide, #ec4899)" stroke-width="1" pointer-events="none"></line>`,
                )}
                ${this._guides.h.map(
                  (y) => svg`<line x1="-100000" y1=${y} x2="100000" y2=${y}
                        style="stroke: var(--modux-guide, #ec4899)" stroke-width="1" pointer-events="none"></line>`,
                )}
              `
            : ''}
          ${this.renderPendingLink()}
          ${this.renderRubber()}
        </g>
        ${this.scene.nodes.length === 0
          ? svg`<text x="50%" y="45%" text-anchor="middle" font-size="15" style="fill: var(--modux-text-faint, #94a3b8)"
                    font-family="ui-sans-serif, system-ui" pointer-events="none">
                  <tspan x="50%">${t('canvas.empty.title')}</tspan>
                  <tspan x="50%" dy="1.5em">${t('canvas.empty.hint')}</tspan>
                </text>`
          : ''}
      </svg>
      ${this.renderMinimap()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'modux-canvas': ModuxCanvas;
  }
}
