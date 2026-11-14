import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Scene } from './scene.js';
import type { ModuxModel, UiMenuEntryRef } from './model.js';
import { LanguageController, language, t, type MessageKey } from './i18n/index.js';

/**
 * Explorador radial del modelo: un árbol vivo con física de muelles.
 * El proyecto en el centro; click en un nodo y sus hijos brotan de él
 * empujados por la simulación (no hay tweens). Un ruido de baja amplitud
 * mantiene todo respirando para que el lienzo nunca se sienta estático.
 *
 * Interacción: click = expandir/plegar · hover = ampliar + ficha ·
 * doble click = abrir (emite node-activated {id, kind}) ·
 * arrastrar nodo = tirar de su subárbol · fondo = pan · rueda = zoom.
 *
 * Solo lectura: las posiciones son efímeras (las posee la física), no se
 * persisten en el layout del editor.
 */

interface XNode {
  /** Path-unique id (a page can hang from two apps). */
  key: string;
  /** Model id, for activation. */
  refId: string;
  kind: string;
  label: string;
  color: string;
  depth: number;
  parent?: XNode;
  children?: XNode[];
  expanded: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Hover grow animation, lerped each frame towards its target. */
  scale: number;
  /** Per-node phases so the idle breathing never synchronizes. */
  p1: number;
  p2: number;
  f1: number;
  f2: number;
}

declare global {
  interface HTMLElementTagNameMap {
    'modux-explorer': ModuxExplorer;
  }
}

const KIND_COLOR: Record<string, string> = {
  root: '#334155',
  boundedContext: '#0369a1',
  group: '#6366f1',
  note: '#ca8a04',
  'external-system': '#9333ea',
  'ui-app': '#16a34a',
  page: '#22c55e',
  actor: '#f59e0b',
  workflow: '#7c3aed',
  'identity-provider': '#ca8a04',
  'ai-agent': '#e11d48',
  aggregate: '#0d9488',
  entity: '#14b8a6',
  'use-case': '#2563eb',
  policy: '#7c3aed',
  'domain-event': '#ea580c',
  'application-event': '#fb923c',
  'read-model': '#475569',
  'domain-service': '#0891b2',
  'query-service': '#64748b',
  'scheduled-trigger': '#d97706',
  'etl-flow': '#0f766e',
  notification: '#db2777',
  document: '#475569',
  api: '#7c3aed',
  'api-operation': '#8b5cf6',
  'external-use-case': '#a855f7',
  'external-table': '#94a3b8',
  'mcp-server': '#c026d3',
};

/** Message key of each kind's display name (translated at render time). */
const KIND_LABEL: Record<string, MessageKey> = {
  root: 'explorer.kind.root',
  boundedContext: 'explorer.kind.boundedContext',
  group: 'explorer.kind.group',
  'external-system': 'explorer.kind.externalSystem',
  'ui-app': 'explorer.kind.uiApp',
  page: 'explorer.kind.page',
  actor: 'explorer.kind.actor',
  workflow: 'explorer.kind.workflow',
  'identity-provider': 'explorer.kind.identityProvider',
  'ai-agent': 'explorer.kind.aiAgent',
  aggregate: 'explorer.kind.aggregate',
  entity: 'explorer.kind.entity',
  'use-case': 'explorer.kind.useCase',
  policy: 'explorer.kind.policy',
  'domain-event': 'explorer.kind.domainEvent',
  'application-event': 'explorer.kind.applicationEvent',
  'read-model': 'explorer.kind.readModel',
  'domain-service': 'explorer.kind.domainService',
  'query-service': 'explorer.kind.queryService',
  'scheduled-trigger': 'explorer.kind.scheduledTrigger',
  'etl-flow': 'explorer.kind.etlFlow',
  notification: 'explorer.kind.notification',
  document: 'explorer.kind.document',
  api: 'explorer.kind.api',
  'api-operation': 'explorer.kind.apiOperation',
  'external-use-case': 'explorer.kind.externalUseCase',
  'external-table': 'explorer.kind.externalTable',
  'mcp-server': 'explorer.kind.mcpServer',
};

/** Plural, for the hover summary («5 aggregates», «3 use cases»). */
const KIND_PLURAL: Record<string, MessageKey> = {
  boundedContext: 'explorer.kindPlural.boundedContext',
  'external-system': 'explorer.kindPlural.externalSystem',
  'ui-app': 'explorer.kindPlural.uiApp',
  page: 'explorer.kindPlural.page',
  actor: 'explorer.kindPlural.actor',
  workflow: 'explorer.kindPlural.workflow',
  'identity-provider': 'explorer.kindPlural.identityProvider',
  'ai-agent': 'explorer.kindPlural.aiAgent',
  aggregate: 'explorer.kindPlural.aggregate',
  entity: 'explorer.kindPlural.entity',
  'use-case': 'explorer.kindPlural.useCase',
  policy: 'explorer.kindPlural.policy',
  'domain-event': 'explorer.kindPlural.domainEvent',
  'application-event': 'explorer.kindPlural.applicationEvent',
  'read-model': 'explorer.kindPlural.readModel',
  'domain-service': 'explorer.kindPlural.domainService',
  'query-service': 'explorer.kindPlural.queryService',
  'scheduled-trigger': 'explorer.kindPlural.scheduledTrigger',
  'etl-flow': 'explorer.kindPlural.etlFlow',
  notification: 'explorer.kindPlural.notification',
  document: 'explorer.kindPlural.document',
  api: 'explorer.kindPlural.api',
  'api-operation': 'explorer.kindPlural.apiOperation',
  'external-use-case': 'explorer.kindPlural.externalUseCase',
  'external-table': 'explorer.kindPlural.externalTable',
  'mcp-server': 'explorer.kindPlural.mcpServer',
};

/** Display name of a node kind in the current language; the raw kind when unknown. */
function kindLabel(kind: string): string {
  const key = KIND_LABEL[kind];
  return key ? t(key) : kind;
}

/** Plural display name of a node kind in the current language; the raw kind when unknown. */
function kindPlural(kind: string): string {
  const key = KIND_PLURAL[kind];
  return key ? t(key) : kind;
}

const RADIUS = [30, 20, 13, 9.5, 7.5];
const REST = [0, 180, 118, 80, 58];
const SPRING_K = 0.055;
const DAMPING = 0.86;
const REPULSION = 2600;
const REP_CUTOFF = 240;
const NOISE_AMP = 0.16;
const ANCHOR_K = 0.015;

@customElement('modux-explorer')
export class ModuxExplorer extends LitElement {
  readonly _i18n = new LanguageController(this, { root: true });
  static styles = css`
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background:
        radial-gradient(ellipse at center, var(--modux-surface, #ffffff) 0%, var(--modux-surface-2, #f1f5f9) 100%);
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: default;
    }
    .rename {
      position: absolute;
      transform: translateX(-50%);
      z-index: 6;
      font: 12px system-ui, sans-serif;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1.5px solid var(--modux-primary, #2563eb);
      background: var(--modux-surface, #ffffff);
      color: var(--modux-text, #0f172a);
      outline: none;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.18);
    }
    .hud {
      position: absolute;
      right: 12px;
      bottom: 10px;
      font: 11px/1.5 system-ui, sans-serif;
      color: var(--modux-text-faint, #94a3b8);
      pointer-events: none;
      text-align: right;
    }
    .controls {
      position: absolute;
      right: 12px;
      top: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      font: 11px system-ui, sans-serif;
      color: var(--modux-text-dim, #64748b);
      background: var(--modux-surface, rgba(255, 255, 255, 0.92));
      border: 1px solid var(--modux-border, #e2e8f0);
      border-radius: 8px;
      padding: 6px 10px;
    }
    .controls input[type='range'] {
      width: 90px;
      accent-color: var(--modux-primary, #6366f1);
    }
    .controls button {
      border: 1px solid var(--modux-border-strong, #cbd5e1);
      background: var(--modux-surface, #ffffff);
      border-radius: 6px;
      padding: 2px 8px;
      font: 11px system-ui, sans-serif;
      color: var(--modux-text-dim, #475569);
      cursor: pointer;
    }
    .controls button:hover {
      background: var(--modux-surface-2, #f1f5f9);
    }
    :host([shifted]) .search {
      left: 268px;
    }
    .search {
      position: absolute;
      left: 12px;
      top: 10px;
      transition: left 0.15s;
      width: 260px;
      font: 12px system-ui, sans-serif;
    }
    .search input {
      width: 100%;
      box-sizing: border-box;
      padding: 7px 10px;
      border: 1px solid var(--modux-border-strong, #cbd5e1);
      border-radius: 8px;
      background: var(--modux-input-bg, rgba(255, 255, 255, 0.95));
      font: inherit;
      color: var(--modux-text, #0f172a);
      outline: none;
    }
    .search input:focus {
      border-color: var(--modux-primary, #0284c7);
      box-shadow: 0 0 0 2px #0284c722;
    }
    .sugs {
      margin: 4px 0 0;
      padding: 4px;
      list-style: none;
      background: var(--modux-surface, rgba(255, 255, 255, 0.98));
      border: 1px solid var(--modux-border-strong, #cbd5e1);
      border-radius: 8px;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
      max-height: 320px;
      overflow-y: auto;
    }
    .sugs li {
      display: flex;
      align-items: baseline;
      gap: 7px;
      padding: 5px 8px;
      border-radius: 6px;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
    }
    .sugs li.active,
    .sugs li:hover {
      background: var(--modux-surface-2, #f1f5f9);
    }
    .sugs .dot {
      flex: none;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      align-self: center;
    }
    .sugs .name {
      color: var(--modux-text, #0f172a);
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sugs .path {
      color: var(--modux-text-faint, #94a3b8);
      font-size: 10.5px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sugs .empty {
      color: var(--modux-text-faint, #94a3b8);
      cursor: default;
    }
  `;

