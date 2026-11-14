import { LitElement, html, css, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Scene, SceneEdge, SceneNode } from './scene.js';
import { LanguageController, t } from './i18n/index.js';

/**
 * The Firefox-Tilt view of a diagram: the SAME Scene every view adapter already
 * produces, rendered as stacked 3D plates — containment depth becomes height
 * (a bounded context is the base plate, its chips float one storey above, an
 * API's operations one more), and the edges lie on the floor plane. Pure CSS 3D
 * (perspective + preserve-3d), no WebGL, no dependencies.
 *
 * A read-only lens: drag orbits, shift+drag pans, wheel zooms, double click
 * resets the camera. Editing stays in <modux-canvas>.
 */
/** Node kinds whose selected plate offers connect handles (mirror of the 2D canvas). */
const HANDLE_KINDS = new Set([
  'external-system', 'actor', 'ai-agent', 'rag', 'mcp-gateway', 'api', 'proxy-api',
  'workflow-step', 'aggregate', 'domain-service', 'use-case', 'domain-event',
  'application-event', 'external-use-case', 'external-table', 'mcp-server',
  'api-operation', 'page', 'menu-item',
]);

@customElement('modux-tilt')
export class ModuxTilt extends LitElement {
  readonly _i18n = new LanguageController(this);
  @property({ attribute: false }) scene: Scene = { nodes: [], edges: [] };
  /** Selection, owned by the shell (same contract as <modux-canvas>). */
  @property({ attribute: false }) selectedId: string | null = null;
  /** Whether connect gestures are legal on the current view (same flag as the canvas). */
  @property({ attribute: false }) connectable = false;

  /** Camera: orbit angles (deg), zoom and screen-space pan. */
  @state() private _rx = 55;
  @state() private _rz = -18;
  @state() private _k = 1;
  @state() private _pan = { x: 0, y: 0 };
  /** Space held: drags pan instead of orbiting (the 2D canvas convention). */
  private _space = false;
  /** A plate being dragged: its live scene-space offset until the drop commits. */
  @state() private _liveMove: { id: string; dx: number; dy: number } | null = null;
  /** A relation being traced: rubber line in screen space + the reacting target. */
  @state() private _connect: { sourceId: string; x1: number; y1: number; x2: number; y2: number } | null =
    null;
  @state() private _hoverTargetId: string | null = null;

  /** Multi-selection (rubber band): Supr deletes the lot, like the 2D canvas. */
  @state() private _selected = new Set<string>();

  /** Rubber-band selection in progress (host-local px). */
  @state() private _rubber: { x1: number; y1: number; x2: number; y2: number; additive: boolean } | null = null;

  /** Inline rename (F2): a floating input over the selected plate. */
  @state() private _renaming: { id: string; kind: string; value: string } | null = null;

