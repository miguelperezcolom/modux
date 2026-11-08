/**
 * Archi-style shell (PROTOTYPE) — four-zone Archi layout over the real
 * `modux-canvas`, with Archi's drawing UX handled INSIDE the canvas (tool mode):
 * pick a tool, click-to-place nodes, click-source→click-target with live rubber
 * line + green/red target feedback, magic connector, create-on-empty, and Archi's
 * validity rule from Archi's real matrix. The shell only owns semantics (validity,
 * menus, model mutation); the canvas owns the gesture + feedback (direct manipulation).
 */
import { LitElement, html, css, nothing, svg, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import '../modux-canvas.js';
import { SYMBOLS, type CanvasTool, type ModuxCanvas } from '../modux-canvas.js';
import type { Scene, SceneNode, SceneEdge, Point } from '../scene.js';
import type { ModuxModel } from '../model.js';
import { catalogEntries, retypeKey, type CatalogEntry } from './catalog.js';
import { RETYPES, retypeTargets } from '../store/commands/retype.js';
import { snapValue } from '../snap.js';

/** SPIKE: a free-form view is just which model elements it shows and where. */
type ViewMembers = { members: { id: string; x: number; y: number; w: number; h: number }[] };
import { EXAMPLE_SCENE, LAYER, ARCHIMATE_SYMBOL, type LayerKey } from './example-scene.js';
import { validRelations, canDraw, REL_NOTATION, REL_TYPES, type RelOption } from './magic.js';
import { connectionOptions, type GestureHost } from '../gestures.js';

/** A meaning the traced line can take in the model (from the editor's gesture vocabulary). */
interface ConnectOption { id: string; label: string; hint: string; apply(): void }

interface ElementTool { kind: string; label: string; layer: LayerKey; w: number; h: number; container?: boolean; group: string; }
/** Element palette groups, in display order — new (high-level) groups slot in here. */
const ELEMENT_GROUPS = ['Estratégico', 'Dominio', 'Comportamiento', 'Orquestación', 'Integración', 'Externo', 'IA', 'UI', 'Despliegue', 'Módulos', 'Otros'];
const ELEMENT_TOOLS: ElementTool[] = [
  { kind: 'component', label: 'Contexto', layer: 'context', w: 240, h: 130, container: true, group: 'Estratégico' },
  { kind: 'aggregate', label: 'Agregado', layer: 'domain', w: 160, h: 66, group: 'Dominio' },
  { kind: 'entity', label: 'Entidad', layer: 'domain', w: 160, h: 66, group: 'Dominio' },
  { kind: 'value-object', label: 'Value object', layer: 'domain', w: 150, h: 56, group: 'Dominio' },
  { kind: 'invariant', label: 'Invariante', layer: 'domain', w: 150, h: 56, group: 'Dominio' },
  { kind: 'read-model', label: 'Read model', layer: 'domain', w: 160, h: 56, group: 'Dominio' },
  { kind: 'policy', label: 'Policy', layer: 'domain', w: 150, h: 56, group: 'Dominio' },
  { kind: 'event', label: 'Evento', layer: 'event', w: 200, h: 62, group: 'Dominio' },
  { kind: 'usecase', label: 'Caso de uso', layer: 'behavior', w: 160, h: 62, group: 'Comportamiento' },
  { kind: 'service', label: 'Servicio', layer: 'behavior', w: 170, h: 50, group: 'Comportamiento' },
  { kind: 'person', label: 'Actor', layer: 'behavior', w: 130, h: 74, group: 'Comportamiento' },
  { kind: 'workflow', label: 'Workflow', layer: 'orchestration', w: 240, h: 130, container: true, group: 'Orquestación' },
  { kind: 'workflow-step', label: 'Paso', layer: 'orchestration', w: 150, h: 56, group: 'Orquestación' },
  { kind: 'etl-flow', label: 'Flujo ETL', layer: 'orchestration', w: 160, h: 56, group: 'Orquestación' },
  { kind: 'api', label: 'API', layer: 'api', w: 160, h: 56, group: 'Integración' },
  { kind: 'api-operation', label: 'Operación API', layer: 'api', w: 170, h: 52, group: 'Integración' },
  { kind: 'proxy-api', label: 'Proxy API', layer: 'api', w: 160, h: 56, group: 'Integración' },
  { kind: 'integration-event', label: 'Evento integración', layer: 'api', w: 200, h: 56, group: 'Integración' },
  { kind: 'external-system', label: 'Sistema externo', layer: 'external', w: 220, h: 120, container: true, group: 'Externo' },
  { kind: 'identity-provider', label: 'IdP', layer: 'external', w: 150, h: 56, group: 'Externo' },
  { kind: 'ai-agent', label: 'Agente IA', layer: 'ai', w: 160, h: 60, group: 'IA' },
  { kind: 'mcp-gateway', label: 'Gateway MCP', layer: 'ai', w: 170, h: 56, group: 'IA' },
  { kind: 'rag', label: 'RAG', layer: 'ai', w: 140, h: 56, group: 'IA' },
  { kind: 'ui-app', label: 'App UI', layer: 'ui', w: 240, h: 130, container: true, group: 'UI' },
  { kind: 'page', label: 'Página', layer: 'ui', w: 150, h: 60, group: 'UI' },
  { kind: 'menu-item', label: 'Menú', layer: 'ui', w: 140, h: 48, group: 'UI' },
  { kind: 'deployment', label: 'Servicio (despliegue)', layer: 'tech', w: 280, h: 170, container: true, group: 'Despliegue' },
  { kind: 'module', label: 'Módulo', layer: 'tech', w: 160, h: 60, group: 'Módulos' },
  { kind: 'bff', label: 'BFF', layer: 'tech', w: 160, h: 56, group: 'Módulos' },
  { kind: 'acl', label: 'ACL', layer: 'tech', w: 150, h: 56, group: 'Módulos' },
  { kind: 'api-gateway', label: 'API Gateway', layer: 'tech', w: 170, h: 56, group: 'Módulos' },
  { kind: 'adapter', label: 'Adaptador', layer: 'tech', w: 160, h: 56, group: 'Módulos' },
  { kind: 'saga', label: 'Saga', layer: 'tech', w: 160, h: 56, group: 'Módulos' },
  { kind: 'projector', label: 'Projector', layer: 'tech', w: 160, h: 56, group: 'Módulos' },
  { kind: 'scheduler', label: 'Scheduler', layer: 'tech', w: 150, h: 56, group: 'Módulos' },
  { kind: 'junction', label: 'Junction', layer: 'behavior', w: 16, h: 16, group: 'Otros' },
];

/** Non-ArchiMate extras (Archi's Note/Group section of the palette). */
const EXTRA_TOOLS: ElementTool[] = [
  { kind: 'group', label: 'Grupo', layer: 'context', w: 240, h: 150, container: true, group: 'Extras' },
  { kind: 'note', label: 'Nota', layer: 'event', w: 160, h: 64, group: 'Extras' },
];

const KIND_LAYER: Record<string, LayerKey> = {
  component: 'context', area: 'context', system: 'context',
  event: 'event',
  usecase: 'behavior', person: 'behavior', service: 'behavior', policy: 'behavior', 'query-service': 'behavior',
  workflow: 'orchestration', 'workflow-step': 'orchestration', 'etl-flow': 'orchestration', process: 'orchestration',
  api: 'api', 'api-operation': 'api', 'proxy-api': 'api', 'integration-event': 'api', subscription: 'api', notification: 'api',
  gateway: 'external',
  'external-system': 'external', 'identity-provider': 'external',
  'ai-agent': 'ai', 'mcp-gateway': 'ai', rag: 'ai',
  'ui-app': 'ui', page: 'ui', 'menu-item': 'ui',
  deployment: 'tech', module: 'tech', bff: 'tech', acl: 'tech', 'api-gateway': 'tech', adapter: 'tech', saga: 'tech', projector: 'tech', scheduler: 'tech',
};
function kindLayer(kind: string): LayerKey { return KIND_LAYER[kind] ?? 'domain'; }

/**
 * Bound-mode wiring (free-form view over a real catalog): palette kind → the real modux command
 * that mints the element. Only kinds that create a STANDALONE element visible in the projection
 * are here; parent-only or unsupported kinds fall through to a "not wired" notice. The module
 * patterns (bff/acl/api-gateway/adapter) are minted as plain modules — «al final, eso serán
 * módulos» — until the schema carries a module pattern.
 */
const BOUND_CREATE: Record<string, (id: string, name: string) => Record<string, unknown>> = {
  component: (id, name) => ({ kind: 'add-boundedContext', id, name, subdomainType: 'GENERIC' }),
  aggregate: (id, name) => ({ kind: 'add-aggregate', id, name }),
  entity: (id, name) => ({ kind: 'add-entity', id, name }),
  'value-object': (id, name) => ({ kind: 'add-value-object', id, name }),
  person: (id, name) => ({ kind: 'add-actor', id, name }),
  usecase: (id, name) => ({ kind: 'add-use-case', id, name }),
  policy: (id, name) => ({ kind: 'add-use-case', id, name, policy: true }),
  workflow: (id, name) => ({ kind: 'add-workflow', id, name }),
  'etl-flow': (id, name) => ({ kind: 'add-etl-flow', id, name }),
  api: (id, name) => ({ kind: 'add-api', id, name }),
  'proxy-api': (id, name) => ({ kind: 'add-proxy-api', id, name }),
  'external-system': (id, name) => ({ kind: 'add-external-system', id, name }),
  'identity-provider': (id, name) => ({ kind: 'add-identity-provider', id, name }),
  'ai-agent': (id, name) => ({ kind: 'add-ai-agent', id, name }),
  'mcp-gateway': (id, name) => ({ kind: 'add-mcp-gateway', id, name }),
  rag: (id, name) => ({ kind: 'add-rag', id, name }),
  'ui-app': (id, name) => ({ kind: 'create-ui-app', id, name }),
  page: (id, name) => ({ kind: 'create-ui-page', id, name }),
  deployment: (id, name) => ({ kind: 'add-service', id, name }),
  module: (id, name) => ({ kind: 'add-module', id, name, boundedContextId: '' }),
  bff: (id, name) => ({ kind: 'add-module', id, name, boundedContextId: '' }),
  acl: (id, name) => ({ kind: 'add-module', id, name, boundedContextId: '' }),
  'api-gateway': (id, name) => ({ kind: 'add-module', id, name, boundedContextId: '' }),
  adapter: (id, name) => ({ kind: 'add-module', id, name, boundedContextId: '' }),
  // These live nested inside a parent; created loose (top-level) and adopted later by a composition edge.
  invariant: (id, name) => ({ kind: 'add-loose-element', id, name, elementType: 'invariant' }),
  'read-model': (id, name) => ({ kind: 'add-loose-element', id, name, elementType: 'read-model' }),
  'integration-event': (id, name) => ({ kind: 'add-loose-element', id, name, elementType: 'integration-event' }),
};

/** Human label of a node kind, for the catalog tree — elements of different kinds often share a name. */
const CATALOG_KIND_LABEL: Record<string, string> = {
  ...Object.fromEntries(ELEMENT_TOOLS.map((t) => [t.kind, t.label])),
  deployment: 'Servicio', service: 'Servicio de dominio', 'query-service': 'Query service', model: 'Modelo',
  system: 'Sistema', projector: 'Proyección', saga: 'Saga', gateway: 'Gateway', subscription: 'Suscripción',
  notification: 'Notificación', process: 'Proceso',
};

/** Palette kind → store type, for a freshly minted element that is not in the projection yet. */
const BOUND_CONTEXT_TYPE: Record<string, string> = {
  aggregate: 'aggregates', usecase: 'useCases', policy: 'useCases',
};

/** The size a kind is placed at: its palette tool's, or a plain box for catalog-only kinds. */
function defaultSize(kind: string): { w: number; h: number } {
  const tool = ELEMENT_TOOLS.find((t) => t.kind === kind);
  return tool ? { w: tool.w, h: tool.h } : { w: 170, h: 56 };
}

/** Node kind → the `type` the rename-element command expects (rename.ts). Absent ⇒ rename unsupported. */
const RENAME_TYPE: Record<string, string> = {
  component: 'boundedContext', aggregate: 'aggregate', entity: 'entity', 'value-object': 'value-object',
  person: 'actor', usecase: 'use-case', workflow: 'workflow', api: 'api', 'proxy-api': 'proxy-api',
  'external-system': 'external-system', 'ai-agent': 'ai-agent', 'mcp-gateway': 'mcp-gateway', rag: 'rag',
  'ui-app': 'ui-app', page: 'page', 'read-model': 'read-model', 'integration-event': 'integration-event',
};

/**
 * Cross-view clipboard for bound mode. Shared across editor webviews via localStorage (every modux
 * editor is served from the same origin, so they share it), with an in-memory fallback for the same
 * webview when storage is unavailable. Copy in one view, paste in another → the target view ADDS the
 * same elements (their relations re-derive); paste in the SAME view → the elements are DUPLICATED.
 */
type ClipItem = { id: string; kind: string; label: string; x: number; y: number; w: number; h: number };
type ClipData = { sourceView: string; items: ClipItem[] };
const CLIP_KEY = 'modux-archi-clipboard';
let clipFallback: ClipData | null = null;
function writeClip(data: ClipData) {
  clipFallback = data;
  try { localStorage.setItem(CLIP_KEY, JSON.stringify(data)); } catch { /* storage unavailable: fall back to memory */ }
}
function readClip(): ClipData | null {
  try { const raw = localStorage.getItem(CLIP_KEY); if (raw) return JSON.parse(raw) as ClipData; } catch { /* ignore */ }
  return clipFallback;
}
/** Distinguishes views that have no id yet, so same-webview paste still duplicates. */
let viewSeq = 0;

type Tool =
  | { kind: 'select' }
  | { kind: 'place'; el: ElementTool }
  | { kind: 'connect'; rel: string | null }; // rel null = magic connector

@customElement('archi-shell')
export class ArchiShell extends LitElement {
  @state() private scene: Scene = structuredClone(EXAMPLE_SCENE);
  /**
   * SPIKE (vista libre): el modelo es la fuente de verdad; la VISTA solo dice qué
   * elementos muestra y dónde. No hay vistas especializadas — el usuario decide qué
   * incluir. La escena se resuelve: miembros de la vista → elementos del modelo.
   */
  @property({ attribute: false }) model: ModuxModel | null = null;
  @property({ attribute: false }) view: ViewMembers = { members: [] };
  /** Which view this shell edits — distinguishes same-view (duplicate) from cross-view (add) paste. */
  @property() viewId?: string;
  private _viewKey = `v-${++viewSeq}-${Date.now()}`;
  /** Stable per-view key: the document's id when it has one, else a per-instance fallback. */
  private get vk() { return this.viewId ?? this._viewKey; }
  private get bound() { return !!this.model; }
  private emit(name: string, detail: unknown) { this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true })); }
  protected willUpdate(changed: PropertyValues) {
    if (this.bound && (changed.has('model') || changed.has('view'))) {
      this.scene = this.buildViewScene();
    }
  }
  /** kind de nodo → tipo del modelo (para rename-element). */
  private modelType(n: SceneNode) {
    return (this.bound ? this.catalogById().get(n.id)?.renameType : undefined) ?? RENAME_TYPE[n.kind] ?? n.kind;
  }
  /** Resuelve un id del modelo a { kind de nodo, label }, recorriendo el modelo proyectado. */
  private resolveElement(id: string): { kind: string; label: string } | null {
    const e = this.catalogById().get(id);
    return e ? { kind: e.kind, label: e.label } : null;
  }
  private _catalogIndex: { model: ModuxModel; byId: Map<string, CatalogEntry> } | null = null;
  private catalogById(): Map<string, CatalogEntry> {
    const m = this.model!;
    if (this._catalogIndex?.model !== m) this._catalogIndex = { model: m, byId: new Map(catalogEntries(m).map((e) => [e.id, e])) };
    return this._catalogIndex.byId;
  }
  /** Escena = miembros de la vista (resueltos contra el modelo) + relaciones entre ellos. */
  private buildViewScene(): Scene {
    const m = this.model!;
    const ids = new Set(this.view.members.map((x) => x.id));
    const nodes: SceneNode[] = [];
    for (const mem of this.view.members) {
      const el = this.resolveElement(mem.id); if (!el) continue;
      nodes.push({
        id: mem.id, label: el.label, kind: el.kind, symbol: ARCHIMATE_SYMBOL[el.kind] ?? el.kind,
        x: mem.x, y: mem.y, w: mem.w, h: mem.h,
        fill: LAYER[kindLayer(el.kind)].fill, stroke: '#5C5C5C',
      });
    }
    const edges: SceneEdge[] = [];
    // A child drawn inside its owner needs no composition line: the nesting already says it (as in
    // ArchiMate). The line only shows when the two are apart on the canvas.
    const box = new Map(this.view.members.map((x) => [x.id, x]));
    const nestedIn = (childId: string, ownerId: string) => {
      const c = box.get(childId), o = box.get(ownerId);
      return !!c && !!o && Math.abs(c.x - o.x) < o.w / 2 && Math.abs(c.y - o.y) < o.h / 2;
    };
    for (const r of m.relations ?? []) if (ids.has(r.sourceId) && ids.has(r.targetId))
      edges.push({ id: `rel:${r.sourceId}->${r.targetId}`, sourceId: r.sourceId, targetId: r.targetId, kind: 'association', markerEnd: 'open-arrow', label: r.type ?? undefined });
    for (const a of m.aggregates ?? []) if (a.boundedContextId && ids.has(a.id) && ids.has(a.boundedContextId) && !nestedIn(a.id, a.boundedContextId))
      edges.push({ id: `agg-ctx:${a.id}`, sourceId: a.boundedContextId, targetId: a.id, kind: 'composition', markerStart: 'diamond' });
    for (const e of m.entities ?? []) if (e.aggregateId && ids.has(e.id) && ids.has(e.aggregateId))
      edges.push({ id: `ent-agg:${e.id}`, sourceId: e.aggregateId, targetId: e.id, kind: 'composition', markerStart: 'diamond' });
    for (const v of m.valueObjects ?? []) if (v.aggregateId && ids.has(v.id) && ids.has(v.aggregateId))
      edges.push({ id: `vo-agg:${v.id}`, sourceId: v.aggregateId, targetId: v.id, kind: 'composition', markerStart: 'diamond' });
    // What else a context nests (use cases, events, read models, query services…): composed by it too.
    for (const e of catalogEntries(m)) if (e.ownerId && e.kind !== 'aggregate' && ids.has(e.id) && ids.has(e.ownerId) && !nestedIn(e.id, e.ownerId))
      edges.push({ id: `nest-ctx:${e.id}`, sourceId: e.ownerId, targetId: e.id, kind: 'composition', markerStart: 'diamond' });
    // A projection writes its read model.
    for (const p of m.projections ?? []) if (p.readModelId && ids.has(p.id) && ids.has(p.readModelId))
      edges.push({ id: `proj-rm:${p.id}`, sourceId: p.id, targetId: p.readModelId, kind: 'access', markerEnd: 'open-arrow', dashed: true, dashArray: '2 3' });
    return { nodes, edges };
  }
  @state() private selectedId: string | null = null;
  @state() private selectedIds: string[] = [];
  @state() private edgePoints: Record<string, Point[]> = {};
  @state() private collapsed = new Set<string>();
  @state() private tab: 'main' | 'appearance' | 'properties' = 'main';
  @state() private treeQuery = '';
  @state() private paletteWidth = 236;

  @state() private tool: Tool = { kind: 'select' };
  @state() private menu: { x: number; y: number; src: SceneNode; tgt: SceneNode; opts: RelOption[] } | null = null;
  /** Bound mode: several model meanings fit the traced line — pick one. */
  @state() private connectMenu: { x: number; y: number; src: SceneNode; tgt: SceneNode; options: ConnectOption[] } | null = null;
  @state() private createMenu: { x: number; y: number; src: SceneNode; sx: number; sy: number } | null = null;
  @state() private createExpand: string | null = null;
  @state() private toast: string | null = null;
  @state() private ctx: { x: number; y: number; id: string; isEdge: boolean } | null = null;
  /** Side store for editable properties the SceneNode type doesn't carry (docs, key-value props). */
  @state() private meta: Record<string, { doc: string; props: { k: string; v: string }[] }> = {};
  /** Sticky palette tool (Shift-click keeps the tool selected after use, like Archi). */
  private sticky = false;
  /** Element being dragged from the palette onto the canvas (pointer-based; see beginPaletteDrag). */
  /** Catalog element being dragged from the tree onto the canvas (see beginCatalogDrag). */
  @state() private _catalogDrag: { entry: CatalogEntry; x: number; y: number; startX: number; startY: number; moved: boolean } | null = null;
  @state() private _paletteDrag: { el: ElementTool; x: number; y: number; startX: number; startY: number; moved: boolean } | null = null;
  /** Format painter: the fill to stamp onto clicked nodes (null = painter off). */
  @state() private painter: string | null = null;

  private seq = 0;
  private toastTimer = 0;

  connectedCallback() { super.connectedCallback(); window.addEventListener('keydown', this.onKey); }
  disconnectedCallback() { super.disconnectedCallback(); window.removeEventListener('keydown', this.onKey); }
  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { this.resetTool(); return; }
    const path = e.composedPath();
    const tag = (path[0] as HTMLElement | undefined)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    // Copy/paste: the canvas doesn't handle these, so act regardless of focus.
    if ((e.metaKey || e.ctrlKey) && (e.key === 'c' || e.key === 'C')) { this.copy(); return; }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'v' || e.key === 'V')) { e.preventDefault(); this.paste(); return; }
    // The canvas handles its own Del / Ctrl+Z while focused; only act when focus is elsewhere.
    if (path.some((el) => (el as HTMLElement | undefined)?.tagName === 'MODUX-CANVAS')) return;
    if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); this.redo(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { if (this.selectedIds.length || this.selectedId) { e.preventDefault(); this.deleteSelected(); } }
  };

  static styles = css`
    :host { display: grid; grid-template-columns: 264px 1fr var(--pal-w, 236px); grid-template-rows: 40px 1fr 224px;
      grid-template-areas: 'toolbar toolbar toolbar' 'tree canvas palette' 'tree props palette';
      height: 100vh; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; color: #1e293b; background: #eef1f5; }
    .toolbar { grid-area: toolbar; display: flex; align-items: center; gap: 12px; padding: 0 14px;
      background: linear-gradient(#fbfcfe, #eef1f5); border-bottom: 1px solid #cbd5e1; }
    .toolbar .brand { font-weight: 700; color: #0f172a; }
    .toolbar .brand small { font-weight: 500; color: #64748b; margin-left: 6px; }
    .toolbar .hint { font-size: 12px; color: #2563eb; }
    .toolbar .spacer { flex: 1; }
    .toolbar button { font: inherit; border: 1px solid #cbd5e1; background: #fff; color: #334155; padding: 4px 10px; border-radius: 6px; cursor: pointer; }
    .toolbar button.on { background: #2563eb; border-color: #2563eb; color: #fff; }
    .aligngrp { display: inline-flex; align-items: center; gap: 2px; padding: 0 6px; }
    .aligngrp button { padding: 3px 7px; font-size: 14px; line-height: 1; }
    .aligngrp .asep { width: 1px; height: 18px; background: #cbd5e1; margin: 0 4px; }
    .zoombar { position: absolute; right: 12px; top: 12px; z-index: 6; display: flex; flex-direction: column; gap: 3px; }
    .zoombar button { width: 30px; height: 28px; font-size: 15px; border: 1px solid #cbd5e1; background: rgba(255,255,255,.95); color: #334155; border-radius: 6px; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
    .zoombar button:hover { background: #f1f5f9; }

    .panel { background: #f7f8fa; border: 1px solid #d5dbe3; overflow: hidden; display: flex; flex-direction: column; }
    .panel > header { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #64748b;
      padding: 7px 10px; background: #eef1f5; border-bottom: 1px solid #d5dbe3; }
    .panel > .body { flex: 1; overflow: auto; }

    .tree { grid-area: tree; border-right: 1px solid #cbd5e1; }
    .tree .treesearch { margin: 6px 8px; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font: inherit; font-size: 12px; }
    .row { display: flex; align-items: center; gap: 6px; padding: 3px 8px; cursor: pointer; white-space: nowrap; user-select: none; }
    .row:hover { background: #e7edf5; }
    .row.sel { background: #d6e4ff; box-shadow: inset 2px 0 0 #3b82f6; }
    .row .twisty { width: 12px; color: #94a3b8; font-size: 10px; }
    .row .swatch { width: 13px; height: 13px; border-radius: 3px; border: 1px solid rgba(0,0,0,.25); flex: none; }
    .row .lbl { overflow: hidden; text-overflow: ellipsis; }
    .child { padding-left: 16px; }
    .row.folder { font-weight: 600; color: #334155; }
    .row.absent .lbl { color: #94a3b8; }
    .row .kindtag { color: #94a3b8; font-size: 10.5px; flex: none; }
    .row.absent .swatch { opacity: .45; }
    .row .add { margin-left: auto; color: #94a3b8; font-size: 12px; padding-right: 6px; visibility: hidden; }
    .row.absent:hover .add { visibility: visible; }
    .row.folder .fic { color: #94a3b8; margin-right: 2px; }
    .row .count { margin-left: auto; color: #94a3b8; font-size: 11px; font-weight: 400; padding-right: 6px; }
    .row .rel-ic { color: #94a3b8; width: 13px; text-align: center; }

    .canvas-wrap { grid-area: canvas; position: relative; overflow: hidden; background: #fff; border-left: 1px solid #d5dbe3; }
    modux-canvas { position: absolute; inset: 0; }
    .legend { position: absolute; left: 10px; bottom: 10px; z-index: 5; background: rgba(255,255,255,.92);
      border: 1px solid #d5dbe3; border-radius: 8px; padding: 8px 10px; display: flex; gap: 14px; font-size: 11px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .legend .k { display: flex; align-items: center; gap: 5px; color: #475569; }
    .legend .sw { width: 12px; height: 12px; border-radius: 3px; border: 1px solid rgba(0,0,0,.25); }

    .palette { grid-area: palette; border-left: 1px solid #cbd5e1; position: relative; }
    .presize { position: absolute; left: -3px; top: 0; bottom: 0; width: 7px; cursor: col-resize; z-index: 8; }
    .presize:hover, .presize.drag { background: rgba(37,99,235,.18); }
    .pgroup { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #94a3b8; padding: 8px 10px 3px; }
    .pgroup.pfold { cursor: pointer; display: flex; align-items: center; gap: 4px; user-select: none; }
    .pgroup.pfold:hover { color: #64748b; }
    .pgroup .ptw { font-size: 8px; color: #94a3b8; }
    .pgroup .pnote { text-transform: none; font-weight: 400; margin-left: auto; color: #cbd5e1; font-size: 9px; padding-right: 4px; }
    .pitem { display: flex; align-items: center; gap: 7px; padding: 4px 10px; cursor: pointer; }
    .pgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 2px 4px; padding: 2px 6px 6px; }
    .pgrid .pitem { padding: 3px 5px; gap: 5px; border-radius: 5px; overflow: hidden; min-width: 0; }
    .pgrid .pitem .lbl { min-width: 0; font-size: 12px; }
    .pitem:hover { background: #e7edf5; }
    .pitem.on { background: #dbeafe; box-shadow: inset 2px 0 0 #2563eb; }
    .pitem .sw { width: 13px; height: 13px; border-radius: 3px; flex: none; border: 1px solid rgba(0,0,0,.25); }
    .pitem .dash { width: 20px; flex: none; }
    .pico { flex: none; }
    .prel { flex: none; }
    .menu .mi .pico, .menu .mi .prel, .menu .subl .prel { flex: none; vertical-align: middle; }
    .pitem .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #334155; }

    .props { grid-area: props; border-top: 1px solid #cbd5e1; border-left: 1px solid #d5dbe3; }
    .tabs { display: flex; gap: 2px; background: #eef1f5; border-bottom: 1px solid #d5dbe3; padding: 4px 8px 0; }
    .tabs button { font: inherit; font-size: 12px; border: 1px solid transparent; border-bottom: none; background: none; color: #64748b;
      padding: 5px 12px; border-radius: 6px 6px 0 0; cursor: pointer; }
    .tabs button.on { background: #f7f8fa; border-color: #d5dbe3; color: #0f172a; font-weight: 600; }
    .form { padding: 12px 14px; display: grid; grid-template-columns: 96px 1fr; gap: 9px 12px; align-items: center; max-width: 640px; }
    .form label { color: #64748b; font-size: 12px; }
    .form input, .form textarea, .form .ro, .form select { font: inherit; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 8px; background: #fff; color: #1e293b; }
    .form .ro { background: #f1f5f9; color: #475569; }
    .form textarea { resize: vertical; min-height: 46px; }
    .empty { padding: 22px; color: #94a3b8; }
    .colorrow { display: flex; align-items: center; gap: 8px; }
    .colorrow input[type=color] { width: 34px; height: 26px; padding: 0; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; }
    .proptable { padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; max-width: 520px; }
    .proprow { display: grid; grid-template-columns: 1fr 1fr 28px; gap: 6px; }
    .proprow input { font: inherit; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 8px; }
    .proprow .del { border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; cursor: pointer; color: #64748b; }
    .addprop { align-self: start; font: inherit; font-size: 12px; border: 1px dashed #94a3b8; background: none; color: #2563eb; border-radius: 6px; padding: 5px 10px; cursor: pointer; }
    .ctxback { position: fixed; inset: 0; z-index: 59; }
    .menu .mi.sub { padding-left: 8px; color: #475569; }
    .menu .subl { display: inline-flex; align-items: center; gap: 6px; margin-left: 18px; }

    .menu { position: fixed; z-index: 60; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px;
      box-shadow: 0 8px 28px rgba(0,0,0,.18); padding: 4px; min-width: 190px; font-size: 13px; }
    .menu .mhead { font-size: 11px; color: #94a3b8; padding: 4px 8px; }
    .menu .mi { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 5px; cursor: pointer; }
    .menu .mi:hover { background: #dbeafe; }
    .menu .mi .rev { font-size: 10px; color: #94a3b8; margin-left: auto; }
    .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 70; background: #7f1d1d; color: #fff;
      padding: 8px 14px; border-radius: 8px; font-size: 13px; box-shadow: 0 6px 20px rgba(0,0,0,.2); }
    .drag-ghost { position: fixed; transform: translate(-50%, -50%); z-index: 80; pointer-events: none;
      background: #1e293b; color: #fff; padding: 3px 9px; border-radius: 6px; font-size: 11px; box-shadow: 0 4px 14px rgba(0,0,0,.25); }
  `;

  // ---- helpers -------------------------------------------------------------
  private node(id: string | null) { return this.scene.nodes.find((n) => n.id === id) ?? null; }
  private selectedNode() { return this.node(this.selectedId); }
  private select(id: string | null) { this.selectedId = id; this.selectedIds = id ? [id] : []; this.ctx = null; }
  /** Ctrl/Cmd-click: add or remove from the selection; the clicked node becomes primary. */
  private toggleSel(id: string) {
    const has = this.selectedIds.includes(id);
    this.selectedIds = has ? this.selectedIds.filter((x) => x !== id) : [...this.selectedIds, id];
    this.selectedId = this.selectedIds.includes(id) ? id : (this.selectedIds[this.selectedIds.length - 1] ?? null);
  }
  private onMultiToggle = (e: Event) => this.toggleSel((e as CustomEvent).detail.id);
  private onBoxed = (e: Event) => { const ids = (e as CustomEvent).detail.ids as string[]; this.selectedIds = ids; this.selectedId = ids[0] ?? null; };
  private onSelCleared = () => { this.selectedIds = []; this.selectedId = null; };
  private resetTool() { this.tool = { kind: 'select' }; this.menu = null; this.connectMenu = null; this.createMenu = null; this.createExpand = null; this.sticky = false; this.ctx = null; this.painter = null; }
  /** Select a palette tool; Shift-click makes it sticky (stays active after one use). */
  private pickTool(t: Tool, e: MouseEvent) { this.sticky = e.shiftKey; this.tool = t; this.menu = null; this.createMenu = null; }
  private metaOf(id: string) { return this.meta[id] ?? { doc: '', props: [] }; }
  private patchMeta(id: string, patch: Partial<{ doc: string; props: { k: string; v: string }[] }>) {
    this.meta = { ...this.meta, [id]: { ...this.metaOf(id), ...patch } };
  }
  private flash(msg: string) {
    this.toast = msg; clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toast = null), 2600);
  }
  private validator = (s: string, t: string, rel: string | null) => {
    if (this.bound) {
      const pair = (a: string, b: string) => (s === a && t === b) || (s === b && t === a);
      return (s === 'component' && t === 'component') || pair('component', 'aggregate') || pair('aggregate', 'entity') || pair('aggregate', 'value-object');
    }
    return rel === null ? validRelations(s, t).length > 0 : canDraw(rel, s, t) !== null;
  };

  /** Map the shell's tool to the canvas's tool contract. */
  private get canvasTool(): CanvasTool {
    const t = this.tool;
    if (t.kind === 'place') return { kind: 'place', nodeKind: t.el.kind, w: t.el.w, h: t.el.h };
    if (t.kind === 'connect') return { kind: 'connect', rel: t.rel };
    return { kind: 'select' };
  }

  // ---- editing loop: apply the canvas's mutations + undo/redo -------------
  private history: { scene: Scene; edgePoints: Record<string, Point[]> }[] = [];
  private future: { scene: Scene; edgePoints: Record<string, Point[]> }[] = [];
  private snap() { return { scene: structuredClone(this.scene), edgePoints: structuredClone(this.edgePoints) }; }
  /** Call before any model mutation so it can be undone. */
  private commit() { this.history = [...this.history, this.snap()].slice(-60); this.future = []; }
  /** The IDE host re-dispatches Cmd/Ctrl+Z here (macOS IntelliJ grabs it before the webview). */
  hostUndo() { this.undo(); }
  hostRedo() { this.redo(); }
  /** Same story for Cmd/Ctrl+C/V — the IDE grabs the clipboard keys before the webview sees them. */
  hostCopy() { this.copy(); }
  hostPaste() { this.paste(); }
  private undo() {
    const prev = this.history.at(-1); if (!prev) return;
    this.future = [this.snap(), ...this.future];
    this.history = this.history.slice(0, -1);
    this.scene = prev.scene; this.edgePoints = prev.edgePoints;
  }
  private redo() {
    const nxt = this.future[0]; if (!nxt) return;
    this.history = [...this.history, this.snap()];
    this.future = this.future.slice(1);
    this.scene = nxt.scene; this.edgePoints = nxt.edgePoints;
  }

  private patchNodes(fn: (n: SceneNode) => SceneNode) { this.scene = { ...this.scene, nodes: this.scene.nodes.map(fn) }; }
  private descendantsOf(id: string): SceneNode[] {
    const out: SceneNode[] = [], stack = [id];
    while (stack.length) {
      const pid = stack.pop()!;
      for (const n of this.scene.nodes) if (n.parentId === pid) { out.push(n); stack.push(n.id); }
    }
    return out;
  }
  private moveNodes(moves: { id: string; x: number; y: number }[]) {
    if (this.bound) {
      const byId = new Map(moves.map((m) => [m.id, { x: m.x, y: m.y }]));
      // A context carries what sits inside its box, as in free mode: otherwise moving it leaves
      // its aggregates behind, still owned but drawn outside.
      for (const mv of moves) {
        const box = this.view.members.find((mem) => mem.id === mv.id);
        if (!box || this.node(mv.id)?.kind !== 'component') continue;
        const dx = mv.x - box.x, dy = mv.y - box.y;
        if (!dx && !dy) continue;
        for (const mem of this.view.members) {
          if (byId.has(mem.id) || mem.id === box.id) continue;
          if (Math.abs(mem.x - box.x) < box.w / 2 && Math.abs(mem.y - box.y) < box.h / 2) byId.set(mem.id, { x: mem.x + dx, y: mem.y + dy });
        }
      }
      this.view = { members: this.view.members.map((mem) => byId.has(mem.id) ? { ...mem, ...byId.get(mem.id)! } : mem) };
      this.emit('view-changed', { view: this.view });
      return;
    }
    this.commit();
    // Moving a container carries its whole subtree by the same delta.
    const all = new Map(moves.map((mv) => [mv.id, mv]));
    for (const mv of moves) {
      const n = this.node(mv.id); if (!n) continue;
      const dx = mv.x - n.x, dy = mv.y - n.y;
      if (dx === 0 && dy === 0) continue;
      for (const d of this.descendantsOf(mv.id)) all.set(d.id, { id: d.id, x: d.x + dx, y: d.y + dy });
    }
    this.patchNodes((n) => (all.has(n.id) ? { ...n, x: all.get(n.id)!.x, y: all.get(n.id)!.y } : n));
  }
  /** Align the multi-selection to the primary selection's edge/centre (Archi's align tools). */
  private align(mode: 'left' | 'centerH' | 'right' | 'top' | 'middleV' | 'bottom') {
    const primary = this.node(this.selectedId);
    if (!primary || this.selectedIds.length < 2) return;
    const moves = this.selectedIds.map((id) => this.node(id)).filter((n): n is SceneNode => !!n).map((n) => {
      let { x, y } = n;
      if (mode === 'left') x = primary.x - primary.w / 2 + n.w / 2;
      else if (mode === 'centerH') x = primary.x;
      else if (mode === 'right') x = primary.x + primary.w / 2 - n.w / 2;
      else if (mode === 'top') y = primary.y - primary.h / 2 + n.h / 2;
      else if (mode === 'middleV') y = primary.y;
      else if (mode === 'bottom') y = primary.y + primary.h / 2 - n.h / 2;
      return { id: n.id, x, y };
    });
    this.moveNodes(moves);
  }
  private onNodeMoved = (e: Event) => {
    const d = (e as CustomEvent).detail; this.moveNodes([d]);
    if (this.bound) this.adoptIntoContext(d.id, d.x, d.y); else this.maybeNest(d.id);
  };
  private onNodesMoved = (e: Event) => {
    const moves = (e as CustomEvent).detail.moves as { id: string; x: number; y: number }[];
    this.moveNodes(moves);
    if (this.bound) for (const mv of moves) this.adoptIntoContext(mv.id, mv.x, mv.y);
  };

  /**
   * Bound mode: an element dropped inside a bounded context BELONGS to it — the drop is the
   * modelling gesture, not just placement (like Archi's nest-to-relate). The model moves (the
   * composition edge then derives); dropping it outside again does not detach, which keeps an
   * accidental drag from orphaning it. Only context-scoped elements nest; for anything else, or
   * when it already belongs there, this is a no-op.
   */
  private adoptIntoContext(id: string, x: number, y: number) {
    const entry = this.catalogById().get(id);
    if ((entry?.kind ?? this.pendingKinds.get(id)) === 'module') { this.deployInto(id, x, y, entry?.label); return; }
    const contextType = entry?.contextType ?? BOUND_CONTEXT_TYPE[this.pendingKinds.get(id) ?? ''];
    if (!contextType) return;
    const ctx = this.contextAt(x, y, id);
    if (!ctx || entry?.ownerId === ctx.id) return;
    this.emit('modux-command', { command: { kind: 'set-element-context', type: contextType, id, boundedContextId: ctx.id } });
    this.flash(`«${entry?.label ?? this.node(id)?.label ?? id}» pasa a «${ctx.label}»`);
  }
  /** A module dropped inside a service (deployment) box is deployed by it — and only by it. */
  private deployInto(id: string, x: number, y: number, label?: string) {
    const svc = this.scene.nodes.find((c) => c.kind === 'deployment' && c.id !== id
      && Math.abs(x - c.x) < c.w / 2 && Math.abs(y - c.y) < c.h / 2);
    if (!svc) return;
    const deployer = this.model?.services?.find((s) => (s.moduleIds ?? []).includes(id));
    if (deployer?.id === svc.id) return;
    this.emit('modux-command', { command: { kind: 'add-service-module', id: svc.id, targetId: id } });
    this.flash(`«${label ?? id}» se despliega en «${svc.label}»`);
  }
  /** The innermost bounded context of this view whose box holds the point. */
  private contextAt(x: number, y: number, excludeId?: string): SceneNode | undefined {
    return this.scene.nodes
      .filter((c) => c.kind === 'component' && c.id !== excludeId
        && Math.abs(x - c.x) < c.w / 2 && Math.abs(y - c.y) < c.h / 2)
      .sort((a, b) => a.w * a.h - b.w * b.h)[0];
  }
  /**
   * Kinds minted from the palette in this session, by id: a fresh element is not in the projected
   * model until the host re-derives it, so its store type comes from the palette kind meanwhile.
   */
  private pendingKinds = new Map<string, string>();
  /**
   * A centre near (x, y) where a w×h box overlaps nothing in the view — so double-clicking several
   * catalog elements lays them out instead of stacking them. Walks square rings outwards.
   */
  private freeSpot(x: number, y: number, w: number, h: number): { x: number; y: number } {
    const GAP = 24;
    const clear = (cx: number, cy: number) => this.view.members.every((m) =>
      Math.abs(cx - m.x) >= (w + m.w) / 2 + GAP || Math.abs(cy - m.y) >= (h + m.h) / 2 + GAP);
    const sx = w + GAP, sy = h + GAP;
    for (let ring = 0; ring <= 12; ring++) {
      for (let i = -ring; i <= ring; i++) {
        for (const [dx, dy] of [[i, -ring], [i, ring], [-ring, i], [ring, i]]) {
          const cx = x + dx * sx, cy = y + dy * sy;
          if (clear(cx, cy)) return { x: cx, y: cy };
        }
      }
    }
    return { x, y };
  }

  // Dropping a node inside a container simply nests it (no relationship dialog).
  private setParentId(id: string, parentId: string | undefined) { this.patchNodes((n) => (n.id === id ? { ...n, parentId } : n)); }
  private containerAt(node: SceneNode) {
    return this.scene.nodes.find((c) => c.container && c.id !== node.id && c.id !== node.parentId
      && Math.abs(node.x - c.x) < c.w / 2 && Math.abs(node.y - c.y) < c.h / 2);
  }
  private maybeNest(id: string) {
    const n = this.node(id); if (!n) return;
    const c = this.containerAt(n);
    if (c) this.setParentId(id, c.id);
  }
  private onNodeResized = (e: Event) => {
    const d = (e as CustomEvent).detail;
    if (this.bound) {
      // the scene is derived from the view: a resize has to land in the view, or the next
      // projection puts the old size back
      this.view = { members: this.view.members.map((mem) => (mem.id === d.id ? { ...mem, x: d.x, y: d.y, w: d.w, h: d.h } : mem)) };
      this.emit('view-changed', { view: this.view });
      return;
    }
    this.commit();
    this.patchNodes((n) => (n.id === d.id ? { ...n, x: d.x, y: d.y, w: d.w, h: d.h } : n));
  };
  private onNodeRenamed = (e: Event) => {
    const d = (e as CustomEvent).detail;
    if (this.bound) {
      // In bound mode the label is the model element's name — rename it there, not on the derived
      // scene (which the next projection would overwrite, so the edit would never persist).
      const n = this.node(d.id);
      if (n) this.emit('modux-command', { command: { kind: 'rename-element', type: this.modelType(n), id: d.id, name: d.name } });
      return;
    }
    this.commit();
    this.patchNodes((n) => (n.id === d.id ? { ...n, label: d.name } : n));
  };
  private onCollapseToggled = (e: Event) => {
    const id = (e as CustomEvent).detail.id; this.commit();
    this.patchNodes((n) => (n.id === id ? { ...n, collapsed: !n.collapsed } : n));
  };
  private removeElements(ids: string[], commit = true) {
    if (this.bound) {
      // Del removes from the VIEW (the element stays in the model), like Archi.
      const set = new Set(ids);
      this.view = { members: this.view.members.filter((mem) => !set.has(mem.id)) };
      this.emit('view-changed', { view: this.view });
      this.selectedId = null; this.selectedIds = [];
      return;
    }
    if (commit) this.commit();
    const set = new Set(ids);
    const gone = new Set(this.scene.nodes.filter((n) => set.has(n.id) || (n.parentId && set.has(n.parentId))).map((n) => n.id));
    const nodes = this.scene.nodes.filter((n) => !gone.has(n.id));
    const edges = this.scene.edges.filter((ed) => !set.has(ed.id) && !gone.has(ed.sourceId) && !gone.has(ed.targetId));
    this.scene = { ...this.scene, nodes, edges };
    if (this.selectedId && (set.has(this.selectedId) || gone.has(this.selectedId))) this.selectedId = null;
    this.selectedIds = this.selectedIds.filter((id) => !set.has(id) && !gone.has(id));
  }
  private onDeleteReq = (e: Event) => this.removeElements([(e as CustomEvent).detail.id]);
  private onDeleteSel = (e: Event) => this.removeElements(((e as CustomEvent).detail.items as { id: string }[]).map((i) => i.id));
  private deleteSelected() {
    const ids = this.selectedIds.length ? this.selectedIds : this.selectedId ? [this.selectedId] : [];
    if (ids.length) this.removeElements(ids);
  }

  private clipboard: { nodes: SceneNode[]; edges: SceneEdge[] } | null = null;
  private copy() {
    const ids = new Set(this.selectedIds.length ? this.selectedIds : this.selectedId ? [this.selectedId] : []);
    if (!ids.size) return;
    if (this.bound) {
      const items: ClipItem[] = [];
      for (const m of this.view.members) if (ids.has(m.id)) {
        const el = this.resolveElement(m.id);
        if (el) items.push({ id: m.id, kind: el.kind, label: el.label, x: m.x, y: m.y, w: m.w, h: m.h });
      }
      if (items.length) writeClip({ sourceView: this.vk, items });
      return;
    }
    const nodes = this.scene.nodes.filter((n) => ids.has(n.id));
    const edges = this.scene.edges.filter((e) => ids.has(e.sourceId) && ids.has(e.targetId));
    this.clipboard = structuredClone({ nodes, edges });
  }
  private paste() {
    if (this.bound) { this.pasteBound(); return; }
    if (!this.clipboard?.nodes.length) return;
    this.commit();
    const idMap = new Map<string, string>();
    this.clipboard.nodes.forEach((n) => idMap.set(n.id, `${n.kind}-${++this.seq}`));
    const newNodes = this.clipboard.nodes.map((n) => ({
      ...structuredClone(n), id: idMap.get(n.id)!, x: n.x + 24, y: n.y + 24,
      parentId: n.parentId && idMap.has(n.parentId) ? idMap.get(n.parentId) : undefined,
    }));
    const newEdges = this.clipboard.edges.map((e) => ({
      ...structuredClone(e), id: `edge-${++this.seq}`, sourceId: idMap.get(e.sourceId)!, targetId: idMap.get(e.targetId)!,
    }));
    this.scene = { ...this.scene, nodes: [...this.scene.nodes, ...newNodes], edges: [...this.scene.edges, ...newEdges] };
    this.selectedIds = newNodes.map((n) => n.id);
    this.selectedId = newNodes[0]?.id ?? null;
  }
  /**
   * Bound paste: same view ⇒ DUPLICATE (mint new elements of the same kind+name); other view ⇒ ADD
   * the same elements as members (their relations re-derive from the model since both ends are now
   * present). An element already in the target view is skipped rather than doubled.
   */
  private pasteBound() {
    const clip = readClip();
    if (!clip?.items?.length) return;
    const sameView = clip.sourceView === this.vk;
    const here = new Set(this.view.members.map((m) => m.id));
    const additions: ViewMembers['members'] = [];
    const stamp = Date.now();
    clip.items.forEach((it, i) => {
      if (sameView) {
        const build = BOUND_CREATE[it.kind];
        if (!build) return;                                     // kind can't be minted standalone
        const newId = `${it.kind}-${stamp}-${i}`;
        this.emit('modux-command', { command: build(newId, it.label) });
        additions.push({ id: newId, x: it.x + 24, y: it.y + 24, w: it.w, h: it.h });
      } else {
        if (here.has(it.id)) return;                            // already shown in this view
        if (this.resolveElement(it.id)) additions.push({ id: it.id, x: it.x, y: it.y, w: it.w, h: it.h });
      }
    });
    if (!additions.length) return;
    this.view = { members: [...this.view.members, ...additions] };
    this.emit('view-changed', { view: this.view });
    this.selectedIds = additions.map((a) => a.id);
    this.selectedId = additions[0]?.id ?? null;
  }

  protected updated() { this.style.setProperty('--pal-w', this.paletteWidth + 'px'); }
  private startPaletteResize = (e: PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX, startW = this.paletteWidth;
    const handle = e.currentTarget as HTMLElement; handle.classList.add('drag');
    const onMove = (ev: PointerEvent) => { this.paletteWidth = Math.max(170, Math.min(560, startW - (ev.clientX - startX))); };
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); handle.classList.remove('drag'); };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  };

  private get canvasEl() { return this.renderRoot.querySelector('modux-canvas') as ModuxCanvas | null; }
  private onContextMenu = (e: MouseEvent) => {
    const id = this.canvasEl?.nodeIdAtClient(e.clientX, e.clientY);
    if (!id) { this.ctx = null; return; }
    e.preventDefault();
    this.select(id);
    this.ctx = { x: e.clientX, y: e.clientY, id, isEdge: false };
  };
  private ctxRename() {
    const id = this.ctx?.id; this.ctx = null; if (!id) return;
    this.select(id);
    const c = this.canvasEl; c?.focus();
    requestAnimationFrame(() => c?.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true, composed: true })));
  }
  private ctxDelete() { const id = this.ctx?.id; this.ctx = null; if (id) this.removeElements([id]); }
  private ctxUnnest() { const id = this.ctx?.id; this.ctx = null; if (!id) return; this.commit(); this.setParentId(id, undefined); }

  /**
   * ARM (Automatic Relationship Management): a relation between a container and its
   * directly-nested child is implicit — the nesting already expresses it — so it's
   * hidden on the canvas while kept in the model (still listed in the Relations folder).
   */
  private get displayScene(): Scene {
    const nested = (e: SceneEdge) => {
      const s = this.node(e.sourceId), t = this.node(e.targetId);
      return !!s && !!t && (t.parentId === s.id || s.parentId === t.id);
    };
    const edges = this.scene.edges.filter((e) => !nested(e));
    return edges.length === this.scene.edges.length ? this.scene : { ...this.scene, edges };
  }

  private onCanvasSelected(e: Event) {
    const d = (e as CustomEvent).detail;
    if (d?.elementType === 'node') {
      if (this.painter !== null) { this.commit(); this.patchNodes((n) => (n.id === d.id ? { ...n, fill: this.painter! } : n)); return; }
      this.select(d.id);
    } else if (d?.elementType === 'edge') { this.selectedId = d.id; this.selectedIds = []; this.ctx = null; }
  }
  private toggleFormatPainter() {
    if (this.painter !== null) { this.painter = null; return; }
    const n = this.selectedNode();
    if (n?.fill) this.painter = n.fill;
  }

  private rename(name: string) {
    if (this.bound) {
      // the selection may be a catalog row not drawn in this view: its type comes from the catalog
      const id = this.selectedId, n = this.selectedNode();
      const type = n ? this.modelType(n) : id ? this.catalogById().get(id)?.renameType : undefined;
      if (id && type) this.emit('modux-command', { command: { kind: 'rename-element', type, id, name } });
      return;
    }
    const id = this.selectedId; if (!id) return;
    this.patchNodes((n) => (n.id === id ? { ...n, label: name } : n));
  }
  private setFill(v: string) {
    const id = this.selectedId; if (!id) return;
    this.patchNodes((n) => (n.id === id ? { ...n, fill: v } : n));
  }
  private selectedEdge() { return this.scene.edges.find((e) => e.id === this.selectedId) ?? null; }
  private setDoc(v: string) { const id = this.selectedId; if (id) this.patchMeta(id, { doc: v }); }
  private addProp() { const id = this.selectedId; if (id) this.patchMeta(id, { props: [...this.metaOf(id).props, { k: '', v: '' }] }); }
  private setProp(i: number, field: 'k' | 'v', v: string) {
    const id = this.selectedId; if (!id) return;
    this.patchMeta(id, { props: this.metaOf(id).props.map((p, j) => (j === i ? { ...p, [field]: v } : p)) });
  }
  private removeProp(i: number) {
    const id = this.selectedId; if (!id) return;
    this.patchMeta(id, { props: this.metaOf(id).props.filter((_, j) => j !== i) });
  }
  private renderPropsTable() {
    const id = this.selectedId; const m = id ? this.metaOf(id) : { props: [] };
    return html`<div class="proptable">
      ${m.props.map((p, i) => html`<div class="proprow">
        <input placeholder="clave" .value=${p.k} @input=${(e: Event) => this.setProp(i, 'k', (e.target as HTMLInputElement).value)} />
        <input placeholder="valor" .value=${p.v} @input=${(e: Event) => this.setProp(i, 'v', (e.target as HTMLInputElement).value)} />
        <button class="del" @click=${() => this.removeProp(i)}>✕</button></div>`)}
      <button class="addprop" @click=${() => this.addProp()}>+ Añadir propiedad</button></div>`;
  }
  private renderEdgeProps(edge: SceneEdge) {
    const s = this.node(edge.sourceId), t = this.node(edge.targetId), m = this.metaOf(edge.id);
    if (this.tab === 'properties') return this.renderPropsTable();
    if (this.tab === 'appearance')
      return html`<div class="form"><label>Tipo de línea</label><div class="ro">${(REL_NOTATION[edge.kind]?.dashed ? 'discontinua' : 'sólida')}</div>
        <label>Color</label><div class="ro">#5C5C5C (notación ArchiMate)</div></div>`;
    return html`<div class="form">
      <label>Relación</label><div class="ro">${REL_NOTATION[edge.kind]?.label ?? edge.kind}</div>
      <label>Origen</label><div class="ro">${s?.label ?? '—'}</div>
      <label>Destino</label><div class="ro">${t?.label ?? '—'}</div>
      <label>Documentación</label><textarea placeholder="Descripción de la relación…" .value=${m.doc} @input=${(e: Event) => this.setDoc((e.target as HTMLTextAreaElement).value)}></textarea></div>`;
  }

  // ---- canvas tool events --------------------------------------------------
  private onPlace = (e: Event) => {
    const d = (e as CustomEvent).detail as { nodeKind: string; w: number; h: number; x: number; y: number };
    const el = ELEMENT_TOOLS.find((x) => x.kind === d.nodeKind)
      ?? EXTRA_TOOLS.find((x) => x.kind === d.nodeKind)
      ?? { kind: d.nodeKind, label: d.nodeKind, layer: 'domain', w: d.w, h: d.h } as ElementTool;
    this.commit();
    this.addNodeAt(el, d.x, d.y);
    if (!this.sticky) this.tool = { kind: 'select' };
  };
  /** After a relation is established, cancelled or rejected, go back to the selection tool (unless sticky). */
  private afterConnect() { if (!this.sticky) this.tool = { kind: 'select' }; }
  private onCommitted = (e: Event) => {
    const d = (e as CustomEvent).detail as { sourceId: string; targetId: string; rel: string | null; x: number; y: number };
    const src = this.node(d.sourceId)!, tgt = this.node(d.targetId)!;
    if (this.bound) {
      const S = src.kind, T = tgt.kind;
      const cmd = (command: unknown) => this.emit('modux-command', { command });
      const agg = S === 'aggregate' ? src : T === 'aggregate' ? tgt : null;
      const mem = ['entity', 'value-object'].includes(S) ? src : ['entity', 'value-object'].includes(T) ? tgt : null;
      if (S === 'component' && T === 'component') cmd({ kind: 'add-relation', sourceId: src.id, targetId: tgt.id, type: 'CUSTOMER_SUPPLIER' });
      else if (agg && mem) cmd({ kind: mem.kind === 'entity' ? 'set-entity-aggregate' : 'set-value-object-aggregate', id: mem.id, aggregateId: agg.id });
      else {
        // Everything else means what the editor's gesture vocabulary says it means — the same
        // rules the classic canvas applies (CRUD API, use case → aggregate, emissions, flows…).
        const options = connectionOptions(this.gestureHost(), src.id, tgt.id) as ConnectOption[];
        if (!options.length) this.flash(`No sé conectar «${src.label}» con «${tgt.label}»`);
        else if (options.length === 1) this.applyConnect(options[0], src, tgt);
        else { this.connectMenu = { x: d.x, y: d.y, src, tgt, options }; return; }
      }
      this.afterConnect();
      return;
    }
    if (d.rel === null) {
      const opts = validRelations(src.kind, tgt.kind);
      if (!opts.length) { this.flash(`No hay ninguna relación válida entre «${src.label}» y «${tgt.label}»`); this.afterConnect(); return; }
      this.menu = { x: d.x, y: d.y, src, tgt, opts }; // pending pick — reset on pickFromMenu
    } else {
      const dir = canDraw(d.rel, src.kind, tgt.kind);
      if (dir) { this.commit(); this.addEdge(d.rel, dir === 'forward' ? src : tgt, dir === 'forward' ? tgt : src); }
      this.afterConnect();
    }
  };
  private onRejected = (e: Event) => {
    const d = (e as CustomEvent).detail as { sourceId: string; targetId: string; rel: string };
    const src = this.node(d.sourceId), tgt = this.node(d.targetId);
    this.flash(`«${REL_NOTATION[d.rel]?.label ?? d.rel}» no es válida entre «${src?.label}» y «${tgt?.label}»`);
    this.afterConnect();
  };
  private onConnectEmpty = (e: Event) => {
    const d = (e as CustomEvent).detail as { sourceId: string; x: number; y: number; sceneX: number; sceneY: number };
    const src = this.node(d.sourceId); if (!src) return;
    this.createMenu = { x: d.x, y: d.y, src, sx: d.sceneX, sy: d.sceneY };
  };

  private addNodeAt(el: ElementTool, x: number, y: number): SceneNode {
    if (this.bound) {
      const id = `${el.kind}-${Date.now()}`;
      const name = el.label;
      const build = BOUND_CREATE[el.kind];
      if (build) {
        this.emit('modux-command', { command: build(id, name) });
        this.view = { members: [...this.view.members, { id, x, y, w: el.w, h: el.h }] };
        this.emit('view-changed', { view: this.view });
        this.pendingKinds.set(id, el.kind);
        this.adoptIntoContext(id, x, y);
        this.select(id);
      } else {
        this.flash(`«${el.label}» necesita un contenedor o aún no se puede crear suelto`);
      }
      return { id, label: name, kind: el.kind, symbol: el.kind, x, y, w: el.w, h: el.h } as SceneNode;
    }
    const lay = LAYER[el.layer];
    const isGroup = el.kind === 'group';
    const n: SceneNode = {
      id: `${el.kind}-${++this.seq}`, label: el.label, kind: el.kind, symbol: ARCHIMATE_SYMBOL[el.kind] ?? el.kind,
      x, y, w: el.w, h: el.h,
      fill: el.kind === 'note' ? '#FEF9C3' : isGroup ? '#F8FAFC' : lay.fill, stroke: lay.stroke,
      ...(el.container ? { container: true, collapsible: true } : {}),
      ...(isGroup ? { dashed: true } : {}),
    };
    this.scene = { ...this.scene, nodes: [...this.scene.nodes, n] };
    this.select(n.id);
    return n;
  }

  private addEdge(rel: string, a: SceneNode, b: SceneNode) {
    if (this.bound) return; // SPIKE: edición de relaciones aún no cableada al modelo
    const note = REL_NOTATION[rel] ?? {};
    const edge = { id: `edge-${++this.seq}`, sourceId: a.id, targetId: b.id, kind: rel, ...note } as SceneEdge;
    this.scene = { ...this.scene, edges: [...this.scene.edges, edge] };
  }

  private pickFromMenu(o: RelOption) {
    if (!this.menu) return;
    const { src, tgt } = this.menu;
    this.commit();
    this.addEdge(o.type, o.reverse ? tgt : src, o.reverse ? src : tgt);
    this.menu = null;
    this.afterConnect();
  }

  private toggleCreateExpand(kind: string) { this.createExpand = this.createExpand === kind ? null : kind; }
  /** Cascade pick: create the new element at the drop point and (optionally) the chosen relation. */
  private pickCascade(el: ElementTool, o: RelOption | null) {
    if (!this.createMenu) return;
    const { src, sx, sy } = this.createMenu;
    this.commit();
    const n = this.addNodeAt(el, sx, sy);
    if (o) this.addEdge(o.type, o.reverse ? n : src, o.reverse ? src : n);
    this.createMenu = null; this.createExpand = null;
    this.afterConnect();
  }

  // ---- tree (Archi-style: folders by layer + a Relations folder) ----------
  private toggle(id: string) { const n = new Set(this.collapsed); n.has(id) ? n.delete(id) : n.add(id); this.collapsed = n; }

  private treeRow(n: SceneNode): TemplateResult {
    const sw = LAYER[kindLayer(n.kind)];
    return html`<div class="row child ${this.selectedIds.includes(n.id) || this.selectedId === n.id ? 'sel' : ''}"
         @click=${(e: MouseEvent) => (e.ctrlKey || e.metaKey ? this.toggleSel(n.id) : this.select(n.id))}>
      <span class="twisty"></span>
      <span class="swatch" style="background:${sw.fill};border-color:${sw.stroke}"></span>
      <span class="lbl">${n.label}</span></div>`;
  }

  private folder(key: string, label: string, rows: TemplateResult[], count: number | string): TemplateResult {
    const collapsed = this.collapsed.has('f:' + key);
    return html`
      <div class="row folder" @click=${() => this.toggle('f:' + key)}>
        <span class="twisty">${collapsed ? '▶' : '▼'}</span><span class="fic">▸</span>
        <span class="lbl">${label}</span><span class="count">${count}</span>
      </div>
      ${collapsed ? nothing : rows}`;
  }

  /**
   * Bound mode: the tree is the whole CATALOG, not just this view. Elements already in the view
   * read normally (click selects them on the canvas); the rest are dimmed, and are brought in by
   * dragging them onto the canvas (or double-clicking: dropped at the centre of what is visible).
   */
  private renderCatalogTree(): TemplateResult {
    const q = this.treeQuery.trim().toLowerCase();
    const here = new Set(this.view.members.map((x) => x.id));
    const entries = catalogEntries(this.model!).filter((e) => !q || e.label.toLowerCase().includes(q));
    return html`${(Object.keys(LAYER) as LayerKey[]).map((fk) => {
      const items = entries.filter((e) => kindLayer(e.kind) === fk).sort((a, b) => a.label.localeCompare(b.label));
      if (!items.length) return nothing;
      const shown = items.filter((e) => here.has(e.id)).length;
      return this.folder(fk, LAYER[fk].name, items.map((e) => this.catalogRow(e, here.has(e.id))), `${shown}/${items.length}`);
    })}${this.renderTreeRelations(q)}`;
  }
  private catalogRow(e: CatalogEntry, inView: boolean): TemplateResult {
    const sw = LAYER[kindLayer(e.kind)];
    const sel = this.selectedIds.includes(e.id) || this.selectedId === e.id;
    return html`<div class="row child ${inView ? '' : 'absent'} ${sel ? 'sel' : ''}"
         title=${inView ? e.label : `${e.label} — arrastra al lienzo (o doble click) para añadirlo a la vista`}
         @pointerdown=${(ev: PointerEvent) => this.beginCatalogDrag(e, inView, ev)}
         @dblclick=${() => { if (!inView) this.addCatalogMember(e); }}>
      <span class="twisty"></span>
      <span class="swatch" style="background:${sw.fill};border-color:${sw.stroke}"></span>
      <span class="lbl">${e.label}</span><span class="kindtag">${CATALOG_KIND_LABEL[e.kind] ?? e.kind}</span>
      ${inView ? nothing : html`<span class="add">＋</span>`}</div>`;
  }
  /** Pointer-based, like the palette drag — native DnD hangs inside JCEF. */
  private beginCatalogDrag(entry: CatalogEntry, inView: boolean, e: PointerEvent) {
    if (e.button !== 0) return;
    if (inView) {
      if (e.ctrlKey || e.metaKey) this.toggleSel(entry.id); else this.select(entry.id);
      return;
    }
    e.preventDefault();
    this._catalogDrag = { entry, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false };
    window.addEventListener('pointermove', this.onCatalogDragMove);
    window.addEventListener('pointerup', this.onCatalogDragUp);
  }
  private onCatalogDragMove = (e: PointerEvent) => {
    const d = this._catalogDrag; if (!d) return;
    const moved = d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 5;
    this._catalogDrag = { ...d, x: e.clientX, y: e.clientY, moved };
  };
  private onCatalogDragUp = (e: PointerEvent) => {
    window.removeEventListener('pointermove', this.onCatalogDragMove);
    window.removeEventListener('pointerup', this.onCatalogDragUp);
    const d = this._catalogDrag; this._catalogDrag = null;
    if (!d) return;
    // A tap on an absent row selects it — the properties panel then shows THAT element. Doing
    // nothing left the previous selection in the panel, and typing renamed the wrong thing.
    if (!d.moved) { this.select(d.entry.id); return; }
    const c = this.canvasEl; if (!c) return;
    const r = c.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    const p = c.sceneFromClient(e.clientX, e.clientY);
    this.addCatalogMember(d.entry, p.x, p.y);
  };
  /**
   * Adds an existing catalog element to this view — a reference, nothing is minted. With a drop
   * point it lands there (and joins the context it was dropped in); without one, at the first free
   * spot around the centre of what is visible.
   */
  private addCatalogMember(entry: CatalogEntry, x?: number, y?: number) {
    if (this.view.members.some((m) => m.id === entry.id)) return;
    const { w, h } = defaultSize(entry.kind);
    const dropped = x !== undefined && y !== undefined;
    if (!dropped) {
      const c = this.canvasEl, r = c?.getBoundingClientRect();
      const centre = c && r ? c.sceneFromClient(r.left + r.width / 2, r.top + r.height / 2) : { x: 0, y: 0 };
      ({ x, y } = this.freeSpot(snapValue(centre.x), snapValue(centre.y), w, h));
    }
    // member x/y are the box's CENTRE, as everywhere on the canvas
    const at = { x: snapValue(x!), y: snapValue(y!) };
    this.view = { members: [...this.view.members, { id: entry.id, ...at, w, h }] };
    this.emit('view-changed', { view: this.view });
    if (dropped) this.adoptIntoContext(entry.id, at.x, at.y);
    this.select(entry.id);
  }

  private renderTree(): TemplateResult {
    if (this.bound) return this.renderCatalogTree();
    const q = this.treeQuery.trim().toLowerCase();
    const layers = Object.keys(LAYER) as LayerKey[];
    return html`
      ${layers.map((fk) => {
        const nodes = this.scene.nodes
          .filter((n) => kindLayer(n.kind) === fk && !['junction', 'note', 'group'].includes(n.kind))
          .filter((n) => !q || n.label.toLowerCase().includes(q))
          .sort((a, b) => a.label.localeCompare(b.label));
        if (!nodes.length) return nothing;
        return this.folder(fk, LAYER[fk].name, nodes.map((n) => this.treeRow(n)), nodes.length);
      })}
      ${this.renderTreeRelations(q)}`;
  }

  private renderTreeRelations(q: string) {
    const edges = this.scene.edges
      .map((e) => ({ e, s: this.node(e.sourceId), t: this.node(e.targetId) }))
      .filter(({ s, t }) => s && t)
      .map(({ e, s, t }) => ({ e, text: `${s!.label} — ${REL_NOTATION[e.kind]?.label ?? e.kind} → ${t!.label}` }))
      .filter(({ text }) => !q || text.toLowerCase().includes(q));
    if (q && !edges.length) return nothing;
    const rows = edges.map(({ e, text }) => html`<div class="row child ${this.selectedId === e.id ? 'sel' : ''}"
        @click=${() => { this.selectedId = e.id; this.selectedIds = []; }}>
      <span class="twisty"></span><span class="rel-ic">╱</span><span class="lbl">${text}</span></div>`);
    return this.folder('rel', 'Relaciones', rows, edges.length);
  }

  // ---- palette -------------------------------------------------------------
  /** ArchiMate type icon for a node kind — the same glyph the canvas draws. */
  private elIcon(kind: string) {
    if (kind === 'junction') return svg`<svg class="pico" viewBox="0 0 12 12" width="17" height="17"><circle cx="6" cy="6" r="3.2" fill="#475569"/></svg>`;
    const glyph = SYMBOLS[ARCHIMATE_SYMBOL[kind] ?? kind];
    return glyph
      ? svg`<svg class="pico" viewBox="0 0 12 12" width="17" height="17"><g fill="none" stroke="#475569" stroke-width="1" stroke-linejoin="round" stroke-linecap="round">${glyph}</g></svg>`
      : svg`<svg class="pico" width="17" height="17"></svg>`;
  }
  /** ArchiMate relationship notation preview: the line plus its start/end decorations. */
  private relPreview(rel: string) {
    const n = REL_NOTATION[rel] ?? {};
    const s = '#475569';
    const dash = n.dashArray ?? (n.dashed ? '4 3' : '');
    const x1 = n.markerStart ? 11 : 4, x2 = n.markerEnd ? 33 : 40;
    const startM = n.markerStart === 'diamond' ? svg`<path d="M3 7 L7 4 L11 7 L7 10 Z" fill=${s}/>`
      : n.markerStart === 'diamond-hollow' ? svg`<path d="M3 7 L7 4 L11 7 L7 10 Z" fill="#fff" stroke=${s} stroke-width="1"/>`
      : n.markerStart === 'ball' ? svg`<circle cx="4" cy="7" r="2.3" fill=${s}/>` : svg``;
    const endM = n.markerEnd === 'arrow' ? svg`<path d="M33 3.5 L41 7 L33 10.5 Z" fill=${s}/>`
      : n.markerEnd === 'open-arrow' ? svg`<path d="M34 3.5 L41 7 L34 10.5" fill="none" stroke=${s} stroke-width="1.4"/>`
      : n.markerEnd === 'hollow-triangle' ? svg`<path d="M33 3.5 L41 7 L33 10.5 Z" fill="#fff" stroke=${s} stroke-width="1.2"/>` : svg``;
    return svg`<svg class="prel" viewBox="0 0 44 14" width="44" height="14">
      <line x1=${x1} y1="7" x2=${x2} y2="7" stroke=${s} stroke-width="1.4" stroke-dasharray=${dash}/>
      ${startM}${endM}</svg>`;
  }
  /** A collapsible palette section (click the header to fold), like Archi's palette. */
  private palGroup(key: string, label: string, body: unknown, extra = '') {
    const collapsed = this.collapsed.has('pal:' + key);
    return html`
      <div class="pgroup pfold" @click=${() => this.toggle('pal:' + key)}>
        <span class="ptw">${collapsed ? '▶' : '▼'}</span>${label}${extra ? html`<span class="pnote">${extra}</span>` : nothing}
      </div>
      ${collapsed ? nothing : html`<div class="pgrid">${body}</div>`}`;
  }
  private elItem(el: ElementTool) {
    const on = this.tool.kind === 'place' && this.tool.el.kind === el.kind;
    // Pointer-based drag, NOT the HTML5 draggable API: native drag-and-drop hangs inside JCEF
    // (the drag grabs the pointer and never releases, freezing the view). A tap arms the place
    // tool (click-on-canvas to drop); a real drag drops the element where the pointer is released.
    return html`<div class="pitem ${on ? 'on' : ''}" title=${el.label}
      @pointerdown=${(e: PointerEvent) => this.beginPaletteDrag(el, e)}>${this.elIcon(el.kind === 'group' ? 'area' : el.kind)}<span class="lbl">${el.label}</span></div>`;
  }
  private beginPaletteDrag(el: ElementTool, e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    this._paletteDrag = { el, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false };
    window.addEventListener('pointermove', this.onPaletteDragMove);
    window.addEventListener('pointerup', this.onPaletteDragUp);
  }
  private onPaletteDragMove = (e: PointerEvent) => {
    const d = this._paletteDrag; if (!d) return;
    const moved = d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 5;
    this._paletteDrag = { ...d, x: e.clientX, y: e.clientY, moved };
  };
  private onPaletteDragUp = (e: PointerEvent) => {
    window.removeEventListener('pointermove', this.onPaletteDragMove);
    window.removeEventListener('pointerup', this.onPaletteDragUp);
    const d = this._paletteDrag; this._paletteDrag = null;
    if (!d) return;
    if (!d.moved) { this.pickTool({ kind: 'place', el: d.el }, e); return; } // a tap: arm the place tool
    const c = this.canvasEl; if (!c) return;                                 // a drag: drop on the canvas
    const r = c.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    const p = c.sceneFromClient(e.clientX, e.clientY);
    if (!this.bound) this.commit();
    const n = this.addNodeAt(d.el, snapValue(p.x), snapValue(p.y));
    if (!this.bound) this.maybeNest(n.id);
  };
  private renderPalette() {
    const magicOn = this.tool.kind === 'connect' && this.tool.rel === null;
    return html`
      <div class="pgroup">Herramientas</div>
      <div class="pgrid">
        <div class="pitem ${this.tool.kind === 'select' ? 'on' : ''}" @click=${() => this.resetTool()}><span class="sw" style="background:#94a3b8"></span><span class="lbl">Seleccionar</span></div>
        <div class="pitem ${magicOn ? 'on' : ''}" @click=${(e: MouseEvent) => this.pickTool({ kind: 'connect', rel: null }, e)}><span class="sw" style="background:#7c3aed"></span><span class="lbl">Conector mágico ✦</span></div>
      </div>

      ${this.palGroup('rel', 'Relaciones', REL_TYPES.map((rel) => {
        const on = this.tool.kind === 'connect' && this.tool.rel === rel;
        return html`<div class="pitem ${on ? 'on' : ''}" title=${REL_NOTATION[rel]?.label ?? rel} @click=${(e: MouseEvent) => this.pickTool({ kind: 'connect', rel }, e)}>${this.relPreview(rel)}<span class="lbl">${REL_NOTATION[rel]?.label ?? rel}</span></div>`;
      }))}

      ${ELEMENT_GROUPS.map((g, i) => {
        const items = ELEMENT_TOOLS.filter((el) => el.group === g);
        return items.length ? this.palGroup('el:' + g, g, items.map((el) => this.elItem(el)), i === 0 ? 'Shift = fija' : '') : nothing;
      })}

      ${this.palGroup('extras', 'Extras', EXTRA_TOOLS.map((el) => this.elItem(el)))}
    `;
  }

  // ---- properties ----------------------------------------------------------
  /** SPIKE: properties bound to the real model (aggregates view). */
  /**
   * The «Tipo» field: read-only, or — for the closed list of convertible types — a picker of what
   * it can become. The model refuses (and says why) when something still points at the element.
   */
  private typeField(id: string, fallback: string) {
    const entry = this.catalogById().get(id);
    const from = entry ? retypeKey(entry) : undefined;
    const targets = from ? retypeTargets(from) : [];
    if (!from || !targets.length) return html`<label>Tipo</label><div class="ro">${fallback}</div>`;
    const change = (e: Event) => {
      const select = e.target as HTMLSelectElement, to = select.value;
      // Show the CURRENT type until the model says otherwise: a refused change (banner) leaves it as
      // it was, an accepted one re-renders the picker with the new type.
      select.value = from;
      if (to !== from) this.emit('modux-command', { command: { kind: 'change-element-type', id, from, to } });
    };
    return html`<label>Tipo</label>
      <select .value=${from} @change=${change} title="Cambiar el tipo conserva id, nombre y lo común; se bloquea si algo lo referencia">
        ${/* fixed family order: options must not be reordered in place, or the select's value
            (set before its children update) would end up on the wrong one after a change */ ''}
        ${Object.keys(RETYPES).filter((k) => k === from || targets.includes(k))
          .map((k) => html`<option value=${k} ?selected=${k === from}>${RETYPES[k].label}</option>`)}
      </select>`;
  }

  private renderBoundProps() {
    const m = this.model!, id = this.selectedId;
    const rename = (e: Event) => this.rename((e.target as HTMLInputElement).value);
    const bc = m.boundedContexts.find((x) => x.id === id);
    if (bc) {
      const aggs = (m.aggregates ?? []).filter((a) => a.boundedContextId === bc.id).length;
      return html`<div class="form">
        <label>Nombre</label><input .value=${bc.name} @input=${rename} />
        <label>Tipo</label><div class="ro">Bounded context</div>
        <label>Subdominio</label><div class="ro">${bc.subdomainType}</div>
        <label>Agregados</label><div class="ro">${aggs}</div></div>`;
    }
    const agg = (m.aggregates ?? []).find((a) => a.id === id);
    if (agg) {
      const ents = (m.entities ?? []).filter((x) => x.aggregateId === agg.id).length;
      const vos = (m.valueObjects ?? []).filter((x) => x.aggregateId === agg.id).length;
      const invs = (agg.invariants ?? []).length;
      return html`<div class="form">
        <label>Nombre</label><input .value=${agg.name} @input=${rename} />
        ${this.typeField(agg.id, 'Agregado')}
        <label>Contexto</label>
        <select .value=${agg.boundedContextId ?? ''} @change=${(e: Event) => this.emit('modux-command', { command: { kind: 'set-aggregate-context', id: agg.id, boundedContextId: (e.target as HTMLSelectElement).value } })}>
          ${m.boundedContexts.map((bc) => html`<option value=${bc.id}>${bc.name}</option>`)}
        </select>
        <label>Entidades</label><div class="ro">${ents}</div>
        <label>Value objects</label><div class="ro">${vos}</div>
        <label>Invariantes</label><div class="ro">${invs}</div></div>`;
    }
    const ent = (m.entities ?? []).find((x) => x.id === id);
    const vo = (m.valueObjects ?? []).find((x) => x.id === id);
    const mem = ent ?? vo;
    if (mem) {
      const cmdKind = ent ? 'set-entity-aggregate' : 'set-value-object-aggregate';
      return html`<div class="form">
        <label>Nombre</label><input .value=${mem.name} @input=${rename} />
        ${this.typeField(mem.id, ent ? 'Entidad' : 'Value object')}
        <label>Agregado</label>
        <select .value=${mem.aggregateId ?? ''} @change=${(e: Event) => this.emit('modux-command', { command: { kind: cmdKind, id: mem.id, aggregateId: (e.target as HTMLSelectElement).value } })}>
          ${(m.aggregates ?? []).map((a) => html`<option value=${a.id}>${a.name}</option>`)}
        </select></div>`;
    }
    // Everything else in the catalog: its name, what it is and — when it can belong to one — its context.
    const entry = id ? this.catalogById().get(id) : undefined;
    if (entry) {
      const setContext = (e: Event) => this.emit('modux-command', { command: {
        kind: 'set-element-context', type: entry.contextType, id: entry.id,
        boundedContextId: (e.target as HTMLSelectElement).value || undefined } });
      return html`<div class="form">
        <label>Nombre</label><input .value=${entry.label} @input=${rename} />
        ${this.typeField(entry.id, CATALOG_KIND_LABEL[entry.kind] ?? entry.kind)}
        ${entry.contextType ? html`<label>Contexto</label>
          <select .value=${entry.ownerId ?? ''} @change=${setContext}>
            <option value="">— sin contexto —</option>
            ${m.boundedContexts.map((c) => html`<option value=${c.id} ?selected=${c.id === entry.ownerId}>${c.name}</option>`)}
          </select>` : nothing}
      </div>`;
    }
    return html`<div class="empty">Selecciona un elemento del modelo.</div>`;
  }

  private renderProps() {
    if (this.bound) return this.renderBoundProps();
    const n = this.selectedNode();
    if (!n) {
      const edge = this.selectedEdge();
      if (edge) return this.renderEdgeProps(edge);
      return html`<div class="empty">Selecciona un elemento en el árbol o el lienzo.</div>`;
    }
    const layer = LAYER[kindLayer(n.kind)];
    const m = this.metaOf(n.id);
    if (this.tab === 'appearance')
      return html`<div class="form">
        <label>Relleno</label>
        <span class="colorrow"><input type="color" .value=${n.fill ?? '#ffffff'} @input=${(e: Event) => this.setFill((e.target as HTMLInputElement).value)} /><span class="ro">${n.fill}</span></span>
        <label>Borde</label><div class="ro">#5C5C5C (notación ArchiMate)</div>
        <label>Capa</label><div class="ro">${layer.name}</div></div>`;
    if (this.tab === 'properties') return this.renderPropsTable();
    return html`<div class="form">
      <label>Nombre</label><input .value=${n.label} @input=${(e: Event) => this.rename((e.target as HTMLInputElement).value)} />
      <label>Tipo</label><div class="ro">${n.kind}</div>
      <label>Capa</label><div class="ro">${layer.name}</div>
      <label>Documentación</label><textarea placeholder="Descripción del elemento…" .value=${m.doc} @input=${(e: Event) => this.setDoc((e.target as HTMLTextAreaElement).value)}></textarea></div>`;
  }

  // ---- menus ---------------------------------------------------------------
  private renderConnectMenu() {
    if (!this.connectMenu) return nothing;
    const m = this.connectMenu;
    return html`<div class="menu" style="left:${m.x}px;top:${m.y}px">
      <div class="mhead">${m.src.label} → ${m.tgt.label}</div>
      ${m.options.map((o) => html`<div class="mi" title=${o.hint} @click=${() => { this.connectMenu = null; this.applyConnect(o, m.src, m.tgt); this.afterConnect(); }}><span>${o.label}</span></div>`)}
    </div>`;
  }
  private applyConnect(o: ConnectOption, src: SceneNode, tgt: SceneNode) {
    o.apply();
    this.flash(`${o.label}: «${src.label}» → «${tgt.label}»`);
  }
  /**
   * The slice of the classic editor's host the connection vocabulary needs: the model and a way
   * to issue commands. The pickers and view plumbing it can also ask for have no counterpart in
   * this canvas, so they are inert.
   */
  private gestureHost(): GestureHost {
    const self = this;
    const none = () => undefined;
    return {
      get model() { return self.model!; },
      command: (c: unknown) => self.emit('modux-command', { command: c }),
      emit: none, sceneFor: () => self.scene, owningProcessOf: none, owningUseCaseOf: none,
      owningWorkflowOf: none, owningApiOf: none, menuEntryIn: () => null, newMenuItemId: (l: string) => l,
      openExtDepPicker: none, openRelationPicker: none, openConnectPicker: none,
      nodeClientRect: () => null, clearSelection: none, expandNode: none,
    } as unknown as GestureHost;
  }
  private renderMenu() {
    if (!this.menu) return nothing;
    const m = this.menu;
    return html`<div class="menu" style="left:${m.x}px;top:${m.y}px">
      <div class="mhead">${m.src.label} → ${m.tgt.label}</div>
      ${m.opts.map((o) => html`<div class="mi" @click=${() => this.pickFromMenu(o)}>${this.relPreview(o.type)}<span>${o.label}</span>${o.reverse ? html`<span class="rev">inversa</span>` : nothing}</div>`)}
    </div>`;
  }
  private renderCreateMenu() {
    if (!this.createMenu) return nothing;
    const m = this.createMenu;
    return html`<div class="menu" style="left:${m.x}px;top:${m.y}px">
      <div class="mhead">Crear elemento desde «${m.src.label}»</div>
      ${ELEMENT_TOOLS.filter((e) => e.kind !== 'junction').map((el) => {
        const opts = validRelations(m.src.kind, el.kind);
        const expanded = this.createExpand === el.kind;
        return html`
          <div class="mi" @click=${() => this.toggleCreateExpand(el.kind)}>
            ${this.elIcon(el.kind)}<span>${el.label}</span><span class="rev">${opts.length ? (expanded ? '▾' : '▸') : ''}</span>
          </div>
          ${expanded ? html`
            <div class="mi sub" @click=${() => this.pickCascade(el, null)}><span class="subl">(solo crear)</span></div>
            ${opts.map((o) => html`<div class="mi sub" @click=${() => this.pickCascade(el, o)}>
              <span class="subl">${this.relPreview(o.type)}</span><span>${o.label}</span>${o.reverse ? html`<span class="rev">inversa</span>` : nothing}</div>`)}
          ` : nothing}
        `;
      })}
    </div>`;
  }

  render() {
    const t = this.tool;
    const hint = this.painter !== null ? 'Pincel activo — click en un nodo para pintar su relleno'
      : t.kind === 'place' ? `Coloca «${t.el.label}» — click en el lienzo`
      : t.kind === 'connect' ? `${t.rel === null ? 'Conector mágico' : `Relación «${REL_NOTATION[t.rel]?.label ?? t.rel}»`} — click en origen y luego en destino`
      : '';
    return html`
      <div class="toolbar">
        <span class="brand">modux <small>· experimento UI estilo Archi</small></span>
        ${hint ? html`<span class="hint">${hint} · Esc cancela</span>` : nothing}
        ${this.selectedIds.length >= 2 ? html`<span class="aligngrp">
          <button title="Alinear izquierda" @click=${() => this.align('left')}>⇤</button>
          <button title="Centrar horizontal" @click=${() => this.align('centerH')}>⇔</button>
          <button title="Alinear derecha" @click=${() => this.align('right')}>⇥</button>
          <span class="asep"></span>
          <button title="Alinear arriba" @click=${() => this.align('top')}>⤒</button>
          <button title="Centrar vertical" @click=${() => this.align('middleV')}>⇳</button>
          <button title="Alinear abajo" @click=${() => this.align('bottom')}>⤓</button>
        </span>` : nothing}
        <div class="spacer"></div>
        <button class=${t.kind === 'select' ? 'on' : ''} @click=${() => this.resetTool()}>Seleccionar</button>
        <button title="Copiar formato: coge el relleno del elemento seleccionado y píntalo en otros"
          class=${this.painter !== null ? 'on' : ''} @click=${() => this.toggleFormatPainter()}>Pincel 🖌</button>
        <button class=${t.kind === 'connect' && t.rel === null ? 'on' : ''} @click=${() => (this.tool = { kind: 'connect', rel: null })}>Conector mágico ✦</button>
      </div>

      <div class="panel tree">
        <header>${this.bound ? 'Catálogo' : 'Modelo'}</header>
        <input class="treesearch" type="search" placeholder="Buscar…" .value=${this.treeQuery}
          @input=${(e: Event) => (this.treeQuery = (e.target as HTMLInputElement).value)} />
        <div class="body">${this.renderTree()}</div>
      </div>

      <div class="canvas-wrap" @contextmenu=${this.onContextMenu}>
        <modux-canvas archimate
          .scene=${this.displayScene} .selectedId=${this.selectedId} .selectedIds=${this.selectedIds}
          .edgePoints=${this.edgePoints}
          .tool=${this.canvasTool} .connectValidator=${this.validator}
          @edge-points-changed=${(e: Event) => { const d = (e as CustomEvent).detail; if (!d.auto) this.commit(); this.edgePoints = { ...this.edgePoints, [d.id]: d.points }; }}
          @element-selected=${this.onCanvasSelected}
          @element-multi-toggled=${this.onMultiToggle}
          @nodes-boxed=${this.onBoxed}
          @selection-cleared=${this.onSelCleared}
          @node-moved=${this.onNodeMoved}
          @nodes-moved=${this.onNodesMoved}
          @node-resized=${this.onNodeResized}
          @node-renamed=${this.onNodeRenamed}
          @node-collapse-toggled=${this.onCollapseToggled}
          @delete-requested=${this.onDeleteReq}
          @delete-selection-requested=${this.onDeleteSel}
          @undo-requested=${() => this.undo()}
          @redo-requested=${() => this.redo()}
          @place-requested=${this.onPlace}
          @connect-committed=${this.onCommitted}
          @connect-rejected=${this.onRejected}
          @connect-on-empty=${this.onConnectEmpty}></modux-canvas>
        <div class="zoombar">
          <button title="Acercar" @click=${() => this.canvasEl?.zoomBy(1.2)}>+</button>
          <button title="Alejar" @click=${() => this.canvasEl?.zoomBy(0.8)}>−</button>
          <button title="Ajustar a la ventana" @click=${() => this.canvasEl?.fit()}>⤢</button>
        </div>
        <div class="legend">${(() => {
          const used = new Set(this.scene.nodes.map((n) => kindLayer(n.kind)));
          return Object.entries(LAYER).filter(([k]) => used.has(k as LayerKey)).map(([, l]) => html`<span class="k"><span class="sw" style="background:${l.fill};border-color:${l.stroke}"></span>${l.name}</span>`);
        })()}</div>
      </div>

      <div class="panel palette">
        <div class="presize" title="Arrastra para ajustar el ancho" @pointerdown=${this.startPaletteResize}></div>
        <header>Paleta</header><div class="body">${this.renderPalette()}</div>
      </div>

      <div class="panel props">
        <div class="tabs">${(['main', 'appearance', 'properties'] as const).map((tb) => html`
          <button class=${this.tab === tb ? 'on' : ''} @click=${() => (this.tab = tb)}>${tb === 'main' ? 'Principal' : tb === 'appearance' ? 'Apariencia' : 'Propiedades'}</button>`)}</div>
        <div class="body">${this.renderProps()}</div>
      </div>

      ${this.renderMenu()}${this.renderConnectMenu()}${this.renderCreateMenu()}
      ${this.ctx ? html`
        <div class="ctxback" @pointerdown=${() => (this.ctx = null)} @contextmenu=${(e: Event) => e.preventDefault()}></div>
        <div class="menu" style="left:${this.ctx.x}px;top:${this.ctx.y}px">
          <div class="mi" @click=${() => this.ctxRename()}>Renombrar <span class="rev">F2</span></div>
          ${this.node(this.ctx.id)?.parentId ? html`<div class="mi" @click=${() => this.ctxUnnest()}>Sacar del contenedor</div>` : nothing}
          <div class="mi" @click=${() => this.ctxDelete()}>Borrar <span class="rev">Supr</span></div>
        </div>` : nothing}
      ${this.toast ? html`<div class="toast">${this.toast}</div>` : nothing}
      ${this._paletteDrag?.moved
        ? html`<div class="drag-ghost" style="left:${this._paletteDrag.x}px;top:${this._paletteDrag.y}px">${this._paletteDrag.el.label}</div>`
        : nothing}
      ${this._catalogDrag?.moved
        ? html`<div class="drag-ghost" style="left:${this._catalogDrag.x}px;top:${this._catalogDrag.y}px">${this._catalogDrag.entry.label}</div>`
        : nothing}
    `;
  }
}