  /** The host palette is open: the search box slides right, out from under it. */
  @property({ type: Boolean, reflect: true }) shifted = false;

  /**
   * Scene mode — the YUGO surface: instead of walking the model, the tree comes
   * from any view's Scene (containment via parentId; edges become the threads).
   * The physics, focus, palette drops and gestures stay exactly the same.
   */
  @property({ attribute: false }) scene: Scene | null = null;

  @property({ attribute: false }) model: ModuxModel = {
    boundedContexts: [],
    externalSystems: [],
    relations: [],
    flows: [],
  };

  private root?: XNode;
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;
  private raf = 0;
  private t = 0;
  private cam = { x: 0, y: 0, k: 1 };
  private hover?: XNode;
  /** When the current hover began (t seconds) — fades the ghost preview in. */
  private hoverAt = 0;
  private dragNode?: XNode;
  private panning = false;
  private downAt = { x: 0, y: 0 };
  private moved = false;
  private ro?: ResizeObserver;
  private reducedMotion = false;
  /** Keeps expand/collapse + positions across model refreshes. */
  private prevByKey = new Map<string, XNode>();
  /** Cross-relations by model id (symmetric) — the faint threads on hover. */
  private related = new Map<string, Set<string>>();

  /** Painted centre of each area's region this frame — where its note threads anchor. */
  private areaHulls = new Map<string, { x: number; y: number }>();

  /** Single-click unfold deferred one beat, so a DOUBLE click opens the ficha cleanly. */
  private clickTimer?: number;
  private lastClickKey?: string;
  private lastClickAt = 0;
  /** Every node in the tree, expanded or not — the search space. */
  private allNodes: XNode[] = [];
  /** Camera flight towards a found node (re-aims every frame: nodes move). */
  private flight?: { node: XNode; until: number };
  /** The landing ring: pulses around the found node for a moment. */
  private found?: { node: XNode; until: number };
  @state() private _q = '';
  @state() private _sugs: XNode[] = [];
  @state() private _active = 0;
  /**
   * How ALIVE the map is, 0..1: scales the breathing noise, and below 1 raises
   * the friction and widens the dead band until, at 0, nodes park in equilibrium.
   */
  @state() private _motion = 1;
  /** Cross-relation threads: always on, or only for the hovered node. */
  @state() private _threads = false;
  /** Naming a curated view built from what is unfolded right now. */
  @state() private _viewNaming = false;
  @state() private _viewName = '';
  /** Language the tree's baked labels were built in. */
  private _treeLanguage = language();
  /** alt+click focus: only these keys render; undefined = everything. */
  private focusKeys?: Set<string>;

  /** Space held: background drags pan (the 2D canvas convention). */
  private _space = false;

  /** Rubber-band selection in progress (world coords). */
  private rubber?: { ax: number; ay: number; bx: number; by: number; additive: boolean };

  /** Multi-selection: node keys — Supr deletes them, «⊞ Vista…» prefers them. */
  @state() private selected = new Set<string>();

  /** The levels slider value — kept in sync when a level change auto-unfolds. */
  @state() private _levels = 1;

  /** Manual slider choices, one per scene (view:detail): touching the slider is
   *  a preference for THAT level — coming back restores it; untouched levels
   *  keep unfolding to their scene's own depth. */
  private manualLevels = new Map<string, number>();

  /** Identity of the scene on stage (view:detail) — set by the host; when it
   *  changes, the tree unfolds to the scene's own depth: each level decides
   *  what matters, the organism shows exactly that. */
  @property() sceneKey = '';

  /** Inline rename (F2): a floating input rides the node. */
  @state() private renaming: { key: string; value: string } | null = null;
  /** A relation being drawn from the hover handle towards the pointer. */
  private linking?: { source: XNode; x: number; y: number };

  connectedCallback(): void {
    super.connectedCallback();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.tabIndex = 0;
    window.addEventListener('keydown', this.onSpaceKey);
    window.addEventListener('keyup', this.onSpaceKey);
    this.addEventListener('keydown', this.onKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.saveState();
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    window.removeEventListener('keydown', this.onSpaceKey);
    window.removeEventListener('keyup', this.onSpaceKey);
    this.removeEventListener('keydown', this.onKeydown);
  }

  private onSpaceKey = (e: KeyboardEvent): void => {
    if (e.code !== 'Space') return;
    const t = e.composedPath()[0] as HTMLElement | undefined;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    this._space = e.type === 'keydown';
    if (this.canvas) this.canvas.style.cursor = this._space ? 'grab' : 'default';
  };

  /** The nodes behind the current selection keys, resolved against the live tree. */
  private selectedNodes(): XNode[] {
    if (!this.selected.size) return [];
    return this.visible().filter((n) => this.selected.has(n.key));
  }

  private onKeydown = (e: KeyboardEvent): void => {
    const t = e.composedPath()[0] as HTMLElement | undefined;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      this.emitUp(e.shiftKey ? 'redo-requested' : 'undo-requested');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      this.emitUp('redo-requested');
      return;
    }
    if (e.key === 'Escape') {
      this.selected = new Set();
      this.renaming = null;
      return;
    }
    const picked = this.selectedNodes();
    if (e.key === 'F2' && picked.length === 1) {
      e.preventDefault();
      this.renaming = { key: picked[0].key, value: picked[0].label };
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && picked.length) {
      e.preventDefault();
      if (picked.length > 1) {
        this.emitUp('delete-selection-requested', {
          items: picked.map((n) => ({ id: n.refId, kind: n.kind })),
        });
      } else {
        this.emitUp('delete-requested', {
          elementType: 'node',
          id: picked[0].refId,
          kind: picked[0].kind,
        });
      }
      this.selected = new Set();
    }
  };

  private emitUp(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  // ── State persistence (double click navigates to a CRUD and remounts us:
  //    coming back must restore the exploded picture, not reset it) ───────

  private static readonly STORE_KEY = 'modux-explorer-state';

  private saveState(): void {
    if (!this.root) return;
    const nodes: Record<string, { e: number; x: number; y: number }> = {};
    const walk = (n: XNode) => {
      nodes[n.key] = { e: n.expanded ? 1 : 0, x: Math.round(n.x), y: Math.round(n.y) };
      for (const c of n.children ?? []) walk(c);
    };
    walk(this.root);
    try {
      sessionStorage.setItem(ModuxExplorer.STORE_KEY, JSON.stringify({
        cam: this.cam,
        nodes,
        levels: Object.fromEntries(this.manualLevels),
      }));
    } catch {
      /* quota/private mode: state is just a nicety */
    }
  }

  private loadState(): void {
    try {
      const raw = sessionStorage.getItem(ModuxExplorer.STORE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as {
        cam?: { x: number; y: number; k: number };
        nodes?: Record<string, { e: number; x: number; y: number }>;
        levels?: Record<string, number>;
      };
      if (s.cam && s.cam.k > 0) this.cam = s.cam;
      this.manualLevels = new Map(Object.entries(s.levels ?? {}));
      for (const [key, v] of Object.entries(s.nodes ?? {})) {
        const ghost: XNode = {
          key,
          refId: '',
          kind: '',
          label: '',
          color: '',
          depth: 0,
          expanded: v.e === 1,
          x: v.x,
          y: v.y,
          vx: 0,
          vy: 0,
          scale: 1,
          p1: Math.random() * Math.PI * 2,
          p2: Math.random() * Math.PI * 2,
          f1: 0.35 + Math.random() * 0.4,
          f2: 0.3 + Math.random() * 0.45,
        };
        if (!this.prevByKey.has(key)) this.prevByKey.set(key, ghost);
      }
    } catch {
      /* corrupt state: start fresh */
    }
  }


  protected firstUpdated(): void {
    this.canvas = this.renderRoot.querySelector('canvas') ?? undefined;
    this.ctx = this.canvas?.getContext('2d') ?? undefined;
    this.loadState();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this);
    this.resize();
    this.buildTree();
    this.raf = requestAnimationFrame(() => this.tick());
    if (this.renaming) {
      const el = this.renderRoot.querySelector('.rename') as HTMLElement | null;
      const n = this.visible().find((x) => x.key === this.renaming!.key);
      if (el && n) {
        el.style.left = `${n.x * this.cam.k + this.cam.x}px`;
        el.style.top = `${(n.y + this.radiusOf(n) + 6) * this.cam.k + this.cam.y}px`;
      }
    }
  }

  /** Centers the visible tree in the viewport (the toolbar's «Ajustar»). */
  fit(): void {
    const nodes = this.visible();
    if (!nodes.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    }
    const pad = 70;
    const w = this.clientWidth || 800;
    const h = this.clientHeight || 600;
    const bw = maxX - minX + pad * 2;
    const bh = maxY - minY + pad * 2;
    const k = Math.min(1.5, Math.max(0.25, Math.min(w / bw, h / bh)));
    this.cam.k = k;
    this.cam.x = w / 2 - ((minX + maxX) / 2) * k;
    this.cam.y = h / 2 - ((minY + maxY) / 2) * k;
  }

  /** Tree depth the scene reaches (root = 0, top nodes = 1, their children = 2…). */
  private sceneDepth(): number {
    if (!this.scene) return 1;
    const byId = new Map(this.scene.nodes.map((n) => [n.id, n]));
    let max = 1;
    for (const n of this.scene.nodes) {
      let d = 1;
      for (let cur = n.ownerId ?? n.parentId; cur; ) {
        d++;
        const up = byId.get(cur);
        cur = up ? up.ownerId ?? up.parentId : undefined;
      }
      max = Math.max(max, d);
    }
    return max;
  }

  protected updated(changed: Map<string, unknown>): void {
    // The tree bakes translated labels (root, groups): a language change rebuilds it.
    if (changed.has('model') || changed.has('scene') || (this.root && this._treeLanguage !== language())) this.buildTree();
    if (changed.has('sceneKey') && changed.get('sceneKey') !== undefined) {
      // A different view/vista took the stage: restore the hand-picked depth if
      // this scene has one. The scene now carries the WHOLE containment tree
      // (operations included), so the automatic unfold stops at a readable depth
      // — the slider and per-node clicks reach the rest.
      this.applyLevels(this.manualLevels.get(this.sceneKey) ?? Math.min(this.sceneDepth(), 3));
    }
    if (changed.has('renaming') && this.renaming) {
      (this.renderRoot.querySelector('.rename') as HTMLInputElement | null)?.select();
    }
  }

  private resize(): void {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = this.clientWidth || 800;
    const h = this.clientHeight || 600;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.cam.x === 0 && this.cam.y === 0) {
      this.cam.x = w / 2;
      this.cam.y = h / 2;
    }
  }