  private _drag:
    | {
        mode: 'orbit' | 'pan' | 'node' | 'connect' | 'rubber';
        x: number;
        y: number;
        rx: number;
        rz: number;
        pan: { x: number; y: number };
        nodeId?: string;
        nodeKind?: string;
        moved?: boolean;
      }
    | null = null;
  /** The total scale used at the last render — needed to unproject pointer deltas. */
  private _kUsed = 1;
  /** The world center the last render pivoted on — needed to unproject absolute points. */
  private _center = { x: 0, y: 0 };

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(ellipse at 50% 30%, #1e293b 0%, #0f172a 70%);
      cursor: grab;
      user-select: none;
      touch-action: none;
    }
    :host(:active) {
      cursor: grabbing;
    }
    .stage {
      position: absolute;
      inset: 0;
      perspective: 1600px;
      perspective-origin: 50% 42%;
    }
    .world {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 0;
      height: 0;
      transform-style: preserve-3d;
    }
    .world,
    .world * {
      transform-style: preserve-3d;
    }
    .floor {
      position: absolute;
      overflow: visible;
      /* Shadows only — coplanar with the base plates, it must never win the hit test. */
      pointer-events: none;
    }
    .edge3 {
      position: absolute;
      height: 0;
      transform-origin: 0 50%;
      pointer-events: none;
    }
    .n3 {
      position: absolute;
      box-sizing: border-box;
      border: 1.6px solid;
      border-radius: 8px;
      font: 600 12px ui-sans-serif, system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2px 6px;
      overflow: hidden;
      cursor: move;
    }
    .n3.selected3 {
      outline: 2.5px solid #38bdf8;
      outline-offset: 2px;
    }
    .n3 {
      transition: transform 0.12s ease, box-shadow 0.12s ease;
    }
    .n3.hover3 {
      outline: 2.5px solid #34d399;
      outline-offset: 2px;
      z-index: 5;
    }
    .h3 {
      position: absolute;
      width: 12px;
      height: 12px;
      margin: -6px 0 0 -6px;
      border-radius: 999px;
      background: #2563eb;
      border: 1.5px solid #ffffff;
      cursor: crosshair;
    }
    /* The chevron folds/unfolds the plate — same sheet the canvas edits. */
    .chev3 {
      position: absolute;
      top: 1px;
      right: 4px;
      font-size: 11px;
      line-height: 1;
      padding: 3px 4px;
      color: #475569;
      cursor: pointer;
      user-select: none;
    }
    .chev3:hover {
      color: #0f172a;
    }
    /* An area: pure graphics — a dashed pane lying on the floor, untouchable. */
    .area3 {
      position: absolute;
      box-sizing: border-box;
      border: 1.6px dashed #94a3b8;
      border-radius: 10px;
      background: rgba(148, 163, 184, 0.14);
      transform: translateZ(0.6px);
      pointer-events: none;
    }
    .rubber {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 30;
    }
    .n3.container3 {
      align-items: flex-start;
      justify-content: flex-start;
      font-weight: 700;
      font-size: 13px;
      padding: 6px 10px;
    }
    .n3 .badge3 {
      position: absolute;
      top: -16px;
      left: 0;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.07em;
      color: #94a3b8;
      white-space: nowrap;
    }
    .lasso {
      position: absolute;
      z-index: 5;
      pointer-events: none;
      border: 1.2px dashed #38bdf8;
      background: rgba(56, 189, 248, 0.09);
      border-radius: 3px;
    }
    .rename3 {
      position: absolute;
      transform: translateX(-50%);
      z-index: 7;
      font: 12px system-ui, sans-serif;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1.5px solid #38bdf8;
      background: #0f172a;
      color: #e2e8f0;
      outline: none;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
    }
    .hud {
      /* right-aligned: the palette docks on the left and was covering it */
      position: absolute;
      right: 12px;
      bottom: 10px;
      max-width: 46%;
      text-align: right;
      font: 11px ui-sans-serif, system-ui, sans-serif;
      color: #94a3b8;
      pointer-events: none;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    // Focusable, so the editor-level shortcuts (V to leave, F, ?) keep working.
    this.tabIndex = 0;
    window.addEventListener('keydown', this.onSpaceKey);
    window.addEventListener('keyup', this.onSpaceKey);
    this.addEventListener('pointerdown', this.onDown);
    this.addEventListener('pointermove', this.onMove);
    this.addEventListener('pointerup', this.onUp);
    this.addEventListener('pointercancel', this.onUp);
    this.addEventListener('wheel', this.onWheel, { passive: false });
    this.addEventListener('dblclick', this.onDblClick);
    this.addEventListener('keydown', this.onKeydown);
  }

  disconnectedCallback(): void {
    window.removeEventListener('keydown', this.onSpaceKey);
    window.removeEventListener('keyup', this.onSpaceKey);
    this.removeEventListener('pointerdown', this.onDown);
    this.removeEventListener('pointermove', this.onMove);
    this.removeEventListener('pointerup', this.onUp);
    this.removeEventListener('pointercancel', this.onUp);
    this.removeEventListener('wheel', this.onWheel);
    this.removeEventListener('dblclick', this.onDblClick);
    this.removeEventListener('keydown', this.onKeydown);
    super.disconnectedCallback();
  }

