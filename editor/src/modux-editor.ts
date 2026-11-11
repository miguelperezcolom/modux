import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ModuxModel, ContextMapRelationType } from './model.js';
import { normalizeViewLayout, resolveOverlaps as declump } from './scene.js';
import type { DiagramLayout, EditorLayout, Point, Scene, SceneNode, ViewLayout } from './scene.js';
import type { ModuxCommand } from './commands.js';
import { MODUX_THEME } from './theme.js';
import { contextMapScene, distributionScene, ownershipIndex, rollupOwnershipIndex } from './views/context-map.js';
import { aggregatesScene } from './views/aggregates.js';
import { flowsScene } from './views/flows.js';
import { processesScene } from './views/processes.js';
import { eventstormingScene } from './views/eventstorming.js';
import { workflowsScene } from './views/workflows.js';
import { uiScene, parseMenuNodeId } from './views/ui.js';
import { mappingsScene } from './views/mappings.js';
import { integrationsScene } from './views/integrations.js';
import type { UiMenuEntryRef, UiComponentNodeRef } from './model.js';
import { autoLayout } from './autolayout.js';
import { routeEdgesAroundNodes } from './edge-routing.js';
import { semanticLayout, semanticPartitions } from './semantic-layout.js';
import { layoutableNodes, needsInitialLayout } from './initial-layout.js';
import { derivedElementIds, hideDerived, markDerived } from './derived.js';
import './modux-canvas.js';
import './modux-tilt.js';
import './modux-explorer.js';
import { inverseOf, type UndoHost } from './undo.js';
import { applyConnectionGesture, archimateOptions, performDeleteGesture, type GestureHost } from './gestures.js';
import { PALETTE_GROUPS, PALETTE_NEW } from './palette-defs.js';
import { coordinateFrom, repoNameOf } from './project-reference.js';
import { slug } from './ids.js';
import { SYMBOLS } from './modux-canvas.js';

/** Strategic context-mapping patterns: abbreviation (as drawn) + full name. */
const RELATION_META: Record<ContextMapRelationType, { abbr: string; name: string }> = {
  PARTNERSHIP: { abbr: 'P', name: 'Partnership' },
  SHARED_KERNEL: { abbr: 'SK', name: 'Shared Kernel' },
  CUSTOMER_SUPPLIER: { abbr: 'C/S', name: 'Customer / Supplier' },
  CONFORMIST: { abbr: 'CF', name: 'Conformist' },
  OPEN_HOST_SERVICE: { abbr: 'OHS', name: 'Open Host Service' },
  ANTI_CORRUPTION_LAYER: { abbr: 'ACL', name: 'Anti-Corruption Layer' },
  PUBLISHED_LANGUAGE: { abbr: 'PL', name: 'Published Language' },
  SEPARATE_WAYS: { abbr: 'SW', name: 'Separate Ways' },
};

const RELATION_TYPES = Object.keys(RELATION_META) as ContextMapRelationType[];

import { type ViewId } from './view-kind.js';
export type { ViewId };


/**
 * Undo/redo operate on edit operations: model commands (sent to the host) plus
 * node moves (applied locally to the layout). One stack entry can bundle both —
 * e.g. dragging a step to reorder it undoes position AND order together.
 */
type MoveNodeOp = {
  kind: 'move-node';
  view: ViewId;
  id: string;
  /** Position to restore; null removes the entry (back to the default layout). */
  pos: { x: number; y: number } | null;
};
type SetEdgePointsOp = {
  kind: 'set-edge-points';
  view: ViewId;
  id: string;
  /** Waypoints to restore; null removes the entry (straight edge again). */
  points: Point[] | null;
};
type ResizeNodeOp = {
  kind: 'resize-node';
  view: ViewId;
  id: string;
  /** Size to restore; null removes the entry (back to the default size). */
  size: { w: number; h: number } | null;
};
type EditOp = ModuxCommand | MoveNodeOp | SetEdgePointsOp | ResizeNodeOp;

/**
 * Canvas activation → semantic element reference. Node ids carry view-specific
 * prefixes; the host only understands catalog element types + raw ids.
 */
function normalizeActivation(id: string, kind: string): { elementType: string; id: string } | null {
  switch (kind) {
    case 'boundedContext':
      return { elementType: 'boundedContext', id: id.replace(/^tgt:/, '') };
    case 'system':
      return { elementType: 'system', id: id.replace(/^tgt:/, '') };
    case 'cdc':
      return { elementType: 'cdc', id };
    case 'aggregate':
      return { elementType: 'aggregate', id };
    case 'use-case':
      return { elementType: 'use-case', id };
    case 'entity':
      return { elementType: 'entity', id };
    case 'value-object':
      return { elementType: 'value-object', id };
    case 'field':
      return { elementType: 'field', id };
    case 'flow':
      return { elementType: 'flow', id: id.replace(/^flow:/, '') };
    case 'process':
      return { elementType: 'process', id };
    case 'workflow':
      return { elementType: 'workflow', id };
    case 'domain-event':
      return { elementType: 'domain-event', id };
    case 'subscription':
      return { elementType: 'subscription', id };
    case 'projection':
      return { elementType: 'projection', id };
    case 'read-model':
      return { elementType: 'read-model', id };
    case 'ui-app':
      return { elementType: 'ui-adapter', id };
    case 'page':
      return { elementType: 'page', id };
    case 'service':
      return { elementType: 'service', id };
    case 'url':
      return { elementType: 'url', id };
    case 'ui':
      return { elementType: 'ui', id };
    case 'actor':
      return { elementType: 'actor', id };
    case 'query-service':
      return { elementType: 'query-service', id };
    case 'scheduled-trigger':
      return { elementType: 'scheduled-trigger', id };
    case 'workflow-gateway':
      return { elementType: 'workflow-gateway', id };
    case 'model':
      return { elementType: 'model', id };
    case 'mapping':
      return { elementType: 'mapping', id };
    case 'component':
      return { elementType: 'component', id };
    case 'external-system':
      return { elementType: 'external-system', id };
    case 'module':
      return { elementType: 'module', id };
    case 'custom-code':
      return { elementType: 'custom-code', id };
    case 'transformation':
      return { elementType: 'transformation', id };
    case 'etl-flow':
      return { elementType: 'etl-flow', id };
    case 'button-group':
      return { elementType: 'button-group', id };
    case 'identity-provider':
      return { elementType: 'identity-provider', id };
    case 'ai-agent':
      return { elementType: 'ai-agent', id };
    case 'rag':
      return { elementType: 'rag', id };
    case 'mcp-gateway':
      return { elementType: 'mcp-gateway', id };
    default:
      return null;
  }
}

/** Spanish labels for the drawer's element-type header; unknown types fall back to humanizeKey. */
const ELEMENT_TYPE_LABELS: Record<string, string> = {
  boundedContext: 'Contexto', aggregate: 'Agregado', entity: 'Entidad',
  'value-object': 'Value object', 'use-case': 'Caso de uso', field: 'Campo',
  flow: 'Flow', process: 'Proceso', workflow: 'Workflow', 'domain-event': 'Evento de dominio',
  subscription: 'Suscripción', projection: 'Proyección', 'read-model': 'Read model',
  'ui-adapter': 'Adaptador UI', page: 'Página', service: 'Servicio', 'query-service': 'Query service',
  actor: 'Actor', 'scheduled-trigger': 'Disparador programado', 'workflow-gateway': 'Gateway',
  model: 'Modelo', mapping: 'Mapping', component: 'Componente', 'external-system': 'Sistema externo',
  module: 'Módulo', 'custom-code': 'Código a medida', 'ai-agent': 'Agente IA', rag: 'RAG',
  'mcp-gateway': 'Pasarela MCP', 'identity-provider': 'Proveedor de identidad',
};

/** «Contexto» for a known elementType, else a spaced-out version of the raw key. */
function drawerTypeLabel(type: string): string {
  return ELEMENT_TYPE_LABELS[type] ?? humanizeKey(type);
}

/**
 * The element kinds `rename-element` understands (mirrors the store's RENAMEABLE table). `field`
 * is renamed by its own command and is handled apart. Both the canvas rename and the drawer rename
 * gate on this — a kind not here has no rename affordance rather than a command that no-ops.
 */
const RENAMEABLE_KINDS = new Set([
  'note', 'area', 'ui', 'page', 'ui-app', 'url', 'boundedContext', 'system', 'cdc', 'aggregate', 'entity',
  'value-object', 'operation', 'process-step', 'workflow', 'workflow-step', 'domain-event',
  'read-model', 'domain-service', 'query-service', 'use-case', 'external-use-case',
  'external-table', 'mcp-server', 'mcp-gateway', 'application-event', 'integration-event', 'external-system',
  'actor', 'ai-agent', 'rag', 'api', 'proxy-api', 'api-operation',
]);

/** camelCase / kebab-case / snake_case → «Palabras legibles» for a field label. */
function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[-_]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** A step opens its owning process — steps have no CRUD of their own. */
function activationForStep(
  processes: { id: string; steps: { id: string }[] }[] | undefined,
  stepId: string,
): { elementType: string; id: string } | null {
  const owner = (processes ?? []).find((p) => p.steps.some((s) => s.id === stepId));
  return owner ? { elementType: 'process', id: owner.id } : null;
}

/**
 * Editor shell. Host contract:
 *   properties in:  model (ModuxModel JSON), layout (EditorLayout)
 *   events out:     modux-command  { command: ModuxCommand }
 *                   layout-changed { layout: EditorLayout }
 *                   modux-select   { elementType, id } | null
 * The host owns persistence of both model and layout.
 */
@customElement('modux-editor')
export class ModuxEditor extends LitElement {
  @property({ attribute: false }) model: ModuxModel = {
    boundedContexts: [],
    externalSystems: [],
    relations: [],
    flows: [],
  };
  @property({ attribute: false }) layout: EditorLayout = {};
  /** On a solution (to-be): element id → ADDED | MODIFIED, drawn as diff rings. */
  @property({ attribute: false }) diff: Record<string, 'ADDED' | 'MODIFIED'> | null = null;

  /**
   * Deep link from the IDE host (§12): open at a given lens and curated scope. Applied once — the
   * user is free to switch views afterwards — so a model round-trip does not snap them back.
   */
  @property({ attribute: false }) open: {
    activeViewId?: string;
    mode?: 'unified' | 'distribution' | 'eventstorming';
  } | null = null;

  /**
   * True inside the IDE plugin, where a view is a document file (§12): creating one opens its
   * document rather than scoping the current sheet in place, which is the web host's behaviour.
   */
  @property({ type: Boolean }) hosted = false;

  /** The front door is graphics-first: the context map on the yugo surface. */
  @state() private _view: ViewId = 'context-map';
  /** Last chosen relation type — the default pre-selection in the picker. */
  @state() private _relationType: ContextMapRelationType = 'CUSTOMER_SUPPLIER';
  /** Open type picker: creating a new relation, or editing an existing one. */
  @state() private _relationPicker: {
    sourceId: string;
    targetId: string;
    mode: 'create' | 'edit';
    x: number;
    y: number;
  } | null = null;
  /** Type picker for an external-system → external-system drag: plain or CQRS. */
  @state() private _extDepPicker: {
    sourceId: string;
    targetId: string;
    x: number;
    y: number;
  } | null = null;
  @state() private _selectedId: string | null = null;
  /**
   * The element whose detail the in-editor drawer shows. Only the IDE host (`hosted`) opens it:
   * in the web app the drawer is Mateu's (GraphicalEditorPage), so there the editor just emits
   * `modux-activate` and this stays null. Double-clicking a node fills it; ✕ / Escape clears it.
   */
  @state() private _drawer: { elementType: string; id: string; kind: string } | null = null;
  /** The drag-to-create / drag-to-place palette. */
  @state() private _paletteOpen = true;
  /** A palette item being dragged with the pointer (CEF has no HTML5 DnD): the ghost's payload + position. */
  @state() private _paletteDrag: {
    payload: { new?: string; existing?: string };
    label: string; x: number; y: number; x0: number; y0: number; active: boolean;
  } | null = null;
  /**
   * The YUGO surface: any view's Scene rendered as the physics organism (Y). Off by default — a
   * view opens on the plain 2D diagram (`modux-canvas`); Yugo and 3D are opt-in lenses (Y / V).
   */
  @state() private _yugo = false;
  /** Whether machine-made stubs (derived elements, ✦) show in the diagram. */
  @state() private _showDerived = true;
  /**
   * Canvas render mode over the SAME model: the unified diagram, the distribution packaging lens,
   * or the eventstorming narrative. They are alternate renders of one canvas, not separate views.
   */
  @state() private _canvasMode: 'unified' | 'distribution' | 'eventstorming' = 'unified';

  /** Mirrors mateu's <html theme="dark"> flag — set by the connected host. */
  @property({ type: Boolean, reflect: true }) dark = false;

  /** Ids issued by palette drops still in flight — the projection hasn't caught up. */
  private _pendingNames = new Set<string>();

  /** The blank-canvas palette auto-open fired already (once per mount). */
  private _paletteOpenedForBlank = false;
  /** Open picker: saying WHERE the project being referenced lives (drop of «Proyecto»). */
  @state() private _repoPicker: { pos: Point; coordinate: string } | null = null;
  /** Open picker: a loose step drop asking WHICH workflow adopts it. */
  @state() private _wfStepPicker: { pos: Point; stepType?: string } | null = null;
  /** Editing the condition of one EXCLUSIVE-split branch. */
  @state() private _branchCondEditor: { gatewayId: string; targetId: string; value: string } | null = null;
  /** The invariant-condition editor (double-click an invariant): its expression and error message. */
  @state() private _invariantCondEditor: { id: string; name: string; expression: string; errorMessage: string } | null = null;
  @state() private _paletteFilter = '';
  /** Palette tab: brand-new elements, or the model's existing catalog. */
  @state() private _paletteTab: 'new' | 'catalog' = 'new';
  /** Mirrors document.fullscreenElement — the editor host in fullscreen. */
  @state() private _fullscreen = false;
  /** Tilt mode: the diagram as stacked 3D plates (a read-only lens). */
  @state() private _tilt = false;
  /** Keyboard-shortcuts help popover (toggled with ?). */
  @state() private _helpOpen = false;
  @state() private _undoStack: EditOp[][] = [];
  @state() private _redoStack: EditOp[][] = [];
  @state() private _multi: string[] = [];
  @state() private _newViewName = '';

  /** The magic connector's question, at the drop point. */
  @state() private _connectPicker: {
    x: number;
    y: number;
    options: { id: string; label: string; hint: string; apply(): void }[];
  } | null = null;
  @state() private _activeViewId = '';
  @state() private _newRagSourceType = 'WEB';
  @state() private _newRagSourceUri = '';
  /** Catalog tree panel: curate the active view's members with checkboxes. */
  @state() private _treeOpen = false;
  /** Pending node deletion awaiting confirmation; memberIds non-empty offers «quitar de la vista». */
  @state() private _deletePicker: {
    items: { elementType: string; id: string; kind: string }[];
    memberIds: string[];
  } | null = null;