  // ── Tree construction (lazy children per node kind) ──────────────────

  private buildTree(): void {
    if (this.root) this.rememberSubtree(this.root);
    this.root = this.makeNode('root', 'root', t('explorer.kind.root'), 0, undefined);
    this._treeLanguage = language();
    this.root.x = 0;
    this.root.y = 0;
    if (!this.prevByKey.has(this.root.key)) this.root.expanded = true;
    this.materialize(this.root);
    this.buildRelations();
    // The full tree, eagerly: search must see what is still folded.
    this.allNodes = [];
    const dig = (n: XNode) => {
      this.allNodes.push(n);
      if (!n.children) n.children = this.childrenOf(n);
      for (const c of n.children) dig(c);
    };
    dig(this.root);
  }

  /** Everything that relates two model elements across the tree's branches. */
  private buildRelations(): void {
    const m = this.model;
    this.related = new Map();
    const link = (a?: string, b?: string) => {
      void m;
      if (!a || !b || a === b) return;
      if (!this.related.has(a)) this.related.set(a, new Set());
      if (!this.related.has(b)) this.related.set(b, new Set());
      this.related.get(a)!.add(b);
      this.related.get(b)!.add(a);
    };
    if (this.scene) {
      // Scene mode: the view's edges ARE the threads.
      for (const e of this.scene.edges) link(e.sourceId, e.targetId);
      return;
    }
    for (const r of m.relations ?? []) link(r.sourceId, r.targetId);
    for (const r of m.useCaseCalls ?? []) link(r.sourceId, r.targetId);
    for (const r of m.queryCalls ?? []) link(r.sourceId, r.targetId);
    for (const r of m.aggregateCalls ?? []) link(r.sourceId, r.targetId);
    for (const r of m.aggregateReferences ?? []) link(r.sourceAggregateId, r.targetAggregateId);
    for (const r of m.emissions ?? []) link(r.sourceId, r.domainEventId);
    for (const r of m.useCaseEmissions ?? []) link(r.sourceId, r.domainEventId);
    for (const r of m.actorUses ?? []) link(r.actorId, r.targetId);
    for (const r of m.actorAppUses ?? []) link(r.actorId, r.appId);
    for (const r of m.actorExternalDependencies ?? []) link(r.actorId, r.externalSystemId);
    for (const r of m.actorAgentUses ?? []) link(r.actorId, r.agentId);
    for (const r of m.externalSystemDependencies ?? []) link(r.sourceId, r.targetId);
    for (const r of m.externalCalls ?? []) link(r.externalSystemId, r.useCaseId);
    for (const r of m.externalUseCaseCalls ?? []) link(r.sourceId, r.targetId);
    for (const r of m.agentUses ?? []) link(r.agentId, r.useCaseId);
    for (const r of m.agentExternalUses ?? []) link(r.agentId, r.externalUseCaseId);
    for (const r of m.agentDelegations ?? []) link(r.agentId, r.delegateAgentId);
    for (const app of m.uiApps ?? []) link(app.id, app.identityProviderId);
    for (const mod of m.boundedContexts) link(mod.id, mod.identityProviderId);
    for (const f of m.etlFlows ?? []) link(f.id, f.identityProviderId);
    for (const idp of m.identityProviders ?? []) link(idp.id, (idp as { publishedByExternalSystemId?: string }).publishedByExternalSystemId);
  }

  private rememberSubtree(n: XNode): void {
    this.prevByKey.set(n.key, n);
    for (const c of n.children ?? []) this.rememberSubtree(c);
  }

  private makeNode(kind: string, refId: string, label: string, depth: number, parent?: XNode): XNode {
    const key = `${parent?.key ?? ''}/${kind}:${refId}`;
    const prev = this.prevByKey.get(key);
    const jitter = () => (Math.random() - 0.5) * 10;
    const n: XNode = {
      key,
      refId,
      kind,
      label,
      color: KIND_COLOR[kind] ?? this.pal('--modux-text-dim', '#64748b'),
      depth,
      parent,
      expanded: prev?.expanded ?? false,
      x: prev?.x ?? (parent ? parent.x + jitter() : 0),
      y: prev?.y ?? (parent ? parent.y + jitter() : 0),
      vx: 0,
      vy: 0,
      scale: 1,
      p1: Math.random() * Math.PI * 2,
      p2: Math.random() * Math.PI * 2,
      f1: 0.35 + Math.random() * 0.4,
      f2: 0.3 + Math.random() * 0.45,
    };
    return n;
  }

  /** Builds n.children (idempotent) and recurses into expanded ones. */
  private materialize(n: XNode): void {
    if (!n.children) n.children = this.childrenOf(n);
    if (n.expanded) for (const c of n.children) this.materialize(c);
  }

  private childrenOf(n: XNode): XNode[] {
    const m = this.model;
    const d = n.depth + 1;
    const mk = (kind: string, id: string, label: string) => this.makeNode(kind, id, label, d, n);
    if (this.scene) {
      // Scene mode: containment comes straight from the view — ownerId (Archi style:
      // free boxes, drawn composition) or parentId (geometric nesting), whichever rules.
      // Areas never enter the tree — they are graphics, not components (drawAreas paints them).
      return this.scene.nodes
        .filter((sn) => sn.kind !== 'area')
        .filter((sn) => (n.kind === 'root' ? !(sn.ownerId ?? sn.parentId) : (sn.ownerId ?? sn.parentId) === n.refId))
        .map((sn) => {
          const node = mk(sn.kind || 'node', sn.id, sn.label);
          if (sn.stroke) node.color = sn.stroke;
          return node;
        });
    }
    switch (n.kind) {
      case 'root':
        return [
          ...m.boundedContexts.map((x) => mk('boundedContext', x.id, x.name)),
          ...m.externalSystems.map((x) => mk('external-system', x.id, x.name)),
          ...(m.uiApps ?? []).map((x) => mk('ui-app', x.id, x.name)),
          ...(m.actors ?? []).map((x) => mk('actor', x.id, x.name)),
          ...(m.aiAgents ?? []).filter((a) => !a.external).map((x) => mk('ai-agent', x.id, x.name)),
          ...(m.workflows ?? []).map((x) => mk('workflow', x.id, x.name)),
          ...(m.identityProviders ?? []).map((x) => mk('identity-provider', x.id, x.name)),
        ];
      case 'boundedContext': {
        const mod = m.boundedContexts.find((x) => x.id === n.refId);
        if (!mod) return [];
        const aggs = (m.aggregates ?? []).filter((a) => a.boundedContextId === n.refId);
        const ucs = mod.useCases ?? [];
        // Events emitted by one of this BC's aggregates hang off the aggregate, not the BC.
        const aggIds = new Set(aggs.map((a) => a.id));
        const emittedByAggregate = new Set(
          (m.emissions ?? []).filter((e) => aggIds.has(e.sourceId)).map((e) => e.domainEventId),
        );
        return [
          ...(aggs.length ? [mk('group', `aggregates:${n.refId}`, t('explorer.tree.aggregatesGroup', { count: aggs.length }))] : []),
          ...(ucs.length ? [mk('group', `use-cases:${n.refId}`, t('explorer.tree.useCasesGroup', { count: ucs.length }))] : []),
          ...(mod.domainEvents ?? [])
            .filter((x) => !emittedByAggregate.has(x.id))
            .map((x) => mk('domain-event', x.id, x.name)),
          ...(mod.applicationEvents ?? []).map((x) => mk('application-event', x.id, x.name)),
          ...(mod.readModels ?? []).map((x) => mk('read-model', x.id, x.name)),
          ...(mod.domainServices ?? []).map((x) => mk('domain-service', x.id, x.name)),
          ...(mod.queryServices ?? []).map((x) => mk('query-service', x.id, x.name)),
          ...(mod.scheduledTriggers ?? []).map((x) => mk('scheduled-trigger', x.id, x.name)),
          ...(m.etlFlows ?? []).filter((f) => f.ownerBoundedContextId === n.refId).map((x) => mk('etl-flow', x.id, x.name)),
          ...(m.notifications ?? []).filter((f) => f.ownerBoundedContextId === n.refId).map((x) => mk('notification', x.id, x.name)),
          ...(m.documents ?? []).filter((f) => f.ownerBoundedContextId === n.refId).map((x) => mk('document', x.id, x.name)),
        ];
      }
      case 'group': {
        const sep = n.refId.indexOf(':');
        const what = n.refId.slice(0, sep);
        const boundedContextId = n.refId.slice(sep + 1);
        const mod = m.boundedContexts.find((x) => x.id === boundedContextId);
        if (!mod) return [];
        if (what === 'aggregates') {
          return (m.aggregates ?? [])
            .filter((a) => a.boundedContextId === boundedContextId)
            .map((x) => mk('aggregate', x.id, x.name));
        }
        return (mod.useCases ?? []).map((x) => mk(x.policy ? 'policy' : 'use-case', x.id, x.name));
      }
      case 'aggregate': {
        // The events this aggregate emits are its offspring, like its entities.
        const emitted = new Set(
          (m.emissions ?? []).filter((e) => e.sourceId === n.refId).map((e) => e.domainEventId),
        );
        return [
          ...(m.entities ?? []).filter((e) => e.aggregateId === n.refId).map((x) => mk('entity', x.id, x.name)),
          ...m.boundedContexts
            .flatMap((mo) => mo.domainEvents ?? [])
            .filter((ev) => emitted.has(ev.id))
            .map((x) => mk('domain-event', x.id, x.name)),
        ];
      }
      case 'external-system': {
        const ext = m.externalSystems.find((x) => x.id === n.refId);
        if (!ext) return [];
        return [
          ...(m.apis ?? []).filter((a) => a.publishedByExternalSystemId === n.refId).map((x) => mk('api', x.id, x.name)),
          ...(ext.useCases ?? []).map((x) => mk('external-use-case', x.id, x.name)),
          ...(ext.tables ?? []).map((x) => mk('external-table', x.id, x.name)),
          ...(ext.mcpServers ?? []).map((x) => mk('mcp-server', x.id, x.name)),
        ];
      }
      case 'api': {
        const api = (m.apis ?? []).find((a) => a.id === n.refId);
        return (api?.operations ?? []).map((x) => mk('api-operation', x.id, x.name));
      }
      case 'ui-app': {
        const app = (m.uiApps ?? []).find((a) => a.id === n.refId);
        if (!app) return [];
        const pageIds = new Set<string>();
        const walk = (items?: UiMenuEntryRef[]) => {
          for (const it of items ?? []) {
            if (it.pageId) pageIds.add(it.pageId);
            walk(it.children);
          }
        };
        walk(app.menuItems);
        for (const pid of [app.headerPageId, app.homePageId, app.viewPageId, app.editPageId]) {
          if (pid) pageIds.add(pid);
        }
        return [...pageIds]
          .map((pid) => (m.pages ?? []).find((p) => p.id === pid))
          .filter((p): p is NonNullable<typeof p> => !!p)
          .map((p) => mk('page', p.id, p.name));
      }
      default:
        return [];
    }
  }