  protected firstUpdated(): void {
    this.focus();
  }

  /** The plate under the pointer, if any (events retarget at the host boundary). */
  private plateAt(e: Event): HTMLElement | null {
    const el = e.composedPath()[0] as HTMLElement | undefined;
    return (el?.closest?.('.n3') as HTMLElement | null) ?? null;
  }

  /**
   * A pointer delta on screen → a delta on the floor plane: undo the zoom, the
   * rotateX foreshortening of the screen-Y axis, then the rotateZ bearing.
   */
  private unproject(dxScreen: number, dyScreen: number): { x: number; y: number } {
    const ux = dxScreen / this._kUsed;
    const uy = dyScreen / this._kUsed / Math.cos((this._rx * Math.PI) / 180);
    const rz = (this._rz * Math.PI) / 180;
    return {
      x: ux * Math.cos(rz) + uy * Math.sin(rz),
      y: -ux * Math.sin(rz) + uy * Math.cos(rz),
    };
  }

  /** The plate under a client point, if any (drops arrive as plain mouse coords). */
  nodeIdAtClient(clientX: number, clientY: number): string | null {
    const el = this.shadowRoot?.elementFromPoint(clientX, clientY) as HTMLElement | null;
    return (el?.closest?.('.n3') as HTMLElement | null)?.dataset.nodeId ?? null;
  }