  static styles = [
    MODUX_THEME,
    css`
    .canvas-wrap {
      position: relative;
    }
    .palette {
      position: absolute;
      left: 8px;
      top: 8px;
      bottom: 8px;
      width: 244px;
      z-index: 15;
      background: var(--modux-surface);
      border: 1px solid var(--modux-border);
      border-radius: 10px;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
      display: flex;
      overflow: hidden;
    }
    .palette.shifted {
      left: 280px;
    }
    .palette-body {
      flex: 1;
      min-width: 0;
      overflow-y: auto;
      padding: 8px;
    }
    .palette-side {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 4px;
      background: var(--modux-surface-2);
      border-left: 1px solid var(--modux-border);
    }
    .palette-vtab {
      writing-mode: vertical-rl;
      border: none;
      background: transparent;
      font: inherit;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: var(--modux-text-dim);
      padding: 10px 4px;
      border-radius: 6px;
      cursor: pointer;
    }
    .palette-vtab[data-active] {
      background: var(--modux-primary);
      color: var(--modux-primary-text);
    }
    .tab.hamburger {
      font-size: 16px;
      line-height: 1;
      padding: 4px 10px;
    }
    .help-pop {
      max-width: 420px;
    }
    .help-row {
      display: flex;
      gap: 12px;
      align-items: baseline;
      font-size: 12px;
      color: var(--modux-text);
      padding: 3px 8px;
    }
    .help-keys {
      flex: 0 0 150px;
      font-weight: 700;
      color: var(--modux-primary);
      font-family: ui-monospace, monospace;
      font-size: 11px;
    }
    .palette-filter {
      width: 100%;
      box-sizing: border-box;
      font: inherit;
      font-size: 12px;
      padding: 4px 8px;
      border: 1px solid var(--modux-border-strong);
      border-radius: 6px;
      margin-bottom: 6px;
      background: var(--modux-input-bg);
      color: var(--modux-text);
    }
    .palette-h {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--modux-text-dim);
      margin: 10px 2px 4px;
    }
    .palette-g {
      font-size: 11px;
      font-weight: 600;
      color: var(--modux-text-dim);
      margin: 8px 2px 2px;
    }
    .palette-item {
      font-size: 12px;
      color: var(--modux-text);
      padding: 4px 8px;
      border: 1px solid var(--modux-border);
      border-radius: 6px;
      margin: 2px 0;
      cursor: grab;
      background: var(--modux-surface-2);
      user-select: none;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .palette-ghost {
      position: fixed;
      z-index: 1000;
      transform: translate(10px, 8px);
      pointer-events: none;
      font-size: 12px;
      color: var(--modux-text);
      padding: 4px 8px;
      border: 1px solid var(--modux-border);
      border-radius: 6px;
      background: var(--modux-surface-2);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
      user-select: none;
      white-space: nowrap;
      opacity: 0.95;
    }
    .drawer-backdrop {
      position: absolute;
      inset: 0;
      z-index: 40;
    }
    .drawer {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 41;
      width: 320px;
      max-width: 80%;
      display: flex;
      flex-direction: column;
      background: var(--modux-surface);
      border-left: 1px solid var(--modux-border);
      box-shadow: -8px 0 24px rgba(0, 0, 0, 0.18);
      font-size: 13px;
      color: var(--modux-text);
    }
    .drawer-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 14px;
      border-bottom: 1px solid var(--modux-border);
    }
    .drawer-type {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--modux-text-dim);
    }
    .drawer-title {
      font-size: 15px;
      font-weight: 600;
      word-break: break-word;
    }
    .drawer-title-input {
      width: 100%;
      box-sizing: border-box;
      font: 600 15px ui-sans-serif, system-ui, sans-serif;
      color: var(--modux-text);
      background: transparent;
      border: 1px solid transparent;
      border-radius: 5px;
      margin: -3px -6px;
      padding: 2px 6px;
    }
    .drawer-title-input:hover {
      border-color: var(--modux-border);
    }
    .drawer-title-input:focus {
      outline: none;
      border-color: var(--modux-primary, #2563eb);
      background: var(--modux-surface-2);
    }
    .drawer-cfg {
      width: 100%;
      box-sizing: border-box;
      font: 13px ui-sans-serif, system-ui, sans-serif;
      color: var(--modux-text);
      background: var(--modux-surface-2);
      border: 1px solid var(--modux-border);
      border-radius: 5px;
      padding: 3px 6px;
    }
    .drawer-cfg:focus {
      outline: none;
      border-color: var(--modux-primary, #2563eb);
    }
    .drawer-close {
      flex: 0 0 auto;
      border: none;
      background: transparent;
      color: var(--modux-text-dim);
      font-size: 15px;
      line-height: 1;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
    }
    .drawer-close:hover {
      background: var(--modux-surface-2);
      color: var(--modux-text);
    }
    .drawer-body {
      margin: 0;
      padding: 12px 14px;
      overflow: auto;
      display: grid;
      grid-template-columns: minmax(0, 40%) minmax(0, 60%);
      gap: 6px 12px;
      align-content: start;
    }
    .drawer-body dt {
      color: var(--modux-text-dim);
      word-break: break-word;
    }
    .drawer-body dd {
      margin: 0;
      word-break: break-word;
    }
    .drawer-empty {
      padding: 16px 14px;
      color: var(--modux-text-dim);
    }
    .pal-ico {
      flex: 0 0 13px;
      width: 13px;
      height: 13px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.2;
      stroke-linecap: round;
      stroke-linejoin: round;
      overflow: visible;
    }
    .pal-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .palette-item:hover {
      background: var(--modux-primary-soft);
      border-color: var(--modux-primary);
    }
    .palette-child {
      border-style: dashed;
    }

    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      font-family: ui-sans-serif, system-ui, sans-serif;
      background: var(--modux-surface);
      border: 1px solid var(--modux-border);
      border-radius: 10px;
      overflow: hidden;
    }
    .brand {
      font: 600 12px ui-sans-serif, system-ui, sans-serif;
      color: var(--modux-text-faint);
      letter-spacing: 0.02em;
      white-space: nowrap;
      padding: 0 6px 0 2px;
      cursor: default;
      user-select: none;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--modux-border);
      background: var(--modux-surface-2);
      flex-wrap: wrap;
    }
    .tab {
      border: none;
      background: transparent;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
      color: var(--modux-text);
    }
    .tab[data-active] {
      background: var(--modux-primary);
      color: var(--modux-primary-text);
    }
    .tab:disabled {
      color: var(--modux-text-faint);
      cursor: not-allowed;
    }
    .spacer {
      flex: 1;
    }
    label {
      font-size: 12px;
      color: var(--modux-text-dim);
    }
    select,
    .new-name {
      font-size: 13px;
      padding: 4px 6px;
      border-radius: 6px;
      border: 1px solid var(--modux-border-strong);
      background: var(--modux-input-bg);
      color: var(--modux-text);
    }
    .new-name {
      width: 130px;
    }
    .new-name.evt {
      width: 110px;
    }
    .picker-backdrop {
      position: fixed;
      inset: 0;
      z-index: 20;
    }
    .relation-picker {
      position: fixed;
      z-index: 21;
      min-width: 210px;
      transform: translate(-50%, 12px);
      background: var(--modux-surface);
      border: 1px solid var(--modux-border);
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      /* Never taller than the viewport: a long vocabulary scrolls inside instead of running off. */
      max-height: 70vh;
      overflow-y: auto;
    }
    /* The relation-type picker can be long; center it so it always fits, whatever the click point. */
    .relation-picker--centered {
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      max-width: min(420px, 90vw);
    }
    .picker-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--modux-text-dim);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 4px 8px 6px;
    }
    .picker-input {
      margin: 0 8px 6px;
      min-width: 320px;
      font-size: 13px;
      padding: 6px 8px;
      border-radius: 7px;
      border: 1px solid var(--modux-border-strong);
      background: var(--modux-input-bg);
      color: var(--modux-text);
    }
    .picker-item {
      display: flex;
      align-items: center;
      gap: 10px;
      border: none;
      background: transparent;
      border-radius: 7px;
      padding: 6px 8px;
      cursor: pointer;
      text-align: left;
      font-size: 13px;
      color: var(--modux-text);
    }
    .picker-item:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .picker-item:hover {
      background: var(--modux-surface-2);
    }
    .picker-item.current {
      background: var(--modux-primary-soft);
    }
    .picker-item .abbr {
      flex: 0 0 34px;
      font-weight: 700;
      font-size: 11px;
      color: var(--modux-primary);
      text-align: center;
    }
    .picker-item.current .abbr::after {
      content: ' ✓';
    }
    .picker-item.danger .abbr {
      color: var(--modux-danger);
    }
    .picker-item.danger:hover {
      background: var(--modux-surface-2);
    }
    .relation-picker input,
    .relation-picker select {
      background: var(--modux-input-bg);
      border-color: var(--modux-border-strong);
      color: var(--modux-text);
    }
    .tab:disabled {
      opacity: 0.4;
    }
    .sep {
      width: 1px;
      align-self: stretch;
      background: var(--modux-border);
      margin: 2px 4px;
    }
    [hidden] {
      display: none !important;
    }
    .hint {
      font-size: 12px;
      color: var(--modux-text-faint);
      padding: 4px 12px;
      border-top: 1px solid var(--modux-border);
    }
    modux-canvas,
    modux-tilt,
    modux-explorer {
      flex: 1;
      min-height: 0;
    }
    .canvas-wrap {
      position: relative;
      flex: 1;
      min-height: 0;
      display: flex;
    }
    .view-tree {
      position: absolute;
      left: 8px;
      top: 8px;
      bottom: 8px;
      width: 264px;
      overflow: auto;
      background: var(--modux-surface);
      border: 1px solid var(--modux-border-strong);
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
      padding: 8px 12px 12px;
      z-index: 15;
    }
    .view-tree h4 {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--modux-text-dim);
      margin: 10px 0 4px;
    }
    .view-tree label {
      display: flex;
      gap: 7px;
      align-items: center;
      padding: 2px 0;
      font-size: 13px;
      color: var(--modux-text);
      cursor: pointer;
    }
    .view-tree label.child {
      margin-left: 18px;
      color: var(--modux-text-dim);
    }
    .view-tree label.implicit {
      color: var(--modux-text-faint);
    }
    .view-tree .tree-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--modux-text);
      padding: 2px 0 4px;
    }
  `,
  ];

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Listen at the WINDOW, not the element: inside the IDE the canvas rarely holds DOM focus, so an
    // element-scoped keydown never fires (Ctrl+Z lands on <body> and is lost). Window-level keydown
    // works whenever the webview has OS focus — the same reason space-to-pan already works.
    window.addEventListener('keydown', this.hostKeydown);
    this.ownerDocument.addEventListener('fullscreenchange', this.onFullscreenChange);
  }

  disconnectedCallback(): void {
    window.removeEventListener('keydown', this.hostKeydown);
    this.ownerDocument.removeEventListener('fullscreenchange', this.onFullscreenChange);
    super.disconnectedCallback();
  }

  private onFullscreenChange = (): void => {
    // document.fullscreenElement retargets to the outermost shadow host, so
    // compare with :fullscreen, which matches through shadow boundaries.
    this._fullscreen = this.matches(':fullscreen');
  };

  /** The diagram takes the whole screen (host element fullscreen), F toggles back. */
  private async toggleFullscreen(): Promise<void> {
    try {
      if (this.ownerDocument.fullscreenElement) await this.ownerDocument.exitFullscreen();
      else await this.requestFullscreen();
    } catch {
      // Fullscreen can be denied (no user gesture, iframe policy) — nothing to do.
    }
  }

  /**
   * Editor-level shortcuts. They never fire while typing (inputs, selects, the
   * inline rename editor); the canvas keeps its own keys (Supr, F2, Ctrl+Z…).
   */
  private hostKeydown = (e: KeyboardEvent): void => {
    const target = e.composedPath()[0] as HTMLElement | undefined;
    const tag = (target?.tagName ?? '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    // Undo/redo from anywhere in the editor (not only when the canvas has focus), so the keyboard
    // shortcut is enough and no toolbar button is needed.
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.redo(); else this.undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      this.redo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const canvas = this.renderRoot.querySelector('modux-canvas');
    switch (e.key) {
      case 'p':
      case 'P':
        if (['context-map', 'distribution', 'workflows', 'ui', 'mappings', 'integrations'].includes(this._view)) {
          e.preventDefault();
          this._paletteOpen = !this._paletteOpen;
        }
        break;
      case 'y':
      case 'Y':
        e.preventDefault();
        this._yugo = !this._yugo;
        if (this._yugo) this._tilt = false;
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        void this.toggleFullscreen();
        break;
      case '0':
        e.preventDefault();
        canvas?.fit();
        this.renderRoot.querySelector('modux-explorer')?.fit();
        break;
      case '+':
      case '=':
        e.preventDefault();
        canvas?.zoomBy(1.25);
        break;
      case '-':
        e.preventDefault();
        canvas?.zoomBy(0.8);
        break;
      case 't':
      case 'T':
        if (this._activeViewId) {
          e.preventDefault();
          this._treeOpen = !this._treeOpen;
        }
        break;
      case 'v':
      case 'V':
        e.preventDefault();
        this._tilt = !this._tilt;
        break;
      case 'c':
      case 'C':
      case 'r':
      case 'R': {
        // With a field selected: c toggles COLLECTION (multiplicity), r toggles REQUIRED.
        const fid = this._selectedId;
        const field = fid
          ? [...(this.model.aggregates ?? []), ...(this.model.entities ?? [])]
              .flatMap((o) => o.fields ?? [])
              .find((f) => f.id === fid)
          : undefined;
        if (field?.modelId) {
          e.preventDefault();
          if (e.key === 'c' || e.key === 'C') {
            this.command({ kind: 'set-model-field-collection', modelId: field.modelId, fieldId: field.id, collection: !field.collection });
          } else {
            this.command({ kind: 'set-model-field-required', modelId: field.modelId, fieldId: field.id, required: !field.required });
          }
        }
        break;
      }
      case '?':
        e.preventDefault();
        this._helpOpen = !this._helpOpen;
        break;
      case 'Escape':
        if (this._helpOpen) this._helpOpen = false;
        if (this._connectPicker) this._connectPicker = null;
        if (this._invariantCondEditor) this._invariantCondEditor = null;
        if (this._drawer) this._drawer = null;
        break;
      default:
        break;
    }
  };

  private command(command: ModuxCommand, pushUndo = true): void {
    if (pushUndo) {
      const inverse = this.inverseOf(command);
      if (inverse) this.pushUndoEntry(inverse);
    }
    this.emit('modux-command', { command });
  }

  /**
   * There is one canvas now, so one geometry per document: the unified canvas and the design
   * drill-in share it (their node ids are disjoint). A scoped document keys under its view id, the
   * whole model under «base» — matching the single key the IDE host seeds and writes back.
   */
  private layoutKey(_view: ViewId): string {
    return this._activeViewId ? `view:${this._activeViewId}` : 'base';
  }

  private viewLayout(view: ViewId): ViewLayout {
    return normalizeViewLayout(this.layout[this.layoutKey(view)]);
  }

  private writeViewLayout(view: ViewId, next: ViewLayout): void {
    this.layout = { ...this.layout, [this.layoutKey(view)]: next };
    this.emit('layout-changed', { layout: this.layout });
  }

  /**
   * Drops every trace of a node's geometry across ALL views: position and size.
   * Palette ids are name slugs, so deleting «Área» and creating another revives
   * the same id — without this sweep the newcomer would inherit the old clothes.
   */
  private purgeNodeGeometry(id: string): void {
    let changed = false;
    const next: EditorLayout = { ...this.layout };
    for (const key of Object.keys(next)) {
      const vl = normalizeViewLayout(next[key]);
      if (!(id in vl.nodes) && !(id in (vl.sizes ?? {}))) continue;
      const nodes = { ...vl.nodes };
      delete nodes[id];
      const sizes = { ...(vl.sizes ?? {}) };
      delete sizes[id];
      next[key] = { ...vl, nodes, sizes };
      changed = true;
    }
    if (!changed) return;
    this.layout = next;
    this.emit('layout-changed', { layout: this.layout });
  }

  /** Adopt the persisted detail level when the host hands us a (re)loaded layout. */
  /** Honoured once: the host's requested lens and curated scope, applied when they first arrive. */
  private _opened = false;

  protected willUpdate(changed: PropertyValues): void {
    if (this.open && !this._opened && (changed.has('open') || changed.has('model'))) {
      this._activeViewId = this.open.activeViewId ?? '';
      // Restore the lens the view was saved in (unified / distribution / eventstorming), so a C4
      // container view opens straight into distribution instead of the flat unified canvas.
      if (this.open.mode) this._canvasMode = this.open.mode;
      this._opened = true;
    }
    if (changed.has('model')) this._pendingNames.clear();
    if (changed.has('model')) this.pruneStaleEdgePoints();
    // A blank canvas opens the palette by itself: the first gesture is a drop.
    if (changed.has('model') && !this._paletteOpenedForBlank
        && this.model.boundedContexts.length === 0 && this.model.externalSystems.length === 0) {
      this._paletteOpen = true;
      this._paletteOpenedForBlank = true;
    }
    if (changed.has('layout') || changed.has('model')) {
      this.migrateLevelLayouts();
      this.migrateNestedGeometry();
    }
  }

  /** Sheets already offered an initial layout (key + view + lens), so it runs once each. */
  private readonly _initialLayoutTried = new Set<string>();

  protected updated(changed: PropertyValues): void {
    if (['model', 'layout', '_view', '_activeViewId', '_canvasMode', '_yugo', '_tilt'].some((p) => changed.has(p))) {
      this.maybeInitialLayout();
    }
  }

  /**
   * A view nobody ever placed (a model written from a spec carries no geometry) opens
   * arranged by ELK instead of on its per-view template — no overlapping boxes, orthogonal
   * lines, crossings minimised. Once per sheet; a sheet with any stored position is the
   * author's and stays as it is.
   */
  private maybeInitialLayout(): void {
    if (this._yugo || this._tilt) return;
    const view = this._view;
    const tried = `${this.layoutKey(view)}|${view}|${this._canvasMode}`;
    if (this._initialLayoutTried.has(tried)) return;
    const scene = this.sceneFor(view);
    if (!scene.nodes.length) return; // the model may not have arrived yet: try again later
    this._initialLayoutTried.add(tried);
    if (needsInitialLayout(scene, this.viewLayout(view))) void this.runAutoLayout({ initial: true });
  }

  /**
   * One-shot migration to the Archi-style flat sheets: pre-flat layouts stored a
   * child's position as an OFFSET from its container's centre. Every node is a
   * free box now, so offsets become absolute by walking the ownership chain.
   * Sizes of ex-containers (they were sized to hold children) are dropped.
   */
  private migrateNestedGeometry(): void {
    if (!this.model.boundedContexts.length && !this.model.externalSystems.length) return;
    const keys = Object.keys(this.layout).filter(
      (k) => k === 'context-map' || k.startsWith('context-map@view:')
        || k === 'distribution' || k.startsWith('distribution@view:'),
    );
    let changed = false;
    const next: EditorLayout = { ...this.layout };
    for (const key of keys) {
      const vl = normalizeViewLayout(next[key]);
      if (vl.flat) continue;
      const owners = ownershipIndex(
        this.model,
        key.startsWith('distribution') ? 'distribution' : 'unified',
      );
      const abs = new Map<string, Point>();
      const resolve = (id: string, guard = 0): Point | null => {
        if (guard > 12) return vl.nodes[id] ?? null;
        const cached = abs.get(id);
        if (cached) return cached;
        const stored = vl.nodes[id];
        const owner = owners.get(id);
        if (!owner) {
          if (stored) abs.set(id, stored);
          return stored ?? null;
        }
        if (!stored) return null;
        const ownerPos = resolve(owner, guard + 1);
        const p = ownerPos ? { x: ownerPos.x + stored.x, y: ownerPos.y + stored.y } : stored;
        abs.set(id, p);
        return p;
      };
      const nodes: DiagramLayout = {};
      for (const id of Object.keys(vl.nodes)) {
        nodes[id] = resolve(id) ?? vl.nodes[id];
      }
      // Ex-containers were sized to hold their children: those clothes no longer fit.
      const parents = new Set(owners.values());
      const sizes = { ...(vl.sizes ?? {}) };
      for (const id of Object.keys(sizes)) if (parents.has(id)) delete sizes[id];
      next[key] = { ...vl, nodes, sizes, flat: true };
      changed = true;
    }
    if (!changed) return;
    this.layout = next;
    this.emit('layout-changed', { layout: this.layout });
  }

  /**
   * One-shot migration from the pre-single-level world: the four per-level sheets
   * (contexts / detail / operations / distribution) fold into ONE diagram sheet plus
   * the distribution lens. The level the user last worked on wins the geometry; the
   * other levels contribute what it lacks (chip offsets, container sizes). The old
   * global levels become per-element expansion: detail/operations layouts expanded
   * every container, so the migrated `expanded` set reproduces that look.
   */
  private migrateLevelLayouts(): void {
    const baseVl = normalizeViewLayout(this.layout['context-map']);
    const legacyKeys = ['context-map@detail', 'context-map@operations', 'context-map@distribution'];
    const hasLegacy = baseVl.detail !== undefined || legacyKeys.some((k) => this.layout[k]);
    if (!hasLegacy) return;
    // The expansion seed needs the model on stage; wait for both props.
    if (!this.model.boundedContexts.length && !this.model.externalSystems.length) return;
    const next: EditorLayout = { ...this.layout };
    const pick = (key: string) => normalizeViewLayout(next[key]);
    const detail = baseVl.detail ?? 'contexts';
    const chosen =
      detail === 'detail' && next['context-map@detail']
        ? pick('context-map@detail')
        : detail === 'operations' && next['context-map@operations']
          ? pick('context-map@operations')
          : baseVl;
    const merged: ViewLayout = {
      nodes: { ...chosen.nodes },
      edges: { ...chosen.edges },
      sizes: { ...(chosen.sizes ?? {}) },
    };
    for (const key of ['context-map', 'context-map@detail', 'context-map@operations']) {
      const vl = pick(key);
      for (const [id, p] of Object.entries(vl.nodes)) if (!(id in merged.nodes)) merged.nodes[id] = p;
      for (const [id, s] of Object.entries(vl.sizes ?? {})) if (!(id in merged.sizes!)) merged.sizes![id] = s;
    }
    // detail/operations drew every container unfolded; their old `collapsed` toggles folded.
    // At the contexts level the toggle meant the opposite: expand.
    const expanded = new Set<string>();
    if (detail === 'contexts' || detail === 'distribution') {
      for (const id of baseVl.collapsed ?? []) expanded.add(id);
    } else {
      const folded = new Set(chosen.collapsed ?? []);
      for (const m of this.model.boundedContexts) expanded.add(m.id);
      for (const x of this.model.externalSystems) expanded.add(x.id);
      if (detail === 'operations') {
        for (const a of this.model.apis ?? []) expanded.add(a.id);
        for (const px of this.model.proxyApis ?? []) expanded.add(px.id);
        for (const impl of this.model.apiImplementations ?? []) {
          expanded.add(`apiimpl:${impl.apiId}@${impl.boundedContextId}`);
        }
      }
      for (const id of folded) expanded.delete(id);
    }
    next['context-map'] = { nodes: merged.nodes, edges: merged.edges, sizes: merged.sizes, expanded: [...expanded] };
    // The distribution level moves to its own view, sheet included (its toggles
    // already meant «expand this module»).
    const dist = next['context-map@distribution'];
    if (dist && !next['distribution']) {
      const dvl = normalizeViewLayout(dist);
      next['distribution'] = {
        nodes: dvl.nodes,
        edges: dvl.edges,
        sizes: dvl.sizes,
        expanded: dvl.collapsed ?? [],
      };
    }
    for (const k of legacyKeys) delete next[k];
    this.layout = next;
    this.emit('layout-changed', { layout: this.layout });
  }

  /**
   * A deleted relation takes its bends with it. Stored edge points whose edge
   * no longer exists — though BOTH endpoints are on stage — belong to a
   * relation the user removed: without this sweep, recreating the relation
   * would revive the old detour. Endpoints hidden by the level, the active
   * vista or the single-module collapse keep their points untouched.
   */
  private pruneStaleEdgePoints(): void {
    const layout = this.viewLayout(this._view);
    const refs = Object.keys(layout.edges ?? {});
    if (!refs.length) return;
    const scene = this.sceneFor(this._view);
    const edgeIds = new Set(scene.edges.map((e) => e.id));
    const nodeIds = new Set(scene.nodes.map((n) => n.id));
    const stale = refs.filter((ref) => {
      if (edgeIds.has(ref)) return false;
      const m = /^(?:[a-z-]+:)?(.+?)->(.+)$/i.exec(ref);
      return !!m && nodeIds.has(m[1]) && nodeIds.has(m[2]);
    });
    if (!stale.length) return;
    const edges = { ...layout.edges };
    stale.forEach((ref) => delete edges[ref]);
    this.writeViewLayout(this._view, { ...layout, edges });
  }

  /**
   * Expanding a node grows its container over the neighbours: nudge the
   * top-level boxes apart (one undoable step) so the map stays legible.
   * Areas group by overlapping — pushing them apart would defeat them.
   */
  private declumpView(view: ViewId): void {
    const current = this.viewLayout(view);
    // Children (ownerId) ride with their owner: pushing them here made a fresh
    // child overlap its own expanded container and fly thousands of pixels away
    // (half the overlap per iteration, eighty iterations, then persisted).
    const top = this.sceneFor(view).nodes.filter(
      (n) => !n.parentId && !n.ownerId && n.kind !== 'area',
    );
    const moves = declump(top);
    const ops: EditOp[] = [...moves.keys()].map((id) => ({
      kind: 'move-node',
      view,
      id,
      pos: current.nodes[id] ?? null,
    }));
    const nodes = { ...current.nodes };
    for (const [id, p] of moves) {
      // Children hang off the STORED centre (a fitted container may render off it):
      // apply the declump displacement as a delta, never the raw scene position.
      const orig = top.find((n) => n.id === id)!;
      const base = current.nodes[id] ?? { x: orig.x, y: orig.y };
      nodes[id] = {
        x: Math.round(base.x + (p.x - orig.x)),
        y: Math.round(base.y + (p.y - orig.y)),
      };
    }
    this.writeViewLayout(view, { ...current, nodes });
    if (ops.length) this.pushUndoEntry(ops);
  }

  /**
   * Display-time edge routing: edges whose straight orthogonal path would run
   * over a foreign node get orthogonal detour bends, recomputed with every scene
   * (no persistence, so they follow every level change and drag) — this is what
   * keeps the lines horizontal/vertical and off the boxes on every diagram view.
   * Hand-placed bends always win.
   */
  private routedEdgePoints(scene: {
    nodes: SceneNode[];
    edges: { id: string; sourceId: string; targetId: string }[];
  }): Record<string, Point[]> {
    const stored = this.viewLayout(this._view).edges;
    if (!scene.edges.length) return stored;
    const routed = routeEdgesAroundNodes(scene, stored);
    if (!routed.size) return stored;
    // `routed` also carries fresh routes for stored ones that ran over a box, so
    // it must WIN over `stored` — those stale/orphaned routes are what it fixes.
    return { ...stored, ...Object.fromEntries(routed) };
  }

  private pushUndoEntry(ops: EditOp[]): void {
    this._undoStack = [...this._undoStack.slice(-19), ops];
    this._redoStack = []; // a fresh user action invalidates the redo branch
  }

  /** Inverses of an operation list, computed against the current state, in reverse order. */
  private inversesOf(ops: EditOp[]): EditOp[] {
    return [...ops].reverse().flatMap((op): EditOp[] => {
      if (op.kind === 'move-node') {
        return [
          {
            kind: 'move-node',
            view: op.view,
            id: op.id,
            pos: this.viewLayout(op.view).nodes[op.id] ?? null,
          } satisfies MoveNodeOp,
        ];
      }
      if (op.kind === 'set-edge-points') {
        return [
          {
            kind: 'set-edge-points',
            view: op.view,
            id: op.id,
            points: this.viewLayout(op.view).edges[op.id] ?? null,
          } satisfies SetEdgePointsOp,
        ];
      }
      if (op.kind === 'resize-node') {
        return [
          {
            kind: 'resize-node',
            view: op.view,
            id: op.id,
            size: this.viewLayout(op.view).sizes?.[op.id] ?? null,
          } satisfies ResizeNodeOp,
        ];
      }
      return this.inverseOf(op) ?? [];
    });
  }

  private applyOps(ops: EditOp[]): void {
    for (const op of ops) {
      if (op.kind === 'move-node') {
        const current = this.viewLayout(op.view);
        const nodes = { ...current.nodes };
        if (op.pos) nodes[op.id] = op.pos;
        else delete nodes[op.id];
        this.writeViewLayout(op.view, { ...current, nodes });
      } else if (op.kind === 'set-edge-points') {
        const current = this.viewLayout(op.view);
        const edges = { ...current.edges };
        // an empty list is a real value: the edge is pinned straight
        if (op.points) edges[op.id] = op.points;
        else delete edges[op.id];
        this.writeViewLayout(op.view, { ...current, edges });
      } else if (op.kind === 'resize-node') {
        const current = this.viewLayout(op.view);
        const sizes = { ...(current.sizes ?? {}) };
        if (op.size) sizes[op.id] = op.size;
        else delete sizes[op.id];
        this.writeViewLayout(op.view, { ...current, sizes });
      } else {
        this.command(op, false);
      }
    }
  }

  /**
   * Inverse commands computed against the CURRENT model (before the command is
   * applied) — what Ctrl+Z replays. Composite where needed (e.g. removing a
   * boundedContext also drops its relations, so its inverse restores them).
   */

  /** Discard undo/redo — called by the host when the model changed externally. */
  clearHistory(): void {
    this._undoStack = [];
    this._redoStack = [];
  }

  /** Undo/redo entry points the IDE host calls: on macOS IntelliJ grabs Cmd+Z before the webview,
   * so the plugin intercepts the key and re-dispatches it here. */
  hostUndo(): void { this.undo(); }
  hostRedo(): void { this.redo(); }

  private undo(): void {
    const inverse = this._undoStack[this._undoStack.length - 1];
    if (!inverse) return;
    this._undoStack = this._undoStack.slice(0, -1);
    this._redoStack = [...this._redoStack.slice(-19), this.inversesOf(inverse)];
    this.applyOps(inverse);
  }

  private redo(): void {
    const ops = this._redoStack[this._redoStack.length - 1];
    if (!ops) return;
    this._redoStack = this._redoStack.slice(0, -1);
    this._undoStack = [...this._undoStack.slice(-19), this.inversesOf(ops)];
    this.applyOps(ops);
  }

  private onNodeMoved(e: CustomEvent): void {
    const { id, x, y } = e.detail;
    const view = this._view;
    const current = this.viewLayout(view);
    const previous = current.nodes[id] ?? null;
    // A nested child is stored as an offset from its container, so it stays put
    // relative to the container when the container itself moves.
    let pos = { x, y };
    const scene = this.sceneFor(view);
    const node = scene.nodes.find((n) => n.id === id);
    if (node?.parentId) {
      const parent = scene.nodes.find((n) => n.id === node.parentId);
      if (parent) pos = { x: x - parent.x, y: y - parent.y };
    }
    this.writeViewLayout(view, { ...current, nodes: { ...current.nodes, [id]: pos } });
    const inverseOps: EditOp[] = [{ kind: 'move-node', view, id, pos: previous }];
    // Dragging a step across its siblings also reorders the process.
    if (view === 'processes') {
      const reorder = this.stepReorderCommand(id);
      if (reorder) {
        const inverse = this.inverseOf(reorder);
        if (inverse) inverseOps.unshift(...inverse);
        this.command(reorder, false);
      }
    }
    this.pushUndoEntry(inverseOps);
  }

  /**
   * A Shift/Ctrl-drag dropped an API chip on a new home: another external system
   * re-homes the API; empty canvas un-nests it (back to a standalone contract).
   * Publisher change and drop position travel in ONE undo entry.
   */
  private onNodeReparentRequested(e: CustomEvent): void {
    const { id, targetId, x, y } = e.detail as {
      id: string;
      targetId: string | null;
      x: number;
      y: number;
    };
    // An external system dropped on another nests as its subsystem; on the
    // canvas, it leaves its parent and goes back to the top level.
    const ext = this.model.externalSystems.find((x) => x.id === id);
    if (ext) {
      const target = targetId ? this.model.externalSystems.find((x) => x.id === targetId) : null;
      if (targetId && !target) return;
      // no cycles: the new parent must not live (directly or not) inside the dragged one
      for (let cur = target; cur; ) {
        if (cur.id === id) return;
        const up = cur.parentExternalSystemId;
        cur = up ? this.model.externalSystems.find((x) => x.id === up) ?? null : null;
      }
      const next = target?.id ?? null;
      if ((ext.parentExternalSystemId ?? null) === next) return;
      const view = this._view;
      const layout = this.viewLayout(view);
      const scene = this.sceneFor(view);
      const parent = next ? scene.nodes.find((n) => n.id === next) : undefined;
      const pos = parent ? { x: x - parent.x, y: y - parent.y } : { x, y };
      // nesting strips the pair's dependency edges on the backend: undo re-adds them
      const pairDeps = next
        ? (this.model.externalSystemDependencies ?? []).filter(
            (d) => (d.sourceId === id && d.targetId === next) || (d.sourceId === next && d.targetId === id))
        : [];
      this.pushUndoEntry([
        { kind: 'set-external-system-parent', id, parentId: ext.parentExternalSystemId ?? null },
        ...pairDeps.map((d): EditOp => ({
          kind: 'add-external-dependency', sourceId: d.sourceId, targetId: d.targetId,
          ...(d.type === 'CQRS' ? { type: 'CQRS' } : {}),
        })),
        { kind: 'move-node', view, id, pos: layout.nodes[id] ?? null },
      ]);
      this.command({ kind: 'set-external-system-parent', id, parentId: next }, false);
      this.writeViewLayout(view, { ...layout, nodes: { ...layout.nodes, [id]: pos } });
      return;
    }
    // A system shift-dropped on another nests as its subsystem; on the bare canvas, back to top.
    const sys = (this.model.systems ?? []).find((s) => s.id === id);
    if (sys) {
      const target = targetId ? (this.model.systems ?? []).find((s) => s.id === targetId) : null;
      if (targetId && !target) return;
      // no cycles: the new parent must not live inside the dragged system
      for (let cur = target; cur; ) {
        if (cur.id === id) return;
        const up = cur.parentSystemId;
        cur = up ? (this.model.systems ?? []).find((s) => s.id === up) ?? null : null;
      }
      const next = target?.id ?? null;
      if ((sys.parentSystemId ?? null) === next) return;
      const view = this._view;
      const layout = this.viewLayout(view);
      const scene = this.sceneFor(view);
      const parent = next ? scene.nodes.find((n) => n.id === next) : undefined;
      const pos = parent ? { x: x - parent.x, y: y - parent.y } : { x, y };
      this.pushUndoEntry([
        { kind: 'set-system-parent', id, parentSystemId: sys.parentSystemId ?? null },
        { kind: 'move-node', view, id, pos: layout.nodes[id] ?? null },
      ]);
      this.command({ kind: 'set-system-parent', id, parentSystemId: next }, false);
      this.writeViewLayout(view, { ...layout, nodes: { ...layout.nodes, [id]: pos } });
      return;
    }
    // A bounded context shift-dropped on a system joins it (C4 grouping); dropped on the bare
    // canvas, it leaves its system and returns to the top level.
    const ctx = this.model.boundedContexts.find((m) => m.id === id);
    if (ctx) {
      const targetSystem = targetId ? (this.model.systems ?? []).find((s) => s.id === targetId) : null;
      // only react to a system (or the canvas, to detach) — dropping on anything else is ignored
      if (targetId && !targetSystem) return;
      const next = targetSystem?.id ?? null;
      if ((ctx.parentSystemId ?? null) === next) return;
      const view = this._view;
      const layout = this.viewLayout(view);
      const scene = this.sceneFor(view);
      const parent = next ? scene.nodes.find((n) => n.id === next) : undefined;
      const pos = parent ? { x: x - parent.x, y: y - parent.y } : { x, y };
      this.pushUndoEntry([
        { kind: 'set-context-system', id, parentSystemId: ctx.parentSystemId ?? null },
        { kind: 'move-node', view, id, pos: layout.nodes[id] ?? null },
      ]);
      this.command({ kind: 'set-context-system', id, parentSystemId: next }, false);
      this.writeViewLayout(view, { ...layout, nodes: { ...layout.nodes, [id]: pos } });
      return;
    }
    const api =
      (this.model.apis ?? []).find((a) => a.id === id) ??
      (this.model.proxyApis ?? []).find((px) => px.id === id);
    if (!api) return;
    if (targetId && !this.model.externalSystems.some((s) => s.id === targetId)) return;
    const current = api.publishedByExternalSystemId ?? '';
    const next = targetId ?? '';
    if (next === current) return;
    const view = this._view;
    const layout = this.viewLayout(view);
    const scene = this.sceneFor(view);
    const parent = next ? scene.nodes.find((n) => n.id === next) : undefined;
    const pos = parent ? { x: x - parent.x, y: y - parent.y } : { x, y };
    const ops: EditOp[] = [
      { kind: 'set-api-publisher', id, targetId: current },
      { kind: 'move-node', view, id, pos: layout.nodes[id] ?? null },
    ];
    this.command({ kind: 'set-api-publisher', id, targetId: next }, false);
    this.writeViewLayout(view, { ...layout, nodes: { ...layout.nodes, [id]: pos } });
    this.pushUndoEntry(ops);
  }

  /**
   * Ctrl-drag dropped an API on an external system: a proxy of that API is born
   * there — named api@host, wired to the API and nested in the host — while the
   * API itself stays where it was. One undo entry removes the whole thing.
   */
  private onNodeProxyRequested(e: CustomEvent): void {
    const { id, targetId, x, y } = e.detail as {
      id: string;
      targetId: string;
      x: number;
      y: number;
    };
    const api = (this.model.apis ?? []).find((a) => a.id === id);
    const host = this.model.externalSystems.find((s) => s.id === targetId);
    if (!api || !host) return;
    const duplicated = (this.model.proxyApis ?? []).some(
      (px) => px.targetApiId === id && px.publishedByExternalSystemId === targetId,
    );
    if (duplicated) return;
    const proxyId = `proxy-${slug(api.name)}-${slug(host.name)}`;
    if ((this.model.proxyApis ?? []).some((px) => px.id === proxyId)) return;
    const view = this._view;
    const layout = this.viewLayout(view);
    const scene = this.sceneFor(view);
    const parent = scene.nodes.find((n) => n.id === targetId);
    this.command(
      {
        kind: 'add-proxy-api',
        id: proxyId,
        name: `${api.name}@${host.name}`,
        targetId: id,
        boundedContextId: targetId,
      },
      false,
    );
    const ops: EditOp[] = [{ kind: 'remove-proxy-api', id: proxyId }];
    if (parent) {
      ops.push({ kind: 'move-node', view, id: proxyId, pos: layout.nodes[proxyId] ?? null });
      this.writeViewLayout(view, {
        ...layout,
        nodes: { ...layout.nodes, [proxyId]: { x: x - parent.x, y: y - parent.y } },
      });
    }
    this.pushUndoEntry(ops);
  }

  /**
   * Where an imported contract lands: the selected API — or, with a proxy
   * selected, the API it fronts (a proxy has no operations of its own).
   */
  private selectedApiId(): string | null {
    if (!this._selectedId) return null;
    if ((this.model.apis ?? []).some((a) => a.id === this._selectedId)) {
      return this._selectedId;
    }
    const proxy = (this.model.proxyApis ?? []).find((px) => px.id === this._selectedId);
    return proxy?.targetApiId ?? null;
  }

  /**
   * Tells you how to import a contract, rather than importing it.
   *
   * Importing reads a file and writes model elements, which is a build step and not an editing
   * gesture: it belongs where it can run in CI and be re-run when the contract moves. That is
   * `mvn modux:import-api`, and its ids are deterministic, so re-running updates the operations in
   * place and preserves the wiring already drawn. This used to POST to the editor's server; what
   * is left here is the instruction, because a button that silently does nothing is worse than no
   * button at all.
   */
  private async onImportApiFile(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const apiId = this.selectedApiId();
    // An API never floats: without an API selected, the selected external system
    // or context becomes the home of the imported contract.
    const homeExternalId = apiId
      ? null
      : (this.model.externalSystems.find((x) => x.id === this._selectedId)?.id ?? null);
    const homeBoundedContextId =
      apiId || homeExternalId
        ? null
        : (this.model.boundedContexts.find((mo) => mo.id === this._selectedId)?.id ?? null);
    if (!apiId && !homeExternalId && !homeBoundedContextId) {
      this.emit('modux-notice', {
        message:
          'Selecciona la API destino, o el sistema externo o contexto que la publicará, antes de importar',
      });
      return;
    }
    const target = apiId ? ` -Dmodux.apiId=${apiId}` : '';
    this.emit('modux-notice', {
      kind: 'info',
      message: `Importar un contrato es un paso de build: mvn modux:import-api`
        + ` -Dmodux.filePath=${file.name}${target}`,
    });
  }


  /** Expansion is a sheet preference (persisted with the vista, not undoable). */
  private onNodeCollapseToggled(e: CustomEvent): void {
    const { id } = e.detail as { id: string };
    const view = this._view;
    const current = this.viewLayout(view);
    const set = new Set(current.expanded ?? []);
    const opening = !set.has(id);
    if (opening) set.add(id);
    else set.delete(id);
    this.writeViewLayout(view, { ...current, expanded: [...set] });
    // An unfolding container grows over its neighbours: keep the map legible.
    if (opening) this.declumpView(view);
  }

  /** A multi-selection drag: every position lands in ONE layout write and ONE undo entry. */
  private onNodesMoved(e: CustomEvent): void {
    const { moves } = e.detail as { moves: { id: string; x: number; y: number }[] };
    const view = this._view;
    const current = this.viewLayout(view);
    const scene = this.sceneFor(view);
    const nodes = { ...current.nodes };
    const inverseOps: EditOp[] = [];
    for (const { id, x, y } of moves) {
      inverseOps.push({ kind: 'move-node', view, id, pos: current.nodes[id] ?? null });
      let pos = { x, y };
      const node = scene.nodes.find((n) => n.id === id);
      if (node?.parentId) {
        const parent = scene.nodes.find((n) => n.id === node.parentId);
        if (parent) pos = { x: x - parent.x, y: y - parent.y };
      }
      nodes[id] = pos;
    }
    this.writeViewLayout(view, { ...current, nodes });
    if (view === 'processes') {
      for (const { id } of moves) {
        const reorder = this.stepReorderCommand(id);
        if (reorder) {
          const inverse = this.inverseOf(reorder);
          if (inverse) inverseOps.unshift(...inverse);
          this.command(reorder, false);
        }
      }
    }
    this.pushUndoEntry(inverseOps);
  }

  private onNodeResized(e: CustomEvent): void {
    const { id, x, y, w, h } = e.detail as { id: string; x: number; y: number; w: number; h: number };
    const view = this._view;
    const current = this.viewLayout(view);
    // An anchored resize moves the centre; children stayed put on screen, so
    // their offsets (relative to the centre) are re-expressed from the new one.
    const scene = this.sceneFor(view);
    const resized = scene.nodes.find((n) => n.id === id);
    const parent = resized?.parentId ? scene.nodes.find((n) => n.id === resized.parentId) : undefined;
    // A chip stores its position as an OFFSET from its parent's centre, and its
    // own nested chips lay themselves out — only free children re-express.
    const children = parent ? [] : scene.nodes.filter((n) => n.parentId === id);
    this.pushUndoEntry([
      { kind: 'resize-node', view, id, size: current.sizes?.[id] ?? null },
      { kind: 'move-node', view, id, pos: current.nodes[id] ?? null },
      ...children.map((c): EditOp => ({ kind: 'move-node', view, id: c.id, pos: current.nodes[c.id] ?? null })),
    ]);
    const nodes = {
      ...current.nodes,
      [id]: parent ? { x: x - parent.x, y: y - parent.y } : { x, y },
    };
    for (const c of children) nodes[c.id] = { x: c.x - x, y: c.y - y };
    this.writeViewLayout(view, {
      ...current,
      nodes,
      sizes: { ...(current.sizes ?? {}), [id]: { w, h } },
    });
  }

  private onEdgePointsChanged(e: CustomEvent): void {
    const { id, points } = e.detail as { id: string; points: Point[] };
    const view = this._view;
    const current = this.viewLayout(view);
    this.pushUndoEntry([
      { kind: 'set-edge-points', view, id, points: current.edges[id] ?? null },
    ]);
    const edges = { ...current.edges };
    // The empty list is kept on purpose: removing the LAST bend pins the edge
    // straight — otherwise the auto-router would re-bend it on the next render
    // and the point would look immortal.
    edges[id] = points;
    this.writeViewLayout(view, { ...current, edges });
  }

  /** Order the owner's steps by their effective x; a changed order becomes a move command. */
  private stepReorderCommand(stepId: string): ModuxCommand | null {
    const owner = this.owningProcessOf(stepId);
    if (!owner) return null;
    const scene = processesScene(this.model, this.viewLayout('processes').nodes);
    const xOf = new Map(scene.nodes.map((n) => [n.id, n.x]));
    const sorted = [...owner.steps].sort(
      (a, b) => (xOf.get(a.id) ?? 0) - (xOf.get(b.id) ?? 0),
    );
    if (sorted.every((s, i) => s.id === owner.steps[i].id)) return null;
    const index = sorted.findIndex((s) => s.id === stepId);
    return {
      kind: 'move-process-step',
      processId: owner.id,
      id: stepId,
      afterStepId: index > 0 ? sorted[index - 1].id : undefined,
    };
  }

  private onConnectRequested(e: CustomEvent): void {
    const { sourceId, targetId, x, y, connectKind } = e.detail;
    this.applyConnection(sourceId, targetId, x, y, connectKind);
  }

  /** The whole gesture vocabulary, callable from drags AND from palette drops. */

  /** Apply the picker's choice: create the new relation or retype the existing one. */
  private pickRelationType(type: ContextMapRelationType): void {
    const p = this._relationPicker;
    this._relationPicker = null;
    if (!p) return;
    this._relationType = type; // remember as the next default
    if (p.mode === 'create') {
      this.command({ kind: 'add-relation', sourceId: p.sourceId, targetId: p.targetId, type });
      return;
    }
    const rel = this.model.relations.find(
      (r) => r.sourceId === p.sourceId && r.targetId === p.targetId,
    );
    if (rel && rel.type !== type) {
      this.command({ kind: 'set-relation-type', sourceId: p.sourceId, targetId: p.targetId, type });
    }
  }

  /** Supr with a multi-selection: one confirmation covers the whole batch. */
  private onDeleteSelectionRequested(e: CustomEvent): void {
    const { items } = e.detail as { items: { id: string; kind: string }[] };
    this._multi = [];
    if (!items.length) return;
    this.openDeletePicker(items.map((i) => ({ elementType: 'node', id: i.id, kind: i.kind })));
  }

  private onDeleteRequested(e: CustomEvent): void {
    const { elementType, id, kind } = e.detail;
    // Edges and waypoints are cheap wiring (undoable, guarded per kind): delete directly.
    // Nodes are catalog ELEMENTS — deleting one from the model always asks first.
    if (elementType !== 'node') {
      this.performDelete(elementType, id, kind);
      return;
    }
    this.openDeletePicker([{ elementType, id, kind }]);
  }

  /**
   * Model deletions are destructive enough to warrant a stop: the picker confirms them, and —
   * when a modux View is active and EVERY node is a member — also offers the gentle
   * alternative of only taking them out of the view.
   */
  private openDeletePicker(items: { elementType: string; id: string; kind: string }[]): void {
    const view = (this.model.views ?? []).find((v) => v.id === this._activeViewId);
    const memberIds = view
      ? items
          .map((i) => this.memberIdOf(i.id, i.kind))
          .filter((m): m is string => !!m && view.memberIds.includes(m))
      : [];
    // Offer «quitar de la vista» whenever ANY deleted item is a member of the active view — not only
    // when every one is. Deleting a member and a non-member together still lets you pull the member
    // out of the view without touching the model.
    this._deletePicker = { items, memberIds };
  }

  /** Canvas node → the catalog id a view lists as member (null when not a member kind). */
  private memberIdOf(id: string, kind: string): string | null {
    switch (kind) {
      case 'boundedContext':
      case 'external-system':
      case 'system':
        return id.replace(/^tgt:/, '');
      case 'aggregate':
      case 'entity':
      case 'process':
      case 'workflow':
      case 'page':
      case 'ui-app':
      case 'actor':
      case 'ai-agent':
      case 'rag':
      case 'mcp-gateway':
      case 'api':
      case 'proxy-api':
      case 'cdc':
        return id;
      case 'flow':
        return id.replace(/^flow:/, '');
      case 'process-step':
        return this.owningProcessOf(id)?.id ?? null;
      case 'workflow-step':
        return this.owningWorkflowOf(id)?.id ?? null;
      default:
        return null;
    }
  }



  private inverseOf(c: ModuxCommand): ModuxCommand[] | null {
    return inverseOf(this.gestureHost(), c);
  }

  /** Effects seen during the last gesture — the ArchiMate fallback reads them. */
  private _gestureEffects = 0;

  private applyConnection(
    sourceId: string,
    targetId: string,
    x?: number,
    y?: number,
    connectKind?: string,
  ): void {
    const before = this._gestureEffects;
    const hadConnectPicker = !!this._connectPicker;
    const pickers = () =>
      !!(this._connectPicker || this._relationPicker || this._extDepPicker || this._deletePicker || this._invariantCondEditor);
    const pickersBefore = pickers();
    // The canvas mode is what the gesture resolver keys on: distribution/eventstorming carry their
    // own meaning; «unified» arrives as context-map and is resolved from the endpoints.
    const mode: ViewId = this._canvasMode === 'distribution'
      ? 'distribution'
      : this._canvasMode === 'eventstorming'
        ? 'eventstorming'
        : 'context-map';
    applyConnectionGesture(this.gestureHost(), mode, sourceId, targetId, x, y, connectKind);
    // Nothing modux meant anything for this pair — no command, no picker, no
    // notice: ArchiMate takes the last word (its eleven types apply to ANY pair).
    if (
      this._gestureEffects === before &&
      pickers() === pickersBefore &&
      connectKind === undefined &&
      sourceId !== targetId &&
      this._canvasMode === 'unified'
    ) {
      const scene = this.sceneFor(this._view);
      const onStage = (id: string) => scene.nodes.some((n) => n.id === id);
      if (onStage(sourceId) && onStage(targetId)) {
        this._connectPicker = {
          x: x ?? this.clientWidth / 2,
          y: y ?? 120,
          options: archimateOptions(this.gestureHost(), sourceId, targetId),
        };
      }
    }
    // A picker just opened for this trace? Offer one «invert» toggle instead of doubling every
    // option: it reopens the same picker with the ends swapped, so any relation reads either way
    // without a list twice as long.
    if (!hadConnectPicker && this._connectPicker && connectKind === undefined && sourceId !== targetId) {
      this._connectPicker = {
        ...this._connectPicker,
        options: [
          {
            id: 'invert-connection',
            label: '⇄ Invertir sentido',
            hint: 'Intercambia origen y destino y vuelve a ofrecer los tipos',
            apply: () => {
              this._connectPicker = null;
              this.applyConnection(targetId, sourceId, x, y, connectKind);
            },
          },
          ...this._connectPicker.options,
        ],
      };
    }
  }

  private performDelete(elementType: string, id: string, kind: string): void {
    performDeleteGesture(this.gestureHost(), this._view, elementType, id, kind);
  }

  /** The thin surface the extracted gesture/undo vocabulary works against. */
  private gestureHost(): GestureHost & UndoHost {
    return {
      model: this.model,
      command: (c, pushUndo) => {
        this._gestureEffects++;
        this.command(c, pushUndo);
      },
      emit: (name, detail) => {
        this._gestureEffects++;
        this.emit(name, detail);
      },
      sceneFor: (view) => this.sceneFor(view),
      owningProcessOf: (id) => this.owningProcessOf(id),
      owningUseCaseOf: (id) => this.owningUseCaseOf(id),
      owningWorkflowOf: (id) => this.owningWorkflowOf(id),
      owningApiOf: (id) => this.owningApiOf(id),
      menuEntryIn: (appId, itemId) => this.menuEntryIn(appId, itemId),
      newMenuItemId: (label) => this.newMenuItemId(label),
      rebuildComponentOps: (pageId, node, parentId, beforeId, fresh, used) =>
        this.rebuildComponentOps(pageId, node, parentId, beforeId, fresh, used),
      openExtDepPicker: (p) => {
        this._extDepPicker = p;
      },
      openRelationPicker: (p) => {
        this._relationPicker = {
          ...p,
          x: p.x || this.clientWidth / 2,
          y: p.y || 120,
        };
      },
      openConnectPicker: (p) => {
        this._connectPicker = p;
      },
      nodeClientRect: (nodeId) => {
        const g = this.renderRoot
          .querySelector('modux-canvas')
          ?.renderRoot.querySelector(`g[data-node-id="${nodeId}"]`);
        return g?.getBoundingClientRect();
      },
      clearSelection: () => {
        this._selectedId = null;
      },
      expandNode: (id) => this.expandNode(id),
    };
  }

  /** Expand a container in the current view (idempotent) — used after composing an element into it. */
  private expandNode(id: string): void {
    const view = this._view;
    const current = this.viewLayout(view);
    const set = new Set(current.expanded ?? []);
    if (set.has(id)) return;
    set.add(id);
    this.writeViewLayout(view, { ...current, expanded: [...set] });
    this.declumpView(view);
  }

  private owningProcessOf(stepId: string) {
    return (this.model.processes ?? []).find((p) => p.steps.some((s) => s.id === stepId));
  }

  private owningUseCaseOf(stepId: string) {
    return this.model.boundedContexts
      .flatMap((mo) => mo.useCases ?? [])
      .find((uc) => (uc.steps ?? []).some((st) => st.id === stepId));
  }

  private owningWorkflowOf(stepId: string) {
    return (this.model.workflows ?? []).find((w) => w.steps.some((s) => s.id === stepId));
  }

  private owningApiOf(operationId: string) {
    return (this.model.apis ?? []).find((a) => a.operations.some((o) => o.id === operationId));
  }

  private onNodeRenamed(e: CustomEvent): void {
    const { id, kind, name } = e.detail;
    this.renameElement(id, kind, name);
  }

  /**
   * Rename one element by its canvas kind — the shared routine behind both the inline (F2) rename
   * and the drawer's editable title. A `field` is a ModelField renamed in its Model; everything the
   * store's rename table covers goes through `rename-element`; an unknown kind does nothing.
   */
  private renameElement(id: string, kind: string, name: string): void {
    if (kind === 'field') {
      const field = [...(this.model.aggregates ?? []), ...(this.model.entities ?? [])]
        .flatMap((o) => o.fields ?? [])
        .find((f) => f.id === id);
      if (field?.modelId) this.command({ kind: 'set-model-field', modelId: field.modelId, fieldId: id, name });
      return;
    }
    if (RENAMEABLE_KINDS.has(kind)) {
      this.command({ kind: 'rename-element', type: kind, id: id.replace(/^tgt:/, ''), name });
    }
  }

  private addRagContentSourceFromToolbar(): void {
    const uri = this._newRagSourceUri.trim();
    const ragId = this._selectedId;
    if (!uri || !ragId || !(this.model.rags ?? []).some((r) => r.id === ragId)) return;
    this.command({
      kind: 'add-rag-content-source',
      sourceId: ragId,
      type: this._newRagSourceType,
      uri,
    });
    this._newRagSourceUri = '';
  }

  /** Check/uncheck in the catalog tree: view membership only — never touches the element. */
  private toggleViewMember(targetId: string, checked: boolean): void {
    if (!this._activeViewId) return;
    this.command(
      checked
        ? { kind: 'add-view-member', id: this._activeViewId, targetId }
        : { kind: 'remove-view-member', id: this._activeViewId, targetId },
    );
  }

  /**
   * The catalog as a tree with membership checkboxes: what belongs to the active
   * view. Aggregates nest under their context; one greyed "(por su contexto)" row
   * means the element rides in implicitly because its container is a member.
   */
  private renderViewTree() {
    const view = (this.model.views ?? []).find((v) => v.id === this._activeViewId);
    if (!view) return '';
    const members = new Set(view.memberIds);
    const row = (id: string, name: string, opts: { child?: boolean; implicit?: boolean } = {}) => html`
      <label
        class="${opts.child ? 'child' : ''} ${opts.implicit && !members.has(id) ? 'implicit' : ''}"
        title=${opts.implicit && !members.has(id)
          ? 'Ya se ve por su contenedor; márcalo para que sea miembro explícito'
          : 'Miembro de la vista — desmarcar lo quita de la vista, NO del proyecto'}
      >
        <input
          type="checkbox"
          .checked=${members.has(id)}
          @change=${(e: Event) => this.toggleViewMember(id, (e.target as HTMLInputElement).checked)}
        />
        ${name}
      </label>
    `;
    const group = (title: string, rows: unknown[]) =>
      rows.length ? html`<h4>${title}</h4>${rows}` : '';
    return html`
      <aside class="view-tree" @pointerdown=${(e: Event) => e.stopPropagation()}>
        <div class="tree-title">Vista: ${view.name}</div>
        ${group(
          'Contextos',
          this.model.boundedContexts.flatMap((m) => [
            row(m.id, m.name),
            ...(this.model.aggregates ?? [])
              .filter((a) => a.boundedContextId === m.id)
              .map((a) => row(a.id, a.name, { child: true, implicit: members.has(m.id) })),
          ]),
        )}
        ${group(
          'Sistemas externos',
          this.model.externalSystems.map((x) => row(x.id, x.name)),
        )}
        ${group('APIs', (this.model.apis ?? []).map((a) => row(a.id, a.name)))}
        ${group('Actores', (this.model.actors ?? []).map((a) => row(a.id, a.name)))}
        ${group('Agentes IA', (this.model.aiAgents ?? []).map((a) => row(a.id, a.name)))}
        ${group('Gateways MCP', (this.model.mcpGateways ?? []).map((g) => row(g.id, g.name)))}
        ${group('RAGs', (this.model.rags ?? []).map((r) => row(r.id, r.name)))}
        ${group('Flows', this.model.flows.map((f) => row(f.id, f.name)))}
        ${group('Procesos', (this.model.processes ?? []).map((p) => row(p.id, p.name)))}
        ${group('Workflows', (this.model.workflows ?? []).map((w) => row(w.id, w.name)))}
      </aside>
    `;
  }

  private onElementSelected(e: CustomEvent): void {
    this._selectedId = e.detail.id;
    this._multi = [];
    this.emit('modux-select', { elementType: e.detail.kind, id: e.detail.id });
  }

  private onMultiToggled(e: CustomEvent): void {
    const { id } = e.detail;
    // The multi-selection REPLACES the single one: otherwise Supr would act on a
    // stale element (e.g. the container selected before shift-clicking children).
    this._selectedId = null;
    this._multi = this._multi.includes(id)
      ? this._multi.filter((x) => x !== id)
      : [...this._multi, id];
  }

  private onNodesBoxed(e: CustomEvent): void {
    this._multi = e.detail.ids;
  }

  /** Canvas node ids → catalog element ids (view members). */
  /** What «crear vista» works on: the multi-selection, or — on the UI and Diseño
   * views, where one page or app is a perfectly good seed — the single selection. */
  /** What a new modux View would draw from: the rubber-band set, else the single
   * selected element. Feeds ⊞ Vista on every diagram surface. */
  private viewSelection(): string[] {
    if (this._multi.length) return this._multi;
    if (this._selectedId) return [this._selectedId];
    return [];
  }

  private memberIdsFromSelection(): string[] {
    const scene = this.sceneFor(this._view);
    const members = new Set<string>();
    for (const id of this.viewSelection()) {
      const node = scene.nodes.find((n) => n.id === id);
      if (!node) continue;
      switch (node.kind) {
        case 'boundedContext':
        case 'external-system':
        case 'system':
          members.add(id.replace(/^tgt:/, ''));
          break;
        case 'aggregate':
        case 'entity':
        case 'process':
        case 'workflow':
        case 'actor':
        case 'ai-agent':
        case 'rag':
        case 'mcp-gateway':
        case 'api':
        case 'page':
        case 'ui-app':
        case 'cdc':
          members.add(id);
          break;
        case 'menu-item':
        case 'menu-group': {
          const ref = parseMenuNodeId(id);
          if (ref) members.add(ref.appId);
          break;
        }
        case 'flow':
          members.add(id.replace(/^flow:/, ''));
          break;
        case 'process-step': {
          const owner = this.owningProcessOf(id);
          if (owner) members.add(owner.id);
          break;
        }
        case 'workflow-step': {
          const owner = this.owningWorkflowOf(id);
          if (owner) members.add(owner.id);
          break;
        }
        default:
          break; // compensations / completion events are derived, not catalog elements
      }
    }
    return [...members];
  }

  private createViewFromSelection(): void {
    const name = this._newViewName.trim();
    if (!name) return;
    // A view is born curated and EMPTY unless a selection seeds it — you then fill it by dropping
    // elements or checking members in the tree. (Before, an empty selection quietly grabbed the whole
    // screen, so a "new view" was never actually empty — the friction we're removing here.)
    const memberIds = this.memberIdsFromSelection();
    const id = crypto.randomUUID();
    this.command({ kind: 'add-view', id, name, memberIds });
    this._newViewName = '';
    this._multi = [];
    this.afterViewCreated(id, name, memberIds);
  }

  /**
   * The entity is in the catalog; now surface the view as a document (§12): the host writes and
   * opens it. The view's TYPE is the LENS you are on — you selected what this lens draws, so the new
   * view draws it too (a context-map selection makes a context-map view). It is fixed at birth and
   * lands in the filename (`<slug>.<type>.modux-view.yaml`), the source of truth; there is no lens
   * to rotate afterwards, and no chooser to get wrong (a mismatched lens rendered an empty view).
   */
  private afterViewCreated(id: string, name: string, memberIds: string[] = []): void {
    // A view is a self-contained document now — its members travel WITH it, so the newly opened
    // file already shows the selection (they are not read back from a `.modux/views/` entry).
    this.emit('create-view', { viewId: id, name, kind: this._view, memberIds });
  }

  /** Model scoped to the active modux View (CURATED members + their context). */
  private filteredModel(): ModuxModel {
    if (!this._activeViewId) return this.model;
    const view = (this.model.views ?? []).find((v) => v.id === this._activeViewId);
    if (!view) return this.model;
    const members = new Set(view.memberIds);
    // A system rides in when it is a member; its bounded contexts ride in with it (so the system can
    // be drilled into) even if the view lists only the system — that is the C4 landscape → container
    // drill-down on one canvas.
    const systems = (this.model.systems ?? []).filter((s) => members.has(s.id));
    const systemIds = new Set(systems.map((s) => s.id));
    const boundedContexts = this.model.boundedContexts.filter(
      (m) => members.has(m.id) || (m.parentSystemId != null && systemIds.has(m.parentSystemId)),
    );
    const boundedContextIds = new Set(boundedContexts.map((m) => m.id));
    const externalSystems = this.model.externalSystems.filter((x) => members.has(x.id));
    const externalIds = new Set(externalSystems.map((x) => x.id));
    const aggregates = (this.model.aggregates ?? []).filter(
      (a) => members.has(a.id) || boundedContextIds.has(a.boundedContextId),
    );
    const aggregateIds = new Set(aggregates.map((a) => a.id));
    // Owned entities ride in with their aggregate; a free-standing one (no aggregate) rides in as a
    // view member, like a loose aggregate does.
    const entities = (this.model.entities ?? []).filter((e) => aggregateIds.has(e.aggregateId) || members.has(e.id));
    // Data models (the mappings collection) have no owner field of their own — an aggregate/entity
    // points AT one via `modelId` (e.g. `model-<aggId>`). Without scoping them, every view — even an
    // empty one — leaked every data model as a stray node. Keep only those an in-scope owner refers to.
    const scopedModelIds = new Set<string>();
    for (const a of aggregates) if (a.modelId) scopedModelIds.add(a.modelId);
    for (const e of entities) if (e.modelId) scopedModelIds.add(e.modelId);
    const uiApps = (this.model.uiApps ?? []).filter((a) => members.has(a.id));
    const menuPageIds = new Set<string>();
    const collectMenuPages = (items?: UiMenuEntryRef[]) => {
      for (const it of items ?? []) {
        if (it.pageId) menuPageIds.add(it.pageId);
        collectMenuPages(it.children);
      }
    };
    uiApps.forEach((a) => collectMenuPages(a.menuItems));
    const pages = (this.model.pages ?? []).filter(
      (x) => members.has(x.id) || menuPageIds.has(x.id),
    );
    const keptAppIds = new Set(uiApps.map((a) => a.id));
    return {
      ...this.model,
      uiApps,
      pages,
      actorAppUses: (this.model.actorAppUses ?? []).filter((u) => keptAppIds.has(u.appId)),
      boundedContexts,
      systems,
      externalSystems,
      // A CDC shows only in the views that list it (a member), like every other top-level node.
      cdcs: (this.model.cdcs ?? []).filter((c) => members.has(c.id)),
      relations: this.model.relations.filter(
        (r) => boundedContextIds.has(r.sourceId) && boundedContextIds.has(r.targetId),
      ),
      flows: this.model.flows.filter(
        (f) =>
          members.has(f.id) ||
          ((boundedContextIds.has(f.sourceId) || externalIds.has(f.sourceId)) &&
            (boundedContextIds.has(f.targetId) || externalIds.has(f.targetId))),
      ),
      aggregates,
      entities,
      // Owned value objects ride with their aggregate; a free-standing one enters as a view member.
      valueObjects: (this.model.valueObjects ?? []).filter((v) => aggregateIds.has(v.aggregateId) || members.has(v.id)),
      models: (this.model.models ?? []).filter((dm) => scopedModelIds.has(dm.id)),
      aggregateReferences: (this.model.aggregateReferences ?? []).filter(
        (r) => aggregateIds.has(r.sourceAggregateId) && aggregateIds.has(r.targetAggregateId),
      ),
      processes: (this.model.processes ?? []).filter(
        (p) => members.has(p.id) || (p.ownerBoundedContextId ? boundedContextIds.has(p.ownerBoundedContextId) : false),
      ),
      // Workflows have no owner boundedContext (they live outside the contexts): member-only.
      workflows: (this.model.workflows ?? []).filter((w) => members.has(w.id)),
      // Free-standing use cases scope by membership too (a curated view shows only what it lists).
      looseUseCases: (this.model.looseUseCases ?? []).filter((u) => members.has(u.id)),
      looseElements: (this.model.looseElements ?? []).filter((e) => members.has(e.id)),
      // Top-level AI/strategic pieces scope by membership too — a curated view
      // about one subdomain should not drag every agent and gateway along.
      actors: (this.model.actors ?? []).filter((a) => members.has(a.id)),
      aiAgents: (this.model.aiAgents ?? []).filter((a) => members.has(a.id)),
      rags: (this.model.rags ?? []).filter((r) => members.has(r.id)),
      mcpGateways: (this.model.mcpGateways ?? []).filter((g) => members.has(g.id)),
      apis: (this.model.apis ?? []).filter(
        (a) =>
          members.has(a.id) ||
          (a.publishedByExternalSystemId ? externalIds.has(a.publishedByExternalSystemId) : false),
      ),
      proxyApis: (this.model.proxyApis ?? []).filter(
        (px) =>
          members.has(px.id) ||
          (px.publishedByExternalSystemId ? externalIds.has(px.publishedByExternalSystemId) : false),
      ),
    };
  }

  /**
   * Opening an element's detail. In the web app the drawer is the HOST's job: the editor emits
   * `modux-activate` and mateu draws its own drawer (GraphicalEditorPage.handleAction returns the
   * Drawer). The IDE plugin has no such host, so when `hosted` the editor draws the detail itself
   * — otherwise a double-click there would do nothing. `kind` is the canvas kind of the SHOWN
   * element, so the drawer's title can rename it through the same path F2 uses.
   */
  private openInDrawer(ref: { elementType: string; id: string }, kind: string): void {
    this.emit('modux-activate', ref);
    if (this.hosted) this._drawer = { ...ref, kind };
  }

  /**
   * The intent↔fact escape hatch for the ArchiMate relation picker. The classification is normally
   * structural (a line between strategic boxes is a sketch; one touching an artifact is a fact); this
   * lets you override the odd real-but-abstract case (a CDC drawn context→context) or vice versa.
   */
  private natureToggleOption(rel: { id: string; sourceId: string; targetId: string; nature?: 'intent' | 'fact' }) {
    const strategic = (id: string) =>
      this.model.boundedContexts.some((m) => m.id === id)
      || (this.model.systems ?? []).some((s) => s.id === id)
      || this.model.externalSystems.some((x) => x.id === id)
      || (this.model.actors ?? []).some((a) => a.id === id)
      || (this.model.aiAgents ?? []).some((a) => a.id === id)
      || (this.model.rags ?? []).some((r) => r.id === id)
      || (this.model.mcpGateways ?? []).some((g) => g.id === id);
    const effective = rel.nature ?? (strategic(rel.sourceId) && strategic(rel.targetId) ? 'intent' : 'fact');
    const next: 'intent' | 'fact' = effective === 'intent' ? 'fact' : 'intent';
    return [{
      id: 'toggle-nature',
      label: next === 'fact' ? '◆ Marcar como hecho (real)' : '◇ Marcar como intención (boceto)',
      hint: next === 'fact'
        ? 'Cuenta como acoplamiento real: genera y sube por roll-up'
        : 'Boceto sin peso en el código; se confirma cuando un hecho de abajo la realice',
      apply: () => this.command({ kind: 'set-archimate-relation-nature', id: rel.id, nature: next }),
    }];
  }

  private onElementActivated(e: CustomEvent): void {
    // Double-clicking a gateway flips its semantics: join TODAS↔CUALQUIERA,
    // split PARALELO↔EXCLUSIVO — the badge tells which one rules.
    if (this._view === 'workflows' && e.detail.elementType === 'edge' && e.detail.kind === 'wf-link') {
      // doble click en una rama de un split EXCLUSIVO: se edita su condición
      const m = /^wflink:(.+)->(.+)$/.exec(e.detail.id);
      const g = m ? (this.model.workflowGateways ?? []).find((x) => x.id === m[1]) : null;
      if (m && g && g.type === 'SPLIT' && g.semantics === 'EXCLUSIVE') {
        const current = (g.branchConditions ?? []).find((c) => c.targetId === m[2])?.expression ?? '';
        this._branchCondEditor = { gatewayId: g.id, targetId: m[2], value: current };
      }
      return;
    }
    if (this._view === 'workflows' && e.detail.kind === 'workflow-gateway') {
      const g = (this.model.workflowGateways ?? []).find((x) => x.id === e.detail.id);
      if (!g) return;
      const next = g.type === 'SPLIT'
        ? (g.semantics === 'EXCLUSIVE' ? 'PARALLEL' : 'EXCLUSIVE')
        : (g.semantics === 'ANY' ? 'ALL' : 'ANY');
      this.command({ kind: 'set-gateway-semantics', id: g.id, type: next });
      return;
    }
    // Double-clicking an ArchiMate relation retypes it (same eleven, in place).
    if (e.detail.elementType === 'edge' && e.detail.kind === 'archimate-relation') {
      const relId = (e.detail.id as string).replace(/^archi:/, '');
      const rel = (this.model.archimateRelations ?? []).find((r) => r.id === relId);
      if (rel) {
        this._connectPicker = {
          x: e.detail.x ?? this.clientWidth / 2,
          y: e.detail.y ?? 120,
          options: [
            {
              id: 'invert-direction',
              label: '↔ Invertir sentido',
              hint: 'Intercambia origen y destino de la relación',
              apply: () => this.command({ kind: 'invert-archimate-relation', id: relId }),
            },
            ...this.natureToggleOption(rel),
            ...archimateOptions(this.gestureHost(), rel.sourceId, rel.targetId).map((o) => ({
              ...o,
              label: o.id === `archimate:${rel.type}` ? `● ${o.label}` : o.label,
              apply: () => {
                this.command({
                  kind: 'set-archimate-relation-type',
                  id: relId,
                  type: o.id.replace(/^archimate:/, ''),
                });
              },
            })),
          ],
        };
      }
      return;
    }
    // Double-clicking a relation's label edits its type rather than opening a CRUD.
    if (this._view === 'context-map' && e.detail.elementType === 'edge' && e.detail.kind === 'relation') {
      const m = /^rel:(.+)->(.+)$/.exec(e.detail.id);
      if (m) {
        this._relationPicker = {
          sourceId: m[1],
          targetId: m[2],
          mode: 'edit',
          x: e.detail.x ?? 0,
          y: e.detail.y ?? 0,
        };
      }
      return;
    }
    if (e.detail.kind === 'invariant') {
      // Double-click edits the invariant's rule (expression + error message) inline.
      const inv = [...(this.model.aggregates ?? []), ...(this.model.valueObjects ?? []), ...(this.model.entities ?? [])]
        .flatMap((o) => o.invariants ?? [])
        .find((i) => i.id === e.detail.id);
      if (inv) {
        this._invariantCondEditor = {
          id: inv.id,
          name: inv.name,
          expression: inv.expression ?? '',
          errorMessage: inv.errorMessage ?? '',
        };
      }
      return;
    }
    const mapped =
      e.detail.kind === 'process-step'
        ? activationForStep(this.model.processes, e.detail.id)
        : e.detail.kind === 'workflow-step'
          ? (() => {
              const owner = this.owningWorkflowOf(e.detail.id);
              return owner ? { elementType: 'workflow', id: owner.id } : null;
            })()
          : normalizeActivation(e.detail.id, e.detail.kind);
    // A step opens its owner, so the drawer's rename must target the owner's kind, not the step's.
    const shownKind =
      e.detail.kind === 'process-step'
        ? 'process'
        : e.detail.kind === 'workflow-step'
          ? 'workflow'
          : e.detail.kind;
    if (mapped) this.openInDrawer(mapped, shownKind);
  }

  /** A fresh menu-entry id, unique across every app's tree (client-generated, like node ids). */
  private newMenuItemId(label: string): string {
    const used = new Set<string>();
    const walk = (items: { id?: string; children?: { id?: string }[] }[] | undefined) => {
      for (const it of items ?? []) {
        if (it.id) used.add(it.id);
        walk((it as { children?: [] }).children);
      }
    };
    (this.model.uiApps ?? []).forEach((a) => walk(a.menuItems));
    const base = `mi-${slug(label)}`;
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    return id;
  }

  /** A fresh content-node id, unique across every page's tree (client-generated). */
  /** A node (and its parent + next sibling) inside a page's content tree. */
  private componentIn(pageId: string, componentId: string): {
    node: UiComponentNodeRef;
    parentId: string | null;
    beforeId: string | null;
  } | null {
    const page = (this.model.pages ?? []).find((x) => x.id === pageId);
    let found: { node: UiComponentNodeRef; parentId: string | null; beforeId: string | null } | null = null;
    const walk = (items: UiComponentNodeRef[] | undefined, up: string | null) => {
      const list = items ?? [];
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === componentId) {
          found = { node: list[i], parentId: up, beforeId: list[i + 1]?.id ?? null };
        }
        walk(list[i].children, list[i].id);
      }
    };
    walk(page?.content, null);
    return found;
  }

  /**
   * Commands that recreate `node` (whole subtree) on a page. With `fresh`, every id is
   * newly allocated (paste/duplicate); without it the original ids are kept (undo,
   * cross-page moves). Returns the ops plus the id the root ended up with.
   */
  private rebuildComponentOps(
    pageId: string,
    node: UiComponentNodeRef,
    parentComponentId: string | undefined,
    beforeComponentId: string | null,
    fresh = false,
    used?: Set<string>,
  ): { ops: ModuxCommand[]; rootId: string } {
    const usedIds = used ?? this.allComponentIds();
    const idFor = (n: UiComponentNodeRef): string => {
      if (!fresh) return n.id;
      const base = `cmp-${slug(n.kind)}`;
      let id = base;
      for (let k = 2; usedIds.has(id) || usedIds.has(`${id}-tab-1`); k++) id = `${base}-${k}`;
      usedIds.add(id);
      return id;
    };
    const ops: ModuxCommand[] = [];
    const emitNode = (n: UiComponentNodeRef, parent: string | undefined): string => {
      const id = idFor(n);
      ops.push({ kind: 'add-page-component', pageId, componentId: id, componentKind: n.kind, parentComponentId: parent });
      // add-page-component seeds a tabLayout with «<id>-tab-1/2»: clear them, OUR tabs follow
      if (n.kind === 'tabLayout') {
        ops.push({ kind: 'remove-page-component', pageId, componentId: `${id}-tab-1` });
        ops.push({ kind: 'remove-page-component', pageId, componentId: `${id}-tab-2` });
      }
      ops.push({ kind: 'set-page-component', pageId, componentId: id, ...this.cmpPatch(n) });
      for (const c of n.children ?? []) emitNode(c, id);
      return id;
    };
    const rootId = emitNode(node, parentComponentId);
    if (beforeComponentId) {
      ops.push({
        kind: 'move-page-component',
        pageId,
        componentId: rootId,
        parentComponentId: parentComponentId ?? null,
        beforeComponentId,
      });
    }
    return { ops, rootId };
  }

  private allComponentIds(): Set<string> {
    const used = new Set<string>();
    const walk = (items?: UiComponentNodeRef[]) => {
      for (const it of items ?? []) {
        used.add(it.id);
        walk(it.children);
      }
    };
    (this.model.pages ?? []).forEach((x) => walk(x.content));
    return used;
  }

  private newComponentId(kind: string): string {
    const used = this.allComponentIds();
    const base = `cmp-${slug(kind)}`;
    let id = base;
    for (let n = 2; used.has(id) || used.has(`${id}-tab-1`); n++) id = `${base}-${n}`;
    return id;
  }

  /** A menu row dropped on a slot (between options / an app's end) or nested on a row. */
  private onMenuSlotRequested = (e: CustomEvent): void => {
    const { id, appId, beforeId, nestRowId } = e.detail as {
      id: string;
      appId?: string;
      beforeId?: string | null;
      nestRowId?: string;
    };
    const src = parseMenuNodeId(id);
    if (!src?.itemId) return;
    const home = this.menuEntryIn(src.appId, src.itemId);
    if (!home) return;
    const inSubtree = (items: UiMenuEntryRef[] | undefined, needle: string): boolean =>
      (items ?? []).some((it) => it.id === needle || inSubtree(it.children, needle));
    if (nestRowId) {
      const tgt = parseMenuNodeId(nestRowId);
      if (!tgt?.itemId || tgt.itemId === src.itemId) return;
      if (src.appId === tgt.appId && inSubtree(home.entry.children, tgt.itemId)) return;
      this.command({
        kind: 'move-menu-item',
        appId: src.appId,
        toAppId: tgt.appId,
        itemId: src.itemId,
        parentId: tgt.itemId,
      });
      return;
    }
    if (beforeId) {
      const tgt = parseMenuNodeId(beforeId);
      if (!tgt?.itemId || tgt.itemId === src.itemId) return;
      const tgtHome = this.menuEntryIn(tgt.appId, tgt.itemId);
      if (!tgtHome) return;
      // the slot's level must not live inside the dragged subtree
      if (src.appId === tgt.appId && inSubtree(home.entry.children, tgt.itemId)) return;
      if (src.appId === tgt.appId && tgtHome.parentId === home.parentId && home.beforeId === tgt.itemId) {
        return; // already exactly there
      }
      this.command({
        kind: 'move-menu-item',
        appId: src.appId,
        toAppId: tgt.appId,
        itemId: src.itemId,
        parentId: tgtHome.parentId ?? undefined,
        beforeItemId: tgt.itemId,
      });
      return;
    }
    if (!appId) return;
    this.command({ kind: 'move-menu-item', appId: src.appId, toAppId: appId, itemId: src.itemId });
  };

  /** Re-slots a wizard step unless it already sits exactly there. */
  private moveWizardStep(pageId: string, stepKey: string, beforeKey: string | null): void {
    if (beforeKey === stepKey) return;
    const steps = ((this.model.pages ?? []).find((pg) => pg.id === pageId)?.wizardSteps ?? [])
      .map((s) => s.id ?? s.pageId!);
    const at = steps.indexOf(stepKey);
    if (at >= 0 && (beforeKey ? steps[at + 1] === beforeKey : at === steps.length - 1)) return;
    this.command({ kind: 'move-page-wizard-step', pageId, targetId: stepKey, beforeItemId: beforeKey });
  }

  /** A wizard step row dropped on a slot: re-slot it before the target step. */
  private onWizardSlotRequested = (e: CustomEvent): void => {
    const { id, beforeId } = e.detail as { id: string; beforeId?: string | null };
    const src = /^wizrow:([^:]+):(.+)$/.exec(id);
    if (!src) return;
    const before = beforeId ? /^wizrow:[^:]+:(.+)$/.exec(beforeId)?.[1] ?? null : null;
    this.moveWizardStep(src[1], src[2], before);
  };

  /** A menu entry (with its parent and next sibling) inside an app's tree, by id. */
  private menuEntryIn(appId: string, itemId: string): {
    entry: UiMenuEntryRef;
    parentId: string | null;
    beforeId: string | null;
  } | null {
    const app = (this.model.uiApps ?? []).find((a) => a.id === appId);
    let found: { entry: UiMenuEntryRef; parentId: string | null; beforeId: string | null } | null = null;
    const walk = (items: UiMenuEntryRef[] | undefined, up: string | null) => {
      const list = items ?? [];
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === itemId) {
          found = { entry: list[i], parentId: up, beforeId: list[i + 1]?.id ?? null };
        }
        walk(list[i].children, list[i].id ?? null);
      }
    };
    walk(app?.menuItems, null);
    return found;
  }


  // ── palette (drag to create / drag to place) ────────────────────────────

  /** Palette entries carry the SAME glyph and stroke colour their node wears on the canvas. */
  /** Section order for the «Nuevos» tab. */
  private paletteCatalog(): {
    label: string;
    symbol: string;
    color: string;
    items: { id: string; name: string }[];
  }[] {
    const m = this.model;
    // State models belong to an aggregate/entity (its fields) — not stand-alone catalog models.
    const stateModelIds = new Set<string>([
      ...(m.aggregates ?? []).map((a) => a.modelId),
      ...(m.entities ?? []).map((e) => e.modelId),
    ].filter((id): id is string => !!id));
    const groups: {
      label: string;
      symbol: string;
      color: string;
      items: { id: string; name: string }[];
    }[] = [
      {
        label: 'Sistemas',
        symbol: 'component',
        color: '#475569',
        items: (m.systems ?? []).map((x) => ({ id: x.id, name: x.name })),
      },
      {
        label: 'CDC',
        symbol: 'flow',
        color: '#0891b2',
        items: (m.cdcs ?? []).map((x) => ({ id: x.id, name: x.name })),
      },
      {
        label: 'Contextos',
        symbol: 'component',
        color: '#94a3b8',
        items: m.boundedContexts.map((x) => ({ id: x.id, name: x.name })),
      },
      {
        label: 'Apps',
        symbol: 'component',
        color: '#0ea5e9',
        items: (m.uiApps ?? []).map((x) => ({ id: x.id, name: x.title || x.name })),
      },
      {
        label: 'Páginas',
        symbol: 'interface',
        color: '#0284c7',
        items: (m.pages ?? []).map((x) => ({ id: x.id, name: x.name })),
      },
      {
        label: 'Modelos',
        symbol: 'readmodel',
        color: '#0369a1',
        // A state model belongs to an aggregate/entity (its fields) — not a stand-alone catalog model.
        items: (m.models ?? [])
          .filter((x) => !stateModelIds.has(x.id))
          .map((x) => ({ id: x.id, name: x.name })),
      },
      {
        label: 'Triggers programados',
        symbol: 'clock',
        color: '#d97706',
        items: m.boundedContexts.flatMap((mod) =>
          (mod.scheduledTriggers ?? []).map((t) => ({ id: t.id, name: t.name })),
        ),
      },
      {
        label: 'Mapeados',
        symbol: 'flow',
        color: '#7c3aed',
        items: (m.modelMappings ?? []).map((x) => ({ id: x.id, name: x.name })),
      },
      {
        label: 'Casos de uso',
        symbol: 'usecase',
        color: '#06b6d4',
        items: m.boundedContexts.flatMap((mod) => (mod.useCases ?? []).map((u) => ({ id: u.id, name: u.name }))),
      },
      {
        label: 'Eventos',
        symbol: 'event',
        color: '#f59e0b',
        items: m.boundedContexts.flatMap((mod) => [
          ...(mod.domainEvents ?? []).map((ev) => ({ id: ev.id, name: ev.name })),
          ...(mod.applicationEvents ?? []).map((ev) => ({ id: ev.id, name: ev.name })),
          ...(mod.integrationEvents ?? []).map((ev) => ({ id: ev.id, name: ev.name })),
        ]),
      },
      {
        label: 'Agregados',
        symbol: 'aggregate',
        color: '#8b5cf6',
        items: (m.aggregates ?? []).map((a) => ({ id: a.id, name: a.name })),
      },
      {
        label: 'Read models',
        symbol: 'readmodel',
        color: '#10b981',
        items: m.boundedContexts.flatMap((mod) => (mod.readModels ?? []).map((rm) => ({ id: rm.id, name: rm.name }))),
      },
      {
        label: 'Operaciones de consulta',
        symbol: 'lens',
        color: '#0284c7',
        items: m.boundedContexts.flatMap((mod) =>
          (mod.queryServices ?? []).flatMap((qs) =>
            (qs.operations ?? []).map((op) => ({ id: op.id, name: `${op.name} (${qs.name})` })),
          ),
        ),
      },
      {
        label: 'Query services',
        symbol: 'lens',
        color: '#0284c7',
        items: m.boundedContexts.flatMap((mod) => (mod.queryServices ?? []).map((q) => ({ id: q.id, name: q.name }))),
      },
      {
        label: 'Actores',
        symbol: 'person',
        color: '#64748b',
        items: (m.actors ?? []).map((a) => ({ id: a.id, name: a.name })),
      },
      {
        label: 'Sistemas externos',
        symbol: 'component',
        color: '#64748b',
        items: m.externalSystems.map((x) => ({ id: x.id, name: x.name })),
      },
      {
        label: 'Operaciones y tablas externas',
        symbol: 'usecase',
        color: '#64748b',
        items: m.externalSystems.flatMap((x) => [
          ...(x.useCases ?? []).map((u) => ({ id: u.id, name: u.name })),
          ...(x.tables ?? []).map((t) => ({ id: t.id, name: t.name })),
          ...(x.mcpServers ?? []).map((sv) => ({ id: sv.id, name: sv.name })),
        ]),
      },
      {
        label: 'APIs',
        symbol: 'interface',
        color: '#4f46e5',
        items: (m.apis ?? []).map((a) => ({ id: a.id, name: a.name })),
      },
      {
        label: 'Operaciones de API',
        symbol: 'usecase',
        color: '#4f46e5',
        items: (m.apis ?? []).flatMap((a) => a.operations.map((o) => ({ id: o.id, name: o.name }))),
      },
      {
        label: 'Proxies API',
        symbol: 'interface',
        color: '#0e7490',
        items: (m.proxyApis ?? []).map((px) => ({ id: px.id, name: px.name })),
      },
      {
        label: 'Agentes IA',
        symbol: 'robot',
        color: '#9333ea',
        items: (m.aiAgents ?? []).map((a) => ({ id: a.id, name: a.name })),
      },
      {
        label: 'Gateways MCP',
        symbol: 'plug',
        color: '#7c3aed',
        items: (m.mcpGateways ?? []).map((g) => ({ id: g.id, name: g.name })),
      },
      {
        label: 'RAGs',
        symbol: 'lens',
        color: '#0e7490',
        items: (m.rags ?? []).map((r) => ({ id: r.id, name: r.name })),
      },
      {
        label: 'Workflows',
        symbol: 'process',
        color: '#6d28d9',
        items: (m.workflows ?? []).map((w) => ({ id: w.id, name: w.name })),
      },
    ];
    const needle = this._paletteFilter.trim().toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        items: needle ? g.items.filter((it) => it.name.toLowerCase().includes(needle)) : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }

  /**
   * Palette → canvas is a POINTER drag, not HTML5 drag-and-drop: CEF (the JCEF webview the plugin
   * embeds) never delivers `dragover`/`drop`, so a native drag just gets stuck. Pointer events work
   * everywhere. A press arms the drag; the first move past a small threshold makes it real (so a
   * plain click still does nothing), a ghost chip follows the cursor, and the release drops.
   */
  private startPaletteDrag(
    e: PointerEvent, payload: { new?: string; existing?: string }, label: string,
  ): void {
    e.preventDefault();
    this._paletteDrag = { payload, label, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, active: false };
    window.addEventListener('pointermove', this.onPaletteDragMove);
    window.addEventListener('pointerup', this.onPaletteDragEnd);
  }

  private onPaletteDragMove = (e: PointerEvent): void => {
    const d = this._paletteDrag;
    if (!d) return;
    const active = d.active || Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 3;
    this._paletteDrag = { ...d, x: e.clientX, y: e.clientY, active };
  };

  private onPaletteDragEnd = (e: PointerEvent): void => {
    const d = this._paletteDrag;
    window.removeEventListener('pointermove', this.onPaletteDragMove);
    window.removeEventListener('pointerup', this.onPaletteDragEnd);
    this._paletteDrag = null;
    if (d && d.active) this.handlePaletteDrop(d.payload, e.clientX, e.clientY);
  };

  /** Land a palette payload at a client point — the shared drop logic (pointer up, or a browser drop). */
  private handlePaletteDrop(payload: { new?: string; existing?: string }, clientX: number, clientY: number): void {
    // Whichever surface is showing takes the drop — canvas and tilt share the API.
    const surface =
      this._yugo
        ? this.renderRoot.querySelector('modux-explorer')
        : this._tilt
          ? this.renderRoot.querySelector('modux-tilt')
          : this.renderRoot.querySelector('modux-canvas');
    if (!surface) return;
    const pos = surface.sceneFromClient(clientX, clientY);
    // Solution/diff overlays and flow lanes prefix node ids; the drop resolvers work
    // on the bare catalog id, like every other handler.
    let targetId = surface.nodeIdAtClient(clientX, clientY)?.replace(/^(tgt:|flow:)/, '') ?? null;
    // Exact hit-testing misses small nodes (SVG fill hit areas vary, boxes shrink when
    // zoomed out): fall back to the nearest node so a drop just SHORT of it still lands.
    if (!targetId && 'nodeIdNearClient' in surface) {
      targetId =
        (surface as import('./modux-canvas.js').ModuxCanvas)
          .nodeIdNearClient(clientX, clientY)
          ?.replace(/^(tgt:|flow:)/, '') ?? null;
    }
    // Over a mockup component chip, the vertical position decides before/after/into.
    const slot = 'dropSlotAtClient' in surface
      ? (surface as import('./modux-canvas.js').ModuxCanvas).dropSlotAtClient(clientX, clientY)
      : null;
    if (payload.new) this.createFromPalette(payload.new, pos, targetId, slot);
    else if (payload.existing) {
      this.placeExistingFromPalette(payload.existing, pos, targetId, clientX, clientY, slot);
    }
  }

  /**
   * A fresh element: the id is an opaque UUID — the granular store names files
   * after it, so it must never derive from the (renamable, duplicable) name.
   * Only the NAME needs uniquifying, so two drops of «Contexto» read apart.
   */
  private uniquePaletteName(base: string): { id: string; name: string } {
    // Names from drops still in flight count as taken: two quick drops of the
    // same type must not read alike while the projection catches up.
    const taken = new Set(this._pendingNames);
    const m = this.model;
    for (const pool of [
      m.boundedContexts.map((x) => x.name),
      m.boundedContexts.flatMap((mo) => (mo.useCases ?? []).map((x) => x.name)),
      m.boundedContexts.flatMap((mo) => (mo.domainEvents ?? []).map((x) => x.name)),
      m.boundedContexts.flatMap((mo) => (mo.applicationEvents ?? []).map((x) => x.name)),
      m.boundedContexts.flatMap((mo) => (mo.readModels ?? []).map((x) => x.name)),
      m.boundedContexts.flatMap((mo) => (mo.domainServices ?? []).map((x) => x.name)),
      m.boundedContexts.flatMap((mo) => (mo.queryServices ?? []).map((x) => x.name)),
      m.boundedContexts.flatMap((mo) => (mo.scheduledTriggers ?? []).map((x) => x.name)),
      (m.aggregates ?? []).map((x) => x.name),
      (m.entities ?? []).map((x) => x.name),
      (m.actors ?? []).map((x) => x.name),
      (m.areas ?? []).map((x) => x.name),
      m.externalSystems.map((x) => x.name),
      m.externalSystems.flatMap((x) => (x.useCases ?? []).map((u) => u.name)),
      m.externalSystems.flatMap((x) => (x.tables ?? []).map((t) => t.name)),
      m.externalSystems.flatMap((x) => (x.mcpServers ?? []).map((s) => s.name)),
      (m.apis ?? []).map((x) => x.name),
      (m.apis ?? []).flatMap((a) => (a.operations ?? []).map((o) => o.name)),
      (m.proxyApis ?? []).map((x) => x.name),
      (m.aiAgents ?? []).map((x) => x.name),
      (m.mcpGateways ?? []).map((x) => x.name),
      (m.rags ?? []).map((x) => x.name),
      (m.workflows ?? []).map((x) => x.name),
      (m.etlFlows ?? []).map((x) => x.name),
      (m.identityProviders ?? []).map((x) => x.name),
      (m.notifications ?? []).map((x) => x.name),
      (m.documents ?? []).map((x) => x.name),
      (m.uiApps ?? []).map((x) => x.name),
      (m.pages ?? []).map((x) => x.name),
      (m.modules ?? []).map((x) => x.name),
      (m.services ?? []).map((x) => x.name),
      (m.customCodes ?? []).map((x) => x.name),
      (m.buttonGroups ?? []).map((x) => x.name),
      (m.workflowGateways ?? []).map((x) => x.name),
      (m.urls ?? []).map((x) => x.name),
    ]) {
      pool.forEach((name) => { if (name) taken.add(name); });
    }
    for (let n = 1; ; n++) {
      const name = n === 1 ? base : `${base} ${n}`;
      if (!taken.has(name)) {
        this._pendingNames.add(name);
        return { id: crypto.randomUUID(), name };
      }
    }
  }

  /** The container chain at a drop target: scene parents — or the explorer's tree. */
  private dropChain(targetId: string | null | undefined): string[] {
    if (!targetId) return [];
    if (this._yugo) {
      const ex = this.renderRoot.querySelector('modux-explorer') as
        | (HTMLElement & { chainOf(id: string): string[] })
        | null;
      return ex?.chainOf(targetId) ?? [targetId];
    }
    const scene = this.sceneFor(this._view);
    const chain: string[] = [];
    for (let cur: string | undefined = targetId; cur; ) {
      chain.push(cur);
      const n = scene.nodes.find((x) => x.id === cur);
      cur = n ? n.ownerId ?? n.parentId : undefined;
    }
    return chain;
  }

  /** The container a child kind needs, resolved from whatever the drop landed on. */
  /** The aggregate whose box is nearest to a scene point — the forgiving drop target. */
  private nearestAggregateTo(pos: Point): string | null {
    const aggs = this.sceneFor('aggregates').nodes.filter((n) => n.kind === 'aggregate');
    let best: string | null = null;
    let bestD = Infinity;
    for (const a of aggs) {
      const dx = Math.max(Math.abs(pos.x - a.x) - (a.w ?? 0) / 2, 0);
      const dy = Math.max(Math.abs(pos.y - a.y) - (a.h ?? 0) / 2, 0);
      const d = Math.hypot(dx, dy);
      if (d < bestD) {
        bestD = d;
        best = a.id;
      }
    }
    return best;
  }

  private dropContainerFor(type: string, targetId: string | null): string | null {
    if (!targetId) return null;
    const chain = this.dropChain(targetId);
    const needsBoundedContext = [
      'aggregate', 'use-case', 'policy', 'domain-event',
      'application-event', 'integration-event', 'domain-service', 'query-service', 'scheduled-trigger', 'etl-flow',
      'notification', 'document', 'module',
    ].includes(type);
    if (needsBoundedContext) return chain.find((id) => this.model.boundedContexts.some((mo) => mo.id === id)) ?? null;
    // A field or invariant belongs to whatever it is dropped on: a value object, an
    // entity, or an aggregate (dropping on a context falls back to its first aggregate).
    if (type === 'invariant' || type === 'field') {
      const vo = chain.find((cid) => (this.model.valueObjects ?? []).some((v) => v.id === cid));
      if (vo) return vo;
      const ent = chain.find((cid) => (this.model.entities ?? []).some((e) => e.id === cid));
      if (ent) return ent;
      const agg = chain.find((cid) => (this.model.aggregates ?? []).some((a) => a.id === cid));
      if (agg) return agg;
      const mod = chain.find((cid) => this.model.boundedContexts.some((mo) => mo.id === cid));
      return (this.model.aggregates ?? []).find((a) => a.boundedContextId === mod)?.id ?? null;
    }
    // Children of an aggregate: dropped on the aggregate itself, or on its context
    // (then the context's first aggregate takes them).
    if (['read-model', 'entity', 'value-object', 'operation'].includes(type)) {
      const agg = chain.find((cid) => (this.model.aggregates ?? []).some((a) => a.id === cid));
      if (agg) return agg;
      const mod = chain.find((cid) => this.model.boundedContexts.some((mo) => mo.id === cid));
      return (this.model.aggregates ?? []).find((a) => a.boundedContextId === mod)?.id ?? null;
    }
    if (['external-use-case', 'external-table', 'mcp-server'].includes(type)) {
      return chain.find((id) => this.model.externalSystems.some((x) => x.id === id)) ?? null;
    }
    if (type === 'model-field') {
      return chain.find((id) => (this.model.models ?? []).some((mo) => mo.id === id)) ?? null;
    }
    if (type === 'etl-flow' && this._view === 'integrations' && this.model.boundedContexts.length === 1) {
      return this.model.boundedContexts[0].id;
    }
    if (type === 'ui-button') {
      return chain.find((id) => (this.model.buttonGroups ?? []).some((g) => g.id === id)) ?? null;
    }
    if (type === 'use-case-step') {
      return (
        chain.find((id) =>
          this.model.boundedContexts.some((mo) => (mo.useCases ?? []).some((u) => u.id === id)),
        ) ?? null
      );
    }
    if (type === 'api-operation') {
      // The API itself, an implementation occurrence of it, or a proxy — a proxy's
      // surface IS its fronted API, so the operation lands on the target.
      for (const id of chain) {
        if ((this.model.apis ?? []).some((a) => a.id === id)) return id;
        const impl = /^apiimpl:(.+)@(.+)$/.exec(id);
        if (impl && (this.model.apis ?? []).some((a) => a.id === impl[1])) return impl[1];
        const px = (this.model.proxyApis ?? []).find((p) => p.id === id);
        if (px?.targetApiId) return px.targetApiId;
      }
      return null;
    }
    if (type === 'api') {
      return (
        chain.find((id) => this.model.externalSystems.some((x) => x.id === id)) ??
        chain.find((id) => this.model.boundedContexts.some((mo) => mo.id === id)) ??
        null
      );
    }
    return null;
  }

  private createFromPalette(
    type: string,
    pos: Point,
    targetId: string | null,
    slot: { nodeId: string; pos: 'before' | 'after' | 'into' } | null = null,
  ): void {
    const def = PALETTE_NEW.find((k) => k.type === type);
    if (!def) return;
    if (type === 'project-reference') {
      this._repoPicker = { pos, coordinate: '' };
      return;
    }
    if (type.startsWith('cmp:')) {
      const componentKind = type.slice(4);
      const m = targetId ? /^cmp:([^:]+):(.+)$/.exec(targetId) : null;
      // Mockup host: dropped on the mockup node (bare id) or on one of its component chips (nest
      // under it), honouring the tab rules — a `tab` only lives in a `tabLayout`, and a `tabLayout`
      // holds only tabs (a drop on it lands in its active tab).
      const mockupHostId = m ? m[1] : targetId;
      if (mockupHostId && (this.model.mockups ?? []).some((mk) => mk.id === mockupHostId)) {
        const dropOn = m ? m[2] : undefined;
        if (componentKind === 'tab') {
          let hostId: string | null = null;
          let cur = dropOn ? this.mockupComponentIn(mockupHostId, dropOn) : null;
          while (cur) {
            if (cur.node.kind === 'tabLayout') { hostId = cur.node.id; break; }
            cur = cur.parentId ? this.mockupComponentIn(mockupHostId, cur.parentId) : null;
          }
          if (!hostId) {
            this.emit('modux-notice', { message: 'Suelta la pestaña sobre un layout de pestañas' });
            return;
          }
          const componentId = this.newComponentId('tab');
          const host = this.mockupComponent(mockupHostId, hostId);
          const title = `Pestaña ${(host?.children ?? []).filter((c) => c.kind === 'tab').length + 1}`;
          this.command({ kind: 'add-page-component', mockupId: mockupHostId, componentId, componentKind: 'tab', parentComponentId: hostId }, false);
          this.command({ kind: 'set-page-component', mockupId: mockupHostId, componentId, title }, false);
          this.pushUndoEntry([{ kind: 'remove-page-component', mockupId: mockupHostId, componentId }]);
          return;
        }
        let parentComponentId = dropOn;
        let beforeComponentId: string | null = null;
        if (dropOn && slot && slot.pos !== 'into') {
          // Sibling slot: land beside the hovered component (before it, or before its next sibling).
          const hovered = this.mockupComponentIn(mockupHostId, dropOn);
          if (hovered) {
            const siblings = hovered.parentId
              ? (this.mockupComponent(mockupHostId, hovered.parentId)?.children ?? [])
              : ((this.model.mockups ?? []).find((mk) => mk.id === mockupHostId)?.content ?? []);
            const idx = siblings.findIndex((c) => c.id === dropOn);
            parentComponentId = hovered.parentId ?? undefined;
            beforeComponentId = slot.pos === 'before' ? dropOn : (siblings[idx + 1]?.id ?? null);
          }
        } else if (dropOn) {
          // «into» (or no slot): nest inside; a tabLayout takes it in its first tab.
          const found = this.mockupComponent(mockupHostId, dropOn);
          if (found?.kind === 'tabLayout') parentComponentId = (found.children ?? [])[0]?.id ?? dropOn;
        }
        const componentId = this.newComponentId(componentKind);
        this.command({ kind: 'add-page-component', mockupId: mockupHostId, componentId, componentKind, parentComponentId }, false);
        if (beforeComponentId !== null) {
          this.command({ kind: 'move-page-component', mockupId: mockupHostId, componentId, parentComponentId: parentComponentId ?? null, beforeComponentId }, false);
        }
        this.pushUndoEntry([{ kind: 'remove-page-component', mockupId: mockupHostId, componentId }]);
        return;
      }
      const pageId = m ? m[1] : targetId && (this.model.pages ?? []).some((x) => x.id === targetId) ? targetId : null;
      if (!pageId) {
        this.emit('modux-notice', { message: 'Suelta el layout/componente sobre una página' });
        return;
      }
      let parentComponentId = m ? m[2] : undefined;
      let beforeComponentId: string | null = null;
      if (componentKind === 'tab') {
        // a tab only lives in a tabLayout: walk up from wherever the drop landed
        let hostId: string | null = null;
        let cur = parentComponentId ? this.componentIn(pageId, parentComponentId) : null;
        while (cur) {
          if (cur.node.kind === 'tabLayout') {
            hostId = cur.node.id;
            break;
          }
          cur = cur.parentId ? this.componentIn(pageId, cur.parentId) : null;
        }
        if (!hostId) {
          this.emit('modux-notice', { message: 'Suelta la pestaña sobre un layout de pestañas' });
          return;
        }
        const host = this.componentIn(pageId, hostId)!.node;
        const componentId = this.newComponentId('tab');
        const title = `Pestaña ${(host.children ?? []).filter((c) => c.kind === 'tab').length + 1}`;
        this.command({ kind: 'add-page-component', pageId, componentId, componentKind: 'tab', parentComponentId: hostId }, false);
        this.command({ kind: 'set-page-component', pageId, componentId, title }, false);
        this.pushUndoEntry([{ kind: 'remove-page-component', pageId, componentId }]);
        return;
      }
      if (parentComponentId) {
        // a tabLayout holds only tabs: dropping on it lands in its active (first) tab
        const found = this.componentIn(pageId, parentComponentId)?.node ?? null;
        if (found?.kind === 'tabLayout' && (found.children ?? [])[0]) {
          parentComponentId = (found.children ?? [])[0].id;
        }
      }
      const componentId = this.newComponentId(componentKind);
      const addCmd: ModuxCommand = {
        kind: 'add-page-component',
        pageId,
        componentId,
        componentKind,
        parentComponentId,
      };
      if (!beforeComponentId) {
        this.command(addCmd);
        return;
      }
      this.command(addCmd, false);
      this.command(
        { kind: 'move-page-component', pageId, componentId, parentComponentId: parentComponentId ?? null, beforeComponentId },
        false,
      );
      this.pushUndoEntry([{ kind: 'remove-page-component', pageId, componentId }]);
      return;
    }

    const view = this._view;
    const scene = this.sceneFor(view);
    const place = (id: string, container?: string) => {
      // Born fresh: a deleted namesake's leftover geometry (a size, a position in
      // another view) must not dress the newcomer — same sweep as stale edge bends.
      this.purgeNodeGeometry(id);
      // A CHILD of a container gets no stored geometry. Its owner may be collapsed at
      // drop time, so an absolute drop point is meaningless; and a parent-relative
      // offset would be read back as absolute (dragged children and emitChildren both
      // use absolute), landing the child near (0,0). Let the view place it around its
      // owner when expanded (context-map/distribution ring, aggregates satellite).
      // Only a TOP-LEVEL node keeps the drop point.
      if (container) {
        return { kind: 'move-node', view, id, pos: null } as EditOp;
      }
      const current = this.viewLayout(view);
      this.writeViewLayout(view, {
        ...current,
        nodes: { ...current.nodes, [id]: { x: Math.round(pos.x), y: Math.round(pos.y) } },
      });
      return { kind: 'move-node', view, id, pos: null } as EditOp;
    };
    const issue = (cmd: ModuxCommand, id: string, container?: string) => {
      const inverse = this.inverseOf(cmd) ?? [];
      this.command(cmd, false);
      const undo: ModuxCommand[] = [...inverse];
      // In a scoped view a NEW catalog element must join the view, or the filter hides it (as
      // placeExisting already does for existing ones). Notes and areas are view-local, not members.
      if (this._activeViewId && cmd.kind !== 'add-note' && cmd.kind !== 'add-area') {
        this.command({ kind: 'add-view-member', id: this._activeViewId, targetId: id }, false);
        undo.unshift({ kind: 'remove-view-member', id: this._activeViewId, targetId: id });
      }
      const moveOp = place(id, container);
      this.pushUndoEntry([...undo, moveOp]);
    };
    if (!def.child) {
      const { id, name } = this.uniquePaletteName(def.label);
      const cmd: ModuxCommand =
        type === 'boundedContext'
          ? { kind: 'add-boundedContext', id, name, subdomainType: 'SUPPORTING' }
          : type === 'system'
            ? { kind: 'add-system', id, name }
          : type === 'cdc'
            ? { kind: 'add-cdc', id, name }
          : type === 'note'
            ? { kind: 'add-note', id, name }
          : type === 'area'
            ? { kind: 'add-area', id, name }
          : type === 'actor'
            ? { kind: 'add-actor', id, name }
            : type === 'external-system'
              ? { kind: 'add-external-system', id, name }
              : type === 'ai-agent'
                ? { kind: 'add-ai-agent', id, name }
                : type === 'external-ai-agent'
                  ? { kind: 'add-ai-agent', id, name, external: true }
                  : type === 'mcp-gateway'
                    ? { kind: 'add-mcp-gateway', id, name }
                    : type === 'rag'
                      ? { kind: 'add-rag', id, name }
                      : type === 'api'
                        ? { kind: 'add-api', id, name }
                        : type === 'proxy-api'
                          ? { kind: 'add-proxy-api', id, name }
                          : type === 'ui'
                            ? { kind: 'add-ui', id, name }
                          : type === 'ui-app'
                            ? { kind: 'create-ui-app', id, name }
                            : type === 'ui-app-orchestrator'
                              ? { kind: 'create-ui-app', id, name, type: 'ORCHESTRATOR' }
                              : type === 'ui-app-masterdetail'
                                ? { kind: 'create-ui-app', id, name, type: 'MASTER_DETAIL' }
                                : type === 'ui-app-vieweditor'
                                  ? { kind: 'create-ui-app', id, name, type: 'VIEW_EDITOR' }
                                  : type === 'ui-model'
                                  ? { kind: 'add-model', id, name }
                                  : type === 'transformation'
                                  ? { kind: 'add-transformation', id, name }
                                  : type === 'custom-code'
                                  ? { kind: 'add-custom-code', id, name }
                                  : type === 'button-group'
                                  ? { kind: 'add-button-group', id, name }
                                  : type === 'identity-provider'
                                  ? { kind: 'add-identity-provider', id, name }
                                  : type === 'service'
                                  ? { kind: 'add-service', id, name }
                                  : type === 'url'
                                  ? { kind: 'add-url', id, name }
                                  : type === 'mockup'
                                  ? { kind: 'add-mockup', id, name }
                                  : {
                                kind: 'add-workflow',
                                id,
                                name,
                                completionEventName: `${name.replace(/\s+/g, '')}Completado`,
                              };
      if (cmd.kind === 'add-ui') {
        const chain = this.dropChain(targetId);
        const boundedContextId = chain.find((cid) => this.model.boundedContexts.some((mo) => mo.id === cid));
        if (boundedContextId) {
          issue({ ...cmd, boundedContextId }, id);
          return;
        }
      }
      if (cmd.kind === 'create-ui-app') {
        // Dropped inside a bounded context: the boundedContext owns the app from the start.
        const chain = this.dropChain(targetId);
        const boundedContextId = chain.find((cid) => this.model.boundedContexts.some((mo) => mo.id === cid));
        if (boundedContextId) {
          issue({ ...cmd, boundedContextId }, id);
          return;
        }
      }
      if (cmd.kind === 'add-external-system') {
        // Dropped on another external system: it is born as its SUBSYSTEM.
        const chain = this.dropChain(targetId);
        const parentId = chain.find((cid) => this.model.externalSystems.some((x) => x.id === cid));
        if (parentId) {
          issue({ ...cmd, parentId }, id);
          this.emit('modux-notice', { message: 'Subsistema creado como parte del sistema' });
          return;
        }
      }
      if (cmd.kind === 'add-system') {
        // Dropped on another system: it is born as its nested SUBSYSTEM.
        const chain = this.dropChain(targetId);
        const parentSystemId = chain.find((cid) => (this.model.systems ?? []).some((s) => s.id === cid));
        if (parentSystemId) {
          issue({ ...cmd, parentSystemId }, id);
          this.emit('modux-notice', { message: 'Subsistema creado dentro del sistema' });
          return;
        }
      }
      if (cmd.kind === 'add-boundedContext') {
        // Dropped on a system: the context is born grouped under it.
        const chain = this.dropChain(targetId);
        const systemId = chain.find((cid) => (this.model.systems ?? []).some((s) => s.id === cid));
        if (systemId) {
          issue(cmd, id);
          this.command({ kind: 'set-context-system', id, parentSystemId: systemId });
          this.emit('modux-notice', { message: 'Contexto creado dentro del sistema' });
          return;
        }
      }
      issue(cmd, id);
      return;
    }
    if (type === 'ui-wizard-step') {
      const chain = this.dropChain(targetId);
      const wizardId = chain
        .map((cid) => /^wizrow:([^:]+):/.exec(cid)?.[1] ?? cid)
        .find((cid) => (this.model.pages ?? []).some((pg) => pg.id === cid && pg.type === 'WIZARD'));
      if (!wizardId) {
        this.emit('modux-notice', { message: 'Suelta el paso sobre un wizard' });
        return;
      }
      const steps = (this.model.pages ?? []).find((pg) => pg.id === wizardId)?.wizardSteps ?? [];
      const taken = new Set(steps.map((s) => s.id ?? s.pageId));
      let n = steps.length + 1;
      while (taken.has(`wzs-${n}`)) n++;
      this.command({ kind: 'add-page-wizard-step', pageId: wizardId, itemId: `wzs-${n}`, label: `Paso ${n}` });
      this.emit('modux-notice', { message: 'Paso creado — arrastra su asa hasta la página que lo implementa' });
      return;
    }
    if (type === 'page' || type === 'ui-page-crud' || type === 'ui-page-wizard') {
      const pageType = type === 'ui-page-crud' ? 'CRUD' : type === 'ui-page-wizard' ? 'WIZARD' : 'PAGE';
      const base = pageType === 'CRUD' ? 'CRUD' : pageType === 'WIZARD' ? 'Wizard' : 'Página';
      const { id, name } = this.uniquePaletteName(base);
      // Dropped on an app (or on one of its menu entries): the page hangs from its menu.
      const chain = this.dropChain(targetId);
      const appId = chain.find((cid) => (this.model.uiApps ?? []).some((a) => a.id === cid));
      const wizardId = chain
        .map((cid) => /^wizrow:([^:]+):/.exec(cid)?.[1] ?? cid)
        .find((cid) => (this.model.pages ?? []).some((pg) => pg.id === cid && pg.type === 'WIZARD'));
      if (wizardId) {
        // Born INSIDE a wizard: the page and its step arrive together.
        const wizNode = scene.nodes.find((n) => n.id === wizardId);
        if (wizNode) {
          pos.x = wizNode.x + wizNode.w / 2 + 160;
          pos.y = wizNode.y - wizNode.h / 2 + 40;
        }
        this.command({ kind: 'create-ui-page', id, name, pageType }, false);
        this.command({ kind: 'add-page-wizard-step', pageId: wizardId, targetId: id }, false);
        const moveOp = place(id);
        this.pushUndoEntry([{ kind: 'delete-ui-page', id }, moveOp]);
        this.emit('modux-notice', { message: `${name} creada como paso del wizard` });
        return;
      }
      if (appId) {
        // Born from an app's menu: park the page beside the app, not on top of it.
        const appNode = scene.nodes.find((n) => n.id === appId);
        if (appNode) {
          pos.x = appNode.x + appNode.w / 2 + 160;
          pos.y = appNode.y - appNode.h / 2 + 40;
        }
      }
      issue(
        appId
          ? { kind: 'create-ui-page', id, name, pageType, appId, menuLabel: name }
          : { kind: 'create-ui-page', id, name, pageType },
        id,
      );
      return;
    }
    if (type === 'menu-item') {
      const chain = this.dropChain(targetId);
      const appId = chain.find((cid) => (this.model.uiApps ?? []).some((a) => a.id === cid));
      if (!appId) {
        this.emit('modux-notice', { message: 'Suelta la entrada de menú sobre una app' });
        return;
      }
      // labels must not collide: they are what the user reads AND the pre-id identity
      const taken = new Set<string>();
      const walkLabels = (items: { label: string; children?: [] }[] | undefined) => {
        for (const it of items ?? []) {
          taken.add(it.label);
          walkLabels(it.children);
        }
      };
      (this.model.uiApps ?? []).forEach((a) => walkLabels(a.menuItems as never));
      let label = 'Entrada';
      for (let n = 2; taken.has(label); n++) label = `Entrada ${n}`;
      // dropped on an existing entry: the new one nests under it (a submenu)
      const parentNode = chain.map((cid) => parseMenuNodeId(cid)).find(Boolean);
      this.command({
        kind: 'add-menu-item',
        appId,
        label,
        itemId: this.newMenuItemId(label),
        parentId: parentNode?.itemId,
        parentLabel: parentNode?.itemId ? undefined : parentNode?.label,
      });
      return;
    }
    if (type === 'etl-transform') {
      const chain = this.dropChain(targetId);
      const flow = chain
        .map((cid) => (this.model.etlFlows ?? []).find((f) => f.id === cid))
        .find(Boolean);
      if (!flow) {
        this.emit('modux-notice', { message: 'Suelta la transformación sobre un flujo ETL' });
        return;
      }
      const taken = new Set((flow.steps ?? []).map((s) => s.id));
      let n = (flow.steps ?? []).length + 1;
      while (taken.has(`ets-${n}`)) n++;
      this.command({
        kind: 'add-etl-step',
        etlFlowId: flow.id,
        id: `ets-${n}`,
        name: `Transformación ${n}`,
        stepType: 'TRANSFORM',
      });
      this.emit('modux-notice', {
        message: 'Transformación añadida — el mapping o el intent se detallan en su ficha',
      });
      return;
    }
    if (type === 'etl-flow' && !this.dropContainerFor(type, targetId)) {
      // In the open it floats: the pipeline exists before deciding who operates it.
      const loose = this.uniquePaletteName(def.label);
      issue({ kind: 'add-etl-flow', id: loose.id, name: loose.name }, loose.id);
      this.emit('modux-notice', {
        message: 'Integrador creado suelto — su contexto dueño se fija en la ficha; cablea fuentes y escrituras aquí',
      });
      return;
    }
    if (type === 'workflow-join' || type === 'workflow-split') {
      // Gateways are born LOOSE: no workflow declared — their links will say.
      const { id, name } = this.uniquePaletteName(type === 'workflow-join' ? 'Join' : 'Split');
      issue({ kind: 'add-workflow-gateway', id, name,
        stepType: type === 'workflow-join' ? 'JOIN' : 'SPLIT' }, id);
      this.emit('modux-notice', {
        message: 'Gateway creado suelto — sus líneas dirán de qué workflow es (join: n entradas → 1 salida; split: 1 → n)',
      });
      return;
    }
    if (type === 'workflow-step') {
      // A step lives in a workflow, but it lands WHEREVER you drop it: on the
      // workflow or one of its steps it chains; in the open, the only workflow
      // adopts it — or a picker asks which one.
      const stepType = undefined as string | undefined;
      const workflows = this.model.workflows ?? [];
      const chain = this.dropChain(targetId);
      const wfDirect = chain.map((cid) => workflows.find((w) => w.id === cid)).find(Boolean);
      const stepHit = chain
        .map((cid) => {
          const owner = workflows.find((w) => (w.steps ?? []).some((s) => s.id === cid));
          return owner ? { owner, stepId: cid } : null;
        })
        .find(Boolean);
      let wf = wfDirect ?? stepHit?.owner;
      if (!wf && workflows.length === 1) wf = workflows[0];
      if (!wf) {
        if (!workflows.length) {
          this.emit('modux-notice', { message: 'Crea antes un workflow: los pasos viven en uno' });
          return;
        }
        this._wfStepPicker = { pos, stepType };
        return;
      }
      const { id, name } = this.uniquePaletteName(
        stepType === 'JOIN' ? 'Join' : stepType === 'SPLIT' ? 'Split' : 'Paso');
      // Chained onto a step: land beside it, downstream (dependencies flow left→right).
      if (stepHit) pos = { x: pos.x + 190, y: pos.y };
      issue(
        {
          kind: 'add-workflow-step',
          workflowId: wf.id,
          id,
          name,
          ...(stepType ? { stepType } : {}),
          ...(stepHit ? { dependsOnStepIds: [stepHit.stepId], afterStepId: stepHit.stepId } : {}),
        },
        id,
      );
      if (this._view !== 'workflows') {
        this.emit('modux-notice', {
          message: `Paso añadido a ${wf.name} — se ve en la vista Workflows`,
        });
      }
      return;
    }
    if (type === 'api') {
      // An API never floats: it is published by an external system or
      // implemented by one of our bounded contexts.
      const home = this.dropContainerFor('api', targetId);
      if (!home) {
        this.emit('modux-notice', {
          message: 'Una API vive en un sistema externo o en un contexto: suéltala sobre uno',
        });
        return;
      }
      const { id, name } = this.uniquePaletteName('API');
      const addCmd: ModuxCommand = { kind: 'add-api', id, name };
      const inverse = this.inverseOf(addCmd) ?? [];
      this.command(addCmd, false);
      if (this.model.externalSystems.some((x) => x.id === home)) {
        this.command({ kind: 'set-api-publisher', id, targetId: home }, false);
      } else {
        this.command({ kind: 'add-api-implementation', apiId: id, boundedContextId: home }, false);
      }
      const current = this.viewLayout(this._view);
      const parent = this.sceneFor(this._view).nodes.find((n) => n.id === home);
      const p = parent
        ? { x: Math.round(pos.x - parent.x), y: Math.round(pos.y - parent.y) }
        : { x: Math.round(pos.x), y: Math.round(pos.y) };
      this.writeViewLayout(this._view, { ...current, nodes: { ...current.nodes, [id]: p } });
      this.pushUndoEntry([...inverse, { kind: 'move-node', view: this._view, id, pos: null }]);
      return;
    }
    let container = this.dropContainerFor(type, targetId);
    // Forgiving drop in the aggregates view: its nodes are small and edge hit-testing
    // is finicky, so a value object / entity / invariant dropped near (not exactly on)
    // an aggregate still lands on the nearest one.
    if (!container && this._view === 'aggregates' && ['value-object', 'entity', 'invariant', 'field', 'operation'].includes(type)) {
      container = this.nearestAggregateTo(pos);
    }
    // Free-standing creation: dropped on empty canvas, these are born without an owner and tied to
    // their parent later by drawing a composition edge (they wear a «sin asociar» badge until then).
    if (!container && ['aggregate', 'entity', 'value-object', 'use-case', 'policy'].includes(type)) {
      const { id, name } = this.uniquePaletteName(def.label);
      const cmd: ModuxCommand =
        type === 'aggregate'
          ? { kind: 'add-aggregate', id, name }
          : type === 'entity'
            ? { kind: 'add-entity', id, name }
            : type === 'value-object'
              ? { kind: 'add-value-object', id, name }
              : { kind: 'add-use-case', id, name, ...(type === 'policy' ? { policy: true } : {}) };
      issue(cmd, id);
      const noun =
        type === 'aggregate' ? 'Agregado'
          : type === 'entity' ? 'Entidad'
          : type === 'value-object' ? 'Value object'
          : type === 'policy' ? 'Policy' : 'Caso de uso';
      const parentNoun = type === 'entity' || type === 'value-object' ? 'un agregado' : 'un contexto';
      this.emit('modux-notice', {
        message: `${noun} «${name}» creado suelto — arrastra una composición desde ${parentNoun} para asociarlo`,
      });
      return;
    }
    // Free-standing NESTED elements (operation/invariant/field/step): they can't live owner-less in
    // their parent's array, so a loose one goes to the looseElements bucket and is adopted into the
    // parent later by a composition edge. It wears a «sin asociar» badge until then.
    if (!container && ['operation', 'invariant', 'field', 'use-case-step', 'read-model', 'external-table', 'integration-event'].includes(type)) {
      const { id, name } = this.uniquePaletteName(def.label);
      issue({ kind: 'add-loose-element', id, name, elementType: type as 'operation' | 'invariant' | 'field' | 'use-case-step' | 'read-model' | 'external-table' | 'integration-event' }, id);
      const parentNoun =
        type === 'operation' ? 'un agregado'
          : type === 'invariant' ? 'un agregado, entidad o value object'
          : type === 'field' ? 'un modelo'
          : type === 'read-model' ? 'un contexto o agregado'
          : type === 'external-table' ? 'un sistema externo'
          : type === 'integration-event' ? 'un contexto'
          : 'un caso de uso o policy';
      const noun = type === 'operation' ? 'Operación' : type === 'invariant' ? 'Invariante'
        : type === 'field' ? 'Campo' : type === 'read-model' ? 'Read model'
        : type === 'external-table' ? 'Tabla' : type === 'integration-event' ? 'Evento de integración' : 'Paso';
      this.emit('modux-notice', {
        message: `${noun} «${name}» creado suelto — arrastra una composición desde ${parentNoun} para asociarlo`,
      });
      return;
    }
    if (!container) {
      this.emit('modux-notice', {
        message:
          type === 'api-operation'
            ? 'Suelta la operación sobre una API'
            : type === 'use-case-step'
              ? 'Suelta el paso sobre un caso de uso'
              : ['external-use-case', 'external-table', 'mcp-server'].includes(type)
                ? 'Suelta el elemento sobre un sistema externo'
                : ['entity', 'value-object', 'invariant', 'field', 'operation'].includes(type)
                  ? 'Suéltalo sobre un agregado (o cerca de uno, en la vista de agregados)'
                  : 'Suelta el elemento sobre un contexto',
      });
      return;
    }
    const { id, name } = this.uniquePaletteName(def.label);
    if (type === 'aggregate') {
      issue({ kind: 'add-aggregate', id, name, boundedContextId: container }, id, container);
    } else if (type === 'entity') {
      issue({ kind: 'add-entity', id, name, aggregateId: container }, id, container);
      const agg = (this.model.aggregates ?? []).find((a) => a.id === container);
      this.emit('modux-notice', { message: `Entidad «${name}» creada en el agregado «${agg?.name ?? container}»` });
    } else if (type === 'value-object') {
      issue({ kind: 'add-value-object', id, name, aggregateId: container }, id, container);
      const agg = (this.model.aggregates ?? []).find((a) => a.id === container);
      this.emit('modux-notice', { message: `Value object «${name}» creado en el agregado «${agg?.name ?? container}»` });
    } else if (type === 'operation') {
      issue({ kind: 'add-operation', id, name, aggregateId: container }, id, container);
      const agg = (this.model.aggregates ?? []).find((a) => a.id === container);
      this.emit('modux-notice', {
        message: `Operación «${name}» creada en «${agg?.name ?? container}» — sus modelos de entrada/salida se editan en la ficha`,
      });
    } else if (type === 'invariant') {
      this.command({ kind: 'add-invariant', ownerId: container, id, name });
      const ownerKind = (this.model.valueObjects ?? []).some((v) => v.id === container)
        ? 'value object'
        : (this.model.entities ?? []).some((e) => e.id === container)
          ? 'entidad'
          : 'agregado';
      this.emit('modux-notice', {
        message: `Invariante declarado en el ${ownerKind} — sus condiciones se detallan en su ficha`,
      });
    } else if (type === 'field') {
      // A field IS a ModelField of the owner's Model (one concept).
      const owner =
        (this.model.aggregates ?? []).find((a) => a.id === container) ??
        (this.model.entities ?? []).find((e) => e.id === container);
      const modelId = owner?.modelId;
      if (modelId) {
        this.command({ kind: 'add-model-field', modelId, fieldId: id, name });
        this.emit('modux-notice', {
          message: `Campo «${name}» creado en «${owner?.name ?? container}» — arrastra un value object sobre él para tiparlo`,
        });
      } else {
        this.emit('modux-notice', { message: 'Suelta el campo sobre un agregado o entidad' });
      }
    } else if (type === 'ui-button') {
      const group = (this.model.buttonGroups ?? []).find((g) => g.id === container);
      const taken = new Set((group?.buttons ?? []).map((bt) => bt.id));
      let n2 = (group?.buttons ?? []).length + 1;
      while (taken.has(`btn-${n2}`)) n2++;
      this.command({ kind: 'add-group-button', id: container, itemId: `btn-${n2}`, label: name });
      this.emit('modux-notice', {
        message: 'Botón creado — arrastra su asa hasta un caso de uso o policy para fijar qué dispara',
      });
    } else if (type === 'model-field') {
      // the chip's scene id is fld:<modelId>:<fieldId> and its spot is fixed — no layout write
      this.command({ kind: 'add-model-field', modelId: container, fieldId: id, name });
    } else if (type === 'module') {
      issue({ kind: 'add-module', id, name, boundedContextId: container }, id, container);
      this.emit('modux-notice', {
        message: 'Módulo creado — arrastra el asa de los elementos del contexto hasta él para distribuirlos',
      });
    } else if (type === 'use-case' || type === 'policy') {
      issue(
        { kind: 'add-use-case', id, name, boundedContextId: container, ...(type === 'policy' ? { policy: true } : {}) },
        id,
        container,
      );
    } else if (type === 'domain-event') {
      issue({ kind: 'add-domain-event', id, name, boundedContextId: container }, id, container);
    } else if (type === 'application-event') {
      issue({ kind: 'add-application-event', id, name, boundedContextId: container }, id, container);
    } else if (type === 'integration-event') {
      issue({ kind: 'add-integration-event', id, name, boundedContextId: container }, id, container);
    } else if (type === 'domain-service') {
      issue({ kind: 'add-domain-service', id, name, boundedContextId: container }, id, container);
    } else if (type === 'query-service') {
      issue({ kind: 'add-query-service', id, name, boundedContextId: container }, id, container);
    } else if (type === 'scheduled-trigger') {
      issue({ kind: 'add-scheduled-trigger', id, name, boundedContextId: container }, id, container);
      this.emit('modux-notice', {
        message: 'Trigger creado (cron diario por defecto) — arrástralo a un caso de uso o policy para fijar qué dispara',
      });
    } else if (type === 'notification') {
      issue({ kind: 'add-notification', id, name, boundedContextId: container }, id, container);
      this.emit('modux-notice', {
        message: 'Notificación creada (canal EMAIL) — arrastra un evento hasta ella y de ella a los roles que avisa',
      });
    } else if (type === 'document') {
      issue({ kind: 'add-document', id, name, boundedContextId: container }, id, container);
      this.emit('modux-notice', {
        message: 'Documento creado — arrástralo a un modelo (plantilla) o a una consulta (informe)',
      });
    } else if (type === 'etl-flow') {
      issue({ kind: 'add-etl-flow', id, name, boundedContextId: container }, id, container);
      this.emit('modux-notice', {
        message:
          'Integrador creado en el contexto — cablea fuentes HACIA él (tabla/API = pull, evento = consumidor) y escrituras DESDE él',
      });
    } else if (type === 'read-model') {
      const aggregate = (this.model.aggregates ?? []).find((a) => a.id === container);
      issue({ kind: 'add-read-model', id, name, aggregateId: container }, id, aggregate?.boundedContextId ?? container);
    } else if (type === 'api-operation') {
      // The operation id embeds the API, so uniqueness is per-API — the generic
      // pool above can't see it and a second «Operación de API» would collide.
      const api = (this.model.apis ?? []).find((a) => a.id === container);
      const taken = new Set((api?.operations ?? []).map((o) => o.id));
      let opName = name;
      let id = `apiop-${container.replace(/^api-/, '')}-${slug(opName)}`;
      for (let n = 2; taken.has(id); n++) {
        opName = `${def.label} ${n}`;
        id = `apiop-${container.replace(/^api-/, '')}-${slug(opName)}`;
      }
      issue({ kind: 'add-api-operation', apiId: container, id, name: opName }, id, container);
      // Guide the eye when the current level doesn't draw operation chips.
      const showsOps = scene.nodes.some(
        (n) => n.parentId === container && (n.kind === 'api-operation' || n.kind === 'api-op-occurrence'),
      );
      if (!showsOps) {
        this.emit('modux-notice', {
          message: `Operación añadida a ${api?.name ?? container} — se ve en el nivel «APIs y operaciones»`,
        });
      }
    } else if (type === 'use-case-step') {
      // Step ids are per-use-case; a bare palette step is Custom — drawing a relation
      // FROM the use case (evento, otro caso de uso, agregado, query…) creates the
      // typed steps instead.
      const uc = this.model.boundedContexts
        .flatMap((mo) => mo.useCases ?? [])
        .find((u) => u.id === container);
      const taken = new Set(uc?.stepIds ?? []);
      let stepName = name;
      let id = `step-${slug(stepName)}`;
      for (let n = 2; taken.has(id); n++) {
        stepName = `${def.label} ${n}`;
        id = `step-${slug(stepName)}`;
      }
      issue({ kind: 'add-use-case-step', useCaseId: container, id, name: stepName }, id, container);
      this.emit('modux-notice', {
        message: `Paso Custom añadido a ${uc?.name ?? container} — detállalo en su ficha; una relación trazada desde el caso de uso crea el paso tipado`,
      });
    } else if (type === 'external-use-case') {
      issue({ kind: 'add-external-use-case', id, name, boundedContextId: container }, id, container);
    } else if (type === 'external-table') {
      issue({ kind: 'add-external-table', id, name, boundedContextId: container }, id, container);
    } else if (type === 'mcp-server') {
      issue({ kind: 'add-mcp-server', id, name, boundedContextId: container }, id, container);
    }
  }

  /** Full config of a content node: set-page-component REPLACES every field, so drops must resend them all. */
  private cmpPatch(cmp: { title?: string; text?: string; label?: string; useCaseId?: string; mappingId?: string;
    modelId?: string; queryServiceId?: string; queryOperationId?: string; fieldId?: string; stereotype?: string;
    colspan?: number; detailPageId?: string }) {
    return {
      title: cmp.title ?? null,
      text: cmp.text ?? null,
      label: cmp.label ?? null,
      useCaseId: cmp.useCaseId ?? null,
      mappingId: cmp.mappingId ?? null,
      modelId: cmp.modelId ?? null,
      queryServiceId: cmp.queryServiceId ?? null,
      queryOperationId: cmp.queryOperationId ?? null,
      fieldId: cmp.fieldId ?? null,
      stereotype: cmp.stereotype ?? null,
      colspan: cmp.colspan ?? null,
      detailPageId: cmp.detailPageId ?? null,
    };
  }

  private placeExistingFromPalette(
    id: string,
    pos: Point,
    targetId: string | null,
    clientX: number,
    clientY: number,
    slot: { nodeId: string; pos: 'before' | 'after' | 'into' } | null = null,
  ): void {
    void slot;
    if (targetId && targetId !== id) {
      this.applyConnection(id, targetId, clientX, clientY);
      return;
    }
    const view = this._view;
    const scene = this.sceneFor(view);
    const node = scene.nodes.find((n) => n.id === id);
    if (!node) {
      if (this._activeViewId) {
        this.command({ kind: 'add-view-member', id: this._activeViewId, targetId: id });
        const current = this.viewLayout(view);
        this.writeViewLayout(view, {
          ...current,
          nodes: { ...current.nodes, [id]: { x: Math.round(pos.x), y: Math.round(pos.y) } },
        });
      } else {
        this.emit('modux-notice', {
          message: 'Ese elemento no se pinta en este nivel de detalle',
        });
      }
      return;
    }
    const current = this.viewLayout(view);
    const parent = node.parentId ? scene.nodes.find((n) => n.id === node.parentId) : undefined;
    const p = parent
      ? { x: Math.round(pos.x - parent.x), y: Math.round(pos.y - parent.y) }
      : { x: Math.round(pos.x), y: Math.round(pos.y) };
    this.pushUndoEntry([{ kind: 'move-node', view, id, pos: current.nodes[id] ?? null }]);
    this.writeViewLayout(view, { ...current, nodes: { ...current.nodes, [id]: p } });
  }

  /** The chip that follows the cursor while a palette item is dragged with the pointer. */
  private renderPaletteGhost() {
    const d = this._paletteDrag;
    if (!d || !d.active) return '';
    return html`<div class="palette-ghost" style="left: ${d.x}px; top: ${d.y}px">${d.label}</div>`;
  }

  /** Depth-first hunt for the raw element object with this id, anywhere in the model tree. */
  private findElement(id: string): Record<string, unknown> | null {
    const seen = new Set<unknown>();
    const walk = (v: unknown): Record<string, unknown> | null => {
      if (!v || typeof v !== 'object' || seen.has(v)) return null;
      seen.add(v);
      if (Array.isArray(v)) {
        for (const it of v) {
          const hit = walk(it);
          if (hit) return hit;
        }
        return null;
      }
      const o = v as Record<string, unknown>;
      if (o.id === id) return o;
      for (const key of Object.keys(o)) {
        const hit = walk(o[key]);
        if (hit) return hit;
      }
      return null;
    };
    return walk(this.model);
  }

  /**
   * The element's detail, drawn inside the editor for the IDE plugin — the web app uses mateu's
   * drawer instead (see openInDrawer). The title renames the element (same path as F2) when its
   * kind supports it; the rest is read-only, editing stays in the canvas gestures (pickers,
   * palette). A ✕ or Escape closes it; a click on the backdrop too.
   */
  private renderDrawer() {
    const ref = this._drawer;
    if (!ref) return '';
    // A mockup component chip carries a synthetic id; edit its config, not a catalog element.
    const cmp = /^cmp:([^:]+):(.+)$/.exec(ref.id);
    if (cmp) return this.renderComponentDrawer(cmp[1], cmp[2]);
    const el = this.findElement(ref.id);
    const close = () => (this._drawer = null);
    const title = (el?.name as string) ?? (el?.label as string) ?? ref.id;
    const canRename = el != null && (ref.kind === 'field' || RENAMEABLE_KINDS.has(ref.kind));
    const commit = (value: string): void => {
      const name = value.trim();
      if (name && name !== title) this.renameElement(ref.id, ref.kind, name);
    };
    return html`
      <div class="drawer-backdrop" @pointerdown=${close}></div>
      <aside class="drawer" @pointerdown=${(e: Event) => e.stopPropagation()}>
        <header class="drawer-head">
          <div class="drawer-head-text">
            <div class="drawer-type">${drawerTypeLabel(ref.elementType)}</div>
            ${canRename
              ? html`<input
                  class="drawer-title-input"
                  .value=${title}
                  aria-label="Nombre"
                  @keydown=${(e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    } else if (e.key === 'Escape') {
                      e.stopPropagation();
                      close();
                    }
                  }}
                  @change=${(e: Event) => commit((e.target as HTMLInputElement).value)}
                />`
              : html`<div class="drawer-title">${title}</div>`}
          </div>
          <button class="drawer-close" title="Cerrar (Esc)" @click=${close}>✕</button>
        </header>
        ${el
          ? html`<dl class="drawer-body">
              ${this.drawerRows(el).map(
                (r) => html`<dt>${r.label}</dt>
                  <dd>${r.value}</dd>`,
              )}
            </dl>`
          : html`<div class="drawer-empty">Este elemento ya no está en el modelo.</div>`}
      </aside>
    `;
  }

  /** Find a component by id anywhere in a mockup's content tree. */
  private mockupComponent(mockupId: string, componentId: string): UiComponentNodeRef | null {
    return this.mockupComponentIn(mockupId, componentId)?.node ?? null;
  }

  /** A component in a mockup, plus the id of its parent component (null at top level). */
  private mockupComponentIn(
    mockupId: string, componentId: string,
  ): { node: UiComponentNodeRef; parentId: string | null } | null {
    const mk = (this.model.mockups ?? []).find((m) => m.id === mockupId);
    let found: { node: UiComponentNodeRef; parentId: string | null } | null = null;
    const walk = (items: UiComponentNodeRef[] | undefined, up: string | null) => {
      for (const c of items ?? []) {
        if (c.id === componentId) found = { node: c, parentId: up };
        walk(c.children, c.id);
      }
    };
    walk(mk?.content, null);
    return found;
  }

  /**
   * The config of a mockup component, editable in the drawer. `set-page-component` REPLACES every
   * field, so each edit resends the component's whole current config with the one change applied.
   */
  private renderComponentDrawer(mockupId: string, componentId: string) {
    const close = () => (this._drawer = null);
    const c = this.mockupComponent(mockupId, componentId);
    if (!c) {
      return html`
        <div class="drawer-backdrop" @pointerdown=${close}></div>
        <aside class="drawer" @pointerdown=${(e: Event) => e.stopPropagation()}>
          <header class="drawer-head">
            <div class="drawer-head-text"><div class="drawer-type">Componente</div></div>
            <button class="drawer-close" title="Cerrar (Esc)" @click=${close}>✕</button>
          </header>
          <div class="drawer-empty">Este componente ya no está en el mockup.</div>
        </aside>`;
    }
    const set = (patch: { title?: string | null; label?: string | null; text?: string | null }): void => {
      this.command({
        kind: 'set-page-component', mockupId, componentId,
        title: c.title ?? null, text: c.text ?? null, label: c.label ?? null,
        useCaseId: c.useCaseId ?? null, mappingId: c.mappingId ?? null, modelId: c.modelId ?? null,
        queryServiceId: c.queryServiceId ?? null, queryOperationId: c.queryOperationId ?? null,
        fieldId: c.fieldId ?? null, stereotype: c.stereotype ?? null,
        colspan: c.colspan ?? null, detailPageId: c.detailPageId ?? null,
        ...patch,
      });
    };
    const field = (label: string, key: 'title' | 'label' | 'text') => html`
      <dt>${label}</dt>
      <dd><input class="drawer-cfg" .value=${(c[key] as string) ?? ''}
        @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        @change=${(e: Event) => set({ [key]: (e.target as HTMLInputElement).value.trim() || null })}
      /></dd>`;
    return html`
      <div class="drawer-backdrop" @pointerdown=${close}></div>
      <aside class="drawer" @pointerdown=${(e: Event) => e.stopPropagation()}>
        <header class="drawer-head">
          <div class="drawer-head-text">
            <div class="drawer-type">Componente · ${c.kind}</div>
            <div class="drawer-title">${c.title || c.label || c.kind}</div>
          </div>
          <button class="drawer-close" title="Cerrar (Esc)" @click=${close}>✕</button>
        </header>
        <dl class="drawer-body">
          ${field('Título', 'title')}
          ${field('Etiqueta', 'label')}
          ${field('Texto', 'text')}
          ${c.useCaseId ? html`<dt>Caso de uso</dt><dd>${c.useCaseId}</dd>` : ''}
          ${c.modelId ? html`<dt>Modelo</dt><dd>${c.modelId}</dd>` : ''}
          ${c.fieldId ? html`<dt>Campo</dt><dd>${c.fieldId}</dd>` : ''}
        </dl>
      </aside>
    `;
  }

  /** The scalar/summary rows shown for an element, in declaration order, minus id/name/noise. */
  private drawerRows(el: Record<string, unknown>): { label: string; value: string }[] {
    const HIDDEN = new Set(['id', 'name', 'label']);
    const rows: { label: string; value: string }[] = [];
    for (const key of Object.keys(el)) {
      if (HIDDEN.has(key)) continue;
      const v = el[key];
      if (v === null || v === undefined || v === '') continue;
      let value: string;
      if (Array.isArray(v)) {
        if (v.length === 0) continue;
        const names = v
          .map((it) =>
            it && typeof it === 'object'
              ? ((it as Record<string, unknown>).name ?? (it as Record<string, unknown>).label)
              : it,
          )
          .filter((n): n is string => typeof n === 'string');
        value =
          names.length === v.length
            ? names.join(', ')
            : `${v.length} elemento${v.length === 1 ? '' : 's'}`;
      } else if (typeof v === 'object') {
        const o = v as Record<string, unknown>;
        value = (o.name as string) ?? (o.label as string) ?? (o.id as string) ?? '—';
      } else if (typeof v === 'boolean') {
        value = v ? 'sí' : 'no';
      } else {
        value = String(v);
      }
      rows.push({ label: humanizeKey(key), value });
    }
    return rows;
  }

  private renderPalette() {
    if (!this._paletteOpen || !['context-map', 'distribution', 'workflows', 'ui', 'mappings', 'integrations', 'aggregates'].includes(this._view)) return '';
    const needle = this._paletteFilter.trim().toLowerCase();
    // The workflows view only creates workflow things; everything else is context-map.
    const news = PALETTE_NEW.filter(
      (k) =>
        (this._view === 'aggregates'
          ? ['entity', 'value-object', 'invariant', 'field', 'operation'].includes(k.type)
          : this._view === 'workflows'
          ? ['workflow', 'workflow-step', 'workflow-join', 'workflow-split'].includes(k.type)
          : this._view === 'ui'
            ? ['ui', 'ui-app', 'ui-app-orchestrator', 'ui-app-masterdetail', 'ui-app-vieweditor', 'page', 'ui-page-crud', 'ui-page-wizard', 'ui-wizard-step', 'menu-item', 'ui-model', 'identity-provider', 'custom-code', 'button-group', 'ui-button'].includes(k.type)
            : this._view === 'integrations'
                ? ['etl-flow', 'etl-transform', 'external-system', 'external-table'].includes(k.type)
              : this._view === 'mappings'
                ? ['ui-model', 'model-field', 'transformation', 'custom-code'].includes(k.type)
                : !['page', 'menu-item', 'model-field', 'transformation', 'ui-button'].includes(k.type)) &&
        (!needle || k.label.toLowerCase().includes(needle)),
    );
    // The workflows view has no catalog section: it always shows the new elements.
    const tab = this._view === 'workflows' ? 'new' : this._paletteTab;
    return html`
      <div class="palette ${!this._tilt && this._treeOpen && this._activeViewId ? 'shifted' : ''}">
        <div class="palette-body">
          <input
            class="palette-filter"
            placeholder="Filtrar…"
            .value=${this._paletteFilter}
            @input=${(e: Event) => (this._paletteFilter = (e.target as HTMLInputElement).value)}
          />
          ${tab === 'new'
            ? html`
                <div class="palette-h">Nuevos — arrastra al lienzo${''}</div>
                ${PALETTE_GROUPS.map((g) => {
                  const items = news.filter((k) => k.group === g);
                  return items.length
                    ? html`
                        <div class="palette-g">${g}</div>
                        ${items.map(
                          (k) => html`
                            <div
                              class="palette-item ${k.child ? 'palette-child' : ''}"
                              title=${k.type === 'workflow-step'
                                ? 'Suéltalo sobre un workflow — o sobre uno de sus pasos para encadenarlo'
                                : k.child
                                  ? 'Suéltalo sobre su contenedor (contexto, sistema externo o API)'
                                  : 'Suéltalo en el lienzo'}
                              @pointerdown=${(e: PointerEvent) =>
                                this.startPaletteDrag(e, { new: k.type }, k.label.replace(/^(Layout|Componente) · /, ''))}
                            >
                              <svg class="pal-ico" viewBox="0 0 12 12" style="color: ${k.color}">
                                ${SYMBOLS[k.symbol]}
                              </svg>
                              <span class="pal-label">${k.label.replace(/^(Layout|Componente) · /, '')}</span>
                            </div>
                          `,
                        )}
                      `
                    : '';
                })}
              `
            : html`
                <div class="palette-h">Catálogo — arrastra para colocar o conectar</div>
                ${this.paletteCatalog().map(
                  (g) => html`
                    <div class="palette-g">${g.label}</div>
                    ${g.items.map(
                      (it) => html`
                        <div
                          class="palette-item"
                          title="Suéltalo en el lienzo para colocarlo, o sobre un nodo para conectarlo"
                          @pointerdown=${(e: PointerEvent) =>
                            this.startPaletteDrag(e, { existing: it.id }, it.name)}
                        >
                          <svg class="pal-ico" viewBox="0 0 12 12" style="color: ${g.color}">
                            ${SYMBOLS[g.symbol]}
                          </svg>
                          <span class="pal-label">${it.name}</span>
                        </div>
                      `,
                    )}
                  `,
                )}
              `}
        </div>
        ${this._view === 'workflows'
          ? ''
          : html`
              <div class="palette-side">
                <button
                  class="palette-vtab"
                  ?data-active=${tab === 'new'}
                  title="Elementos nuevos para arrastrar al lienzo"
                  @click=${() => (this._paletteTab = 'new')}
                >
                  Nuevos
                </button>
                <button
                  class="palette-vtab"
                  ?data-active=${tab === 'catalog'}
                  title="El catálogo del modelo: colocar o conectar elementos existentes"
                  @click=${() => (this._paletteTab = 'catalog')}
                >
                  Catálogo
                </button>
              </div>
            `}
      </div>
    `;
  }

  private sceneFor(view: ViewId, opts?: { expandAll?: boolean }) {
    const vl = this.viewLayout(view);
    const model = this.filteredModel();
    const expandAll = opts?.expandAll ?? false;
    // Roll-up ownership is built over the WHOLE model, not the scoped one: a scoped view drops the
    // API/component nodes a lower-level relation runs between, so the re-anchor needs their homes
    // from the full model to surface that relation between the visible members. Only worth it when
    // the view is actually scoped — the base canvas shows everything, nothing to roll up.
    const rollup = this._activeViewId
      ? rollupOwnershipIndex(this.model, this._canvasMode === 'distribution' ? 'distribution' : 'unified')
      : undefined;
    const scene =
      view === 'aggregates'
        ? aggregatesScene(model, vl.nodes)
        : view === 'flows'
          ? flowsScene(model, vl.nodes)
          : view === 'processes'
            ? processesScene(model, vl.nodes)
            : view === 'workflows'
              ? workflowsScene(model, vl.nodes, new Set(vl.expanded ?? []), expandAll)
              : view === 'ui'
                ? uiScene(model, vl.nodes, new Set(vl.expanded ?? []), expandAll)
              : view === 'integrations'
                ? integrationsScene(model, vl.nodes)
              : view === 'mappings'
                ? mappingsScene(model, vl.nodes)
                : view === 'eventstorming'
                  ? eventstormingScene(model, vl.nodes, new Set(vl.expanded ?? []), expandAll)
                : view === 'distribution'
                  ? distributionScene(model, vl.nodes, vl.sizes ?? {}, new Set(vl.expanded ?? []), expandAll, rollup)
                // The unified canvas renders in the mode the toolbar toggles chose.
                : view === 'context-map' && this._canvasMode === 'eventstorming'
                  ? eventstormingScene(model, vl.nodes, new Set(vl.expanded ?? []), expandAll)
                : view === 'context-map' && this._canvasMode === 'distribution'
                  ? distributionScene(model, vl.nodes, vl.sizes ?? {}, new Set(vl.expanded ?? []), expandAll, rollup)
                : contextMapScene(model, vl.nodes, vl.sizes ?? {}, new Set(vl.expanded ?? []), expandAll, rollup);
    this.withAreas(scene, view);
    this.withNotes(scene, view);
    this.withDescriptions(scene);
    // On a solution, ring what differs from the system (node ids carry view prefixes).
    if (this.diff) {
      for (const node of scene.nodes) {
        const kind = this.diff[node.id] ?? this.diff[node.id.replace(/^(tgt:|flow:)/, '')];
        if (kind) node.diffKind = kind;
      }
    }
    // Machine-made stubs (actor/page derivations) get the ✦ mark; the
    // «Inferidos» toggle can hide them from the diagram altogether.
    const marked = markDerived(scene, derivedElementIds(model));
    return this._showDerived ? marked : hideDerived(marked);
  }

  /**
   * The area layer, per view: an area shows only in the view where it was dropped (its
   * rectangle is that view's layout). It renders BEHIND everything — a named frame whose
   * membership is geometric — and anchors note threads like any other element.
   */
  /**
   * Append each element's description (edited in its ficha) to its node tooltip,
   * so it shows on hover. Node ids may carry a view prefix; the descriptions map
   * is keyed by the raw element id.
   */
  private withDescriptions(scene: Scene): void {
    const descs = this.model.descriptions;
    if (!descs) return;
    for (const node of scene.nodes) {
      const d = descs[node.id] ?? descs[node.id.replace(/^(tgt:|flow:)/, '')];
      if (d) node.tooltip = node.tooltip ? `${node.tooltip}\n\n${d}` : d;
    }
  }

  private withAreas(scene: Scene, view: ViewId): void {
    const areas = this.model.areas ?? [];
    if (!areas.length) return;
    const vl = this.viewLayout(view);
    const sizes = vl.sizes ?? {};
    for (const area of areas) {
      const placed = vl.nodes[area.id];
      if (!placed) continue;
      // Bare rectangle: no title, no glyph — the name lives in the tooltip (and F2 edits it).
      scene.nodes.unshift({
        id: area.id,
        label: area.name,
        kind: 'area',
        x: placed.x,
        y: placed.y,
        w: sizes[area.id]?.w ?? 340,
        h: sizes[area.id]?.h ?? 220,
        fill: 'rgba(148, 163, 184, 0.07)',
        stroke: '#94a3b8',
        dashed: true,
        tooltip: area.name,
        resizable: true,
      });
    }
  }

  /**
   * The sticky-note layer, view-independent: a note shows wherever it was dropped (it
   * has a position in that view's layout) and wherever one of its targets is visible —
   * annotations follow their subject across views. Dashed amber threads tie the note to
   * each visible target; a thread to a RELATION anchors at that edge's midpoint (the
   * canvas resolves the `edgeanchor:` pseudo-target).
   */
  private withNotes(scene: Scene, view: ViewId): void {
    const notes = this.model.notes ?? [];
    if (!notes.length) return;
    const vl = this.viewLayout(view);
    const nodeIds = new Set(scene.nodes.map((n) => n.id));
    const edgeIds = new Set(scene.edges.map((e) => e.id));
    const sizes = vl.sizes ?? {};
    for (const note of notes) {
      const placed = vl.nodes[note.id];
      const resolveTarget = (t: string): string | null =>
        nodeIds.has(t) ? t : nodeIds.has(`tgt:${t}`) ? `tgt:${t}` : nodeIds.has(`flow:${t}`) ? `flow:${t}` : null;
      const targets = (note.targetIds ?? [])
        .map((t) => ({ raw: t, nodeId: resolveTarget(t) }))
        .filter((t): t is { raw: string; nodeId: string } => !!t.nodeId);
      const edgeTargets = (note.edgeRefs ?? []).filter((r) => edgeIds.has(r));
      if (!placed && !targets.length && !edgeTargets.length) continue;
      const anchor = targets.length ? scene.nodes.find((n) => n.id === targets[0].nodeId) : undefined;
      const pos = placed ?? { x: (anchor?.x ?? 0) + 40, y: (anchor?.y ?? 0) - 110 };
      scene.nodes.push({
        id: note.id,
        label: note.text,
        kind: 'note',
        x: pos.x,
        y: pos.y,
        w: sizes[note.id]?.w ?? 150,
        h: sizes[note.id]?.h ?? 72,
        fill: '#fef9c3',
        symbol: 'note',
        resizable: true,
      });
      for (const t of targets) {
        scene.edges.push({
          id: `note:${note.id}->${t.raw}`,
          sourceId: note.id,
          targetId: t.nodeId,
          kind: 'note-link',
          dashed: true,
          color: '#ca8a04',
        });
      }
      for (const r of edgeTargets) {
        scene.edges.push({
          id: `note:${note.id}->${r}`,
          sourceId: note.id,
          targetId: `edgeanchor:${r}`,
          kind: 'note-link',
          dashed: true,
          color: '#ca8a04',
        });
      }
    }
  }

  /** Screen space the overlays occupy on the left — fit() centers in what remains. */
  private fitInsets(): { left: number } {
    const paletteVisible =
      this._paletteOpen && ['context-map', 'distribution', 'workflows', 'ui', 'aggregates'].includes(this._view);
    const treeVisible = this._treeOpen && !!this._activeViewId;
    // Geometry mirrors the CSS: tree at 8+264, palette 244 wide (shifted past the tree).
    if (treeVisible && paletteVisible) return { left: 280 + 244 + 8 };
    if (treeVisible) return { left: 8 + 264 + 8 };
    if (paletteVisible) return { left: 8 + 244 + 8 };
    return { left: 0 };
  }

  /**
   * Relayout for the current view, applied as ONE undoable composite move. ELK
   * places the nodes and routes the edges orthogonally; map-like views pass one
   * lane per semantic rank so the left→right meaning is preserved.
   *
   * With a selection, the layout is SCOPED to it: only the selected top-level
   * nodes are rearranged, kept in place (their centroid doesn't move) so the rest
   * of the diagram stays put. With nothing selected, the whole view is relaid.
   */
  private async runAutoLayout(opts?: { initial?: boolean }): Promise<void> {
    const initial = opts?.initial ?? false;
    const view = this._view;
    const key = this.layoutKey(view);
    const scene = this.sceneFor(view);
    if (!scene.nodes.length) return;
    // Nested children (aggregates/use cases) are derived from their container's
    // position, so only top-level nodes take part in the layout. Areas are frames:
    // the layout ignores them (they stay where their author framed them).
    const topNodes = layoutableNodes(scene);
    // The initial layout arranges the whole sheet, whatever happens to be selected.
    const selection = initial ? [] : this._multi.length ? this._multi : this._selectedId ? [this._selectedId] : [];
    const scoped = selection.length > 0;
    const selSet = new Set(selection);
    const layoutNodes = scoped ? topNodes.filter((n) => selSet.has(n.id)) : topNodes;
    if (layoutNodes.length < 2) return; // nothing to arrange (or a selection of edges/children)
    const ids = new Set(layoutNodes.map((n) => n.id));
    const layoutScene = {
      nodes: layoutNodes,
      edges: scene.edges.filter((e) => ids.has(e.sourceId) && ids.has(e.targetId)),
    };
    const isPipeline =
      view === 'flows' || view === 'processes' || view === 'workflows' || view === 'eventstorming';
    // ELK does the placement AND the orthogonal edge routing for every view, so
    // the lines come out horizontal/vertical without overlapping or crossing a
    // box. Pipeline views let ELK layer freely; map-like views hand it one lane
    // per semantic rank (derived from the canonical lane layout) so the left→
    // right meaning — driving side, domain, driven side — is preserved.
    const partitions = isPipeline ? undefined : semanticPartitions(semanticLayout(layoutScene));
    const result = await autoLayout(layoutScene, partitions ? { partitions } : undefined);
    // ELK is asynchronous: the user may have switched views, or placed a box, meanwhile.
    if (initial && (this._view !== view || this.layoutKey(view) !== key
        || !needsInitialLayout(this.sceneFor(view), this.viewLayout(view)))) return;
    const current = this.viewLayout(view);

    // A scoped layout keeps the selection where it is: translate ELK's output so
    // its centroid matches the selection's current centroid.
    if (scoped) {
      let ox = 0;
      let oy = 0;
      let nx = 0;
      let ny = 0;
      for (const n of layoutNodes) {
        const cur = current.nodes[n.id] ?? { x: n.x, y: n.y };
        ox += cur.x;
        oy += cur.y;
        nx += result.nodes[n.id].x;
        ny += result.nodes[n.id].y;
      }
      const k = layoutNodes.length;
      const dx = (ox - nx) / k;
      const dy = (oy - ny) / k;
      for (const id of Object.keys(result.nodes)) {
        result.nodes[id] = { x: result.nodes[id].x + dx, y: result.nodes[id].y + dy };
      }
      for (const id of Object.keys(result.edges)) {
        result.edges[id] = result.edges[id].map((p) => ({ x: p.x + dx, y: p.y + dy }));
      }
    }

    // Every edge touching the moved nodes loses its now-stale stored route:
    // wholly-inside ones get ELK's fresh route (or, when ELK left them straight,
    // the canvas draws them clean); boundary ones re-route live from the moved
    // endpoint. Without clearing them, an inside edge ELK routed straight would
    // keep the OLD bends and render diagonal. Everything else is left alone.
    const internalEdgeIds = scoped ? layoutScene.edges.map((e) => e.id) : [];
    const boundaryEdgeIds = scoped
      ? scene.edges.filter((e) => ids.has(e.sourceId) !== ids.has(e.targetId)).map((e) => e.id)
      : [];
    const changedEdgeIds = scoped
      ? [...new Set([...internalEdgeIds, ...boundaryEdgeIds])]
      : Object.keys(current.edges);

    // The initial layout is where the view starts, not a step the user took: nothing to undo.
    if (!initial) this.pushUndoEntry([
      ...layoutNodes.map((n) => ({
        kind: 'move-node' as const,
        view,
        id: n.id,
        pos: current.nodes[n.id] ?? null,
      })),
      // relayout rewrites these routes — restore the previous bends on undo
      ...changedEdgeIds.map((edgeId) => ({
        kind: 'set-edge-points' as const,
        view,
        id: edgeId,
        points: current.edges[edgeId] ?? null,
      })),
    ]);

    // Keep container sizes AND the expansion state: auto-layout redistributes,
    // it never folds.
    if (scoped) {
      const nodes = { ...current.nodes };
      for (const n of layoutNodes) nodes[n.id] = result.nodes[n.id];
      const edges = { ...current.edges };
      for (const id of internalEdgeIds) delete edges[id]; // drop stale routes first
      Object.assign(edges, result.edges); // then ELK's fresh ones (bended edges only)
      for (const id of boundaryEdgeIds) delete edges[id];
      this.writeViewLayout(view, { ...current, nodes, edges });
    } else {
      this.writeViewLayout(view, { ...current, nodes: result.nodes, edges: result.edges });
    }
    await this.updateComplete;
    // A full relayout re-fits; a scoped one keeps the user's viewport.
    if (!scoped) this.renderRoot.querySelector('modux-canvas')?.fit();
  }

  /**
   * Re-route the edges on the CURRENT node positions without moving anything —
   * the companion to auto-layout for when you've placed the nodes yourself and
   * only the lines look stale. It simply drops the stored routes so the canvas
   * re-draws each edge fresh (orthogonal, around the boxes) and, from then on,
   * live — the routes follow later drags instead of freezing again. With a
   * selection it only touches the lines of the selected nodes. Undoable.
   */
  private runRerouteEdges(): void {
    const view = this._view;
    const current = this.viewLayout(view);
    const stored = Object.keys(current.edges);
    if (!stored.length) return; // nothing frozen — the canvas already routes live
    const selection = this._multi.length ? this._multi : this._selectedId ? [this._selectedId] : [];
    let targetIds = stored;
    if (selection.length) {
      const sel = new Set(selection);
      const touches = new Set(
        this.sceneFor(view)
          .edges.filter((e) => sel.has(e.sourceId) || sel.has(e.targetId))
          .map((e) => e.id),
      );
      targetIds = stored.filter((id) => touches.has(id));
    }
    if (!targetIds.length) return;
    this.pushUndoEntry(
      targetIds.map((id) => ({
        kind: 'set-edge-points' as const,
        view,
        id,
        points: current.edges[id],
      })),
    );
    const edges = { ...current.edges };
    for (const id of targetIds) delete edges[id];
    this.writeViewLayout(view, { ...current, edges });
  }

  /**
   * Line up the selected top-level nodes on a shared axis: `'row'` gives them a
   * common Y (a horizontal row), `'column'` a common X (a vertical column). The
   * shared value is the selection's centroid, so the group stays put on average
   * and moves the least. Lines of the moved nodes re-route clean on the new
   * positions. One undoable step; needs at least two nodes.
   */
  private alignSelection(axis: 'row' | 'column'): void {
    const view = this._view;
    const selection = this._multi.length ? this._multi : this._selectedId ? [this._selectedId] : [];
    const sel = new Set(selection);
    const nodes = this.sceneFor(view).nodes.filter(
      (n) => sel.has(n.id) && !n.parentId && n.kind !== 'area',
    );
    if (nodes.length < 2) return;
    const current = this.viewLayout(view);
    const posOf = (n: SceneNode) => current.nodes[n.id] ?? { x: n.x, y: n.y };
    const key = axis === 'row' ? 'y' : 'x';
    const target = nodes.reduce((s, n) => s + posOf(n)[key], 0) / nodes.length;
    const ids = new Set(nodes.map((n) => n.id));
    const affectedEdges = this.sceneFor(view)
      .edges.filter((e) => ids.has(e.sourceId) || ids.has(e.targetId))
      .map((e) => e.id)
      .filter((id) => current.edges[id]);
    this.pushUndoEntry([
      ...nodes.map((n) => ({ kind: 'move-node' as const, view, id: n.id, pos: current.nodes[n.id] ?? null })),
      ...affectedEdges.map((id) => ({ kind: 'set-edge-points' as const, view, id, points: current.edges[id] })),
    ]);
    const newNodes = { ...current.nodes };
    for (const n of nodes) {
      const p = posOf(n);
      newNodes[n.id] = key === 'y' ? { x: p.x, y: target } : { x: target, y: p.y };
    }
    const edges = { ...current.edges };
    for (const id of affectedEdges) delete edges[id]; // re-route on the aligned positions
    this.writeViewLayout(view, { ...current, nodes: newNodes, edges });
  }

  /**
   * Toolbar controls keep keyboard focus after use, so the next space bar
   * reopens the select (or re-fires the button) instead of panning the canvas.
   * Once a select changes or a button is clicked, the keyboard belongs to the
   * canvas again; text inputs keep focus (the user is typing).
   */
  private refocusCanvasAfterControl(e: Event): void {
    const target = e.target as HTMLElement;
    const isSelectChange = e.type === 'change' && target instanceof HTMLSelectElement;
    const isButtonClick = e.type === 'click' && !!target.closest('button');
    if (!isSelectChange && !isButtonClick) return;
    (this.renderRoot.querySelector('modux-canvas') as HTMLElement | null)?.focus();
  }

  render() {
    const scene = this.sceneFor(this._view);
    return html`
      ${this.renderPaletteGhost()}
      <div class="toolbar"
           @change=${this.refocusCanvasAfterControl}
           @click=${this.refocusCanvasAfterControl}>
        <span
          class="brand"
          title="Editor gráfico — context map, agregados, flows, procesos y eventstorming sobre lienzo editable; los cambios se guardan en el modelo"
        >Editor gráfico</span>
        <button
          class="tab hamburger"
          ?hidden=${!['context-map', 'distribution', 'workflows', 'ui', 'mappings', 'integrations', 'aggregates'].includes(this._view)}
          ?data-active=${this._paletteOpen}
          title="Paleta de elementos: arrastra nuevos o existentes al lienzo (P)"
          @click=${() => (this._paletteOpen = !this._paletteOpen)}
        >
          ☰
        </button>
        ${this._activeViewId
          ? html`
              <button
                class="tab"
                ?data-active=${this._treeOpen}
                title="Árbol del catálogo: marca qué elementos pertenecen a la vista (sin borrar nada del proyecto)"
                @click=${() => (this._treeOpen = !this._treeOpen)}
              >
                ☰ Árbol
              </button>
            `
          : ''}
        <div class="spacer"></div>
        ${this.viewSelection().length ||
        (!this._activeViewId && (this._view === 'context-map' || this._view === 'distribution'))
          ? html`
              <input
                class="new-name"
                placeholder="Nombre de la vista…"
                title=${this.viewSelection().length
                  ? 'Crear una vista modux con la selección'
                  : 'Crear una vista modux vacía — luego añades elementos soltándolos o desde el árbol'}
                .value=${this._newViewName}
                @input=${(e: Event) => (this._newViewName = (e.target as HTMLInputElement).value)}
                @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.createViewFromSelection()}
              />
              <button
                class="tab"
                title=${this.viewSelection().length
                  ? 'Crear una vista modux con la selección'
                  : 'Crear una vista modux vacía — luego añades elementos soltándolos o desde el árbol'}
                @click=${this.createViewFromSelection}
              >
                ⊞ Vista${this.viewSelection().length ? ` (${this.viewSelection().length})` : ''}
              </button>
              <span class="sep"></span>
            `
          : ''}
        <input
          class="import-api-file"
          type="file"
          hidden
          accept=".json,.yaml,.yml,.wsdl,.xml"
          @change=${this.onImportApiFile}
        />
        <button
          class="tab"
          ?hidden=${this._view !== 'context-map'}
          title=${this.selectedApiId()
            ? 'Importa un OpenAPI/WSDL sobre la API seleccionada (operaciones y modelos rq/rs)'
            : 'Importa un OpenAPI/WSDL como una nueva API del diagrama'}
          @click=${() =>
            (this.renderRoot.querySelector('input.import-api-file') as HTMLInputElement | null)?.click()}
        >
          ⇪ Importar API${this.selectedApiId() ? ' aquí' : '…'}
        </button>
        ${this._view === 'context-map' &&
        this._selectedId &&
        (this.model.rags ?? []).some((r) => r.id === this._selectedId)
          ? html`
              <span class="sep"></span>
              <select
                title="Tipo de fuente de contenido del RAG"
                @change=${(e: Event) =>
                  (this._newRagSourceType = (e.target as HTMLSelectElement).value)}
              >
                ${['WEB', 'REPO', 'FTP', 'DATABASE', 'BUCKET', 'SHAREPOINT', 'CONFLUENCE', 'DRIVE', 'FILESYSTEM', 'TICKETING', 'CRM'].map(
                  (t) =>
                    html`<option value=${t} ?selected=${t === this._newRagSourceType}>${t}</option>`,
                )}
              </select>
              <input
                class="new-name"
                placeholder="URI de la fuente…"
                title="La fuente que alimenta el RAG: repo, web, FTP, base de datos, bucket, SharePoint, Confluence, Drive o sistema de ficheros"
                .value=${this._newRagSourceUri}
                @input=${(e: Event) =>
                  (this._newRagSourceUri = (e.target as HTMLInputElement).value)}
                @keydown=${(e: KeyboardEvent) =>
                  e.key === 'Enter' && this.addRagContentSourceFromToolbar()}
              />
              <button
                class="tab"
                title="Añadir la fuente de contenido al RAG seleccionado"
                @click=${this.addRagContentSourceFromToolbar}
              >
                ＋ Fuente
              </button>
            `
          : ''}
        <button
          class="tab"
          title="Ajustar la vista a la selección (o a todo el diagrama, si no hay selección)"
          @click=${() => {
            this.renderRoot.querySelector('modux-canvas')?.fit();
            this.renderRoot.querySelector('modux-explorer')?.fit();
          }}
        >
          ⌖ Ajustar
        </button>
        <button
          class="tab"
          title="Alejar (tecla −)"
          ?disabled=${this._yugo}
          @click=${() => this.renderRoot.querySelector('modux-canvas')?.zoomBy(1 / 1.25)}
        >
          −
        </button>
        <button
          class="tab"
          title="Acercar (tecla +)"
          ?disabled=${this._yugo}
          @click=${() => this.renderRoot.querySelector('modux-canvas')?.zoomBy(1.25)}
        >
          +
        </button>
        <button
          class="tab"
          title=${this._multi.length >= 2
            ? `Recoloca solo los ${this._multi.length} elementos seleccionados (deshacible)`
            : 'Recoloca todo el diagrama automáticamente — o solo la selección si la hay (deshacible)'}
          ?disabled=${this._yugo}
          @click=${() => void this.runAutoLayout()}
        >
          ✨ Auto-layout${this._multi.length >= 2 ? ` (${this._multi.length})` : ''}
        </button>
        <button
          class="tab"
          title=${this.viewSelection().length
            ? 'Recalcula solo las líneas de la selección sobre las posiciones actuales, sin mover los nodos (deshacible)'
            : 'Recalcula todas las líneas sobre las posiciones actuales, sin mover los nodos (deshacible)'}
          ?disabled=${this._yugo}
          @click=${() => this.runRerouteEdges()}
        >
          ↻ Líneas
        </button>
        ${this._multi.length >= 2 && !this._yugo
          ? html`
              <button
                class="tab"
                title="Alinear los seleccionados en una fila (misma altura)"
                @click=${() => this.alignSelection('row')}
              >
                ↔ Alinear
              </button>
              <button
                class="tab"
                title="Alinear los seleccionados en una columna (misma vertical)"
                @click=${() => this.alignSelection('column')}
              >
                ↕ Alinear
              </button>
            `
          : ''}
        ${this._view === 'workflows'
          && ((this.model.processes ?? []).length || (this.model.sagas ?? []).length)
          ? html`<button
              class="tab"
              title="Procesos y sagas se fusionan en workflows: cadena lineal con rol, plazo y compensación en cada paso"
              @click=${() => {
                if ((this.model.processes ?? []).length) {
                  this.command({ kind: 'migrate-processes-to-workflows' }, false);
                }
                if ((this.model.sagas ?? []).length) {
                  this.command({ kind: 'migrate-sagas-to-workflows' }, false);
                }
              }}
            >
              ⇪ Migrar ${[
                (this.model.processes ?? []).length
                  ? `${(this.model.processes ?? []).length} procesos` : '',
                (this.model.sagas ?? []).length
                  ? `${(this.model.sagas ?? []).length} sagas` : '',
              ].filter(Boolean).join(' y ')}
            </button>`
          : ''}
        <button
          class="tab"
          ?data-active=${this._tilt}
          title=${this._tilt
            ? 'Volver al lienzo editable (V)'
            : 'Vista 3D: el diagrama como placas apiladas por contención (V)'}
          @click=${() => {
            this._tilt = !this._tilt;
            if (this._tilt) this._yugo = false;
          }}
        >
          ⬦ 3D
        </button>
        <button
          class="tab"
          ?data-active=${this._yugo}
          title=${this._yugo
            ? 'Volver al lienzo editable (Y)'
            : 'Superficie yugo: la vista como organismo físico — click expande, shift+arrastrar relaciona (Y)'}
          @click=${() => {
            this._yugo = !this._yugo;
            if (this._yugo) this._tilt = false;
          }}
        >
          ∿ Yugo
        </button>
        <button
          class="tab"
          ?data-active=${!this._showDerived}
          title=${this._showDerived
            ? 'Ocultar los elementos inferidos (stubs generados por el sistema, marcados ✦)'
            : 'Mostrar los elementos inferidos (stubs generados por el sistema, marcados ✦)'}
          @click=${() => (this._showDerived = !this._showDerived)}
        >
          ✦ Inferidos: ${this._showDerived ? 'visibles' : 'ocultos'}
        </button>
        <button
          class="tab"
          ?data-active=${this._fullscreen}
          title=${this._fullscreen
            ? 'Salir de pantalla completa (F o Esc)'
            : 'El diagrama a pantalla completa (F)'}
          @click=${() => void this.toggleFullscreen()}
        >
          ⛶
        </button>
        <button
          class="tab"
          ?data-active=${this._helpOpen}
          title="Atajos de teclado y gestos (?)"
          @click=${() => (this._helpOpen = !this._helpOpen)}
        >
          ?
        </button>
      </div>
      <div class="canvas-wrap">
      ${this._yugo
        ? html`${this.renderPalette()}<modux-explorer
            class="yugo"
            .scene=${this.sceneFor(this._view, { expandAll: true })}
            .sceneKey=${`${this._view}:${this._activeViewId || 'base'}`}
            ?shifted=${this._paletteOpen}
            @delete-requested=${this.onDeleteRequested}
            @delete-selection-requested=${this.onDeleteSelectionRequested}
            @node-renamed=${this.onNodeRenamed}
            @undo-requested=${this.undo}
            @redo-requested=${this.redo}
            @node-activated=${(e: CustomEvent<{ id: string; kind: string }>) => {
              this.onElementActivated(new CustomEvent('element-activated', {
                detail: { elementType: 'node', id: e.detail.id, kind: e.detail.kind },
              }));
            }}
            @explorer-connect=${(e: CustomEvent<{ sourceId: string; targetId: string; x?: number; y?: number }>) => {
              // the lines mean whatever the ACTIVE view says they mean — including
              // context⇆context, which asks the DDD type at the drop point
              this.applyConnection(e.detail.sourceId, e.detail.targetId, e.detail.x, e.detail.y);
            }}
            @explorer-create-view=${(e: CustomEvent<{ name: string; members: { id: string; kind: string }[] }>) => {
              // Members are the VIEW-able kinds; finer elements ride along with
              // their (also visible) owning container, like in canvas selections.
              const MEMBER_KINDS = new Set([
                'boundedContext', 'system', 'external-system', 'aggregate', 'entity', 'process', 'workflow',
                'actor', 'ai-agent', 'rag', 'mcp-gateway', 'api', 'page', 'ui-app',
              ]);
              const memberIds = [...new Set(
                e.detail.members.filter((m) => MEMBER_KINDS.has(m.kind)).map((m) => m.id),
              )];
              if (!memberIds.length) {
                this.emit('modux-notice', { message: 'Despliega algo antes de crear la vista' });
                return;
              }
              const id = crypto.randomUUID();
              this.command({ kind: 'add-view', id, name: e.detail.name, memberIds });
              this.afterViewCreated(id, e.detail.name, memberIds);
              this.emit('modux-notice', {
                message: `Vista «${e.detail.name}» creada con lo desplegado (${memberIds.length} miembros)`,
              });
            }}
          ></modux-explorer>`
        : this._tilt
        ? html`
      ${this.renderPalette()}
      <modux-tilt
            .scene=${scene}
            .selectedId=${this._selectedId}
            .connectable=${['context-map', 'distribution', 'workflows', 'ui'].includes(this._view)}
            @connect-requested=${this.onConnectRequested}
            @element-selected=${this.onElementSelected}
            @element-activated=${this.onElementActivated}
            @node-collapse-toggled=${this.onNodeCollapseToggled}
            @node-moved=${this.onNodeMoved}
            @delete-requested=${this.onDeleteRequested}
            @delete-selection-requested=${this.onDeleteSelectionRequested}
            @node-renamed=${this.onNodeRenamed}
            @undo-requested=${this.undo}
            @redo-requested=${this.redo}
            @selection-cleared=${() => {
              this._selectedId = null;
              this._multi = [];
              this.emit('modux-select', null);
            }}
          ></modux-tilt>`
        : html`
      ${this._treeOpen && this._activeViewId ? this.renderViewTree() : ''}
      ${this.renderPalette()}
      <modux-canvas
        .fitInsets=${this.fitInsets()}
        .scene=${scene}
        .edgePoints=${this.routedEdgePoints(scene)}
        .selectedId=${this._selectedId}
        .selectedIds=${this._multi}
        .connectable=${['context-map', 'distribution', 'workflows', 'ui'].includes(this._view)}
        @node-moved=${this.onNodeMoved}
        @nodes-moved=${this.onNodesMoved}
        @node-reparent-requested=${this.onNodeReparentRequested}
        @node-collapse-toggled=${this.onNodeCollapseToggled}
        @menu-slot-requested=${this.onMenuSlotRequested}
        @wizard-slot-requested=${this.onWizardSlotRequested}
        @node-proxy-requested=${this.onNodeProxyRequested}
        @node-resized=${this.onNodeResized}
        @connect-requested=${this.onConnectRequested}
        @delete-requested=${this.onDeleteRequested}
        @delete-selection-requested=${this.onDeleteSelectionRequested}
        @node-renamed=${this.onNodeRenamed}
        @edge-points-changed=${this.onEdgePointsChanged}
        @element-multi-toggled=${this.onMultiToggled}
        @nodes-boxed=${this.onNodesBoxed}
        @undo-requested=${this.undo}
        @redo-requested=${this.redo}
        @element-selected=${this.onElementSelected}
        @element-activated=${this.onElementActivated}
        @selection-cleared=${() => {
          this._selectedId = null;
          this._multi = [];
          this.emit('modux-select', null);
        }}
      ></modux-canvas>
      `}
      </div>
      <div class="hint">
        ${this._view === 'context-map'
          ? html`Arrastra para reordenar · Shift+arrastrar mueve una API de sistema (y un sistema externo dentro/fuera de otro) · Ctrl+arrastrar una API a un sistema crea un proxy · asa azul → crear relación (elige el tipo) · doble click
            en la etiqueta cambia el tipo · arrastra en vacío para seleccionar · espacio+arrastra
            mueve el lienzo · Supr borra la relación o el contexto vacío seleccionado · F2 renombra
            · rueda para zoom`
          : this._view === 'eventstorming'
            ? html`Vista derivada del modelo: comando azul → agregado amarillo → evento naranja →
              policy lila → read model verde · se edita desde las otras vistas o los CRUD (doble
              click abre el CRUD) · ✨ Auto-layout ordena la narrativa · rueda para zoom`
            : this._view === 'workflows'
              ? html`Arrastra un paso sobre otro con el asa para declarar dependencia (B espera a A)
                · Supr borra el paso o la dependencia seleccionada · F2 renombra · doble click abre
                el CRUD · espacio+arrastra mueve el lienzo · rueda para zoom`
              : html`Arrastra para reordenar · arrastra en vacío para seleccionar · espacio+arrastra
            mueve el lienzo · Supr borra (si está vacío) · F2 renombra · doble click abre el CRUD ·
            rueda para zoom`}
        · pulsa <b>?</b> para los atajos
      </div>
      ${this.renderRelationPicker()} ${this.renderRepoPicker()} ${this.renderWfStepPicker()} ${this.renderInvariantCondEditor()} ${this.renderBranchCondEditor()} ${this.renderExtDepPicker()} ${this.renderConnectPicker()} ${this.renderDeletePicker()}
      ${this.renderHelpPopover()} ${this.renderDrawer()}
    `;
  }

  /** The keyboard cheatsheet (toggled with ? and closed with Esc or a click outside). */
  private renderHelpPopover() {
    if (!this._helpOpen) return '';
    const rows: [string, string][] = [
      ['P', 'Mostrar/ocultar la paleta'],
      ['F', 'Pantalla completa (Esc sale)'],
      ['0', 'Ajustar la vista a la selección (o a todo el diagrama)'],
      ['+ / −', 'Zoom (también con la rueda)'],
      ['1 · 4', 'Mapa del sistema · Distribución'],
      ['2', 'Secuencias (interacciones)'],
      ['5 · 6 · 7 · 8 · 9', 'Flows · Procesos · Workflows · UI · Diseño'],
      ['A', 'Vista de agregados'],
      ['E', 'Vista EventStorming'],
      ['V', 'Vista 3D (placas apiladas, tipo Firefox Tilt)'],
      ['T', 'Árbol del catálogo (con una vista activa)'],
      ['Supr', 'Borrar la selección'],
      ['F2', 'Renombrar el nodo seleccionado'],
      ['Ctrl+Z / Ctrl+Y', 'Deshacer / rehacer'],
      ['Espacio+arrastrar', 'Mover el lienzo'],
      ['Shift+click / arrastrar', 'Multi-selección / banda elástica'],
      ['Alt+arrastrar', 'Arrastre libre (desactiva el snap a rejilla y las guías)'],
      ['?', 'Esta ayuda'],
    ];
    return html`
      <div class="picker-backdrop" @pointerdown=${() => (this._helpOpen = false)}></div>
      <div
        class="relation-picker help-pop"
        style="left: 50%; top: 90px"
        @pointerdown=${(e: Event) => e.stopPropagation()}
      >
        <div class="picker-title">Atajos de teclado</div>
        ${rows.map(
          ([keys, what]) => html`
            <div class="help-row"><span class="help-keys">${keys}</span><span>${what}</span></div>
          `,
        )}
      </div>
    `;
  }

  /**
   * Deleting from the MODEL always confirms here first; with a View active and every node a
   * member, the picker also offers only taking them out of the view.
   */
  private renderDeletePicker() {
    const p = this._deletePicker;
    if (!p) return '';
    const view = (this.model.views ?? []).find((v) => v.id === this._activeViewId);
    const scene = this.sceneFor(this._view);
    const names = p.items.map(
      (it) => scene.nodes.find((n) => n.id === it.id)?.label ?? it.id,
    );
    const what =
      names.length === 1 ? `«${names[0]}»` : `${names.length} elementos (${names.join(', ')})`;
    const offerView = p.memberIds.length > 0 && view;
    return html`
      <div class="picker-backdrop" @pointerdown=${() => (this._deletePicker = null)}></div>
      <div
        class="relation-picker"
        style="left: 50%; top: 120px"
        @pointerdown=${(e: Event) => e.stopPropagation()}
      >
        <div class="picker-title">
          ${offerView ? `¿Eliminar ${what}, o solo quitar de la vista?` : `¿Eliminar ${what} del modelo?`}
        </div>
        ${offerView
          ? html`
              <button
                class="picker-item"
                @click=${() => {
                  const picked = this._deletePicker!;
                  this._deletePicker = null;
                  for (const memberId of new Set(picked.memberIds)) {
                    this.command({
                      kind: 'remove-view-member',
                      id: this._activeViewId,
                      targetId: memberId,
                    });
                  }
                }}
              >
                <span class="abbr">👁</span>
                <span class="name">Quitar de la vista «${view!.name ?? this._activeViewId}»</span>
              </button>
            `
          : ''}
        <button
          class="picker-item danger"
          @click=${() => {
            const picked = this._deletePicker!;
            this._deletePicker = null;
            for (const it of picked.items) {
              this.performDelete(it.elementType, it.id, it.kind);
            }
          }}
        >
          <span class="abbr">🗑</span>
          <span class="name">Eliminar del modelo — desaparece de todas las vistas y diagramas</span>
        </button>
        <button class="picker-item" @click=${() => (this._deletePicker = null)}>
          <span class="abbr">✕</span>
          <span class="name">Cancelar</span>
        </button>
      </div>
    `;
  }

  private pickExtDepType(type: 'DEPENDS' | 'CQRS'): void {
    const p = this._extDepPicker;
    this._extDepPicker = null;
    if (!p) return;
    const current = (this.model.externalSystemDependencies ?? []).find(
      (d) => d.sourceId === p.sourceId && d.targetId === p.targetId,
    );
    if (current && (current.type ?? 'DEPENDS') === type) return;
    this.command({
      kind: 'add-external-dependency',
      sourceId: p.sourceId,
      targetId: p.targetId,
      type,
    });
  }

  /** The magic connector's question: which of the fitting relation types is this line? */
  private renderConnectPicker() {
    const p = this._connectPicker;
    if (!p) return '';
    return html`
      <div class="picker-backdrop" @pointerdown=${() => (this._connectPicker = null)}></div>
      <div
        class="relation-picker relation-picker--centered"
        @pointerdown=${(e: Event) => e.stopPropagation()}
      >
        <div class="picker-title">¿Qué relación es esta línea?</div>
        ${p.options.map(
          (o) => html`
            <button
              class="picker-item"
              title=${o.hint}
              @click=${() => {
                this._connectPicker = null;
                o.apply();
              }}
            >
              <span class="name">${o.label}</span>
            </button>
          `,
        )}
      </div>
    `;
  }

  private renderExtDepPicker() {
    const p = this._extDepPicker;
    if (!p) return '';
    const current = (this.model.externalSystemDependencies ?? []).find(
      (d) => d.sourceId === p.sourceId && d.targetId === p.targetId,
    )?.type;
    const options = [
      { type: 'DEPENDS' as const, abbr: 'DEP', name: 'Dependencia simple' },
      { type: 'CQRS' as const, abbr: 'CQRS', name: 'CQRS — consulta sobre sus datos' },
    ];
    return html`
      <div class="picker-backdrop" @pointerdown=${() => (this._extDepPicker = null)}></div>
      <div
        class="relation-picker"
        style="left:${p.x}px; top:${p.y}px"
        @pointerdown=${(e: Event) => e.stopPropagation()}
      >
        <div class="picker-title">Tipo de dependencia</div>
        ${options.map(
          (o) => html`
            <button
              class="picker-item ${o.type === (current ?? '') ? 'current' : ''}"
              title=${o.name}
              @click=${() => this.pickExtDepType(o.type)}
            >
              <span class="abbr">${o.abbr}</span>
              <span class="name">${o.name}</span>
            </button>
          `,
        )}
      </div>
    `;
  }

  /**
   * The «which project?» picker: you say where the other project is.
   *
   * It used to list a catalog the server read from `~/.modux`. Nothing lists them now, because
   * there is no such catalog to list — what identifies another project is its repository, and
   * that is what gets stored, versioned with the model (§4.7).
   */
  private renderRepoPicker() {
    const p = this._repoPicker;
    if (!p) return '';
    const add = () => {
      const coordinate = this._repoPicker?.coordinate.trim();
      if (!coordinate) return;
      const referencedProject = coordinateFrom(coordinate);
      const id = `proj-${repoNameOf(coordinate)}`;
      this._repoPicker = null;
      this.command({ kind: 'add-project-reference', referencedProject, id }, false);
      const current = this.viewLayout(this._view);
      this.writeViewLayout(this._view, {
        ...current,
        nodes: { ...current.nodes, [id]: { x: Math.round(p.pos.x), y: Math.round(p.pos.y) } },
      });
      this.pushUndoEntry([
        { kind: 'remove-external-system', id },
        { kind: 'move-node', view: this._view, id, pos: null },
      ]);
    };
    return html`
      <div class="picker-backdrop" @pointerdown=${() => (this._repoPicker = null)}></div>
      <div
        class="relation-picker"
        style="left:${this.clientWidth / 2}px; top:120px"
        @pointerdown=${(e: Event) => e.stopPropagation()}
      >
        <div class="picker-title">Referenciar otro proyecto modux</div>
        <input
          class="picker-input"
          placeholder="URL del repositorio, o ../otro-repo/modux"
          .value=${p.coordinate}
          @input=${(e: Event) =>
            (this._repoPicker = { ...p, coordinate: (e.target as HTMLInputElement).value })}
          @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && add()}
        />
        <button class="picker-item" ?disabled=${!p.coordinate.trim()} @click=${add}>
          Referenciar
        </button>
      </div>
    `;
  }

  /** The condition editor of an invariant: its rule expression and the error message. */
  private renderInvariantCondEditor() {
    const p = this._invariantCondEditor;
    if (!p) return '';
    const save = () => {
      this.command({ kind: 'set-invariant-condition', id: p.id, expression: p.expression, errorMessage: p.errorMessage });
      this._invariantCondEditor = null;
    };
    const inputStyle =
      'width: 260px; margin: 6px 10px; padding: 5px 8px; border: 1px solid var(--modux-border-strong, #cbd5e1); border-radius: 6px; font: 12px system-ui;';
    return html`
      <div class="picker-backdrop" @pointerdown=${() => (this._invariantCondEditor = null)}></div>
      <div
        class="relation-picker"
        style="left:${this.clientWidth / 2}px; top:120px"
        @pointerdown=${(e: Event) => e.stopPropagation()}
      >
        <div class="picker-title">⚖ ${p.name} — condición (vacío la quita)</div>
        <input
          style=${inputStyle}
          placeholder="expresión — p. ej. importe >= 0"
          .value=${p.expression}
          @input=${(e: Event) => (p.expression = (e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') this._invariantCondEditor = null;
          }}
        />
        <input
          style=${inputStyle}
          placeholder="mensaje de error — p. ej. El importe no puede ser negativo"
          .value=${p.errorMessage}
          @input=${(e: Event) => (p.errorMessage = (e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') this._invariantCondEditor = null;
          }}
        />
        <button class="picker-item" @click=${save}>Guardar</button>
      </div>
    `;
  }

  /** The condition editor of one EXCLUSIVE-split branch. */
  private renderBranchCondEditor() {
    const p = this._branchCondEditor;
    if (!p) return '';
    return html`
      <div class="picker-backdrop" @pointerdown=${() => (this._branchCondEditor = null)}></div>
      <div
        class="relation-picker"
        style="left:${this.clientWidth / 2}px; top:120px"
        @pointerdown=${(e: Event) => e.stopPropagation()}
      >
        <div class="picker-title">Condición de la rama (vacío la quita)</div>
        <input
          style="width: 240px; margin: 6px 10px; padding: 5px 8px; border: 1px solid var(--modux-border-strong, #cbd5e1); border-radius: 6px; font: 12px system-ui;"
          placeholder="p. ej. importe > 1000"
          .value=${p.value}
          @input=${(e: Event) => (p.value = (e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter') {
              this.command({ kind: 'set-gateway-branch-condition', id: p.gatewayId, targetId: p.targetId, text: p.value });
              this._branchCondEditor = null;
            }
            if (e.key === 'Escape') this._branchCondEditor = null;
          }}
        />
        <button
          class="picker-item"
          @click=${() => {
            this.command({ kind: 'set-gateway-branch-condition', id: p.gatewayId, targetId: p.targetId, text: p.value });
            this._branchCondEditor = null;
          }}
        >
          Guardar
        </button>
      </div>
    `;
  }

  /** The «which workflow?» picker for steps dropped in the open. */
  private renderWfStepPicker() {
    const p = this._wfStepPicker;
    if (!p) return '';
    return html`
      <div class="picker-backdrop" @pointerdown=${() => (this._wfStepPicker = null)}></div>
      <div
        class="relation-picker"
        style="left:${this.clientWidth / 2}px; top:120px"
        @pointerdown=${(e: Event) => e.stopPropagation()}
      >
        <div class="picker-title">¿De qué workflow es el paso?</div>
        ${(this.model.workflows ?? []).map(
          (w) => html`
            <button
              class="picker-item"
              @click=${() => {
                const picked = p;
                this._wfStepPicker = null;
                const { id, name } = this.uniquePaletteName(
                  picked.stepType === 'JOIN' ? 'Join' : picked.stepType === 'SPLIT' ? 'Split' : 'Paso');
                this.command(
                  { kind: 'add-workflow-step', workflowId: w.id, id, name,
                    ...(picked.stepType ? { stepType: picked.stepType } : {}) },
                  false,
                );
                const current = this.viewLayout(this._view);
                this.writeViewLayout(this._view, {
                  ...current,
                  nodes: { ...current.nodes, [id]: { x: Math.round(picked.pos.x), y: Math.round(picked.pos.y) } },
                });
                this.pushUndoEntry([
                  { kind: 'remove-workflow-step', workflowId: w.id, id },
                  { kind: 'move-node', view: this._view, id, pos: null },
                ]);
              }}
            >
              ${w.name}
            </button>
          `,
        )}
      </div>
    `;
  }

  private renderRelationPicker() {
    const p = this._relationPicker;
    if (!p) return '';
    const current =
      p.mode === 'edit'
        ? this.model.relations.find(
            (r) => r.sourceId === p.sourceId && r.targetId === p.targetId,
          )?.type
        : this._relationType;
    return html`
      <div class="picker-backdrop" @pointerdown=${() => (this._relationPicker = null)}></div>
      <div
        class="relation-picker"
        style="left:${p.x}px; top:${p.y}px"
        @pointerdown=${(e: Event) => e.stopPropagation()}
      >
        <div class="picker-title">
          ${p.mode === 'create' ? 'Tipo de relación' : 'Cambiar tipo'}
        </div>
        ${RELATION_TYPES.map(
          (t) => html`
            <button
              class="picker-item ${t === current ? 'current' : ''}"
              title=${t}
              @click=${() => this.pickRelationType(t)}
            >
              <span class="abbr">${RELATION_META[t].abbr}</span>
              <span class="name">${RELATION_META[t].name}</span>
            </button>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'modux-editor': ModuxEditor;
  }
}