  // ── Simulation ────────────────────────────────────────────────────────

  private visible(): XNode[] {
    const out: XNode[] = [];
    const walk = (n: XNode) => {
      if (this.focusKeys && !this.focusKeys.has(n.key)) return;
      out.push(n);
      if (n.expanded) for (const c of n.children ?? []) walk(c);
    };
    if (this.root) walk(this.root);
    return out;
  }

  /** Every node expanded down to `levels` (0 = todo plegado); focus clears. */
  /** The slider touched by hand: remember the choice for THIS scene only. */
  private applyLevelsManually(levels: number): void {
    if (this.sceneKey) {
      this.manualLevels.set(this.sceneKey, levels);
    }
    this.applyLevels(levels);
  }

  private applyLevels(levels: number): void {
    this._levels = levels;
    this.focusKeys = undefined;
    const walk = (n: XNode) => {
      if (!n.children) n.children = this.childrenOf(n);
      n.expanded = n.depth < levels && n.children.length > 0;
      if (n.expanded) for (const c of n.children) walk(c);
    };
    if (this.root) walk(this.root);
    this.saveState();
  }

  /** A curated view out of the CURRENT picture: whatever is unfolded, as members. */
  private createViewFromVisible(): void {
    const name = this._viewName.trim();
    if (!name) return;
    // A live multi-selection narrows the view to exactly what you lassoed.
    const pool = this.selected.size
      ? this.selectedNodes()
      : this.visible();
    const members = pool
      .filter((n) => n.kind !== 'root' && n.kind !== 'group' && n.refId)
      .map((n) => ({ id: n.refId, kind: n.kind }));
    this._viewNaming = false;
    this._viewName = '';
    this.dispatchEvent(
      new CustomEvent('explorer-create-view', {
        detail: { name, members },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * alt+click: the node expands and the map narrows to what matters to it — its
   * subtree, its ancestors, and whatever it talks to through cross-relations.
   */
  private focusOn(n: XNode): void {
    if (!n.expanded && n.children?.length) this.toggle(n);
    const keep = new Set<string>();
    const withAncestors = (x: XNode) => {
      for (let cur: XNode | undefined = x; cur; cur = cur.parent) keep.add(cur.key);
    };
    const withSubtree = (x: XNode) => {
      keep.add(x.key);
      for (const c of x.children ?? []) withSubtree(c);
    };
    withAncestors(n);
    withSubtree(n);
    const rel = this.related.get(n.refId);
    if (rel) {
      for (const other of this.allNodes) {
        if (other.refId && rel.has(other.refId)) withAncestors(other);
      }
    }
    this.focusKeys = keep;
  }

  private tick(): void {
    this.t += 1 / 60;
    const nodes = this.visible();
    this.step(nodes);
    this.stepFlight();
    this.draw(nodes);
    // Lazy persistence: a full reload (activation navigates) skips
    // disconnectedCallback, so checkpoint about once per second.
    if ((this.frame = (this.frame + 1) % 60) === 0) this.saveState();
    this.raf = requestAnimationFrame(() => this.tick());
  }

  private frame = 0;

  private step(nodes: XNode[]): void {
    const t = this.t;
    // Springs: each visible node towards its parent at the depth's rest length.
    for (const n of nodes) {
      if (n.parent) {
        const rest =
          (REST[Math.min(n.depth, REST.length - 1)] ?? 60) +
          Math.min(60, ((n.parent.children?.length ?? 1) - 1) * 2.5);
        let dx = n.x - n.parent.x;
        let dy = n.y - n.parent.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 0.01) {
          const a = Math.random() * Math.PI * 2;
          dx = Math.cos(a) * 0.1;
          dy = Math.sin(a) * 0.1;
          dist = 0.1;
        }
        const f = SPRING_K * (dist - rest);
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        n.vx -= fx;
        n.vy -= fy;
        n.parent.vx += fx * 0.4;
        n.parent.vy += fy * 0.4;
      } else {
        n.vx -= n.x * ANCHOR_K;
        n.vy -= n.y * ANCHOR_K;
      }
      if (!this.reducedMotion && this._motion > 0) {
        n.vx += Math.sin(t * n.f1 * Math.PI * 2 + n.p1) * NOISE_AMP * this._motion;
        n.vy += Math.cos(t * n.f2 * Math.PI * 2 + n.p2) * NOISE_AMP * this._motion;
      }
    }
    // Pairwise repulsion within a cutoff; hubs (low depth) push harder.
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (Math.abs(dx) > REP_CUTOFF || Math.abs(dy) > REP_CUTOFF) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 > REP_CUTOFF * REP_CUTOFF || d2 < 0.01) continue;
        const d = Math.sqrt(d2);
        const hub = a.depth <= 1 && b.depth <= 1 ? 3 : 1;
        const f = (REPULSION * hub) / d2;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }
    // Below full motion the map turns viscous: friction rises and the dead band
    // widens until, at 0, nodes PARK in equilibrium instead of pushing forever.
    const m = this._motion;
    const drag = DAMPING * m + 0.5 * (1 - m);
    const dead = (1 - m) * 0.7;
    for (const n of nodes) {
      if (n === this.dragNode) {
        n.vx = 0;
        n.vy = 0;
        continue;
      }
      n.vx *= drag;
      n.vy *= drag;
      const v = Math.hypot(n.vx, n.vy);
      if (v > 14) {
        n.vx = (n.vx / v) * 14;
        n.vy = (n.vy / v) * 14;
      }
      if (dead > 0 && v < dead) {
        n.vx = 0;
        n.vy = 0;
        continue;
      }
      n.x += n.vx;
      n.y += n.vy;
      const target = n === this.hover ? 1.75 : 1;
      n.scale += (target - n.scale) * 0.18;
    }
  }

  // ── Drawing ───────────────────────────────────────────────────────────

  private radiusOf(n: XNode): number {
    return (RADIUS[Math.min(n.depth, RADIUS.length - 1)] ?? 7) * n.scale;
  }

  /**
   * Theme palette lookup: the palette rides in on CSS custom properties (they
   * inherit through shadow boundaries), but canvas 2D needs concrete colors.
   */
  private pal(name: string, fallback: string): string {
    const v = getComputedStyle(this).getPropertyValue(name).trim();
    return v || fallback;
  }

  private draw(nodes: XNode[]): void {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;
    const w = this.clientWidth;
    const h = this.clientHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(this.cam.x, this.cam.y);
    ctx.scale(this.cam.k, this.cam.k);

    this.drawAreas(ctx, nodes);

    ctx.lineWidth = 1.3 / this.cam.k;
    for (const n of nodes) {
      if (!n.parent) continue;
      ctx.strokeStyle = n.color + '55';
      ctx.beginPath();
      ctx.moveTo(n.parent.x, n.parent.y);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();
    }

    const fontPx = (px: number) => `${px}px system-ui, sans-serif`;
    for (const n of nodes) {
      const r = this.radiusOf(n);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = n.kind === 'note'
        ? this.pal('--modux-note-fill', '#fef9c3')
        : n.expanded
          ? n.color + '22'
          : this.pal('--modux-node-fill', '#232527');
      ctx.fill();
      ctx.lineWidth = (n === this.hover ? 2.6 : 1.8) / this.cam.k;
      ctx.strokeStyle = n.color;
      ctx.stroke();
      this.drawGlyph(ctx, n, r);
      const kids = n.children?.length ?? 0;
      if (!n.expanded && kids > 0) {
        // Collapsed hub: a count badge so you can tell there is more inside.
        const br = Math.max(7, r * 0.42);
        const bx = n.x + r * 0.75;
        const by = n.y + r * 0.75;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = fontPx(br * 1.1);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(kids), bx, by + 0.5);
      }
      const showLabel = n.depth <= 1 || n === this.hover || this.cam.k > 0.65;
      if (showLabel) {
        const label = n.label.length > 22 ? n.label.slice(0, 21) + '…' : n.label;
        ctx.font = n === this.hover ? `600 ${fontPx(12)}` : fontPx(n.depth <= 1 ? 12 : 10.5);
        ctx.fillStyle = n === this.hover ? this.pal('--modux-text', '#0f172a') : this.pal('--modux-text-dim', '#475569');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, n.x, n.y + r + 4);
      }
    }