  /**
   * A client point → the floor plane (z=0), exactly: rebuild the CSS projection
   * (perspective with its origin + the world transform) as a DOMMatrix and solve
   * the 2×2 system the perspective divide leaves for a point known to sit at z=0.
   */
  sceneFromClient(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    const ox = rect.width * 0.5;
    const oy = rect.height * 0.42; // perspective-origin: 50% 42%
    const persp = new DOMMatrix();
    persp.m34 = -1 / 1600;
    const m = new DOMMatrix()
      .translate(ox, oy)
      .multiply(persp)
      .translate(-ox, -oy)
      .translate(rect.width / 2, rect.height / 2) // .world sits at 50% / 50%
      .translate(this._pan.x, this._pan.y)
      .scale(this._kUsed, this._kUsed, this._kUsed)
      .rotateAxisAngle(1, 0, 0, this._rx)
      .rotateAxisAngle(0, 0, 1, this._rz)
      .translate(-this._center.x, -this._center.y, 0);
    // screen = proj(M·(x,y,0,1)) — linear in (x,y) once the divide is cleared.
    const c0 = m.transformPoint(new DOMPoint(0, 0, 0, 1));
    const c1 = m.transformPoint(new DOMPoint(1, 0, 0, 0));
    const c2 = m.transformPoint(new DOMPoint(0, 1, 0, 0));
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const a11 = c1.x - sx * c1.w;
    const a12 = c2.x - sx * c2.w;
    const a21 = c1.y - sy * c1.w;
    const a22 = c2.y - sy * c2.w;
    const b1 = sx * c0.w - c0.x;
    const b2 = sy * c0.w - c0.y;
    const det = a11 * a22 - a12 * a21;
    if (!det) return { ...this._center };
    return { x: (b1 * a22 - a12 * b2) / det, y: (a11 * b2 - b1 * a21) / det };
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('_renaming') && this._renaming) {
      (this.renderRoot.querySelector('.rename3') as HTMLInputElement | null)?.select();
    }
  }

  private onSpaceKey = (e: KeyboardEvent): void => {
    if (e.key !== ' ') return;
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    this._space = e.type === 'keydown';
    if (this._space) e.preventDefault();
  };

  private onDown = (e: PointerEvent): void => {
    if (e.button !== 0 && e.button !== 1) return;
    if (e.button === 1) e.preventDefault(); // middle button pans, not autoscroll
    this.focus();
    try {
      this.setPointerCapture?.(e.pointerId);
    } catch {
      /* synthetic events have no active pointer */
    }
    const el = e.composedPath()[0] as HTMLElement | undefined;
    // The chevron folds/unfolds the SAME sheet the canvas edits — no drag, no select.
    const chev = el?.closest?.('.chev3') as HTMLElement | null;
    if (chev?.dataset.nodeId) {
      this.emit('node-collapse-toggled', { id: chev.dataset.nodeId });
      return;
    }
    const handle = el?.closest?.('.h3') as HTMLElement | null;
    if (handle?.dataset.sourceId) {
      const rect = this.getBoundingClientRect();
      this._connect = {
        sourceId: handle.dataset.sourceId,
        x1: e.clientX - rect.left,
        y1: e.clientY - rect.top,
        x2: e.clientX - rect.left,
        y2: e.clientY - rect.top,
      };
      this._drag = { mode: 'connect', x: e.clientX, y: e.clientY, rx: this._rx, rz: this._rz, pan: { ...this._pan } };
      return;
    }
    const wantsPan = e.shiftKey || this._space || e.button === 1;
    const plate = wantsPan ? null : this.plateAt(e);
    // Same grammar as every surface: plain background drag SELECTS; space/shift
    // pan; alt keeps the orbit (the gesture 3D adds, not replaces).
    if (!plate && !wantsPan && !e.altKey) {
      const rect = this.getBoundingClientRect();
      this._rubber = {
        x1: e.clientX - rect.left,
        y1: e.clientY - rect.top,
        x2: e.clientX - rect.left,
        y2: e.clientY - rect.top,
        additive: false,
      };
      this._drag = { mode: 'rubber', x: e.clientX, y: e.clientY, rx: this._rx, rz: this._rz, pan: { ...this._pan }, moved: false };
      return;
    }
    this._drag = {
      mode: plate ? 'node' : wantsPan ? 'pan' : 'orbit',
      x: e.clientX,
      y: e.clientY,
      rx: this._rx,
      rz: this._rz,
      pan: { ...this._pan },
      nodeId: plate?.dataset.nodeId,
      nodeKind: plate?.dataset.kind,
      moved: false,
    };
  };

  private onMove = (e: PointerEvent): void => {
    if (!this._drag) return;
    const dx = e.clientX - this._drag.x;
    const dy = e.clientY - this._drag.y;
    if (this._drag.mode === 'connect' && this._connect) {
      const rect = this.getBoundingClientRect();
      this._connect = { ...this._connect, x2: e.clientX - rect.left, y2: e.clientY - rect.top };
      // The plate under the pointer REACTS: it grows and lifts a little.
      const under = this.shadowRoot?.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const target = under?.closest?.('.n3') as HTMLElement | null;
      const targetId = target?.dataset.nodeId ?? null;
      this._hoverTargetId = targetId !== this._connect.sourceId ? targetId : null;
      return;
    }
    if (this._drag.mode === 'rubber' && this._rubber) {
      if (Math.hypot(dx, dy) > 3) this._drag.moved = true;
      const rect = this.getBoundingClientRect();
      this._rubber = { ...this._rubber, x2: e.clientX - rect.left, y2: e.clientY - rect.top };
      return;
    }
    if (this._drag.mode === 'node') {
      if (Math.hypot(dx, dy) > 3) this._drag.moved = true;
      if (this._drag.moved && this._drag.nodeId) {
        const d = this.unproject(dx, dy);
        this._liveMove = { id: this._drag.nodeId, dx: d.x, dy: d.y };
      }
      return;
    }
    if (this._drag.mode === 'pan') {
      this._pan = { x: this._drag.pan.x + dx, y: this._drag.pan.y + dy };
    } else {
      // Horizontal drag spins the model, vertical drag tilts it (clamped so it
      // never flips under the floor or goes fully flat-on-edge).
      this._rz = this._drag.rz + dx * 0.4;
      this._rx = Math.max(5, Math.min(80, this._drag.rx + dy * 0.3));
    }
  };

  private onUp = (): void => {
    const drag = this._drag;
    this._drag = null;
    if (!drag) return;
    if (drag.mode === 'connect') {
      const source = this._connect?.sourceId;
      const target = this._hoverTargetId;
      this._connect = null;
      this._hoverTargetId = null;
      if (source && target && target !== source) {
        // Same contract as the canvas: the shell decides what the pair means.
        this.emit('connect-requested', { sourceId: source, targetId: target });
      }
      return;
    }
    if (drag.mode === 'rubber') {
      const r = this._rubber;
      this._rubber = null;
      if (r && drag.moved) {
        const host = this.getBoundingClientRect();
        const x0 = Math.min(r.x1, r.x2) + host.left;
        const x1 = Math.max(r.x1, r.x2) + host.left;
        const y0 = Math.min(r.y1, r.y2) + host.top;
        const y1 = Math.max(r.y1, r.y2) + host.top;
        const caught: string[] = [];
        this.renderRoot.querySelectorAll('.n3').forEach((el) => {
          const b = (el as HTMLElement).getBoundingClientRect();
          const cx = b.left + b.width / 2;
          const cy = b.top + b.height / 2;
          const id = (el as HTMLElement).dataset.nodeId;
          if (id && cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) caught.push(id);
        });
        this._selected = new Set(caught);
      } else {
        this._selected = new Set();
        this.emit('selection-cleared');
      }
      return;
    }
    if (drag.mode === 'node' && drag.nodeId) {
      const node = this.scene.nodes.find((n) => n.id === drag.nodeId);
      if (drag.moved && node && this._liveMove) {
        // Same contract as the canvas: the shell persists the layout + undo.
        this.emit('node-moved', {
          id: drag.nodeId,
          x: node.x + this._liveMove.dx,
          y: node.y + this._liveMove.dy,
        });
      } else if (node) {
        this.emit('element-selected', { elementType: 'node', id: node.id, kind: node.kind });
      }
      this._liveMove = null;
      return;
    }
    // A background click (no orbit/pan movement) clears the selection.
    if (!drag.moved && Math.abs(this._rz - drag.rz) < 0.5 && Math.abs(this._rx - drag.rx) < 0.5
        && this._pan.x === drag.pan.x && this._pan.y === drag.pan.y) {
      this.emit('selection-cleared');
    }
  };

  private onDblClick = (e: MouseEvent): void => {
    // Pointer capture from the drag retargets the derived dblclick to the host,
    // so the plate is resolved by coordinates instead of by composedPath.
    const under = this.shadowRoot?.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (under?.closest?.('.chev3')) return; // two fast chevron clicks are two folds, not «open»
    const plate = (under?.closest?.('.n3') as HTMLElement | null) ?? this.plateAt(e);
    if (plate?.dataset.nodeId) {
      this.emit('element-activated', {
        elementType: 'node',
        id: plate.dataset.nodeId,
        kind: plate.dataset.kind,
      });
      return;
    }
    this.reset();
  };

  private onKeydown = (e: KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      this.emit(e.shiftKey ? 'redo-requested' : 'undo-requested');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      this.emit('redo-requested');
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // A live multi-selection takes over — each node goes through the host's rules.
      if (this._selected.size) {
        e.preventDefault();
        const items = this.scene.nodes
          .filter((n) => this._selected.has(n.id))
          .map((n) => ({ id: n.id, kind: n.kind }));
        this._selected = new Set();
        if (items.length) this.emit('delete-selection-requested', { items });
        return;
      }
      if (this.selectedId) {
        const node = this.scene.nodes.find((n) => n.id === this.selectedId);
        if (node) {
          e.preventDefault();
          this.emit('delete-requested', { elementType: 'node', id: node.id, kind: node.kind });
        }
      }
      return;
    }
    if (e.key === 'F2') {
      const only = this._selected.size === 1 ? [...this._selected][0] : this.selectedId;
      const node = only ? this.scene.nodes.find((n) => n.id === only) : undefined;
      if (node) {
        e.preventDefault();
        this._renaming = { id: node.id, kind: node.kind ?? 'node', value: node.label };
      }
      return;
    }
    if (e.key === 'Escape') {
      this._selected = new Set();
      this._renaming = null;
      this.emit('selection-cleared');
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    this._k = Math.max(0.15, Math.min(3, this._k * factor));
  };

  private reset = (): void => {
    this._rx = 55;
    this._rz = -18;
    this._k = 1;
    this._pan = { x: 0, y: 0 };
  };

  /**
   * The virtual endpoint for a note thread that targets a RELATION: a node-shaped point
   * at the host edge's midpoint, lifted to the average of its endpoints' storeys.
   */
  private edgeAnchorOf(
    e: SceneEdge,
    byId: Map<string, SceneNode>,
  ): (SceneNode & { z: number }) | null {
    if (!e.targetId.startsWith('edgeanchor:')) return null;
    const host = this.scene.edges.find((h) => h.id === e.targetId.slice('edgeanchor:'.length));
    const hs = host ? byId.get(host.sourceId) : undefined;
    const ht = host ? byId.get(host.targetId) : undefined;
    if (!hs || !ht) return null;
    const depth = this.depths();
    const z = (((depth.get(hs.id) ?? 0) + (depth.get(ht.id) ?? 0)) / 2) * 30 + 2;
    return {
      id: '',
      label: '',
      kind: 'edge-anchor',
      x: (hs.x + ht.x) / 2,
      y: (hs.y + ht.y) / 2,
      w: 0,
      h: 0,
      z,
    };
  }

  /** Containment depth: how many parents above the node (0 = floor plate). */
  private depths(): Map<string, number> {
    const byId = new Map(this.scene.nodes.map((n) => [n.id, n]));
    const depth = new Map<string, number>();
    const of = (n: SceneNode): number => {
      const cached = depth.get(n.id);
      if (cached !== undefined) return cached;
      const up = n.ownerId ?? n.parentId;
      const parent = up ? byId.get(up) : undefined;
      const d = parent ? of(parent) + 1 : 0;
      depth.set(n.id, d);
      return d;
    };
    for (const n of this.scene.nodes) of(n);
    return depth;
  }

  render() {
    const nodes = this.scene.nodes;
    if (!nodes.length) {
      return html`<div class="hud">${t('canvas.tilt.empty')}</div>`;
    }
    const depth = this.depths();
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const minX = Math.min(...nodes.map((n) => n.x - n.w / 2)) - 60;
    const maxX = Math.max(...nodes.map((n) => n.x + n.w / 2)) + 60;
    const minY = Math.min(...nodes.map((n) => n.y - n.h / 2)) - 60;
    const maxY = Math.max(...nodes.map((n) => n.y + n.h / 2)) + 60;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    // Auto-fit the initial zoom to the host size.
    const rect = this.getBoundingClientRect();
    const fit = rect.width
      ? Math.min(rect.width / (maxX - minX), rect.height / (maxY - minY), 1) * 0.9
      : 0.5;
    const k = this._k * fit;
    this._kUsed = k; // the unprojection of pointer deltas needs the real scale
    this._center = { x: cx, y: cy }; // …and absolute points also need the pivot
    const STOREY = 30; // px of elevation per containment level
    const live = this._liveMove;
    const lx = (n: SceneNode) => n.x + (live?.id === n.id ? live.dx : 0);
    const ly = (n: SceneNode) => n.y + (live?.id === n.id ? live.dy : 0);

    return html`
      <div class="stage">
        <div
          class="world"
          style="transform: translate3d(${this._pan.x}px, ${this._pan.y}px, 0) scale3d(${k}, ${k}, ${k}) rotateX(${this._rx}deg) rotateZ(${this._rz}deg) translate3d(${-cx}px, ${-cy}px, 0)"
        >
          <svg
            class="floor"
            style="left: ${minX}px; top: ${minY}px"
            width=${maxX - minX}
            height=${maxY - minY}
            viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}"
          >
            ${this.scene.edges.map((e) => {
              const s = byId.get(e.sourceId);
              const t = byId.get(e.targetId) ?? this.edgeAnchorOf(e, byId);
              if (!s || !t) return '';
              // Faint shadow on the floor: the depth cue under the real 3D line.
              return svg`<line
                x1=${lx(s)} y1=${ly(s)} x2=${lx(t)} y2=${ly(t)}
                stroke="#000000" stroke-width="2" opacity=${e.dim ? 0.05 : 0.22} />`;
            })}
          </svg>
          ${this.scene.edges.map((e) => {
            const s = byId.get(e.sourceId);
            // A note thread may target a RELATION: anchor at that edge's midpoint.
            const t = byId.get(e.targetId) ?? this.edgeAnchorOf(e, byId);
            if (!s || !t) return '';
            // A 3D segment between the two plates: rotateZ sets the bearing on
            // the XY plane, rotateY lifts the far end to the target's storey.
            const z1 = (depth.get(s.id) ?? 0) * STOREY + 2;
            const z2 = t.id
              ? (depth.get(t.id) ?? 0) * STOREY + 2
              : (t as unknown as { z: number }).z;
            const dx = lx(t) - lx(s);
            const dy = ly(t) - ly(s);
            const dz = z2 - z1;
            const dxy = Math.hypot(dx, dy);
            const len = Math.hypot(dxy, dz);
            const bearing = (Math.atan2(dy, dx) * 180) / Math.PI;
            const climb = (Math.atan2(dz, dxy) * 180) / Math.PI;
            const color = e.color ?? '#64748b';
            const stroke = e.dashed
              ? `repeating-linear-gradient(90deg, ${color} 0 6px, transparent 6px 10px)`
              : color;
            return html`<div
              class="edge3"
              style="
                left: ${lx(s)}px; top: ${ly(s)}px; width: ${len}px; height: 1.7px;
                transform: translateZ(${z1}px) rotateZ(${bearing}deg) rotateY(${-climb}deg);
                background: ${stroke};
                opacity: ${e.dim ? 0.12 : 0.9};
              "
            ></div>`;
          })}
          ${nodes.map((n) => {
            if (n.kind === 'area') {
              // Not a component: no plate, no label, no shadow, no pointer — just the frame.
              return html`<div
                class="area3"
                title=${n.tooltip ?? ''}
                style="left: ${lx(n) - n.w / 2}px; top: ${ly(n) - n.h / 2}px;
                       width: ${n.w}px; height: ${n.h}px; opacity: ${n.dim ? 0.25 : 1};"
              ></div>`;
            }
            const d = depth.get(n.id) ?? 0;
            const isPlate = n.container || d === 0;
            const hovered = this._hoverTargetId === n.id;
            return html`
              <div
                class="n3 ${n.container ? 'container3' : ''} ${this.selectedId === n.id ||
                  this._selected.has(n.id)
                  ? 'selected3'
                  : ''} ${hovered ? 'hover3' : ''}"
                data-node-id=${n.id}
                data-kind=${n.kind}
                title=${n.tooltip ?? n.label}
                style="
                  opacity: ${n.dim ? 0.25 : 1};
                  left: ${lx(n) - n.w / 2}px; top: ${ly(n) - n.h / 2}px;
                  width: ${n.w}px; height: ${n.h}px;
                  transform: translateZ(${d * STOREY + (hovered ? 8 : 0)}px)${hovered
                    ? ' scale(1.06)'
                    : ''};
                  background: ${n.container
                    ? 'color-mix(in srgb, ' + (n.fill ?? '#ffffff') + ' 82%, transparent)'
                    : (n.fill ?? '#ffffff')};
                  border-color: ${n.stroke ?? '#64748b'};
                  border-style: ${n.dashed ? 'dashed' : 'solid'};
                  color: #1e293b;
                  box-shadow: ${isPlate
                    ? '0 18px 30px rgba(0, 0, 0, 0.45)'
                    : '0 10px 16px rgba(0, 0, 0, 0.35)'};
                "
              >
                ${n.badge ? html`<span class="badge3" style="color: ${n.stroke ?? '#94a3b8'}">${n.badge}</span>` : ''}
                <span>${n.label}</span>
                ${n.collapsible
                  ? html`<span
                      class="chev3"
                      data-node-id=${n.id}
                      title=${n.collapsed
                        ? t('canvas.node.expand')
                        : t('canvas.node.collapse')}
                      >${n.collapsed ? '▸' : '▾'}</span>`
                  : ''}
              </div>
            `;
          })}
          ${(() => {
            // Connect handles on the SELECTED plate (same kinds as the 2D canvas).
            const sel = this.connectable && this.selectedId ? byId.get(this.selectedId) : undefined;
            if (!sel || !HANDLE_KINDS.has(sel.kind)) return '';
            const z = (depth.get(sel.id) ?? 0) * STOREY + 4;
            const spots = [
              [lx(sel) + sel.w / 2, ly(sel)],
              [lx(sel) - sel.w / 2, ly(sel)],
              [lx(sel), ly(sel) + sel.h / 2],
              [lx(sel), ly(sel) - sel.h / 2],
            ];
            return spots.map(
              ([hx, hy]) => html`<div
                class="h3"
                data-source-id=${sel.id}
                title=${t('canvas.tilt.connectHandle')}
                style="left: ${hx}px; top: ${hy}px; transform: translateZ(${z}px)"
              ></div>`,
            );
          })()}
        </div>
      </div>
      ${this._connect
        ? html`<svg class="rubber">
            <line
              x1=${this._connect.x1}
              y1=${this._connect.y1}
              x2=${this._connect.x2}
              y2=${this._connect.y2}
              stroke="#38bdf8"
              stroke-width="2"
              stroke-dasharray="7 5"
            ></line>
          </svg>`
        : ''}
      ${this._rubber
        ? html`<div
            class="lasso"
            style="left: ${Math.min(this._rubber.x1, this._rubber.x2)}px; top: ${Math.min(
              this._rubber.y1,
              this._rubber.y2,
            )}px; width: ${Math.abs(this._rubber.x2 - this._rubber.x1)}px; height: ${Math.abs(
              this._rubber.y2 - this._rubber.y1,
            )}px"
          ></div>`
        : ''}
      ${this._renaming
        ? (() => {
            const el = this.renderRoot.querySelector(
              `.n3[data-node-id="${this._renaming.id}"]`,
            ) as HTMLElement | null;
            const host = this.getBoundingClientRect();
            const b = el?.getBoundingClientRect();
            const rx = b ? b.left + b.width / 2 - host.left : host.width / 2;
            const ry = b ? b.bottom - host.top + 6 : host.height / 2;
            return html`<input
              class="rename3"
              style="left: ${rx}px; top: ${ry}px"
              .value=${this._renaming.value}
              @pointerdown=${(e: Event) => e.stopPropagation()}
              @input=${(e: Event) =>
                (this._renaming = { ...this._renaming!, value: (e.target as HTMLInputElement).value })}
              @keydown=${(e: KeyboardEvent) => {
                e.stopPropagation();
                if (e.key === 'Escape') this._renaming = null;
                if (e.key === 'Enter') {
                  const r = this._renaming!;
                  const name = r.value.trim();
                  this._renaming = null;
                  const node = this.scene.nodes.find((n) => n.id === r.id);
                  if (name && node && name !== node.label) {
                    this.emit('node-renamed', { id: r.id, kind: r.kind, name });
                  }
                }
              }}
              @blur=${() => (this._renaming = null)}
            />`;
          })()
        : ''}
      <div class="hud">${t('canvas.tilt.help')}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'modux-tilt': ModuxTilt;
  }
}