    // Selection rings: dashed, in the canvas' accent — Supr and F2 act on them.
    if (this.selected.size) {
      ctx.save();
      ctx.strokeStyle = this.pal('--modux-primary', '#2563eb');
      ctx.lineWidth = 2 / this.cam.k;
      ctx.setLineDash([5 / this.cam.k, 4 / this.cam.k]);
      for (const n of nodes) {
        if (!this.selected.has(n.key)) continue;
        ctx.beginPath();
        ctx.arc(n.x, n.y, this.radiusOf(n) + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (this.rubber) {
      const r = this.rubber;
      ctx.save();
      ctx.fillStyle = this.pal('--modux-primary-soft', 'rgba(37, 99, 235, 0.08)');
      ctx.strokeStyle = this.pal('--modux-primary', '#2563eb');
      ctx.lineWidth = 1.2 / this.cam.k;
      ctx.setLineDash([4 / this.cam.k, 3 / this.cam.k]);
      ctx.fillRect(Math.min(r.ax, r.bx), Math.min(r.ay, r.by), Math.abs(r.bx - r.ax), Math.abs(r.by - r.ay));
      ctx.strokeRect(Math.min(r.ax, r.bx), Math.min(r.ay, r.by), Math.abs(r.bx - r.ax), Math.abs(r.by - r.ay));
      ctx.restore();
    }
    if (this.found) {
      // Landing ring: a pulse around the node search flew to.
      if (this.t > this.found.until) {
        this.found = undefined;
      } else {
        const f = this.found.node;
        const life = (this.found.until - this.t) / 3.2;
        ctx.save();
        ctx.globalAlpha = Math.min(0.8, life * 1.6);
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2.2 / this.cam.k;
        const pulse = this.reducedMotion ? 0 : Math.sin(this.t * 5) * 3;
        ctx.beginPath();
        ctx.arc(f.x, f.y, this.radiusOf(f) + 9 + pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha *= 0.4;
        ctx.beginPath();
        ctx.arc(f.x, f.y, this.radiusOf(f) + 18 + pulse * 1.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    this.drawNotes(ctx, nodes);
    if (this._threads) {
      for (const n of nodes) this.drawThreads(ctx, n, nodes);
    } else if (this.hover) {
      this.drawThreads(ctx, this.hover, nodes);
    }
    if (this.hover && !this.hover.expanded && this.hover.children?.length) {
      this.drawGhosts(ctx, this.hover);
    }
    // The relation being drawn from the handle, and the handle itself on hover.
    if (this.linking) {
      const s = this.linking.source;
      ctx.save();
      ctx.strokeStyle = this.pal('--modux-text-dim', '#475569');
      ctx.lineWidth = 1.6 / this.cam.k;
      ctx.setLineDash([5 / this.cam.k, 4 / this.cam.k]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(this.linking.x, this.linking.y);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    if (this.hover && !this.linking) this.drawCard(ctx, this.hover, w, h);
  }


  /**
   * Cross-relations as faint threads: hovering a node reveals what it talks
   * to across the tree (calls, events, actor uses, IdP trust…) without
   * cluttering the resting picture. Only threads to visible nodes are drawn.
   */
  private drawThreads(ctx: CanvasRenderingContext2D, n: XNode, nodes: XNode[]): void {
    const rel = this.related.get(n.refId);
    if (!rel?.size) return;
    const alpha = Math.min(0.65, (this.t - this.hoverAt) * 2.2);
    if (alpha <= 0.02) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.4 / this.cam.k;
    for (const v of nodes) {
      if (v === n || !rel.has(v.refId)) continue;
      if (v === n.parent || v.parent === n) continue; // the tree already draws these
      const mx = (n.x + v.x) / 2;
      const my = (n.y + v.y) / 2;
      const dx = v.x - n.x;
      const dy = v.y - n.y;
      const bend = 0.18;
      ctx.strokeStyle = v.color;
      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.quadraticCurveTo(mx - dy * bend, my + dx * bend, v.x, v.y);
      ctx.stroke();
      // A soft halo on the far end, so the eye finds it.
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(v.x, v.y, this.radiusOf(v) + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([6, 5]);
    }
    ctx.restore();
  }

  /**
   * Areas are pure graphics — no tree node, no physics. Each one paints as a dashed
   * region hugging the LIVE positions of the members its canvas rectangle contains
   * (geometric membership, read straight off the scene boxes). The region's centre
   * doubles as the anchor for note threads pointing at the area.
   */
  private drawAreas(ctx: CanvasRenderingContext2D, nodes: XNode[]): void {
    this.areaHulls.clear();
    const sceneNodes = this.scene?.nodes ?? [];
    const areas = sceneNodes.filter((n) => n.kind === 'area');
    if (!areas.length) return;
    const k = this.cam.k;
    ctx.save();
    ctx.setLineDash([5 / k, 4 / k]);
    ctx.lineWidth = 1.4 / k;
    for (const area of areas) {
      const members = sceneNodes.filter(
        (n) =>
          n.kind !== 'area' &&
          !n.parentId &&
          n.x - n.w / 2 >= area.x - area.w / 2 &&
          n.x + n.w / 2 <= area.x + area.w / 2 &&
          n.y - n.h / 2 >= area.y - area.h / 2 &&
          n.y + n.h / 2 <= area.y + area.h / 2,
      );
      const pts: { x: number; y: number; r: number }[] = [];
      for (const m of members) {
        const rep = this.visibleRepresentative(m.id, nodes);
        if (rep) pts.push({ x: rep.x, y: rep.y, r: this.radiusOf(rep) + 16 });
      }
      if (!pts.length) continue;
      const minX = Math.min(...pts.map((p) => p.x - p.r));
      const maxX = Math.max(...pts.map((p) => p.x + p.r));
      const minY = Math.min(...pts.map((p) => p.y - p.r));
      const maxY = Math.max(...pts.map((p) => p.y + p.r));
      this.areaHulls.set(area.id, { x: (minX + maxX) / 2, y: (minY + maxY) / 2 });
      ctx.fillStyle = 'rgba(148, 163, 184, 0.09)';
      ctx.strokeStyle = this.pal('--modux-node-stroke', '#94a3b8');
      ctx.beginPath();
      ctx.roundRect(minX, minY, maxX - minX, maxY - minY, 18 / k);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * The note's threads, always on: the note itself already rides the tree as one more
   * node (the scene brings it in), so here only the dashed amber lines to each visible
   * target are drawn — straight from the scene's note-link edges. Threads to RELATIONS
   * (edgeanchor targets) stay on the 2D/3D maps — the yugo doesn't draw those edges.
   * A thread to an AREA anchors at its painted region's centre.
   */
  private drawNotes(ctx: CanvasRenderingContext2D, nodes: XNode[]): void {
    const links = (this.scene?.edges ?? []).filter((e) => e.kind === 'note-link');
    if (!links.length) return;
    const k = this.cam.k;
    ctx.save();
    ctx.setLineDash([4 / k, 3 / k]);
    ctx.strokeStyle = 'rgba(202, 138, 4, 0.75)';
    ctx.lineWidth = 1.4 / k;
    for (const link of links) {
      if (link.targetId.startsWith('edgeanchor:')) continue;
      const from = this.visibleRepresentative(link.sourceId, nodes);
      const toNode = this.visibleRepresentative(link.targetId, nodes);
      const to = toNode ?? this.areaHulls.get(link.targetId);
      if (!from || !to || toNode === from) continue;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const r1 = this.radiusOf(from);
      const r2 = toNode ? this.radiusOf(toNode) : 0;
      ctx.beginPath();
      ctx.moveTo(from.x + (dx / len) * r1, from.y + (dy / len) * r1);
      ctx.lineTo(to.x - (dx / len) * r2, to.y - (dy / len) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private visibleRepresentative(refId: string, nodes: XNode[]): XNode | null {
    const byRef = new Map(nodes.map((n) => [n.refId, n]));
    const parentOf = new Map((this.scene?.nodes ?? []).map((n) => [n.id, n.ownerId ?? n.parentId]));
    for (let cur: string | undefined | null = refId; cur; cur = parentOf.get(cur)) {
      const hit = byRef.get(cur);
      if (hit) return hit;
    }
    return null;
  }

  /** Ghost preview: a hovered, folded node whispers its children around it. */
  private drawGhosts(ctx: CanvasRenderingContext2D, n: XNode): void {
    const kids = n.children ?? [];
    const shown = kids.slice(0, 14);
    const alpha = Math.min(0.55, (this.t - this.hoverAt) * 2.2);
    if (alpha <= 0.02) return;
    const r = this.radiusOf(n);
    const ring = r + 24;
    const away = n.parent ? Math.atan2(n.y - n.parent.y, n.x - n.parent.x) : -Math.PI / 2;
    const spread = n.parent ? Math.PI * 1.35 : Math.PI * 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.2 / this.cam.k;
    shown.forEach((c, i) => {
      const a = away - spread / 2 + (spread * (i + 0.5)) / shown.length;
      // Each ghost shimmers with its child's own phase, like the real thing.
      const wob = this.reducedMotion ? 0 : Math.sin(this.t * c.f1 * Math.PI * 2 + c.p1) * 1.8;
      const gx = n.x + Math.cos(a) * (ring + wob);
      const gy = n.y + Math.sin(a) * (ring + wob);
      ctx.beginPath();
      ctx.arc(gx, gy, 6, 0, Math.PI * 2);
      ctx.fillStyle = this.pal('--modux-node-fill', '#232527');
      ctx.fill();
      ctx.strokeStyle = c.color;
      ctx.stroke();
    });
    if (kids.length > shown.length) {
      ctx.setLineDash([]);
      ctx.fillStyle = this.pal('--modux-text-dim', '#64748b');
      ctx.font = `${11 / this.cam.k}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const a = away + spread / 2 + 0.35;
      ctx.fillText(`+${kids.length - shown.length}`, n.x + Math.cos(a) * ring, n.y + Math.sin(a) * ring);
    }
    ctx.restore();
  }

  /** A tiny kind glyph inside the circle, so the tree reads without hovering. */
  private drawGlyph(ctx: CanvasRenderingContext2D, n: XNode, r: number): void {
    const s = r * 0.42; // glyph half-size
    if (s < 3.2) return; // too small to read: leave the circle clean
    const { x, y } = n;
    ctx.save();
    ctx.strokeStyle = n.color;
    ctx.fillStyle = n.color;
    ctx.lineWidth = Math.max(1, s * 0.22);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (n.kind) {
      case 'note': // a post-it with its folded corner
        ctx.moveTo(x - s * 0.8, y - s * 0.9);
        ctx.lineTo(x + s * 0.8, y - s * 0.9);
        ctx.lineTo(x + s * 0.8, y + s * 0.3);
        ctx.lineTo(x + s * 0.2, y + s * 0.9);
        ctx.lineTo(x - s * 0.8, y + s * 0.9);
        ctx.closePath();
        ctx.moveTo(x + s * 0.8, y + s * 0.3);
        ctx.lineTo(x + s * 0.2, y + s * 0.3);
        ctx.lineTo(x + s * 0.2, y + s * 0.9);
        ctx.stroke();
        break;
      case 'group': {
        // a cluster in brackets: three dots between two arcs
        ctx.arc(x - s * 0.45, y, s * 0.16, 0, Math.PI * 2);
        ctx.moveTo(x + s * 0.16, y);
        ctx.arc(x, y, s * 0.16, 0, Math.PI * 2);
        ctx.moveTo(x + s * 0.61, y);
        ctx.arc(x + s * 0.45, y, s * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, s, -Math.PI * 0.35, Math.PI * 0.35);
        ctx.moveTo(x - s * Math.cos(Math.PI * 0.35), y + s * Math.sin(Math.PI * 0.35));
        ctx.arc(x, y, s, Math.PI * 0.65, Math.PI * 1.35);
        ctx.stroke();
        break;
      }
      case 'root': // concentric target
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.moveTo(x + s * 0.35, y);
        ctx.arc(x, y, s * 0.35, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'boundedContext': // cluster of three dots
        for (const [dx, dy] of [[-0.55, 0.4], [0.55, 0.4], [0, -0.55]]) {
          ctx.moveTo(x + dx * s + s * 0.3, y + dy * s);
          ctx.arc(x + dx * s, y + dy * s, s * 0.3, 0, Math.PI * 2);
        }
        ctx.fill();
        break;
      case 'aggregate': // diamond
        ctx.moveTo(x, y - s);
        ctx.lineTo(x + s, y);
        ctx.lineTo(x, y + s);
        ctx.lineTo(x - s, y);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'entity':
      case 'external-table':
      case 'read-model': // card with header line
        ctx.rect(x - s, y - s * 0.8, s * 2, s * 1.6);
        ctx.moveTo(x - s, y - s * 0.25);
        ctx.lineTo(x + s, y - s * 0.25);
        ctx.stroke();
        break;
      case 'use-case':
      case 'external-use-case': // play triangle
        ctx.moveTo(x - s * 0.6, y - s * 0.85);
        ctx.lineTo(x + s * 0.85, y);
        ctx.lineTo(x - s * 0.6, y + s * 0.85);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'policy':
      case 'domain-event':
      case 'application-event': // lightning bolt
        ctx.moveTo(x + s * 0.3, y - s);
        ctx.lineTo(x - s * 0.5, y + s * 0.15);
        ctx.lineTo(x + s * 0.05, y + s * 0.15);
        ctx.lineTo(x - s * 0.3, y + s);
        ctx.lineTo(x + s * 0.5, y - s * 0.15);
        ctx.lineTo(x - s * 0.05, y - s * 0.15);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'domain-service':
      case 'etl-flow': { // gear: circle + spokes
        ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          ctx.moveTo(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55);
          ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
        }
        ctx.stroke();
        break;
      }
      case 'query-service': // magnifier
        ctx.arc(x - s * 0.25, y - s * 0.25, s * 0.6, 0, Math.PI * 2);
        ctx.moveTo(x + s * 0.25, y + s * 0.25);
        ctx.lineTo(x + s, y + s);
        ctx.stroke();
        break;
      case 'scheduled-trigger': // clock
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.moveTo(x, y - s * 0.55);
        ctx.lineTo(x, y);
        ctx.lineTo(x + s * 0.45, y + s * 0.25);
        ctx.stroke();
        break;
      case 'notification': // bell
        ctx.moveTo(x - s * 0.85, y + s * 0.45);
        ctx.quadraticCurveTo(x - s * 0.85, y - s, x, y - s);
        ctx.quadraticCurveTo(x + s * 0.85, y - s, x + s * 0.85, y + s * 0.45);
        ctx.closePath();
        ctx.moveTo(x + s * 0.25, y + s * 0.75);
        ctx.arc(x, y + s * 0.75, s * 0.25, 0, Math.PI);
        ctx.stroke();
        break;
      case 'document': // page with folded corner
        ctx.moveTo(x - s * 0.7, y - s);
        ctx.lineTo(x + s * 0.25, y - s);
        ctx.lineTo(x + s * 0.7, y - s * 0.55);
        ctx.lineTo(x + s * 0.7, y + s);
        ctx.lineTo(x - s * 0.7, y + s);
        ctx.closePath();
        ctx.moveTo(x + s * 0.25, y - s);
        ctx.lineTo(x + s * 0.25, y - s * 0.55);
        ctx.lineTo(x + s * 0.7, y - s * 0.55);
        ctx.stroke();
        break;
      case 'workflow': // chevrons
        for (const dx of [-0.7, 0.1]) {
          ctx.moveTo(x + dx * s, y - s * 0.7);
          ctx.lineTo(x + (dx + 0.6) * s, y);
          ctx.lineTo(x + dx * s, y + s * 0.7);
        }
        ctx.stroke();
        break;
      case 'identity-provider': // key
        ctx.arc(x - s * 0.45, y - s * 0.45, s * 0.45, 0, Math.PI * 2);
        ctx.moveTo(x - s * 0.1, y - s * 0.1);
        ctx.lineTo(x + s * 0.9, y + s * 0.9);
        ctx.moveTo(x + s * 0.45, y + s * 0.45);
        ctx.lineTo(x + s * 0.85, y + s * 0.05);
        ctx.stroke();
        break;
      case 'actor': // person
        ctx.arc(x, y - s * 0.5, s * 0.42, 0, Math.PI * 2);
        ctx.moveTo(x - s * 0.8, y + s);
        ctx.quadraticCurveTo(x, y - s * 0.1, x + s * 0.8, y + s);
        ctx.stroke();
        break;
      case 'ai-agent': // spark
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a + Math.PI / 4) * s * 0.5, y + Math.sin(a + Math.PI / 4) * s * 0.5);
        }
        ctx.stroke();
        break;
      case 'external-system': // cloud
        ctx.arc(x - s * 0.45, y + s * 0.15, s * 0.45, Math.PI * 0.4, Math.PI * 1.45);
        ctx.arc(x + s * 0.1, y - s * 0.35, s * 0.5, Math.PI * 0.95, Math.PI * 1.95);
        ctx.arc(x + s * 0.55, y + s * 0.2, s * 0.4, Math.PI * 1.45, Math.PI * 0.55);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'ui-app': // 2×2 grid
        for (const [dx, dy] of [[-1, -1], [0.15, -1], [-1, 0.15], [0.15, 0.15]]) {
          ctx.rect(x + dx * s, y + dy * s, s * 0.85, s * 0.85);
        }
        ctx.stroke();
        break;
      case 'page': // browser window
        ctx.rect(x - s, y - s * 0.8, s * 2, s * 1.6);
        ctx.moveTo(x - s, y - s * 0.35);
        ctx.lineTo(x + s, y - s * 0.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x - s * 0.7, y - s * 0.57, s * 0.09, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'api': // angle brackets
        ctx.moveTo(x - s * 0.25, y - s);
        ctx.lineTo(x - s, y);
        ctx.lineTo(x - s * 0.25, y + s);
        ctx.moveTo(x + s * 0.25, y - s);
        ctx.lineTo(x + s, y);
        ctx.lineTo(x + s * 0.25, y + s);
        ctx.stroke();
        break;
      case 'api-operation': // arrow
        ctx.moveTo(x - s, y);
        ctx.lineTo(x + s * 0.7, y);
        ctx.moveTo(x + s * 0.1, y - s * 0.5);
        ctx.lineTo(x + s * 0.8, y);
        ctx.lineTo(x + s * 0.1, y + s * 0.5);
        ctx.stroke();
        break;
      case 'mcp-server': // plug
        ctx.arc(x, y + s * 0.25, s * 0.6, 0, Math.PI);
        ctx.closePath();
        ctx.moveTo(x - s * 0.35, y + s * 0.25);
        ctx.lineTo(x - s * 0.35, y - s * 0.7);
        ctx.moveTo(x + s * 0.35, y + s * 0.25);
        ctx.lineTo(x + s * 0.35, y - s * 0.7);
        ctx.stroke();
        break;
      default:
        ctx.arc(x, y, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
  }

  /** Hover card: what the node is, what it holds, how to enter. Screen space, clamped to the canvas. */
  private drawCard(ctx: CanvasRenderingContext2D, n: XNode, w: number, h: number): void {
    // The summary looks THROUGH groups: the card teaches what is inside, the
    // group only adds a step when expanding.
    const contents = (n.children ?? []).flatMap((c) =>
      c.kind === 'group' ? (c.children ??= this.childrenOf(c)) : [c],
    );
    const counts = new Map<string, number>();
    for (const c of contents) counts.set(c.kind, (counts.get(c.kind) ?? 0) + 1);
    const lines: string[] = [];
    for (const [kind, count] of counts) {
      lines.push(`${count} ${count === 1 ? kindLabel(kind).toLowerCase() : kindPlural(kind)}`);
      if (lines.length === 4) {
        const rest = [...counts.keys()].length - 4;
        if (rest > 0) lines[3] += ` ${t('explorer.card.moreKinds', { count: rest })}`;
        break;
      }
    }
    // A taste of what is inside, by name — colored bullet per kind.
    const names: { label: string; color: string }[] = contents
      .slice(0, 6)
      .map((c) => ({ label: c.label.length > 30 ? c.label.slice(0, 29) + '…' : c.label, color: c.color }));
    const more = contents.length - names.length;
    const title = n.label;
    const sub = kindLabel(n.kind);
    const hint =
      (n.children?.length ? (n.expanded ? t('explorer.card.clickCollapse') : t('explorer.card.clickExpand')) : '') +
      (n.kind !== 'root' ? (n.children?.length ? ' · ' : '') + t('explorer.card.doubleClickOpen') : '');
    ctx.save();
    ctx.font = '600 13px system-ui, sans-serif';
    const wTitle = ctx.measureText(title).width;
    ctx.font = '11px system-ui, sans-serif';
    const wLines = Math.max(
      ctx.measureText(sub).width,
      ...lines.map((l) => ctx.measureText(l).width),
      ...names.map((x) => ctx.measureText(x.label).width + 12),
      ctx.measureText(hint).width,
    );
    const bw = Math.min(300, Math.max(wTitle, wLines) + 24);
    const namesBlock = names.length ? 8 + names.length * 15 + (more > 0 ? 15 : 0) : 0;
    const bh = 40 + lines.length * 15 + namesBlock + (hint ? 18 : 0);
    // Beside the node, flipped/clamped so it never leaves the canvas.
    const sr = this.radiusOf(n) * this.cam.k;
    const sx = this.cam.x + n.x * this.cam.k;
    const sy = this.cam.y + n.y * this.cam.k;
    let bx = sx + sr + 14;
    if (bx + bw > w - 8) bx = sx - sr - 14 - bw;
    bx = Math.max(8, Math.min(bx, w - bw - 8));
    const by = Math.max(8, Math.min(sy - 10, h - bh - 8));
    ctx.translate(bx, by);
    ctx.fillStyle = this.pal('--modux-surface', 'rgba(255,255,255,0.96)');
    ctx.strokeStyle = this.pal('--modux-border-strong', '#cbd5e1');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(0, 0, bw, bh, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.pal('--modux-text', '#0f172a');
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, 12, 9);
    ctx.fillStyle = n.color;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(sub, 12, 25);
    ctx.fillStyle = this.pal('--modux-text-dim', '#475569');
    lines.forEach((l, i) => ctx.fillText(l, 12, 41 + i * 15));
    let ny = 41 + lines.length * 15 + (names.length ? 8 : 0);
    names.forEach((x) => {
      ctx.fillStyle = x.color;
      ctx.beginPath();
      ctx.arc(15, ny + 5.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.pal('--modux-text', '#334155');
      ctx.fillText(x.label, 24, ny);
      ny += 15;
    });
    if (more > 0) {
      ctx.fillStyle = this.pal('--modux-text-faint', '#94a3b8');
      ctx.fillText(t('explorer.card.andMore', { count: more }), 24, ny);
    }
    if (hint) {
      ctx.fillStyle = this.pal('--modux-text-faint', '#94a3b8');
      ctx.fillText(hint, 12, bh - 16);
    }
    ctx.restore();
  }

  // ── Search & fly ──────────────────────────────────────────────────────

  private static fold(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  private onSearchInput(e: Event): void {
    this._q = (e.target as HTMLInputElement).value;
    const q = ModuxExplorer.fold(this._q.trim());
    this._active = 0;
    this._sugs =
      q.length < 2
        ? []
        : this.allNodes
            .filter((n) => n.kind !== 'root' && ModuxExplorer.fold(n.label).includes(q))
            .slice(0, 8);
  }

  private onSearchKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._active = Math.min(this._active + 1, this._sugs.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._active = Math.max(this._active - 1, 0);
    } else if (e.key === 'Enter' && this._sugs.length) {
      this.flyToNode(this._sugs[this._active]);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      this._q = '';
      this._sugs = [];
      (e.target as HTMLInputElement).blur();
    }
  }

  /** Where the node lives, for disambiguation («Reservas › Reserva»). */
  private pathOf(n: XNode): string {
    const parts: string[] = [];
    for (let p = n.parent; p && p.kind !== 'root'; p = p.parent) parts.unshift(p.label);
    return parts.join(' › ');
  }

  /** Expands the path to the node (each level explodes) and flies the camera. */
  private flyToNode(n: XNode): void {
    const chain: XNode[] = [];
    for (let p = n.parent; p; p = p.parent) chain.unshift(p);
    for (const a of chain) if (!a.expanded) this.toggle(a);
    this.flight = { node: n, until: this.t + 1.5 };
    this.found = { node: n, until: this.t + 3.2 };
    this._q = '';
    this._sugs = [];
    this.saveState();
  }

  /** Eases the camera towards the flight target, re-aiming as physics moves it. */
  private stepFlight(): void {
    if (!this.flight) return;
    if (this.t > this.flight.until) {
      this.flight = undefined;
      return;
    }
    const n = this.flight.node;
    const w = this.clientWidth || 800;
    const h = this.clientHeight || 600;
    const tk = Math.max(0.9, Math.min(1.2, this.cam.k));
    this.cam.k += (tk - this.cam.k) * 0.08;
    this.cam.x += (w / 2 - n.x * this.cam.k - this.cam.x) * 0.12;
    this.cam.y += (h / 2 - n.y * this.cam.k - this.cam.y) * 0.12;
  }

  // ── Interaction ───────────────────────────────────────────────────────

  /** A client point → world coordinates (palette drops share the canvas contract). */
  sceneFromClient(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.cam.x) / this.cam.k,
      y: (clientY - rect.top - this.cam.y) / this.cam.k,
    };
  }

  /** The MODEL element under a client point (its refId), for palette drops. */
  nodeIdAtClient(clientX: number, clientY: number): string | null {
    const w = this.sceneFromClient(clientX, clientY);
    const n = this.nodeAt(w.x, w.y);
    return n && n.kind !== 'root' && n.kind !== 'group' && n.refId ? n.refId : null;
  }

  /** The refId chain from the element up to the root (grouping nodes skipped). */
  chainOf(refId: string): string[] {
    const node = this.allNodes.find((n) => n.refId === refId);
    const out: string[] = [];
    for (let cur: XNode | undefined = node; cur; cur = cur.parent) {
      if (cur.refId && cur.kind !== 'group' && cur.kind !== 'root') out.push(cur.refId);
    }
    return out.length ? out : [refId];
  }

  private toWorld(e: PointerEvent | WheelEvent): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - this.cam.x) / this.cam.k,
      y: (e.clientY - rect.top - this.cam.y) / this.cam.k,
    };
  }

  private nodeAt(wx: number, wy: number): XNode | undefined {
    // Iterate deepest-last so small leaves win over their big parents.
    const nodes = this.visible();
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const r = this.radiusOf(n) + 4 / this.cam.k;
      if ((wx - n.x) ** 2 + (wy - n.y) ** 2 <= r * r) return n;
    }
    return undefined;
  }

  private onPointerDown(e: PointerEvent): void {
    this.flight = undefined; // the user takes the wheel back
    const w = this.toWorld(e);
    this.downAt = { x: e.clientX, y: e.clientY };
    this.moved = false;
    const n = this.nodeAt(w.x, w.y);
    // shift/ctrl + drag FROM a node draws a relation — the node is a big target,
    // no aiming at a moving handle.
    if (n && n.kind !== 'root' && (e.shiftKey || e.ctrlKey)) {
      this.linking = { source: n, x: w.x, y: w.y };
      try {
        (e.target as Element).setPointerCapture(e.pointerId);
      } catch {
        /* synthetic events */
      }
      return;
    }
    if (n) {
      this.dragNode = n;
    } else if (this._space) {
      this.panning = true;
    } else {
      // Plain background drag selects (like the 2D canvas); space pans.
      this.rubber = { ax: w.x, ay: w.y, bx: w.x, by: w.y, additive: e.shiftKey };
    }
    this.focus();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events */
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > 4) this.moved = true;
    if (this.linking) {
      const w = this.toWorld(e);
      this.linking.x = w.x;
      this.linking.y = w.y;
      this.hover = this.nodeAt(w.x, w.y); // highlight the target under the line
      return;
    }
    if (this.dragNode) {
      const w = this.toWorld(e);
      this.dragNode.x = w.x;
      this.dragNode.y = w.y;
      return;
    }
    if (this.rubber && (e.buttons & 1)) {
      const w = this.toWorld(e);
      this.rubber.bx = w.x;
      this.rubber.by = w.y;
      return;
    }
    if (this.panning && (e.buttons & 1)) {
      this.cam.x += e.movementX;
      this.cam.y += e.movementY;
      return;
    }
    const w = this.toWorld(e);
    const prev = this.hover;
    this.hover = this.nodeAt(w.x, w.y);
    if (this.hover !== prev) this.hoverAt = this.t;
    if (this.canvas) this.canvas.style.cursor = this.hover ? 'pointer' : 'default';
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.linking) {
      const w = this.toWorld(e);
      const target = this.nodeAt(w.x, w.y);
      const source = this.linking.source;
      this.linking = undefined;
      if (target && target !== source && target.kind !== 'root' && source.refId && target.refId) {
        this.dispatchEvent(
          new CustomEvent('explorer-connect', {
            // client coords travel along: pickers (fixed-position) open at the drop point
            detail: { sourceId: source.refId, targetId: target.refId, x: e.clientX, y: e.clientY },
            bubbles: true,
            composed: true,
          }),
        );
      }
      return;
    }
    if (this.rubber) {
      const r = this.rubber;
      this.rubber = undefined;
      if (this.moved) {
        const x0 = Math.min(r.ax, r.bx);
        const x1 = Math.max(r.ax, r.bx);
        const y0 = Math.min(r.ay, r.by);
        const y1 = Math.max(r.ay, r.by);
        const caught = this.visible()
          .filter((n) => n.kind !== 'root' && n.kind !== 'group' && n.refId)
          .filter((n) => n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1)
          .map((n) => n.key);
        this.selected = new Set(r.additive ? [...this.selected, ...caught] : caught);
      } else {
        // a plain click on the background clears selection and focus
        this.selected = new Set();
        this.focusKeys = undefined;
      }
      return;
    }
    const n = this.dragNode;
    this.dragNode = undefined;
    this.panning = false;
    if (n && !this.moved) {
      if (e.altKey) this.focusOn(n);
      else {
        // click both SELECTS (Supr/F2 target) and unfolds — one gesture, two truths.
        // The unfold waits a beat: the second click of a DOUBLE click must open
        // the ficha, not flap the node open and shut on its way there.
        this.selected = new Set(n.kind !== 'root' && n.refId ? [n.key] : []);
        const now = performance.now();
        const secondClick = this.lastClickKey === n.key && now - this.lastClickAt < 350;
        this.lastClickKey = n.key;
        this.lastClickAt = now;
        window.clearTimeout(this.clickTimer);
        if (!secondClick) this.clickTimer = window.setTimeout(() => this.toggle(n), 240);
      }
    } else if (!n && !this.moved && this.focusKeys) {
      // a plain click on the background lets go of the focus
      this.focusKeys = undefined;
    }
  }

  /** Click: the node explodes — children burst out from it and the springs settle. */
  private toggle(n: XNode): void {
    if (!n.children?.length) return;
    n.expanded = !n.expanded;
    if (n.expanded) {
      // Children are born at the parent and shot outwards, away from the
      // grandparent so the subtree opens into free space.
      const away = n.parent ? Math.atan2(n.y - n.parent.y, n.x - n.parent.x) : Math.random() * Math.PI * 2;
      const spread = n.parent ? Math.PI * 1.25 : Math.PI * 2;
      const kids = n.children;
      kids.forEach((c, i) => {
        this.materialize(c.parent!);
        const a = away - spread / 2 + (spread * (i + 0.5)) / kids.length;
        c.x = n.x + Math.cos(a) * 6;
        c.y = n.y + Math.sin(a) * 6;
        c.vx = Math.cos(a) * 7;
        c.vy = Math.sin(a) * 7;
        if (!c.children) c.children = this.childrenOf(c);
      });
      // A little recoil on the parent sells the explosion.
      n.vx -= Math.cos(away) * 2;
      n.vy -= Math.sin(away) * 2;
    }
  }

  private onDblClick(e: MouseEvent): void {
    // The pending single-click unfold dies here: double click means «open», only that.
    window.clearTimeout(this.clickTimer);
    const rect = this.getBoundingClientRect();
    const wx = (e.clientX - rect.left - this.cam.x) / this.cam.k;
    const wy = (e.clientY - rect.top - this.cam.y) / this.cam.k;
    const n = this.nodeAt(wx, wy);
    if (!n || n.kind === 'root') return;
    this.dispatchEvent(
      new CustomEvent('node-activated', {
        detail: { id: n.refId, kind: n.kind },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.flight = undefined;
    const rect = this.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.0012);
    const k = Math.min(2.5, Math.max(0.25, this.cam.k * factor));
    const real = k / this.cam.k;
    this.cam.x = px - (px - this.cam.x) * real;
    this.cam.y = py - (py - this.cam.y) * real;
    this.cam.k = k;
  }

  render() {
    return html`
      <canvas
        @pointerdown=${this.onPointerDown}
        @pointermove=${this.onPointerMove}
        @pointerup=${this.onPointerUp}
        @dblclick=${this.onDblClick}
        @wheel=${this.onWheel}
      ></canvas>
      ${this.renaming
        ? html`<input
            class="rename"
            .value=${this.renaming.value}
            @pointerdown=${(e: Event) => e.stopPropagation()}
            @input=${(e: Event) => (this.renaming = { ...this.renaming!, value: (e.target as HTMLInputElement).value })}
            @keydown=${(e: KeyboardEvent) => {
              e.stopPropagation();
              if (e.key === 'Escape') this.renaming = null;
              if (e.key === 'Enter') {
                const n = this.visible().find((x) => x.key === this.renaming!.key);
                const name = this.renaming!.value.trim();
                this.renaming = null;
                if (n && name && name !== n.label) {
                  n.label = name; // optimistic: the projection will confirm
                  this.emitUp('node-renamed', { id: n.refId, kind: n.kind, name });
                }
              }
            }}
            @blur=${() => (this.renaming = null)}
          />`
        : ''}
      <div class="search" @pointerdown=${(e: Event) => e.stopPropagation()}>
        <input
          type="text"
          placeholder=${t('explorer.search.placeholder')}
          .value=${this._q}
          @input=${this.onSearchInput}
          @keydown=${this.onSearchKeydown}
        />
        ${this._sugs.length
          ? html`<ul class="sugs">
              ${this._sugs.map(
                (n, i) => html`<li
                  class=${i === this._active ? 'active' : ''}
                  @mouseenter=${() => (this._active = i)}
                  @click=${() => this.flyToNode(n)}
                >
                  <span class="dot" style="background:${n.color}"></span>
                  <span class="name">${n.label}</span>
                  <span class="path">${this.pathOf(n) || kindLabel(n.kind)}</span>
                </li>`,
              )}
            </ul>`
          : this._q.trim().length >= 2
            ? html`<ul class="sugs"><li class="empty">${t('explorer.search.noResults')}</li></ul>`
            : null}
      </div>
      <div class="controls" @pointerdown=${(e: Event) => e.stopPropagation()}>
        <span>${t('explorer.controls.levels')}</span>
        <input
          type="range"
          min="0"
          max=${Math.max(5, this.sceneDepth())}
          step="1"
          .value=${String(this._levels)}
          title=${t('explorer.controls.levelsTooltip')}
          @input=${(e: Event) => this.applyLevelsManually(Number((e.target as HTMLInputElement).value))}
        />
        <button title=${t('explorer.controls.collapseAllTooltip')} @click=${() => this.applyLevelsManually(0)}>
          ${t('explorer.controls.collapseAll')}
        </button>
        <span>${t('explorer.controls.physics')}</span>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          .value=${String(Math.round(this._motion * 100))}
          title=${t('explorer.controls.physicsTooltip')}
          @input=${(e: Event) => (this._motion = Number((e.target as HTMLInputElement).value) / 100)}
        />
        <button
          title=${this._motion > 0 ? t('explorer.controls.stopMotion') : t('explorer.controls.resumeMotion')}
          @click=${() => (this._motion = this._motion > 0 ? 0 : 1)}
        >
          ${this._motion > 0 ? '⏸' : '▶'}
        </button>
        <button
          title=${this._threads
            ? t('explorer.controls.threadsHoverTooltip')
            : t('explorer.controls.threadsAlwaysTooltip')}
          @click=${() => (this._threads = !this._threads)}
        >
          ∿ ${this._threads ? t('explorer.controls.threadsAlways') : t('explorer.controls.threadsHover')}
        </button>
        ${this._viewNaming
          ? html`
              <input
                type="text"
                style="width: 130px"
                placeholder=${t('explorer.view.namePlaceholder')}
                .value=${this._viewName}
                @input=${(e: Event) => (this._viewName = (e.target as HTMLInputElement).value)}
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === 'Enter') this.createViewFromVisible();
                  if (e.key === 'Escape') this._viewNaming = false;
                }}
              />
              <button @click=${() => this.createViewFromVisible()}>${t('explorer.view.create')}</button>
              <button @click=${() => (this._viewNaming = false)}>✕</button>
            `
          : html`<button
              title=${t('explorer.view.newTooltip')}
              @click=${() => (this._viewNaming = true)}
            >
              ⊞ ${t('explorer.view.new')}
            </button>`}
      </div>
      <div class="hud">
        ${t('explorer.help.line1')}<br />
        ${t('explorer.help.line2')}<br />
        ${t('explorer.help.line3')}<br />
        ${t('explorer.help.line4')}
      </div>
    `;
  }
}
