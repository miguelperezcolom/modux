import type { ModuxModel, UiMenuEntryRef } from './model.js';
import type { ModuxCommand } from './commands.js';
import type { Scene } from './scene.js';
import type { ViewId } from './modux-editor.js';
import { parseMenuNodeId } from './views/ui.js';
import { ARCHIMATE_LABEL } from './views/context-map.js';
import { parseFieldNodeId } from './views/mappings.js';
import { slug } from './ids.js';
import { t } from './i18n/index.js';

/**
 * The whole gesture vocabulary — what a drawn line MEANS and what Supr
 * deletes, per view — extracted from the component: pure functions of
 * (host, view, gesture). The host is the thin surface the editor exposes.
 */
export interface GestureHost {
  readonly model: ModuxModel;
  command(c: ModuxCommand, pushUndo?: boolean): void;
  emit(name: string, detail?: unknown): void;
  sceneFor(view: ViewId): Scene;
  owningProcessOf(stepId: string): ModuxModel['processes'] extends (infer T)[] | undefined ? T | undefined : never;
  owningUseCaseOf(stepId: string): ReturnType<GestureHost['model']['boundedContexts'][number]['useCases'] extends (infer U)[] | undefined ? () => U | undefined : never>;
  owningWorkflowOf(stepId: string): ModuxModel['workflows'] extends (infer W)[] | undefined ? W | undefined : never;
  owningApiOf(operationId: string): ModuxModel['apis'] extends (infer A)[] | undefined ? A | undefined : never;
  menuEntryIn(appId: string, itemId: string): {
    entry: UiMenuEntryRef;
    parentId: string | null;
    beforeId: string | null;
  } | null;
  newMenuItemId(label: string): string;
  openExtDepPicker(p: { sourceId: string; targetId: string; x: number; y: number }): void;
  /** Two bounded contexts: the strategic relation needs its TYPE — ask at the drop point. */
  openRelationPicker(p: {
    sourceId: string;
    targetId: string;
    mode: 'create' | 'edit';
    x: number;
    y: number;
  }): void;
  /** The relation type armed from the palette: the next trace applies exactly it. */
  /** The magic connector's question: several typed meanings fit — pick one. */
  openConnectPicker(p: {
    x: number;
    y: number;
    options: { id: string; label: string; hint: string; apply(): void }[];
  }): void;
  /** Screen rect of a canvas node (menu drops slot by vertical position). */
  nodeClientRect(nodeId: string): DOMRect | null | undefined;
  clearSelection(): void;
  /** Expand a container in the current view — so an element just composed INTO it stays visible. */
  expandNode(id: string): void;
}

/** The relation palette (Archi style): pick a type, trace, done. */
/** The typed relation vocabulary the traced line offers when several fit (read at call time: translated). */
function relationTypes(): { id: string; label: string; hint: string }[] {
  return [
    { id: 'uc-call', label: t('gestures.relation.ucCall.label'), hint: t('gestures.relation.ucCall.hint') },
    { id: 'query-call', label: t('gestures.relation.queryCall.label'), hint: t('gestures.relation.queryCall.hint') },
    { id: 'aggregate-call', label: t('gestures.relation.aggregateCall.label'), hint: t('gestures.relation.aggregateCall.hint') },
    { id: 'emission', label: t('gestures.relation.emission.label'), hint: t('gestures.relation.emission.hint') },
    { id: 'flow-triggers', label: t('gestures.relation.flowTriggers.label'), hint: t('gestures.relation.flowTriggers.hint') },
    { id: 'flow-materializes', label: t('gestures.relation.flowMaterializes.label'), hint: t('gestures.relation.flowMaterializes.hint') },
    { id: 'actor-use', label: t('gestures.relation.actorUse.label'), hint: t('gestures.relation.actorUse.hint') },
    { id: 'ext-dep', label: t('gestures.relation.extDep.label'), hint: t('gestures.relation.extDep.hint') },
    { id: 'api-implementation', label: t('gestures.relation.apiImplementation.label'), hint: t('gestures.relation.apiImplementation.hint') },
    { id: 'api-consumption', label: t('gestures.relation.apiConsumption.label'), hint: t('gestures.relation.apiConsumption.hint') },
    { id: 'external-call', label: t('gestures.relation.externalCall.label'), hint: t('gestures.relation.externalCall.hint') },
    { id: 'external-crud', label: t('gestures.relation.externalCrud.label'), hint: t('gestures.relation.externalCrud.hint') },
    { id: 'context-crud', label: t('gestures.relation.contextCrud.label'), hint: t('gestures.relation.contextCrud.hint') },
    { id: 'ui-crud', label: t('gestures.relation.uiCrud.label'), hint: t('gestures.relation.uiCrud.hint') },
    { id: 'external-uc-call', label: t('gestures.relation.externalUcCall.label'), hint: t('gestures.relation.externalUcCall.hint') },
    { id: 'agent-tool', label: t('gestures.relation.agentTool.label'), hint: t('gestures.relation.agentTool.hint') },
    { id: 'agent-delegate', label: t('gestures.relation.agentDelegate.label'), hint: t('gestures.relation.agentDelegate.hint') },
    { id: 'agent-rag', label: t('gestures.relation.agentRag.label'), hint: t('gestures.relation.agentRag.hint') },
    { id: 'idp-trust', label: t('gestures.relation.idpTrust.label'), hint: t('gestures.relation.idpTrust.hint') },
    { id: 'ui-assignment', label: t('gestures.relation.uiAssignment.label'), hint: t('gestures.relation.uiAssignment.hint') },
    { id: 'ui-composition', label: t('gestures.relation.uiComposition.label'), hint: t('gestures.relation.uiComposition.hint') },
    { id: 'ui-serving', label: t('gestures.relation.uiServing.label'), hint: t('gestures.relation.uiServing.hint') },
    { id: 'aggregate-composition', label: t('gestures.relation.aggregateComposition.label'), hint: t('gestures.relation.aggregateComposition.hint') },
    { id: 'system-composition', label: t('gestures.relation.systemComposition.label'), hint: t('gestures.relation.systemComposition.hint') },
    { id: 'projection', label: t('gestures.relation.projection.label'), hint: t('gestures.relation.projection.hint') },
  ];
}

/** A readable name for a node id, scanning the strategic/domain collections. */
function nodeName(host: GestureHost, id: string): string {
  const m = host.model;
  const hit =
    m.boundedContexts.find((e) => e.id === id) ??
    (m.systems ?? []).find((e) => e.id === id) ??
    m.externalSystems.find((e) => e.id === id) ??
    (m.actors ?? []).find((e) => e.id === id) ??
    (m.aggregates ?? []).find((e) => e.id === id) ??
    (m.apis ?? []).find((e) => e.id === id) ??
    (m.proxyApis ?? []).find((e) => e.id === id);
  return hit?.name ?? id;
}

/**
 * The ArchiMate 3 vocabulary as picker options: any pair admits all eleven, created source→target.
 * Each label spells out the direction (src → tgt) so the sense is never a guess; to build it the
 * other way, the connect picker offers a single «invert» toggle rather than doubling every option.
 * The id stays `archimate:<type>` so the retype picker keeps matching on it.
 */
export function archimateOptions(
  host: GestureHost,
  sourceId: string,
  targetId: string,
): { id: string; label: string; hint: string; apply(): void }[] {
  const src = nodeName(host, sourceId);
  const tgt = nodeName(host, targetId);
  return Object.entries(ARCHIMATE_LABEL).map(([type, label]) => ({
    id: `archimate:${type}`,
    label: `${label} — ${src} → ${tgt}`,
    hint: t('gestures.archimate.hint', { label, source: src, target: tgt }),
    apply() {
      host.command({ kind: 'add-archimate-relation', id: `ar-${sourceId}-${targetId}-${type}`, sourceId, targetId, type });
    },
  }));
}

/**
 * The typed meanings a trace between these two elements admits. Each option is
 * self-contained (guards + command); the armed palette applies exactly one, the
 * magic connector asks when several fit and lets the classic resolver handle
 * the unambiguous rest.
 */
export function connectionOptions(
  host: GestureHost,
  sourceId: string,
  targetId: string,
): { id: string; label: string; hint: string; apply(): void }[] {
  const m = host.model;
  const out: { id: string; apply(): void }[] = [];
  const offer = (id: string, apply: () => void) => out.push({ id, apply });

  const ucIds = new Set(m.boundedContexts.flatMap((mo) => (mo.useCases ?? []).map((u) => u.id)));
  const qsIds = new Set(m.boundedContexts.flatMap((mo) => (mo.queryServices ?? []).map((q) => q.id)));
  const eventIds = new Set(m.boundedContexts.flatMap((mo) => (mo.domainEvents ?? []).map((ev) => ev.id)));
  const appEventIds = new Set(m.boundedContexts.flatMap((mo) =>
    [...(mo.applicationEvents ?? []), ...(mo.integrationEvents ?? [])].map((ev) => ev.id)));
  const emitterIds = new Set([
    ...(m.aggregates ?? []).map((a) => a.id),
    ...m.boundedContexts.flatMap((mo) => (mo.domainServices ?? []).map((ds) => ds.id)),
  ]);
  const externalUcIds = new Set(m.externalSystems.flatMap((x) => (x.useCases ?? []).map((u) => u.id)));
  const isAgent = (id: string) => (m.aiAgents ?? []).some((a) => a.id === id);
  const isActor = (id: string) => (m.actors ?? []).some((a) => a.id === id);
  const isExternal = (id: string) => m.externalSystems.some((x) => x.id === id);
  const isContext = (id: string) => m.boundedContexts.some((mo) => mo.id === id);
  const isSystem = (id: string) => (m.systems ?? []).some((s) => s.id === id);
  const isAggregate = (id: string) => (m.aggregates ?? []).some((a) => a.id === id);

  const uiIds = new Set((m.uis ?? []).map((u) => u.id));
  const appIds = new Set((m.uiApps ?? []).map((a) => a.id));
  const pageIds = new Set((m.pages ?? []).map((p) => p.id));
  {
    // contexto ⇆ ui: SOLO composición — el contexto posee la interfaz que expone
    const ui = uiIds.has(sourceId) ? sourceId : uiIds.has(targetId) ? targetId : null;
    const other = ui === sourceId ? targetId : sourceId;
    if (ui && isContext(other)) {
      offer('ui-composition', () => {
        host.command({ kind: 'set-ui-context', id: ui, boundedContextId: other });
      });
    }
  }
  {
    // ui ⇆ actor: SOLO servidumbre — la interfaz sirve a la persona
    const ui = uiIds.has(sourceId) ? sourceId : uiIds.has(targetId) ? targetId : null;
    const other = ui === sourceId ? targetId : sourceId;
    if (ui && isActor(other)) {
      offer('ui-serving', () => {
        host.command({ kind: 'add-ui-serving', id: ui, targetId: other });
      });
    }
  }
  {
    // ui ⇆ app/página: la asignación (cualquier dirección)
    const ui = uiIds.has(sourceId) ? sourceId : uiIds.has(targetId) ? targetId : null;
    const other = ui === sourceId ? targetId : sourceId;
    if (ui && (appIds.has(other) || pageIds.has(other))) {
      offer('ui-assignment', () => {
        host.command({ kind: 'add-ui-assignment', id: ui, targetId: other });
      });
    }
  }
  // app → aggregate: the UI surface of the CRUD (the generator emits its pages because of this)
  if (appIds.has(sourceId) && isAggregate(targetId)) {
    offer('ui-crud', () => host.command({ kind: 'add-ui-crud', sourceId, targetId }));
  }
  if (ucIds.has(sourceId) && ucIds.has(targetId) && sourceId !== targetId) {
    offer('uc-call', () => {
      if (!(m.useCaseCalls ?? []).some((c) => c.sourceId === sourceId && c.targetId === targetId)) {
        host.command({ kind: 'add-use-case-call', sourceId, targetId });
      }
    });
  }
  if (ucIds.has(sourceId) && qsIds.has(targetId)) {
    offer('query-call', () => {
      if (!(m.queryCalls ?? []).some((c) => c.sourceId === sourceId && c.targetId === targetId)) {
        host.command({ kind: 'add-query-call', sourceId, targetId });
      }
    });
  }
  if (ucIds.has(sourceId) && isAggregate(targetId)) {
    offer('aggregate-call', () => {
      if (!(m.aggregateCalls ?? []).some((c) => c.sourceId === sourceId && c.targetId === targetId)) {
        host.command({ kind: 'add-aggregate-call', sourceId, targetId });
      }
    });
  }
  if (
    (emitterIds.has(sourceId) && eventIds.has(targetId)) ||
    (ucIds.has(sourceId) && (appEventIds.has(targetId) || eventIds.has(targetId)))
  ) {
    offer('emission', () => {
      if (!(m.emissions ?? []).some((em) => em.sourceId === sourceId && em.domainEventId === targetId)) {
        host.command({ kind: 'add-emission', sourceId, targetId });
      }
    });
  }
  if ((eventIds.has(sourceId) || appEventIds.has(sourceId)) && ucIds.has(targetId)) {
    offer('flow-triggers', () => applyConnectionGesture(host, 'context-map', sourceId, targetId, undefined, undefined, '__classic'));
  }
  if (
    (eventIds.has(sourceId) || appEventIds.has(sourceId)) &&
    (isContext(targetId) ||
      m.boundedContexts.some((mo) => (mo.readModels ?? []).some((rm) => rm.id === targetId)))
  ) {
    offer('flow-materializes', () => applyConnectionGesture(host, 'context-map', sourceId, targetId, undefined, undefined, '__classic'));
  }
  // An actor is only ever SERVED — it never serves nor initiates. So it is never a source of a
  // relationship (no «actor usa X»); the only edge it takes part in points INTO it (e.g. a UI serving
  // it, handled in the ui⇆actor block above). Dragging from an actor offers nothing.
  if (isExternal(sourceId)) {
    if (isExternal(targetId) && sourceId !== targetId) {
      offer('ext-dep', () => {
        if (!(m.externalSystemDependencies ?? []).some((d) => d.sourceId === sourceId && d.targetId === targetId)) {
          host.command({ kind: 'add-external-dependency', sourceId, targetId });
        }
      });
    }
    if ((m.apis ?? []).some((a) => a.id === targetId) || (m.proxyApis ?? []).some((px) => px.id === targetId)) {
      offer('ext-dep', () => {
        if (!(m.externalSystemDependencies ?? []).some((d) => d.sourceId === sourceId && d.targetId === targetId)) {
          host.command({ kind: 'add-external-dependency', sourceId, targetId });
        }
      });
    }
    if (ucIds.has(targetId)) {
      offer('external-call', () => {
        if (!(m.externalCalls ?? []).some((c) => c.externalSystemId === sourceId && c.useCaseId === targetId)) {
          host.command({ kind: 'add-external-call', sourceId, targetId });
        }
      });
    }
    if (isAggregate(targetId)) {
      offer('external-crud', () => host.command({ kind: 'add-external-crud', sourceId, targetId }));
    }
  }
  // Another context → aggregate (not its own): it consumes the aggregate's CRUD through a first-class API.
  if (isContext(sourceId) && isAggregate(targetId)
      && (m.aggregates ?? []).find((a) => a.id === targetId)?.boundedContextId !== sourceId) {
    offer('context-crud', () => host.command({ kind: 'add-context-crud', sourceId, targetId }));
  }
  {
    // contexto ⇆ agregado SUELTO: composición — el contexto pasa a contenerlo (fija su dueño).
    // Solo para agregados sin dueño; los que ya pertenecen a un contexto usan context-crud arriba.
    const ctx = isContext(sourceId) ? sourceId : isContext(targetId) ? targetId : null;
    const agg = isAggregate(sourceId) ? sourceId : isAggregate(targetId) ? targetId : null;
    if (ctx && agg && !(m.aggregates ?? []).find((a) => a.id === agg)?.boundedContextId) {
      offer('aggregate-composition', () => {
        host.command({ kind: 'set-aggregate-context', id: agg, boundedContextId: ctx });
        host.expandNode(ctx);
      });
    }
  }
  {
    // sistema ⇆ contexto o sistema ⇆ sistema: composición — el sistema pasa a contenerlo.
    // Un contexto entra por tipo (cualquier sentido); un sistema entra por dirección (el ORIGEN,
    // el «todo», contiene al DESTINO, la «parte») — como marca la notación ArchiMate.
    if (isSystem(sourceId) || isSystem(targetId)) {
      const sys = isSystem(sourceId) ? sourceId : targetId;
      const other = sys === sourceId ? targetId : sourceId;
      if (isContext(other)
        && m.boundedContexts.find((mo) => mo.id === other)?.parentSystemId !== sys) {
        offer('system-composition', () => {
          host.command({ kind: 'set-context-system', id: other, parentSystemId: sys });
          host.expandNode(sys);
        });
      } else if (isSystem(sourceId) && isSystem(targetId) && sourceId !== targetId
        && (m.systems ?? []).find((s) => s.id === targetId)?.parentSystemId !== sourceId) {
        offer('system-composition', () => {
          host.command({ kind: 'set-system-parent', id: targetId, parentSystemId: sourceId });
          host.expandNode(sourceId);
        });
      }
    }
  }
  {
    // tabla externa ⇆ read model: la ÚNICA relación es una PROYECCIÓN (el read model se proyecta de
    // la tabla). Cualquier sentido; el read model puede estar suelto o dentro de un contexto.
    // The read model must be REAL (inside a context) so the projection has an owner; the table may be
    // real (inside an external system) OR still loose — add-projection just records its id, which
    // matches once the loose table is adopted (adoption keeps the id).
    const isReadModel = (id: string) =>
      m.boundedContexts.some((bc) => (bc.readModels ?? []).some((rm) => rm.id === id));
    const isTable = (id: string) =>
      m.externalSystems.some((x) => (x.tables ?? []).some((t) => t.id === id))
      || (m.looseElements ?? []).some((e) => e.id === id && e.elementType === 'external-table');
    const rmId = isReadModel(sourceId) ? sourceId : isReadModel(targetId) ? targetId : null;
    const tblId = isTable(sourceId) ? sourceId : isTable(targetId) ? targetId : null;
    if (rmId && tblId && !(m.projections ?? []).some((p) => p.readModelId === rmId)) {
      offer('projection', () => host.command({
        kind: 'add-projection', id: `proj-${tblId}-${rmId}`, name: 'Proyección',
        externalTableId: tblId, targetId: rmId,
      }));
    }
  }
  {
    // API (o el proxy que la fronteña) → contexto: dos sentidos muy distintos que NO
    // se deben asumir. El contexto la IMPLEMENTA (la sirve él mismo, strangler) o la
    // CONSUME (servidumbre: la API le sirve). Se pregunta con el picker.
    const isApi = (id: string) => (m.apis ?? []).some((a) => a.id === id);
    const px = (m.proxyApis ?? []).find((p) => p.id === sourceId);
    const apiToImpl = isApi(sourceId) ? sourceId : px?.targetApiId;
    if ((isApi(sourceId) || px?.targetApiId) && isContext(targetId)) {
      if (apiToImpl) {
        offer('api-implementation', () => {
          if (
            !(m.apiImplementations ?? []).some(
              (i) => i.apiId === apiToImpl && i.boundedContextId === targetId,
            )
          ) {
            host.command({ kind: 'add-api-implementation', apiId: apiToImpl, boundedContextId: targetId });
          }
        });
      }
      offer('api-consumption', () => {
        if (
          !(m.archimateRelations ?? []).some(
            (r) => r.sourceId === sourceId && r.targetId === targetId && r.type === 'serving',
          )
        ) {
          host.command({
            kind: 'add-archimate-relation',
            id: `ar-${sourceId}-${targetId}-serving`,
            sourceId,
            targetId,
            type: 'serving',
          });
        }
      });
    }
  }
  if (ucIds.has(sourceId) && externalUcIds.has(targetId)) {
    offer('external-uc-call', () => {
      if (!(m.externalUseCaseCalls ?? []).some((c) => c.sourceId === sourceId && c.targetId === targetId)) {
        host.command({ kind: 'add-external-uc-call', sourceId, targetId });
      }
    });
  }
  if (isAgent(sourceId)) {
    const mcpIds = new Set(m.externalSystems.flatMap((x) => (x.mcpServers ?? []).map((s) => s.id)));
    const apiOpIds = new Set((m.apis ?? []).flatMap((a) => a.operations.map((o) => o.id)));
    if (
      ucIds.has(targetId) || externalUcIds.has(targetId) || mcpIds.has(targetId) ||
      (m.mcpGateways ?? []).some((g) => g.id === targetId) || apiOpIds.has(targetId) ||
      (m.apis ?? []).some((a) => a.id === targetId) ||
      (m.proxyApis ?? []).some((px) => px.id === targetId) || qsIds.has(targetId)
    ) {
      offer('agent-tool', () => applyConnectionGesture(host, 'context-map', sourceId, targetId, undefined, undefined, '__classic'));
    }
    if (isAgent(targetId) && targetId !== sourceId) {
      offer('agent-delegate', () => {
        if (!(m.agentDelegations ?? []).some((d) => d.agentId === sourceId && d.delegateAgentId === targetId)) {
          host.command({ kind: 'add-agent-delegate', sourceId, targetId });
        }
      });
    }
    if ((m.rags ?? []).some((r) => r.id === targetId)) {
      offer('agent-rag', () => {
        if (!(m.agentRags ?? []).some((ar) => ar.agentId === sourceId && ar.ragId === targetId)) {
          host.command({ kind: 'add-agent-rag', sourceId, targetId });
        }
      });
    }
  }
  const isIdp = (id: string) => (m.identityProviders ?? []).some((idp) => idp.id === id);
  if (isIdp(targetId) && (isContext(sourceId) || (m.etlFlows ?? []).some((f) => f.id === sourceId) || (m.uiApps ?? []).some((a) => a.id === sourceId))) {
    offer('idp-trust', () => applyConnectionGesture(host, 'context-map', sourceId, targetId, undefined, undefined, '__classic'));
  }

  // dedupe by type id (e.g. ext-dep offered by two guards) and dress with metadata
  const seen = new Set<string>();
  const types = relationTypes();
  return out
    .filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)))
    .map((o) => {
      const meta = types.find((r) => r.id === o.id)!;
      return { ...o, label: meta.label, hint: meta.hint };
    });
}

/** Typed drag handles that belong to the UI lens (a page/app/group offers them). */
const UI_CONNECT_HANDLES = new Set([
  'toolbar', 'bottom', 'home', 'header', 'crud-detail', 'crud-create', 'viewmodel', 'view', 'edit',
]);

/**
 * On the ONE unified canvas every kind of node coexists, so a traced line no longer inherits its
 * meaning from a lens — it is read from the endpoints (and the typed handle, if any). This maps a
 * connect gesture to the lens whose rules apply, so the existing per-lens logic runs unchanged.
 * Ambiguous or purely-strategic connects fall to `context-map`, which offers the relation picker.
 */
function resolveConnectLens(
  host: GestureHost, sourceId: string, targetId: string, connectKind?: string,
): ViewId {
  if (connectKind && UI_CONNECT_HANDLES.has(connectKind)) return 'ui';
  if (connectKind?.startsWith('es-')) return 'eventstorming';
  const m = host.model;
  const has = <T extends { id: string }>(coll: T[] | undefined, id: string) =>
    (coll ?? []).some((x) => x.id === id);
  // A workflow, its steps or gateways at either end → the workflow rules (which also handle
  // actor→step and page→step by looking at the OTHER end).
  const isWorkflowThing = (id: string) =>
    has(m.workflows, id) ||
    (m.workflows ?? []).some((w) => (w.steps ?? []).some((s) => s.id === id)) ||
    has(m.workflowGateways, id);
  if (isWorkflowThing(sourceId) || isWorkflowThing(targetId)) return 'workflows';
  // Mapping side: synthetic field chips, models, transformations and custom code.
  const mapSide = (id: string) =>
    !!parseFieldNodeId(id) || has(m.models, id) || has(m.transformations, id) || has(m.customCodes, id);
  if (parseFieldNodeId(sourceId) || parseFieldNodeId(targetId) || (mapSide(sourceId) && mapSide(targetId))) {
    return 'mappings';
  }
  // Aggregate assignment: a value object / entity / model dropped on an aggregate or on one of its
  // raw fields (setting membership or a field's type).
  const isAggField = (id: string) =>
    [...(m.aggregates ?? []), ...(m.entities ?? [])].some((o) => (o.fields ?? []).some((f) => f.id === id));
  const droppable = has(m.valueObjects, sourceId) || has(m.entities, sourceId) || has(m.models, sourceId);
  if (droppable && (has(m.aggregates, targetId) || isAggField(targetId))) return 'aggregates';
  return 'context-map';
}

export function applyConnectionGesture(
  host: GestureHost,
  view: ViewId,
  sourceId: string,
  targetId: string,
  x?: number,
  y?: number,
  connectKind?: string,
): void {
    // Notes annotate: a thread from (or to) a note ties it to the other end —
    // element or relation (edge targets arrive as `edge:<edgeId>`). This wins
    // over every other meaning.
    const noteIds = new Set((host.model.notes ?? []).map((n) => n.id));
    if (noteIds.has(sourceId) || noteIds.has(targetId)) {
      const noteId = noteIds.has(sourceId) ? sourceId : targetId;
      const other = noteIds.has(sourceId) ? targetId : sourceId;
      if (noteId === other) return;
      const ref = other.startsWith('edge:')
        ? other.slice('edge:'.length)
        : other.replace(/^(tgt:|flow:)/, '');
      host.command({ kind: 'note-attach', id: noteId, targetId: ref });
      return;
    }
    // A mockup ⇆ page: the mockup stands for that page (either drag direction).
    {
      const isMockup = (id: string) => (host.model.mockups ?? []).some((mk) => mk.id === id);
      const isPage = (id: string) => (host.model.pages ?? []).some((p) => p.id === id);
      if (isMockup(sourceId) !== isMockup(targetId)) {
        const mockupId = isMockup(sourceId) ? sourceId : targetId;
        const other = isMockup(sourceId) ? targetId : sourceId;
        if (isPage(other)) {
          host.command({ kind: 'set-mockup-page', id: mockupId, pageId: other });
          return;
        }
      }
    }
    // Composición de un elemento SUELTO: arrastrar desde su contenedor lo mete dentro (fija su
    // dueño). Solo aplica a elementos sin dueño; los que ya pertenecen usan sus relaciones normales.
    {
      const isCtx = (id: string) => host.model.boundedContexts.some((mo) => mo.id === id);
      const aggById = (id: string) => (host.model.aggregates ?? []).find((a) => a.id === id);
      const entById = (id: string) => (host.model.entities ?? []).find((e) => e.id === id);
      const voById = (id: string) => (host.model.valueObjects ?? []).find((v) => v.id === id);
      const ctx = isCtx(sourceId) ? sourceId : isCtx(targetId) ? targetId : null;
      const looseAgg = aggById(sourceId) ?? aggById(targetId);
      if (ctx && looseAgg && !looseAgg.boundedContextId) {
        host.command({ kind: 'set-aggregate-context', id: looseAgg.id, boundedContextId: ctx });
        host.expandNode(ctx);
        return;
      }
      const looseUc = (host.model.looseUseCases ?? []).find((u) => u.id === sourceId || u.id === targetId);
      if (ctx && looseUc) {
        host.command({ kind: 'set-use-case-context', id: looseUc.id, boundedContextId: ctx });
        host.expandNode(ctx);
        return;
      }
      const agg = aggById(sourceId) ?? aggById(targetId);
      const looseEnt = entById(sourceId) ?? entById(targetId);
      if (agg && looseEnt && !looseEnt.aggregateId) {
        host.command({ kind: 'set-entity-aggregate', id: looseEnt.id, aggregateId: agg.id });
        host.expandNode(agg.id);
        return;
      }
      const looseVo = voById(sourceId) ?? voById(targetId);
      if (agg && looseVo && !looseVo.aggregateId) {
        host.command({ kind: 'set-value-object-aggregate', id: looseVo.id, aggregateId: agg.id });
        host.expandNode(agg.id);
        return;
      }
      // A loose nested element (operation/invariant/field/step) is adopted into a valid parent.
      const looseEl = (host.model.looseElements ?? []).find((e) => e.id === sourceId || e.id === targetId);
      if (looseEl) {
        const other = looseEl.id === sourceId ? targetId : sourceId;
        const entOf = (id: string) => (host.model.entities ?? []).find((e) => e.id === id);
        let ownerId: string | null = null;
        if (looseEl.elementType === 'operation') {
          ownerId = aggById(other)?.id ?? null;
        } else if (looseEl.elementType === 'invariant') {
          ownerId = aggById(other)?.id ?? entOf(other)?.id ?? voById(other)?.id ?? null;
        } else if (looseEl.elementType === 'field') {
          const model = (host.model.models ?? []).find((mo) => mo.id === other);
          ownerId = model?.id ?? aggById(other)?.modelId ?? entOf(other)?.modelId ?? null;
        } else if (looseEl.elementType === 'use-case-step') {
          const uc = host.model.boundedContexts.flatMap((bc) => bc.useCases ?? []).find((u) => u.id === other)
            ?? (host.model.looseUseCases ?? []).find((u) => u.id === other);
          ownerId = uc?.id ?? null;
        } else if (looseEl.elementType === 'read-model') {
          ownerId = host.model.boundedContexts.find((b) => b.id === other)?.id ?? aggById(other)?.id ?? null;
        } else if (looseEl.elementType === 'external-table') {
          ownerId = host.model.externalSystems.find((x) => x.id === other)?.id ?? null;
        } else if (looseEl.elementType === 'integration-event') {
          ownerId = host.model.boundedContexts.find((b) => b.id === other)?.id ?? null;
        }
        if (ownerId) {
          host.command({ kind: 'adopt-loose-element', id: looseEl.id, ownerId });
          host.expandNode(ownerId); // keep the just-adopted child visible
          return;
        }
      }
    }
    // On the unified canvas the caller passes 'context-map'; read the real meaning from the
    // endpoints. Distribution/eventstorming MODES arrive as their own view and keep it; the
    // '__classic' sentinel (an internal re-entry from connectionOptions) also keeps context-map.
    if (view === 'context-map' && connectKind !== '__classic') {
      view = resolveConnectLens(host, sourceId, targetId, connectKind);
    }
    // Distribution level: a line means packaging (elemento → módulo) or deployment
    // (servicio → módulo). Anything else falls through to the usual meanings.
    if (view === 'distribution') {
      const scene = host.sceneFor('distribution');
      const modules = host.model.modules ?? [];
      const boxOf = (id: string): string | null => {
        for (let cur: string | undefined = id; cur; ) {
          if (modules.some((cm) => cm.id === cur)) return cur;
          const n = scene.nodes.find((x) => x.id === cur);
          cur = n ? n.ownerId ?? n.parentId : undefined;
        }
        return null;
      };
      // A line from a service to a URL says the service answers there (either direction).
      const urlIdsOnMap = new Set((host.model.urls ?? []).map((u) => u.id));
      const svcIds = new Set((host.model.services ?? []).map((sv) => sv.id));
      if (svcIds.has(sourceId) && urlIdsOnMap.has(targetId)) {
        host.command({ kind: 'add-service-url', serviceId: sourceId, id: targetId });
        return;
      }
      if (urlIdsOnMap.has(sourceId) && svcIds.has(targetId)) {
        host.command({ kind: 'add-service-url', serviceId: targetId, id: sourceId });
        return;
      }
      const targetBox = boxOf(targetId);
      if (targetBox && targetBox !== sourceId) {
        if ((host.model.services ?? []).some((s) => s.id === sourceId)) {
          host.command({ kind: 'add-service-module', serviceId: sourceId, id: targetBox });
          return;
        }
      }
      // A collapsed context (single main module) is itself the deployment target:
      // the service's line lands on the context and deploys its main module.
      if ((host.model.services ?? []).some((s) => s.id === sourceId)) {
        const context = host.model.boundedContexts.find((mo) => mo.id === targetId);
        const own = context ? modules.filter((cm) => cm.boundedContextId === context.id) : [];
        const main = own.find((cm) => cm.main) ?? own[0];
        if (main) {
          host.command({ kind: 'add-service-module', serviceId: sourceId, id: main.id });
          return;
        }
      }
      if (targetBox && targetBox !== sourceId) {
        const isElement =
          !modules.some((cm) => cm.id === sourceId) &&
          !host.model.boundedContexts.some((mo) => mo.id === sourceId);
        if (isElement) {
          // the backend moves it: an element lives in ONE boundedContext of its context
          host.command({ kind: 'add-module-element', id: targetBox, elementId: sourceId });
          return;
        }
      }
    }
    // EventStorming: a step dropped on a CODE sticky delegates in that hand-written code.
    if (view === 'eventstorming') {
      const isCC = (id: string) => (host.model.customCodes ?? []).some((cc) => cc.id === id);
      const pair = isCC(targetId)
        ? { stepId: sourceId, ccId: targetId }
        : isCC(sourceId)
          ? { stepId: targetId, ccId: sourceId }
          : null;
      if (pair) {
        const owner = host.owningUseCaseOf(pair.stepId);
        if (owner) {
          host.command({
            kind: 'set-use-case-step-custom-code',
            useCaseId: owner.id,
            id: pair.stepId,
            targetId: pair.ccId,
          });
        }
        return;
      }
      return;
    }
    // In the workflows view, dragging step A → step B declares "B depends on A".
    if (view === 'workflows') {
      // actor ⇆ paso: la tarea se vuelve humana — el rol recibe su lista de tareas
      const isActor = (id: string) => (host.model.actors ?? []).some((a) => a.id === id);
      if (isActor(sourceId) !== isActor(targetId)) {
        const roleId = isActor(sourceId) ? sourceId : targetId;
        const stepId = isActor(sourceId) ? targetId : sourceId;
        const roleOwner = host.owningWorkflowOf(stepId);
        if (roleOwner) {
          host.command({ kind: 'set-workflow-step-role', workflowId: roleOwner.id, id: stepId, targetId: roleId });
          return;
        }
      }
      // paso ⇆ página: el formulario de la tarea humana (cualquier dirección)
      const isPage = (id: string) => (host.model.pages ?? []).some((p) => p.id === id);
      if (isPage(sourceId) !== isPage(targetId)) {
        const pageId = isPage(sourceId) ? sourceId : targetId;
        const stepId = isPage(sourceId) ? targetId : sourceId;
        const owner = host.owningWorkflowOf(stepId);
        if (owner) {
          host.command({ kind: 'set-workflow-step-form', workflowId: owner.id, id: stepId, targetId: pageId });
          return;
        }
      }
      const gateways = host.model.workflowGateways ?? [];
      const isGateway = (id: string) => gateways.some((g) => g.id === id);
      // gateways y saltos a otro workflow: un solo comando, el backend valida la gramática
      if (isGateway(sourceId) || isGateway(targetId)
          || (host.model.workflows ?? []).some((w) => w.id === targetId)) {
        if (sourceId === targetId) return;
        host.command({ kind: 'add-workflow-link', sourceId, targetId });
        return;
      }
      const sourceOwner = host.owningWorkflowOf(sourceId);
      const targetOwner = host.owningWorkflowOf(targetId);
      if (!sourceOwner || sourceOwner !== targetOwner || sourceId === targetId) return;
      const target = sourceOwner.steps.find((s) => s.id === targetId);
      if ((target?.dependsOnStepIds ?? []).includes(sourceId)) return;
      host.command({
        kind: 'add-workflow-dependency',
        workflowId: sourceOwner.id,
        id: targetId,
        dependsOnStepId: sourceId,
      });
      return;
    }
    if (view === 'ui') {
      const pages = host.model.pages ?? [];
      const apps = host.model.uiApps ?? [];
      const isApp = (id: string) => apps.some((a) => a.id === id);
      const isPage = (id: string) => pages.some((x) => x.id === id);
      // UI declarada ⇆ app/página: la ASIGNACIÓN (cualquier dirección) — antes
      // que el resto del vocabulario de la vista, que no la conoce.
      const isUi = (id: string) => (host.model.uis ?? []).some((u) => u.id === id);
      if (isUi(sourceId) !== isUi(targetId)) {
        const ui = isUi(sourceId) ? sourceId : targetId;
        const other = ui === sourceId ? targetId : sourceId;
        if (isApp(other) || isPage(other)) {
          host.command({ kind: 'add-ui-assignment', id: ui, targetId: other });
          return;
        }
        if ((host.model.actors ?? []).some((a) => a.id === other)) {
          host.command({ kind: 'add-ui-serving', id: ui, targetId: other });
          return;
        }
      }
      const isCC = (id: string) => (host.model.customCodes ?? []).some((cc) => cc.id === id);
      // custom code: página ↔ CODE la hace custom; CODE → cualquier otro elemento = «lo usa»
      if (isCC(sourceId) || isCC(targetId)) {
        const ccId = isCC(sourceId) ? sourceId : targetId;
        const other = isCC(sourceId) ? targetId : sourceId;
        if (isCC(other)) return;
        if (isPage(other)) {
          host.command({ kind: 'set-page-custom-code', id: other, targetId: ccId });
          return;
        }
        host.command({ kind: 'add-custom-code-use', id: ccId, elementId: other });
        return;
      }
      const groups = host.model.buttonGroups ?? [];
      const isGroup = (id: string) => groups.some((g) => g.id === id);
      // grupo → página con asa tipada: engancha a la barra elegida
      if ((connectKind === 'toolbar' || connectKind === 'bottom') && isGroup(sourceId) && isPage(targetId)) {
        host.command({ kind: 'add-page-bar-group', pageId: targetId, id: sourceId, bar: connectKind });
        return;
      }
      // grupo → grupo: se anida como subgrupo
      if (isGroup(sourceId) && isGroup(targetId) && sourceId !== targetId) {
        host.command({ kind: 'add-group-subgroup', id: targetId, targetId: sourceId });
        return;
      }
      // botón del grupo → caso de uso o policy: eso es lo que dispara
      const gbtn = /^gbtn:([^:]+):(.+)$/.exec(sourceId);
      if (gbtn) {
        const isUseCase = host.model.boundedContexts.some((mo) => (mo.useCases ?? []).some((u) => u.id === targetId));
        if (isUseCase) {
          host.command({ kind: 'set-group-button-target', id: gbtn[1], itemId: gbtn[2], useCaseId: targetId });
        } else {
          host.emit('modux-notice', { message: t('gestures.notice.buttonWiresToUseCase') });
        }
        return;
      }
      // typed handles first: they say exactly WHAT the line means
      if (connectKind === 'home' && isApp(sourceId) && (isPage(targetId) || isApp(targetId))) {
        if (targetId === sourceId) return;
        host.command(
          isPage(targetId)
            ? { kind: 'set-app-home-page', appId: sourceId, pageId: targetId }
            : { kind: 'set-app-home-page', appId: sourceId, pageId: null, toAppId: targetId },
        );
        return;
      }
      if (connectKind === 'header' && isApp(sourceId) && isPage(targetId)) {
        host.command({ kind: 'set-app-header-page', appId: sourceId, pageId: targetId });
        return;
      }
      if (
        (connectKind === 'crud-detail' || connectKind === 'crud-create') &&
        isPage(sourceId) &&
        (isPage(targetId) || isApp(targetId)) &&
        targetId !== sourceId
      ) {
        const kind = connectKind === 'crud-detail' ? 'set-crud-detail' : 'set-crud-create';
        host.command(
          isPage(targetId)
            ? { kind, pageId: sourceId, targetId, toAppId: null }
            : { kind, pageId: sourceId, targetId: null, toAppId: targetId },
        );
        return;
      }
      if (connectKind === 'viewmodel' && isPage(sourceId)) {
        if ((host.model.models ?? []).some((mo) => mo.id === targetId)) {
          host.command({ kind: 'set-page-model', pageId: sourceId, modelId: targetId });
        } else {
          host.emit('modux-notice', { message: t('gestures.notice.viewmodelToModel') });
        }
        return;
      }
      if ((connectKind === 'view' || connectKind === 'edit') && isApp(sourceId) && isPage(targetId)) {
        host.command({
          kind: connectKind === 'view' ? 'set-app-view-page' : 'set-app-edit-page',
          appId: sourceId,
          pageId: targetId,
        });
        return;
      }

      if (connectKind) return; // a typed line means nothing else
      // a step row wired to a page MAPS the step onto it (either direction)
      const rowRef = (id: string) => /^wizrow:([^:]+):(.+)$/.exec(id);
      const rowSide = rowRef(sourceId) ?? rowRef(targetId);
      if (rowSide) {
        const other = rowRef(sourceId) ? targetId : sourceId;
        if (isPage(other) && other !== rowSide[1]) {
          host.command({ kind: 'set-wizard-step-page', pageId: rowSide[1], itemId: rowSide[2], targetId: other });
        }
        return;
      }
      // a page dropped on the WIZARD body joins it as a new (mapped) step
      const wizTarget = pages.find((pg) => pg.id === targetId && pg.type === 'WIZARD');
      if (isPage(sourceId) && wizTarget && sourceId !== wizTarget.id) {
        if (!(wizTarget.wizardSteps ?? []).some((s) => s.pageId === sourceId)) {
          host.command({ kind: 'add-page-wizard-step', pageId: wizTarget.id, targetId: sourceId });
        }
        return;
      }
      // a page dropped on an app (drag or catalog): a menu entry that opens it —
      // except on a headerless MASTER-DETAIL, where the first page IS the header
      if (isPage(sourceId) && isApp(targetId)) {
        const page = pages.find((x) => x.id === sourceId)!;
        const app = apps.find((a) => a.id === targetId)!;
        if (app.type === 'MASTER_DETAIL' && !app.headerPageId) {
          host.command({ kind: 'set-app-header-page', appId: targetId, pageId: sourceId });
          host.emit('modux-notice', {
            message: t('gestures.notice.pageIsHeader', { page: page.name, app: app.name }),
          });
          return;
        }
        host.command({
          kind: 'add-menu-item',
          appId: targetId,
          label: page.name,
          pageId: sourceId,
          itemId: host.newMenuItemId(page.name),
        });
        return;
      }
      // an app wired to an IdP: its users authenticate there (either direction)
      const idpsUi = host.model.identityProviders ?? [];
      const isIdp = (id: string) => idpsUi.some((x) => x.id === id);
      if (isIdp(sourceId) || isIdp(targetId)) {
        const idpId = isIdp(sourceId) ? sourceId : targetId;
        const other = isIdp(sourceId) ? targetId : sourceId;
        if (isApp(other)) {
          host.command({ kind: 'set-identity-provider', id: other, targetId: idpId });
        } else {
          host.emit('modux-notice', { message: t('gestures.notice.idpInUiView') });
        }
        return;
      }
      // a model wired to a page or an app becomes its VIEWMODEL (either direction)
      const isModel = (id: string) => (host.model.models ?? []).some((mo) => mo.id === id);
      if (isModel(sourceId) || isModel(targetId)) {
        const modelId = isModel(sourceId) ? sourceId : targetId;
        const other = isModel(sourceId) ? targetId : sourceId;
        if (isPage(other)) {
          host.command({ kind: 'set-page-model', pageId: other, modelId });
          return;
        }
        if (isApp(other)) {
          host.command({ kind: 'set-app-model', appId: other, modelId });
          return;
        }
        return;
      }
      // an entry dragged onto ANOTHER entry moves it: the edges slot it as a sibling,
      // the middle nests it (the target becomes a grouper); onto an app, to its root —
      // including another app's. The subtree travels whole.
      const srcMenu = parseMenuNodeId(sourceId);
      if (srcMenu?.itemId && (parseMenuNodeId(targetId)?.itemId || isApp(targetId))) {
        const tgtMenu = parseMenuNodeId(targetId);
        const src = host.menuEntryIn(srcMenu.appId, srcMenu.itemId);
        if (!src) return;
        if (tgtMenu?.itemId) {
          const tgt = host.menuEntryIn(tgtMenu.appId, tgtMenu.itemId);
          if (!tgt) return;
          // its own subtree is off-limits
          const inSubtree = (items?: UiMenuEntryRef[]): boolean =>
            (items ?? []).some((it) => it.id === tgtMenu.itemId || inSubtree(it.children));
          if (srcMenu.appId === tgtMenu.appId && (tgtMenu.itemId === srcMenu.itemId || inSubtree(src.entry.children))) {
            return;
          }
          // where on the row: edges slot a sibling, the middle nests
          const rect = host.nodeClientRect(targetId);
          const fr = rect && y !== undefined ? (y - rect.top) / Math.max(1, rect.height) : 0.5;
          const pos = fr < 0.3 ? 'before' : fr > 0.7 ? 'after' : 'nest';
          if (pos === 'nest') {
            host.command({
              kind: 'move-menu-item',
              appId: srcMenu.appId,
              toAppId: tgtMenu.appId,
              itemId: srcMenu.itemId,
              parentId: tgtMenu.itemId,
            });
          } else {
            const before = pos === 'before' ? tgtMenu.itemId : (tgt.beforeId ?? undefined);
            if (srcMenu.appId === tgtMenu.appId && tgt.parentId === src.parentId && before === srcMenu.itemId) return;
            host.command({
              kind: 'move-menu-item',
              appId: srcMenu.appId,
              toAppId: tgtMenu.appId,
              itemId: srcMenu.itemId,
              parentId: tgt.parentId ?? undefined,
              beforeItemId: before,
            });
          }
          return;
        }
        // dropped on an app: to its root level (also the promote-to-top gesture)
        if (srcMenu.appId === targetId && !src.parentId) return; // already there
        host.command({
          kind: 'move-menu-item',
          appId: srcMenu.appId,
          toAppId: targetId,
          itemId: srcMenu.itemId,
        });
        return;
      }
      // menu entry ↔ page or app: the entry OPENS that UI component (an app is just
      // another component, like a page) — same gesture, both directions
      const menuRef = parseMenuNodeId(sourceId) ?? parseMenuNodeId(targetId);
      if (menuRef) {
        const menuNodeIdStr = parseMenuNodeId(sourceId) ? sourceId : targetId;
        const other = parseMenuNodeId(sourceId) ? targetId : sourceId;
        if (host.sceneFor('ui').nodes.find((n) => n.id === menuNodeIdStr)?.kind === 'menu-group') {
          host.emit('modux-notice', { message: t('gestures.notice.menuGroupOpensNothing') });
          return;
        }
        const isUseCase = host.model.boundedContexts.some((mod) =>
          (mod.useCases ?? []).some((u) => u.id === other),
        );
        const isAggregate = (host.model.aggregates ?? []).some((a) => a.id === other);
        const owningQs = host.model.boundedContexts
          .flatMap((mod) => mod.queryServices ?? [])
          .find((qs) => (qs.operations ?? []).some((op) => op.id === other));
        if (isPage(other)) {
          host.command({ kind: 'set-menu-page', pageId: other, ...menuRef });
        } else if (isApp(other) && other !== menuRef.appId) {
          host.command({ kind: 'set-menu-app', toAppId: other, ...menuRef });
        } else if (isUseCase) {
          host.command({ kind: 'set-menu-use-case', useCaseId: other, ...menuRef });
        } else if (isAggregate) {
          host.command({ kind: 'set-menu-aggregate', aggregateId: other, ...menuRef });
        } else if (owningQs) {
          host.command({
            kind: 'set-menu-query-operation',
            queryServiceId: owningQs.id,
            queryOperationId: other,
            ...menuRef,
          });
        }
        return;
      }
      // app → aggregate: the app manages that aggregate through a CRUD — a menu entry is added
      // and its CRUD page (+ listing query, use cases, lifecycle events) is materialized from it.
      // The UI twin of actor → aggregate: the actor says WHO may run the CRUD, the app says WHERE.
      if (isApp(sourceId) && (host.model.aggregates ?? []).some((a) => a.id === targetId)) {
        host.command({ kind: 'add-ui-crud', sourceId, targetId });
        return;
      }
      // actor → app: the actor uses that app
      if ((host.model.actors ?? []).some((a) => a.id === sourceId) && isApp(targetId)) {
        if (!(host.model.actorAppUses ?? []).some((u) => u.actorId === sourceId && u.appId === targetId)) {
          host.command({ kind: 'add-actor-app', actorId: sourceId, appId: targetId });
        }
        return;
      }
      // page ↔ use case (a toolbar button) / query service (the listing source),
      // in either direction so the catalog can drop system pieces ON the page
      const pair = isPage(sourceId)
        ? { pageId: sourceId, other: targetId }
        : isPage(targetId)
          ? { pageId: targetId, other: sourceId }
          : null;
      if (pair) {
        const useCaseIds = new Set(
          host.model.boundedContexts.flatMap((m) => (m.useCases ?? []).map((u) => u.id)),
        );
        const queryServiceIds = new Set(
          host.model.boundedContexts.flatMap((m) => (m.queryServices ?? []).map((q) => q.id)),
        );
        const page = pages.find((x) => x.id === pair.pageId)!;
        if (useCaseIds.has(pair.other)) {
          if (!(page.buttons ?? []).some((b) => b.useCaseId === pair.other)) {
            host.command({ kind: 'add-page-button', pageId: pair.pageId, useCaseId: pair.other });
          }
        } else if (queryServiceIds.has(pair.other)) {
          host.command({ kind: 'set-page-listing', pageId: pair.pageId, queryServiceId: pair.other });
        }
      }
      return;
    }
    if (view === 'mappings') {
      const models = host.model.models ?? [];
      const srcField = parseFieldNodeId(sourceId);
      const tgtField = parseFieldNodeId(targetId);
      const transformations = host.model.transformations ?? [];
      const customCodes = host.model.customCodes ?? [];
      const isCustomCode = (id: string) => customCodes.some((cc) => cc.id === id);
      // custom code ↔ transformación: la transformación delega en ese código.
      if (isCustomCode(sourceId) && transformations.some((t) => t.id === targetId)) {
        host.command({ kind: 'set-transformation-custom-code', id: targetId, targetId: sourceId });
        return;
      }
      if (isCustomCode(targetId) && transformations.some((t) => t.id === sourceId)) {
        host.command({ kind: 'set-transformation-custom-code', id: sourceId, targetId });
        return;
      }
      // custom code → un modelo mapeado: el MAPEADO de ese modelo delega en el código
      // (si participa en varios, se elige desde la ficha del mapeado).
      if (isCustomCode(sourceId)) {
        const overModel = tgtField?.modelId ?? (models.some((m) => m.id === targetId) ? targetId : null);
        if (overModel) {
          const involved = (host.model.modelMappings ?? []).filter(
            (mm) => mm.sourceModelId === overModel || mm.targetModelId === overModel,
          );
          if (involved.length === 1) {
            host.command({ kind: 'set-mapping-custom-code', id: involved[0].id, targetId: sourceId });
          } else {
            host.emit('modux-notice', {
              message: involved.length
                ? t('gestures.notice.modelInSeveralMappings')
                : t('gestures.notice.modelHasNoMappings'),
            });
          }
          return;
        }
        return;
      }
      // modelo/campo → transformación: una ENTRADA más; transformación → modelo/campo: su SALIDA.
      if (transformations.some((t) => t.id === targetId)) {
        if (tgtField || transformations.some((t) => t.id === sourceId)) return;
        const input = srcField
          ? { modelId: srcField.modelId, fieldId: srcField.fieldId }
          : models.some((m) => m.id === sourceId)
            ? { modelId: sourceId }
            : null;
        if (input) host.command({ kind: 'add-transformation-input', id: targetId, ...input });
        return;
      }
      if (transformations.some((t) => t.id === sourceId)) {
        const output = tgtField
          ? { modelId: tgtField.modelId, fieldId: tgtField.fieldId }
          : models.some((m) => m.id === targetId)
            ? { modelId: targetId }
            : null;
        if (output) host.command({ kind: 'set-transformation-output', id: sourceId, ...output });
        return;
      }
      // campo → campo (de OTRO modelo): una regla del mapeado entre sus modelos,
      // creando el mapeado en el mismo gesto si aún no existe.
      if (srcField && tgtField) {
        if (srcField.modelId === tgtField.modelId) {
          host.emit('modux-notice', { message: t('gestures.notice.rulesNeedDistinctModels') });
          return;
        }
        let mapping = (host.model.modelMappings ?? []).find(
          (mm) => mm.sourceModelId === srcField.modelId && mm.targetModelId === tgtField.modelId,
        );
        if (!mapping) {
          const src = models.find((m) => m.id === srcField.modelId);
          const tgt = models.find((m) => m.id === tgtField.modelId);
          if (!src || !tgt) return;
          const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');
          const taken = new Set((host.model.modelMappings ?? []).map((mm) => mm.id));
          let mid = `mapping-${slug(src.name)}-${slug(tgt.name)}`;
          for (let n = 2; taken.has(mid); n++) mid = `mapping-${slug(src.name)}-${slug(tgt.name)}-${n}`;
          host.command(
            { kind: 'add-model-mapping', id: mid, name: `${clean(src.name)}2${clean(tgt.name)}`, sourceId: src.id, targetId: tgt.id },
            false,
          );
          mapping = { id: mid, name: '', sourceModelId: src.id, targetModelId: tgt.id };
        }
        host.command({
          kind: 'add-model-mapping-rule',
          id: mapping.id,
          sourceId: srcField.fieldId,
          targetId: tgtField.fieldId,
        });
        return;
      }
      // campo → otro modelo: el campo se MUEVE allí (sus reglas caducan).
      if (srcField && models.some((m) => m.id === targetId) && targetId !== srcField.modelId) {
        host.command({ kind: 'move-model-field', modelId: srcField.modelId, fieldId: srcField.fieldId, targetId });
        return;
      }
      if (!models.some((m) => m.id === sourceId) || !models.some((m) => m.id === targetId)) return;
      if (sourceId === targetId) return;
      if ((host.model.modelMappings ?? []).some((mm) => mm.sourceModelId === sourceId && mm.targetModelId === targetId)) {
        return;
      }
      const src = models.find((m) => m.id === sourceId)!;
      const tgt = models.find((m) => m.id === targetId)!;
      const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');
      const taken = new Set((host.model.modelMappings ?? []).map((mm) => mm.id));
      let id = `mapping-${slug(src.name)}-${slug(tgt.name)}`;
      for (let n = 2; taken.has(id); n++) id = `mapping-${slug(src.name)}-${slug(tgt.name)}-${n}`;
      host.command({
        kind: 'add-model-mapping',
        id,
        name: `${clean(src.name)}2${clean(tgt.name)}`,
        sourceId,
        targetId,
      });
      return;
    }
    // Aggregates view: the only wiring is composition — a value object (or an entity)
    // dropped on an aggregate belongs there. A VO has exactly one owner, so this moves
    // it off any previous aggregate; an entity's parentAggregateId changes.
    if (view === 'aggregates') {
      // Dropping a value object (or a pure Model) ON a field sets that field's TYPE.
      const targetField = [...(host.model.aggregates ?? []), ...(host.model.entities ?? [])]
        .flatMap((o) => o.fields ?? [])
        .find((f) => f.id === targetId);
      if (targetField) {
        const modelId = targetField.modelId;
        if (modelId && (host.model.valueObjects ?? []).some((v) => v.id === sourceId)) {
          host.command({ kind: 'set-model-field-type', modelId, fieldId: targetId, type: 'value-object', targetId: sourceId });
        } else if (modelId && (host.model.entities ?? []).some((e) => e.id === sourceId)) {
          host.command({ kind: 'set-model-field-type', modelId, fieldId: targetId, type: 'entity', targetId: sourceId });
        } else if (modelId && (host.model.models ?? []).some((m) => m.id === sourceId)) {
          host.command({ kind: 'set-model-field-type', modelId, fieldId: targetId, type: 'model', targetId: sourceId });
        }
        return;
      }
      if ((host.model.aggregates ?? []).some((a) => a.id === targetId)) {
        const vo = (host.model.valueObjects ?? []).find((v) => v.id === sourceId);
        if (vo) {
          if (vo.aggregateId !== targetId) {
            host.command({ kind: 'set-value-object-aggregate', id: sourceId, aggregateId: targetId });
          }
          return;
        }
        const ent = (host.model.entities ?? []).find((e) => e.id === sourceId);
        if (ent && ent.aggregateId !== targetId) {
          host.command({ kind: 'set-entity-aggregate', id: sourceId, aggregateId: targetId });
        }
      }
      return;
    }
    if (view !== 'context-map') return;
    // The relation vocabulary: a traced line asks when SEVERAL typed meanings
    // fit — draw first, decide after. The classic resolver keeps the unambiguous
    // rest (sentinel: '__classic').
    if (connectKind !== '__classic' && connectKind === undefined) {
      const typed = connectionOptions(host, sourceId, targetId);
      // Composition-into-a-system must never auto-apply: a system↔system/context line is just as
      // likely serving or another ArchiMate type, so it always asks (composition + the vocabulary).
      const autoApply = typed.length === 1 && typed[0].id !== 'system-composition';
      if (autoApply) {
        // one meaning: no question, no detour — the trace IS that relation
        typed[0].apply();
        return;
      }
      if (typed.length >= 1) {
        host.openConnectPicker({
          x: x ?? 0,
          y: y ?? 0,
          options: [...typed, ...archimateOptions(host, sourceId, targetId)],
        });
        return;
      }
    }
    // A proxy's operation occurrence → an implementation SITE of the fronted API: the
    // published API node (in its external system) or an api-impl occurrence (in a
    // bounded context; the bare context also counts when it implements the API).
    const opOcc = /^apiop:(.+)@(.+)$/.exec(sourceId);
    if (opOcc) {
      const [, operationId, siteId] = opOcc;
      const px = (host.model.proxyApis ?? []).find((p) => p.id === siteId);
      // The occurrence's API: through the proxy's target, or the site boundedContext's implementation.
      const occApiId =
        px?.targetApiId ??
        (host.model.apiImplementations ?? []).find(
          (impl) =>
            impl.boundedContextId === siteId &&
            (host.model.apis ?? []).some(
              (a) => a.id === impl.apiId && a.operations.some((o) => o.id === operationId),
            ),
        )?.apiId;
      if (!occApiId) return;
      // Occurrence → use case: the fine wiring of the OPERATION itself (any site, same op).
      const occUcIds = new Set(
        host.model.boundedContexts.flatMap((m) => (m.useCases ?? []).map((u) => u.id)),
      );
      if (occUcIds.has(targetId)) {
        // From an occurrence, the wiring is ALWAYS per-site: the site is the bounded
        // context implementing the API, or the proxy fronting it — the use case serving
        // the operation there may live in any context. (The published chip keeps the
        // global targetUseCaseId wiring.)
        host.command({
          kind: 'set-api-operation-implementation',
          apiId: occApiId,
          operationId,
          boundedContextId: siteId,
          targetUseCaseId: targetId,
        });
        return;
      }
      // The routing gestures below only make sense from a PROXY's occurrence.
      if (!px?.targetApiId) return;
      let targetSiteId: string | null = null;
      if (targetId === px.targetApiId) {
        targetSiteId = px.targetApiId; // as published
      } else {
        const implTarget = /^apiimpl:(.+)@(.+)$/.exec(targetId);
        if (implTarget && implTarget[1] === px.targetApiId) {
          targetSiteId = implTarget[2];
        } else if (
          host.model.boundedContexts.some((m) => m.id === targetId) &&
          (host.model.apiImplementations ?? []).some(
            (impl) => impl.apiId === px.targetApiId && impl.boundedContextId === targetId,
          )
        ) {
          targetSiteId = targetId;
        }
      }
      if (!targetSiteId) return;
      const already = (host.model.proxyOperationRoutes ?? []).some(
        (r) => r.proxyId === px.id && r.operationId === operationId && r.targetSiteId === targetSiteId,
      );
      if (!already) {
        host.command({
          kind: 'add-proxy-operation-route',
          proxyId: px.id,
          operationId,
          targetSiteId,
        });
      }
      return;
    }
    // Actor and AI-agent drags come first: they may legally end on children (use
    // cases, query services, aggregates) that other gestures treat as off-limits.
    const agentIds = new Set((host.model.aiAgents ?? []).map((a) => a.id));
    if (agentIds.has(sourceId)) {
      const agentUcIds = new Set(
        host.model.boundedContexts.flatMap((m) => (m.useCases ?? []).map((u) => u.id)),
      );
      if (agentUcIds.has(targetId)) {
        const already = (host.model.agentUses ?? []).some(
          (u) => u.agentId === sourceId && u.useCaseId === targetId,
        );
        if (!already) host.command({ kind: 'add-agent-use', sourceId, targetId });
        return;
      }
      // The other half of the agent's tool surface: external-system operations.
      const agentExtUcIds = new Set(
        host.model.externalSystems.flatMap((x) => (x.useCases ?? []).map((u) => u.id)),
      );
      if (agentExtUcIds.has(targetId)) {
        const already = (host.model.agentExternalUses ?? []).some(
          (u) => u.agentId === sourceId && u.externalUseCaseId === targetId,
        );
        if (!already) host.command({ kind: 'add-agent-external-use', sourceId, targetId });
        return;
      }
      // Or a whole MCP server published by an external system.
      const agentMcpIds = new Set(
        host.model.externalSystems.flatMap((x) => (x.mcpServers ?? []).map((s) => s.id)),
      );
      if (agentMcpIds.has(targetId)) {
        const already = (host.model.agentMcpUses ?? []).some(
          (u) => u.agentId === sourceId && u.mcpServerId === targetId,
        );
        if (!already) host.command({ kind: 'add-agent-mcp', sourceId, targetId });
        return;
      }
      // Or one of our MCP gateways (a curated tool surface).
      if ((host.model.mcpGateways ?? []).some((g) => g.id === targetId)) {
        const already = (host.model.agentGatewayUses ?? []).some(
          (u) => u.agentId === sourceId && u.gatewayId === targetId,
        );
        if (!already) host.command({ kind: 'add-agent-gateway', sourceId, targetId });
        return;
      }
      // Or an API operation as a tool.
      const agentApiOpIds = new Set(
        (host.model.apis ?? []).flatMap((a) => a.operations.map((o) => o.id)),
      );
      if (agentApiOpIds.has(targetId)) {
        const already = (host.model.agentApiOpUses ?? []).some(
          (u) => u.agentId === sourceId && u.apiOperationId === targetId,
        );
        if (!already) host.command({ kind: 'add-agent-api-operation', sourceId, targetId });
        return;
      }
      // Or a WHOLE API — real or proxy — as a tool (every operation of it).
      if (
        (host.model.apis ?? []).some((a) => a.id === targetId) ||
        (host.model.proxyApis ?? []).some((px) => px.id === targetId)
      ) {
        const already = (host.model.agentApiUses ?? []).some(
          (u) => u.agentId === sourceId && u.apiId === targetId,
        );
        if (!already) host.command({ kind: 'add-agent-api', sourceId, targetId });
        return;
      }
      // Or a query service as a read tool.
      const agentQsIds = new Set(
        host.model.boundedContexts.flatMap((m) => (m.queryServices ?? []).map((q) => q.id)),
      );
      if (agentQsIds.has(targetId)) {
        const already = (host.model.agentQueryUses ?? []).some(
          (u) => u.agentId === sourceId && u.queryServiceId === targetId,
        );
        if (!already) host.command({ kind: 'add-agent-query', sourceId, targetId });
        return;
      }
      // Or another agent: delegation.
      if (agentIds.has(targetId) && targetId !== sourceId) {
        const already = (host.model.agentDelegations ?? []).some(
          (u) => u.agentId === sourceId && u.delegateAgentId === targetId,
        );
        if (!already) host.command({ kind: 'add-agent-delegate', sourceId, targetId });
        return;
      }
      // Knowledge: the agent grounds its answers on the RAG.
      if ((host.model.rags ?? []).some((r) => r.id === targetId)) {
        const already = (host.model.agentRags ?? []).some(
          (u) => u.agentId === sourceId && u.ragId === targetId,
        );
        if (!already) host.command({ kind: 'add-agent-rag', sourceId, targetId });
      }
      return;
    }
    // The MCP gateway aggregates/exposes whatever it is dragged onto.
    if ((host.model.mcpGateways ?? []).some((g) => g.id === sourceId)) {
      const gw = (host.model.mcpGateways ?? []).find((g) => g.id === sourceId)!;
      const exposable =
        host.model.externalSystems.some((x) => (x.mcpServers ?? []).some((s) => s.id === targetId)) ||
        (host.model.apis ?? []).some((a) => a.id === targetId) ||
        (host.model.apis ?? []).some((a) => a.operations.some((o) => o.id === targetId)) ||
        host.model.boundedContexts.some((m) => (m.useCases ?? []).some((u) => u.id === targetId)) ||
        (host.model.rags ?? []).some((r) => r.id === targetId);
      const already = [
        ...(gw.mcpServerIds ?? []),
        ...(gw.apiIds ?? []),
        ...(gw.apiOperationIds ?? []),
        ...(gw.useCaseIds ?? []),
        ...(gw.ragIds ?? []),
      ].includes(targetId);
      if (exposable && !already) {
        host.command({ kind: 'add-gateway-exposure', sourceId, targetId });
      }
      return;
    }
    if ((host.model.mcpGateways ?? []).some((g) => g.id === targetId)) return; // gateways only take agents/exposures
    // Dragging a RAG onto a read model declares its source: the RAG indexes it.
    const rag = (host.model.rags ?? []).find((r) => r.id === sourceId);
    if (rag) {
      const readModelIds = new Set(
        host.model.boundedContexts.flatMap((m) => (m.readModels ?? []).map((rm) => rm.id)),
      );
      if (readModelIds.has(targetId) && !(rag.sourceReadModelIds ?? []).includes(targetId)) {
        host.command({ kind: 'add-rag-source', sourceId, targetId });
        return;
      }
      // Structured legacy content: a table owned by an external system.
      const extTableIds = new Set(
        host.model.externalSystems.flatMap((x) => (x.tables ?? []).map((t) => t.id)),
      );
      if (extTableIds.has(targetId) && !(rag.sourceExternalTableIds ?? []).includes(targetId)) {
        host.command({ kind: 'add-rag-source', sourceId, targetId });
        return;
      }
      // Or an API — real or proxy — whose content it indexes by calling it.
      if (
        ((host.model.apis ?? []).some((a) => a.id === targetId) ||
          (host.model.proxyApis ?? []).some((px) => px.id === targetId)) &&
        !(rag.sourceApiIds ?? []).includes(targetId)
      ) {
        host.command({ kind: 'add-rag-source', sourceId, targetId });
        return;
      }
      // Coarse sources: a whole external system, or a whole bounded context.
      if (
        host.model.externalSystems.some((x) => x.id === targetId) &&
        !(rag.sourceExternalSystemIds ?? []).includes(targetId)
      ) {
        host.command({ kind: 'add-rag-source', sourceId, targetId });
        return;
      }
      if (
        host.model.boundedContexts.some((mo) => mo.id === targetId) &&
        !(rag.sourceBoundedContextIds ?? []).includes(targetId)
      ) {
        host.command({ kind: 'add-rag-source', sourceId, targetId });
      }
      return;
    }
    if ((host.model.rags ?? []).some((r) => r.id === targetId)) return; // rag targets only make sense from agents
    // Dragging a WORKFLOW onto a use case adds a step orchestrating it; onto
    // ANOTHER workflow, chains them: A's completion event becomes B's trigger.
    if ((host.model.workflows ?? []).some((w) => w.id === sourceId)) {
      const wf = (host.model.workflows ?? []).find((w) => w.id === sourceId)!;
      const targetWf = (host.model.workflows ?? []).find(
        (w) => w.id === targetId && w.id !== sourceId,
      );
      if (targetWf) {
        const completion =
          wf.onCompletionEventName || `${wf.name.replace(/\s+/g, '')}Completado`;
        if (targetWf.triggerEvent !== completion) {
          host.command({ kind: 'set-workflow-trigger', id: targetId, triggerEvent: completion });
        }
        return;
      }
      const uc = host.model.boundedContexts
        .flatMap((mo) => mo.useCases ?? [])
        .find((u) => u.id === targetId);
      if (uc) {
        const already = (wf.steps ?? []).some((st) => st.targetUseCaseId === targetId);
        if (!already) {
          const base = `wfs-${slug(uc.name)}`;
          let stepId = base;
          for (let n = 2; (wf.steps ?? []).some((st) => st.id === stepId); n++) {
            stepId = `${base}-${n}`;
          }
          host.command({
            kind: 'add-workflow-step',
            workflowId: sourceId,
            id: stepId,
            name: uc.name,
            targetUseCaseId: targetId,
          });
        }
      }
      return;
    }
    // Dragging an EVENT onto a workflow points its trigger at that event.
    if ((host.model.workflows ?? []).some((w) => w.id === targetId)) {
      const domainEv = host.model.boundedContexts
        .flatMap((mo) => mo.domainEvents ?? [])
        .find((ev) => ev.id === sourceId);
      const appEv = host.model.boundedContexts
        .flatMap((mo) => mo.applicationEvents ?? [])
        .find((ev) => ev.id === sourceId);
      const ev = domainEv ?? appEv;
      if (ev) {
        // Best effort on the emitter: whoever the emission edges say publishes it.
        const emitter = (host.model.emissions ?? []).find((em) => em.domainEventId === sourceId);
        const aggregateIds2 = new Set((host.model.aggregates ?? []).map((a) => a.id));
        const dsIds2 = new Set(
          host.model.boundedContexts.flatMap((mo) => (mo.domainServices ?? []).map((d) => d.id)),
        );
        const ucIds2 = new Set(
          host.model.boundedContexts.flatMap((mo) => (mo.useCases ?? []).map((u) => u.id)),
        );
        host.command({
          kind: 'set-workflow-trigger',
          id: targetId,
          triggerEvent: ev.name,
          triggerAggregateId:
            emitter && aggregateIds2.has(emitter.sourceId) ? emitter.sourceId : undefined,
          triggerDomainServiceId:
            emitter && dsIds2.has(emitter.sourceId) ? emitter.sourceId : undefined,
          triggerUseCaseId:
            emitter && ucIds2.has(emitter.sourceId) ? emitter.sourceId : undefined,
        });
      }
      return;
    }
    // Dragging a proxy onto an API wires what it fronts; onto an external system, its host;
    // onto a bounded context, the API it fronts gets an implementation THERE too (the same
    // API — strangler style — and the proxy routes to it as well).
    if ((host.model.proxyApis ?? []).some((px) => px.id === sourceId)) {
      const px = (host.model.proxyApis ?? []).find((x) => x.id === sourceId)!;
      if ((host.model.apis ?? []).some((a) => a.id === targetId)) {
        if (px.targetApiId !== targetId) {
          host.command({ kind: 'set-proxy-target', id: sourceId, targetId });
        }
        return;
      }
      if (host.model.boundedContexts.some((m) => m.id === targetId)) {
        if (!px.targetApiId) return; // nothing to implement until the proxy fronts an API
        const already = (host.model.apiImplementations ?? []).some(
          (impl) => impl.apiId === px.targetApiId && impl.boundedContextId === targetId,
        );
        if (!already) {
          host.command({ kind: 'add-api-implementation', apiId: px.targetApiId, boundedContextId: targetId });
        }
        return;
      }
      if (host.model.externalSystems.some((x) => x.id === targetId)) {
        if (px.publishedByExternalSystemId !== targetId) {
          host.command({ kind: 'set-api-publisher', id: sourceId, targetId });
        }
      }
      return;
    }
    // Dragging an API onto an external system declares its publisher (it nests inside);
    // onto a bounded context, the sibling gesture of proxy → context: implemented there too.
    if ((host.model.apis ?? []).some((a) => a.id === sourceId)) {
      if (host.model.externalSystems.some((x) => x.id === targetId)) {
        const api = (host.model.apis ?? []).find((a) => a.id === sourceId)!;
        if (api.publishedByExternalSystemId !== targetId) {
          host.command({ kind: 'set-api-publisher', id: sourceId, targetId });
        }
        return;
      }
      if (host.model.boundedContexts.some((m) => m.id === targetId)) {
        const already = (host.model.apiImplementations ?? []).some(
          (impl) => impl.apiId === sourceId && impl.boundedContextId === targetId,
        );
        if (!already) {
          host.command({ kind: 'add-api-implementation', apiId: sourceId, boundedContextId: targetId });
        }
      }
      return;
    }
    // Agents as target: legal from an actor (talks to it) or from an event (triggers
    // it — reactive agents); the event branch lives further down, past the emission
    // sets it reuses. Anything else pointing at an agent is not a gesture.
    const actorIds = new Set((host.model.actors ?? []).map((a) => a.id));
    if (agentIds.has(targetId)) {
      const eventSourceIds = new Set([
        ...host.model.boundedContexts.flatMap((m) => (m.domainEvents ?? []).map((ev) => ev.id)),
        ...host.model.boundedContexts.flatMap((m) => (m.applicationEvents ?? []).map((ev) => ev.id)),
      ]);
      if (eventSourceIds.has(sourceId)) {
        const already = (host.model.agentTriggers ?? []).some(
          (t) => t.eventId === sourceId && t.agentId === targetId,
        );
        if (!already) host.command({ kind: 'add-agent-trigger', sourceId, targetId });
        return;
      }
      if (!actorIds.has(sourceId)) return;
    }
    // An actor never serves nor initiates — it is only ever served (see connectionOptions). So an
    // edge dragged FROM an actor creates nothing; the only actor edge is one pointing into it (a UI
    // serving it), handled by the ui-serving branch where the actor is the target.
    if (actorIds.has(sourceId)) return;
    // Dragging an API operation onto its implementer wires the published contract to
    // the domain: a use case (or policy) is the fine wiring, a context the coarse one.
    const owningApi = host.owningApiOf(sourceId);
    if (owningApi) {
      const wireUcIds = new Set(
        host.model.boundedContexts.flatMap((m) => (m.useCases ?? []).map((u) => u.id)),
      );
      if (wireUcIds.has(targetId)) {
        host.command({
          kind: 'set-api-operation-target',
          apiId: owningApi.id,
          id: sourceId,
          targetUseCaseId: targetId,
        });
        return;
      }
      if (host.model.boundedContexts.some((m) => m.id === targetId)) {
        host.command({
          kind: 'set-api-operation-target',
          apiId: owningApi.id,
          id: sourceId,
          boundedContextId: targetId,
        });
        return;
      }
      return;
    }
    // Notifications: an event wired to one fires it; the notification wired to an
    // actor adds that role as recipient.
    const notifOf = (id: string) => (host.model.notifications ?? []).find((x) => x.id === id);
    if (notifOf(sourceId) || notifOf(targetId)) {
      const notif = notifOf(sourceId) ?? notifOf(targetId)!;
      const other = notifOf(sourceId) ? targetId : sourceId;
      const isEvent = host.model.boundedContexts.some((mo) =>
        [...(mo.domainEvents ?? []), ...(mo.applicationEvents ?? [])].some((ev) => ev.id === other),
      );
      if (isEvent) {
        if (notif.eventId !== other) {
          host.command({ kind: 'set-notification-event', id: notif.id, targetId: other });
        }
        return;
      }
      if ((host.model.actors ?? []).some((a2) => a2.id === other)) {
        if (!(notif.recipientRoleIds ?? []).includes(other)) {
          host.command({ kind: 'add-notification-recipient', id: notif.id, roleId: other });
        }
        return;
      }
      host.emit('modux-notice', {
        message: t('gestures.notice.notificationWiring'),
      });
      return;
    }
    // Documents: wired to a query service (or one of its operations) it becomes a
    // query-fed report.
    const docOf = (id: string) => (host.model.documents ?? []).find((x) => x.id === id);
    if (docOf(sourceId) || docOf(targetId)) {
      const doc = docOf(sourceId) ?? docOf(targetId)!;
      const other = docOf(sourceId) ? targetId : sourceId;
      const asModel = (host.model.models ?? []).find((x) => x.id === other);
      if (asModel) {
        host.command({ kind: 'set-document-model', id: doc.id, modelId: other });
        return;
      }
      const qs = host.model.boundedContexts.flatMap((mo) => mo.queryServices ?? []).find((x) => x.id === other);
      const opOwner = host.model.boundedContexts
        .flatMap((mo) => (mo.queryServices ?? []).flatMap((x) => (x.operations ?? []).map((op) => ({ op, qs: x }))))
        .find(({ op }) => op.id === other);
      if (qs || opOwner) {
        host.command({
          kind: 'set-document-query',
          id: doc.id,
          queryServiceId: qs?.id ?? opOwner!.qs.id,
          queryOperationId: opOwner?.op.id ?? null,
        });
        return;
      }
      host.emit('modux-notice', {
        message: t('gestures.notice.documentWiring'),
      });
      return;
    }
    // Identity: wiring an element to an IdP declares the trust — a bounded context
    // validates its tokens, an ETL flow runs as one of its service identities; and
    // an IdP wired to an external system becomes FEDERATED (published by it).
    const idps = host.model.identityProviders ?? [];
    const idpOf = (id: string) => idps.find((x) => x.id === id);
    if (idpOf(sourceId) || idpOf(targetId)) {
      const idp = idpOf(sourceId) ?? idpOf(targetId)!;
      const other = idpOf(sourceId) ? targetId : sourceId;
      if (idpOf(sourceId) && host.model.externalSystems.some((x) => x.id === other)) {
        if (idp.publishedByExternalSystemId !== other) {
          host.command({ kind: 'set-idp-publisher', id: idp.id, targetId: other });
        }
        return;
      }
      const isBoundedContext = host.model.boundedContexts.some((mo) => mo.id === other);
      const isEtl = (host.model.etlFlows ?? []).some((f) => f.id === other);
      if (isBoundedContext || isEtl) {
        host.command({ kind: 'set-identity-provider', id: other, targetId: idp.id });
        return;
      }
      host.emit('modux-notice', {
        message: t('gestures.notice.idpWiring'),
      });
      return;
    }
    // ETL integrator: whatever you wire INTO the flow is a source (a table or an
    // API = pull, an event = consumer); whatever the flow wires OUT to is a write.
    const etlFlowsAll = host.model.etlFlows ?? [];
    const etlOf = (id: string) => etlFlowsAll.find((f) => f.id === id);
    if (etlOf(sourceId) || etlOf(targetId)) {
      const flow = etlOf(sourceId) ?? etlOf(targetId)!;
      const other = etlOf(sourceId) ? targetId : sourceId;
      const isSource = !etlOf(sourceId); // element dragged ONTO the flow
      const tables = new Set(host.model.externalSystems.flatMap((x) => (x.tables ?? []).map((t) => t.id)));
      const apisAll = new Set([
        ...(host.model.apis ?? []).map((a) => a.id),
        ...(host.model.proxyApis ?? []).map((px) => px.id),
      ]);
      const owningApi = (host.model.apis ?? []).find((a) => a.operations.some((o) => o.id === other));
      const evAll = new Set(
        host.model.boundedContexts.flatMap((mo) => [
          ...(mo.domainEvents ?? []).map((ev) => ev.id),
          ...(mo.applicationEvents ?? []).map((ev) => ev.id),
        ]),
      );
      let stepType: string | null = null;
      let refs: { externalTableId?: string; apiId?: string; operationId?: string; targetId?: string } = {};
      if (tables.has(other)) {
        stepType = isSource ? 'SOURCE_PULL' : 'WRITE_DB';
        refs = { externalTableId: other };
      } else if (owningApi) {
        stepType = isSource ? 'SOURCE_PULL' : 'WRITE_API';
        refs = { apiId: owningApi.id, operationId: other };
      } else if (apisAll.has(other)) {
        stepType = isSource ? 'SOURCE_PULL' : 'WRITE_API';
        refs = { apiId: other };
      } else if (evAll.has(other)) {
        stepType = isSource ? 'SOURCE_CONSUMER' : 'WRITE_EVENT';
        refs = { targetId: other };
      }
      if (!stepType) {
        host.emit('modux-notice', {
          message: t('gestures.notice.etlWiring'),
        });
        return;
      }
      const dup = (flow.steps ?? []).some(
        (s) =>
          s.type === stepType &&
          (s.externalTableId ?? s.operationId ?? s.apiId ?? s.eventId) ===
            (refs.externalTableId ?? refs.operationId ?? refs.apiId ?? refs.targetId),
      );
      if (dup) return;
      const taken = new Set((flow.steps ?? []).map((s) => s.id));
      let n = (flow.steps ?? []).length + 1;
      while (taken.has(`ets-${n}`)) n++;
      host.command({ kind: 'add-etl-step', etlFlowId: flow.id, id: `ets-${n}`, stepType, ...refs });
      return;
    }
    // Dragging an external operation or a legacy table onto a read model (or another
    // context) declares a POLLING projection — the classic legacy integration.
    const externalOp = host.model.externalSystems
      .flatMap((x) => x.useCases ?? [])
      .find((u) => u.id === sourceId);
    const externalTable = host.model.externalSystems
      .flatMap((x) => x.tables ?? [])
      .find((t) => t.id === sourceId);
    if (externalOp || externalTable) {
      const sourceName = (externalOp ?? externalTable)!.name;
      const sourceKey = externalOp
        ? { externalUseCaseId: sourceId }
        : { externalTableId: sourceId };
      const alreadyFrom = (p: import('./model.js').ProjectionRef) =>
        externalOp ? p.sourceExternalUseCaseId === sourceId : p.sourceExternalTableId === sourceId;
      const targetReadModel = host.model.boundedContexts
        .flatMap((m) => m.readModels ?? [])
        .find((rm) => rm.id === targetId);
      if (targetReadModel) {
        const exists = (host.model.projections ?? []).some(
          (p) => alreadyFrom(p) && p.readModelId === targetId,
        );
        if (!exists) {
          host.command({
            kind: 'add-projection',
            id: `proj-${slug(sourceName)}-${slug(targetReadModel.name)}`,
            name: `${targetReadModel.name}Projection`,
            ...sourceKey,
            targetId,
          });
        }
        return;
      }
      const targetBoundedContext = host.model.boundedContexts.find((m) => m.id === targetId);
      if (targetBoundedContext) {
        const exists = (host.model.projections ?? []).some(
          (p) => alreadyFrom(p) && p.boundedContextId === targetId,
        );
        if (!exists) {
          host.command({
            kind: 'add-projection',
            id: `proj-${slug(sourceName)}-${slug(targetBoundedContext.name)}`,
            name: `${sourceName}ViewProjection`,
            ...sourceKey,
            boundedContextId: targetId,
            readModelName: `${sourceName}View`,
          });
        }
        return;
      }
      return;
    }
    // Dragging an aggregate onto a read model (or another context) declares a state
    // projection: the aggregate's state is materialized there. What that implies
    // (CDC, snapshots, replication…) is decided later — this only records the intent.
    const projAggregate = (host.model.aggregates ?? []).find((a) => a.id === sourceId);
    if (projAggregate) {
      const targetReadModel = host.model.boundedContexts
        .flatMap((m) => m.readModels ?? [])
        .find((rm) => rm.id === targetId);
      if (targetReadModel) {
        const exists = (host.model.projections ?? []).some(
          (p) => p.sourceAggregateId === sourceId && p.readModelId === targetId,
        );
        if (!exists) {
          host.command({
            kind: 'add-projection',
            id: `proj-${slug(projAggregate.name)}-${slug(targetReadModel.name)}`,
            name: `${targetReadModel.name}Projection`,
            aggregateId: sourceId,
            targetId,
          });
        }
        return;
      }
      const targetBoundedContext = host.model.boundedContexts.find((m) => m.id === targetId);
      if (targetBoundedContext) {
        const exists = (host.model.projections ?? []).some(
          (p) => p.sourceAggregateId === sourceId && p.boundedContextId === targetId,
        );
        if (!exists) {
          host.command({
            kind: 'add-projection',
            id: `proj-${slug(projAggregate.name)}-${slug(targetBoundedContext.name)}`,
            name: `${projAggregate.name}ViewProjection`,
            aggregateId: sourceId,
            boundedContextId: targetId,
            readModelName: `${projAggregate.name}View`,
          });
        }
        return;
      }
      // any other target (e.g. a domain event) falls through to the gestures below
    }
    // Dragging from an aggregate/use case onto a domain event declares an emission.
    const eventIds = new Set(
      host.model.boundedContexts.flatMap((m) => (m.domainEvents ?? []).map((ev) => ev.id)),
    );
    // Only aggregates and domain services emit domain events; use cases emit
    // application events instead.
    const emitterIds = new Set([
      ...(host.model.aggregates ?? []).map((a) => a.id),
      ...host.model.boundedContexts.flatMap((m) => (m.domainServices ?? []).map((ds) => ds.id)),
    ]);
    const appEventIds = new Set(
      host.model.boundedContexts.flatMap((m) => (m.applicationEvents ?? []).map((ev) => ev.id)),
    );
    const ucIds = new Set(host.model.boundedContexts.flatMap((m) => (m.useCases ?? []).map((u) => u.id)));
    const qsIds = new Set(
      host.model.boundedContexts.flatMap((m) => (m.queryServices ?? []).map((q) => q.id)),
    );
    if (ucIds.has(sourceId) && qsIds.has(targetId)) {
      const already = (host.model.queryCalls ?? []).some(
        (c) => c.sourceId === sourceId && c.targetId === targetId,
      );
      if (!already) host.command({ kind: 'add-query-call', sourceId, targetId });
      return;
    }
    const externalUcIds = new Set(
      host.model.externalSystems.flatMap((x) => (x.useCases ?? []).map((u) => u.id)),
    );
    if (ucIds.has(sourceId) && externalUcIds.has(targetId)) {
      const already = (host.model.externalUseCaseCalls ?? []).some(
        (c) => c.sourceId === sourceId && c.targetId === targetId,
      );
      if (!already) host.command({ kind: 'add-external-uc-call', sourceId, targetId });
      return;
    }
    if (ucIds.has(sourceId) && ucIds.has(targetId) && sourceId !== targetId) {
      const already = (host.model.useCaseCalls ?? []).some(
        (c) => c.sourceId === sourceId && c.targetId === targetId,
      );
      if (!already) host.command({ kind: 'add-use-case-call', sourceId, targetId });
      return;
    }
    // Scheduled trigger → use case (or policy): the cron fires it.
    const sourceTrigger = host.model.boundedContexts
      .flatMap((mo) => mo.scheduledTriggers ?? [])
      .find((t) => t.id === sourceId);
    if (sourceTrigger && ucIds.has(targetId)) {
      if (sourceTrigger.useCaseId !== targetId) {
        host.command({ kind: 'set-scheduled-trigger-target', id: sourceId, targetUseCaseId: targetId });
      }
      return;
    }
    // Use case → aggregate: the use case operates on it (a CallAggregateOperation
    // step; the aggregate's single operation wires itself, more stay for the form).
    if (ucIds.has(sourceId) && (host.model.aggregates ?? []).some((a) => a.id === targetId)) {
      const already = (host.model.aggregateCalls ?? []).some(
        (c) => c.sourceId === sourceId && c.targetId === targetId,
      );
      if (!already) host.command({ kind: 'add-aggregate-call', sourceId, targetId });
      return;
    }
    if (
      (emitterIds.has(sourceId) && eventIds.has(targetId)) ||
      (ucIds.has(sourceId) && appEventIds.has(targetId))
    ) {
      const already = (host.model.emissions ?? []).some(
        (em) => em.sourceId === sourceId && em.domainEventId === targetId,
      );
      if (!already) host.command({ kind: 'add-emission', sourceId, targetId });
      return;
    }
    // Dragging an event onto another context (or one of its read models) draws a
    // materialization: a MATERIALIZES flow — the projection/read model/subscription
    // triple stays derived at generation time (flows are the source of truth).
    // (An event onto an AGENT — the reactive-agent gesture — resolved earlier,
    // in the agents-as-target guard.)
    if (eventIds.has(sourceId) || appEventIds.has(sourceId)) {
      const isApplicationEvent = appEventIds.has(sourceId);
      const event = host.model.boundedContexts
        .flatMap((m) => (isApplicationEvent ? m.applicationEvents : m.domainEvents) ?? [])
        .find((ev) => ev.id === sourceId);
      const targetUseCase = host.model.boundedContexts
        .flatMap((m) => (m.useCases ?? []).map((u) => ({ u, boundedContext: m })))
        .find(({ u }) => u.id === targetId);
      const targetReadModel = host.model.boundedContexts
        .flatMap((m) => (m.readModels ?? []).map((rm) => ({ rm, boundedContext: m })))
        .find(({ rm }) => rm.id === targetId);
      const targetBoundedContext =
        host.model.boundedContexts.find((m) => m.id === targetId) ??
        targetReadModel?.boundedContext ??
        targetUseCase?.boundedContext;
      if (!event || !targetBoundedContext) return;
      const aggregateIds = new Set((host.model.aggregates ?? []).map((a) => a.id));
      const domainServiceIds = new Set(
        host.model.boundedContexts.flatMap((m) => (m.domainServices ?? []).map((ds) => ds.id)),
      );
      const emitter = (host.model.emissions ?? []).find(
        (em) =>
          em.domainEventId === sourceId &&
          (isApplicationEvent
            ? ucIds.has(em.sourceId)
            : aggregateIds.has(em.sourceId) || domainServiceIds.has(em.sourceId)),
      );
      if (!emitter) {
        host.emit('modux-notice', {
          message: isApplicationEvent
            ? t('gestures.notice.declarePublisherFirst', { event: event.name })
            : t('gestures.notice.declareEmitterFirst', { event: event.name }),
          kind: 'info',
        });
        return;
      }
      const emitterIsAggregate = !isApplicationEvent && aggregateIds.has(emitter.sourceId);
      if (targetUseCase) {
        // Event onto a use case: the TRIGGERS archetype (subscription + CallUseCase derive later).
        const exists = host.model.flows.some(
          (f) =>
            f.archetype === 'TRIGGERS' &&
            f.triggerEvent === event.name &&
            f.targetUseCaseId === targetUseCase.u.id,
        );
        if (exists) return;
        host.command({
          kind: 'add-flow',
          id: `flow-${slug(event.name)}-${slug(targetUseCase.u.name)}`,
          name: targetUseCase.u.name,
          archetype: 'TRIGGERS',
          triggerAggregateId: emitterIsAggregate ? emitter.sourceId : '',
          triggerDomainServiceId:
            !isApplicationEvent && !emitterIsAggregate ? emitter.sourceId : undefined,
          triggerUseCaseId: isApplicationEvent ? emitter.sourceId : undefined,
          triggerEvent: event.name,
          targetId: targetBoundedContext.id,
          targetUseCaseId: targetUseCase.u.id,
        });
        return;
      }
      const readModelName = targetReadModel?.rm.name ?? `${event.name}View`;
      const exists = host.model.flows.some(
        (f) =>
          f.archetype === 'MATERIALIZES' &&
          f.triggerEvent === event.name &&
          f.targetId === targetBoundedContext.id &&
          f.readModelName === readModelName,
      );
      if (exists) return;
      host.command({
        kind: 'add-flow',
        id: `flow-${slug(event.name)}-${slug(readModelName)}`,
        name: readModelName,
        archetype: 'MATERIALIZES',
        triggerAggregateId: emitterIsAggregate ? emitter.sourceId : '',
        triggerDomainServiceId:
          !isApplicationEvent && !emitterIsAggregate ? emitter.sourceId : undefined,
        triggerUseCaseId: isApplicationEvent ? emitter.sourceId : undefined,
        triggerEvent: event.name,
        targetId: targetBoundedContext.id,
        readModelName,
      });
      return;
    }
    // Any other pair touching a nested child is not a strategic relation.
    const childIds = new Set([
      ...emitterIds,
      ...ucIds,
      ...qsIds,
      ...host.model.boundedContexts.flatMap((m) => (m.readModels ?? []).map((rm) => rm.id)),
    ]);
    if (
      childIds.has(sourceId) ||
      childIds.has(targetId) ||
      eventIds.has(targetId) ||
      appEventIds.has(targetId)
    ) {
      return;
    }
    const relationExternalIds = new Set(host.model.externalSystems.map((s) => s.id));
    if (relationExternalIds.has(sourceId)) {
      const extUcIds0 = new Set(
        host.model.boundedContexts.flatMap((m) => (m.useCases ?? []).map((u) => u.id)),
      );
      if (extUcIds0.has(targetId)) {
        const already = (host.model.externalCalls ?? []).some(
          (c) => c.externalSystemId === sourceId && c.useCaseId === targetId,
        );
        if (!already) host.command({ kind: 'add-external-call', sourceId, targetId });
        return;
      }
      if (relationExternalIds.has(targetId) && targetId !== sourceId) {
        // Between systems the relation has flavours — ask (drawing again retypes).
        host.openExtDepPicker({ sourceId, targetId, x: x ?? 0, y: y ?? 0 });
        return;
      }
      // A specific API operation: the real chip (nested in the published API) or an
      // occurrence at a proxy / bounded-context implementation.
      const realOpApi = (host.model.apis ?? []).find((a) =>
        a.operations.some((o) => o.id === targetId),
      );
      const occTarget = /^apiop:(.+)@(.+)$/.exec(targetId);
      const opUse = realOpApi
        ? { operationId: targetId, siteId: realOpApi.id }
        : occTarget
          ? { operationId: occTarget[1], siteId: occTarget[2] }
          : null;
      if (opUse) {
        const already = (host.model.externalOperationUses ?? []).some(
          (u) =>
            u.externalSystemId === sourceId &&
            u.operationId === opUse.operationId &&
            u.siteId === opUse.siteId,
        );
        if (!already) {
          host.command({
            kind: 'add-external-operation-use',
            sourceId,
            operationId: opUse.operationId,
            targetSiteId: opUse.siteId,
          });
        }
        return;
      }
      if (
        (host.model.apis ?? []).some((a) => a.id === targetId) ||
        (host.model.proxyApis ?? []).some((px) => px.id === targetId)
      ) {
        const exists = (host.model.externalSystemDependencies ?? []).some(
          (d) => d.sourceId === sourceId && d.targetId === targetId,
        );
        if (!exists) host.command({ kind: 'add-external-dependency', sourceId, targetId });
        return;
      }
      return;
    }
    if (relationExternalIds.has(targetId)) return;
    if (actorIds.has(targetId)) return;
    // Context↔context relations use the ArchiMate vocabulary (serving, composition…), like every
    // other strategic pair — not the DDD context-map types. So this falls through to the ArchiMate
    // picker below. (The old CUSTOMER_SUPPLIER/ACL picker survives only for retyping a relation that
    // was already declared, via double-click.)
    // Nothing modux meant anything for this pair: ArchiMate is the last word —
    // any two elements admit its eleven relationship types (documentation intent).
    if (sourceId !== targetId && connectKind === undefined) {
      host.openConnectPicker({
        x: x ?? 0,
        y: y ?? 0,
        options: archimateOptions(host, sourceId, targetId),
      });
      return;
    }
    void x;
    void y;
}

/**
 * Deleting on the unified canvas: an element's KIND is globally unique, so it alone says which
 * lens's delete rules apply. The caller passes 'context-map'; this reads the lens from the kind so
 * the existing per-lens delete logic runs. Anything unmapped stays context-map.
 */
function resolveDeleteLens(id: string, kind: string): ViewId {
  const WF = new Set(['workflow-dependency', 'workflow-start', 'workflow-gateway', 'wf-role', 'wf-form', 'wf-link']);
  const MAP = new Set([
    'model-mapping', 'mapping-rule', 'model-field', 'model', 'transformation', 'transform-input',
    'transform-output', 'custom-of-transformation', 'custom-of-mapping', 'custom-code',
  ]);
  if (WF.has(kind)) return 'workflows';
  if (MAP.has(kind)) return 'mappings';
  if (kind === 'es-custom') return 'eventstorming';
  if (kind === 'deploys') return 'distribution';
  if (id.startsWith('menu:') || kind === 'menu-item' || kind === 'menu-group') return 'ui';
  return 'context-map';
}

export function performDeleteGesture(
  host: GestureHost,
  view: ViewId,
  elementType: string,
  id: string,
  kind: string,
): void {
  if (view === 'context-map') view = resolveDeleteLens(id, kind);
  // A loose node (read model, external table, operation… dropped free-standing) lives in the
  // looseElements bucket, not in its would-be parent — so the type-specific remove finds nothing.
  // Delete it as what it is. Checked first, before the by-kind handlers below.
  if (elementType === 'node' && (host.model.looseElements ?? []).some((e) => e.id === id)) {
    host.clearSelection();
    host.command({ kind: 'remove-loose-element', id });
    return;
  }
  // A mockup, or its link to a page (kind is unique, so no lens needed).
  if (kind === 'mockup-of') {
    const m = /^mockupof:(.+)->(.+)$/.exec(id);
    if (m) {
      host.clearSelection();
      host.command({ kind: 'set-mockup-page', id: m[1], pageId: null });
    }
    return;
  }
  if (elementType === 'node' && kind === 'mockup') {
    host.clearSelection();
    host.command({ kind: 'delete-mockup', id });
    return;
  }
  if (kind === 'ui-serving') {
    const m = /^uisrv:(.+)->(.+)$/.exec(id);
    if (m) {
      host.clearSelection();
      host.command({ kind: 'remove-ui-serving', id: m[1], targetId: m[2] });
    }
    return;
  }
  if (kind === 'ui-assignment') {
    const m = /^uiasg:(.+)->(.+)$/.exec(id);
    if (m) {
      host.clearSelection();
      host.command({ kind: 'remove-ui-assignment', id: m[1], targetId: m[2] });
    }
    return;
  }
  if (kind === 'ui' && elementType === 'node') {
    host.clearSelection();
    host.command({ kind: 'remove-ui', id });
    return;
  }
  if (kind === 'archimate-relation') {
    const relId = id.replace(/^archi:/, '');
    host.clearSelection();
    host.command({ kind: 'remove-archimate-relation', id: relId });
    return;
  }
  if (elementType === 'node' && kind === 'note') {
    host.clearSelection();
    host.command({ kind: 'remove-note', id });
    return;
  }
  if (elementType === 'node' && kind === 'url') {
    host.clearSelection();
    host.command({ kind: 'remove-url', id });
    return;
  }
  if (elementType === 'edge' && kind === 'service-url') {
    const m = /^svcurl:(.+)->(.+)$/.exec(id);
    if (m) {
      host.clearSelection();
      host.command({ kind: 'remove-service-url', serviceId: m[1], id: m[2] });
    }
    return;
  }
  if (elementType === 'node' && kind === 'area') {
    // Only the frame goes: its members are geometric and the anchored notes survive.
    host.clearSelection();
    host.command({ kind: 'remove-area', id });
    return;
  }
  if (elementType === 'edge' && kind === 'note-link') {
    // The thread's id carries both ends: note:<noteId>-><target ref>.
    const body = id.slice('note:'.length);
    const cut = body.indexOf('->');
    if (cut > 0) {
      host.clearSelection();
      host.command({ kind: 'note-detach', id: body.slice(0, cut), targetId: body.slice(cut + 2) });
    }
    return;
  }
  if (kind === 'invariant' || kind === 'invariant-containment') {
    const invariantId = kind === 'invariant' ? id : id.replace(/^protects:.+->/, '');
    host.clearSelection();
    host.command({ kind: 'remove-invariant', id: invariantId });
    return;
  }
    if (view === 'eventstorming' && elementType === 'edge' && kind === 'es-custom') {
      const match = /^escc:(.+)$/.exec(id);
      const owner = match ? host.owningUseCaseOf(match[1]) : null;
      if (match && owner) {
        host.clearSelection();
        host.command({ kind: 'set-use-case-step-custom-code', useCaseId: owner.id, id: match[1], targetId: null });
      }
      return;
    }
    if (view === 'eventstorming' && elementType === 'node' && kind === 'custom-code') {
      host.clearSelection();
      host.command({ kind: 'remove-custom-code', id });
      return;
    }
    if (view === 'ui') {
      if (elementType === 'edge') {
        let m: RegExpExecArray | null;
        if ((m = /^idpauth:(.+)$/.exec(id))) {
          host.command({ kind: 'set-identity-provider', id: m[1], targetId: null });
        } else if ((m = /^appheader:(.+)->(.+)$/.exec(id))) {
          host.command({ kind: 'set-app-header-page', appId: m[1], pageId: null });
        } else if ((m = /^apphome:(.+)->(.+)$/.exec(id))) {
          host.command({ kind: 'set-app-home-page', appId: m[1], pageId: null });
        } else if ((m = /^appmodel:(.+)->(.+)$/.exec(id))) {
          host.command({ kind: 'set-app-model', appId: m[1], modelId: null });
        } else if ((m = /^appview:(.+)->(.+)$/.exec(id))) {
          host.command({ kind: 'set-app-view-page', appId: m[1], pageId: null });
        } else if ((m = /^appedit:(.+)->(.+)$/.exec(id))) {
          host.command({ kind: 'set-app-edit-page', appId: m[1], pageId: null });
        } else if ((m = /^cruddetail:(.+)->(.+)$/.exec(id))) {
          host.command({ kind: 'set-crud-detail', pageId: m[1], targetId: null, toAppId: null });
        } else if ((m = /^crudnew:(.+)->(.+)$/.exec(id))) {
          host.command({ kind: 'set-crud-create', pageId: m[1], targetId: null, toAppId: null });
        } else if ((m = /^wizstep:([^:]+):(.+)$/.exec(id))) {
          // the line is the MAPPING: Supr unmaps the step (the row keeps its place)
          host.command({ kind: 'set-wizard-step-page', pageId: m[1], itemId: m[2], targetId: null });
        } else if ((m = /^pgbtn:(.+)->(.+)$/.exec(id))) {
          host.command({ kind: 'remove-page-button', pageId: m[1], useCaseId: m[2] });
        } else if ((m = /^pglist:(.+)->(.+)$/.exec(id))) {
          host.command({ kind: 'set-page-listing', pageId: m[1], queryServiceId: null });
        } else if ((m = /^pgmodel:(.+)->(.+)$/.exec(id))) {
          host.command({ kind: 'set-page-model', pageId: m[1], modelId: null });
        } else if ((m = /^actorapp:(.+)->(.+)$/.exec(id))) {
          host.command({ kind: 'remove-actor-app', actorId: m[1], appId: m[2] });
        } else if ((m = /^menupage:(.+)->[^>]+$/.exec(id))) {
          const ref = parseMenuNodeId(m[1]);
          if (ref) host.command({ kind: 'set-menu-page', pageId: null, ...ref });
        } else if ((m = /^menuapp:(.+)->[^>]+$/.exec(id))) {
          const ref = parseMenuNodeId(m[1]);
          if (ref) host.command({ kind: 'set-menu-app', toAppId: null, ...ref });
        } else if ((m = /^menuuc:(.+)->[^>]+$/.exec(id))) {
          const ref = parseMenuNodeId(m[1]);
          if (ref) host.command({ kind: 'set-menu-use-case', useCaseId: null, ...ref });
        } else if ((m = /^menuagg:(.+)->[^>]+$/.exec(id))) {
          const ref = parseMenuNodeId(m[1]);
          if (ref) host.command({ kind: 'set-menu-aggregate', aggregateId: null, ...ref });
        } else if ((m = /^menuqop:(.+)->[^>]+$/.exec(id))) {
          const ref = parseMenuNodeId(m[1]);
          if (ref) {
            host.command({ kind: 'set-menu-query-operation', queryServiceId: null, queryOperationId: null, ...ref });
          }
        }
        return;
      }
      if (kind === 'ui-app') {
        host.command({ kind: 'delete-ui-app', id });
        return;
      }
      if (kind === 'page') {
        host.command({ kind: 'delete-ui-page', id });
        return;
      }
      if (kind === 'menu-item' || kind === 'menu-group') {
        const ref = parseMenuNodeId(id);
        if (ref) host.command({ kind: 'remove-menu-item', ...ref });
        return;
      }
      if (kind === 'wizard-step-row') {
        const m = /^wizrow:([^:]+):(.+)$/.exec(id);
        if (m) host.command({ kind: 'remove-page-wizard-step', pageId: m[1], targetId: m[2] });
        return;
      }
      if (kind === 'model') {
        host.command({ kind: 'remove-model', id });
        return;
      }
      if (kind === 'identity-provider') {
        host.command({ kind: 'remove-identity-provider', id });
        return;
      }
      if (kind === 'custom-code') {
        host.command({ kind: 'remove-custom-code', id });
        return;
      }
      if (kind === 'button-group') {
        host.command({ kind: 'remove-button-group', id });
        return;
      }
      if (kind === 'group-button') {
        const m2 = /^gbtn:([^:]+):(.+)$/.exec(id);
        if (m2) host.command({ kind: 'remove-group-button', id: m2[1], itemId: m2[2] });
        return;
      }
      if (kind === 'group-subgroup') {
        const m2 = /^gsub:([^:]+):(.+)$/.exec(id);
        if (m2) host.command({ kind: 'remove-group-subgroup', id: m2[1], targetId: m2[2] });
        return;
      }
      if (elementType === 'edge' && kind === 'bar-group') {
        const m2 = /^bargrp:([^:]+):[^:]+:(.+)$/.exec(id);
        if (m2) host.command({ kind: 'remove-page-bar-group', pageId: m2[1], id: m2[2] });
        return;
      }
      if (elementType === 'edge' && kind === 'gbtn-target') {
        const m2 = /^gbtnt:([^:]+):(.+)$/.exec(id);
        if (m2) host.command({ kind: 'set-group-button-target', id: m2[1], itemId: m2[2], useCaseId: null });
        return;
      }
      if (elementType === 'edge' && kind === 'ui-custom-page') {
        const m2 = /^ccpage:(.+)$/.exec(id);
        if (m2) host.command({ kind: 'set-page-custom-code', id: m2[1], targetId: null });
        return;
      }
      if (elementType === 'edge' && kind === 'cc-uses') {
        const m2 = /^ccuse:(.+)->(.+)$/.exec(id);
        if (m2) host.command({ kind: 'remove-custom-code-use', id: m2[1], elementId: m2[2] });
        return;
      }
      // system chips (use cases, query services, models, actors) are not deletable from here
      return;
    }
    if (view === 'mappings' && elementType === 'edge' && kind === 'model-mapping') {
      const match = /^mapping:(.+)$/.exec(id);
      if (match) {
        host.clearSelection();
        host.command({ kind: 'remove-model-mapping', id: match[1] });
      }
      return;
    }
    if (view === 'mappings' && elementType === 'edge' && kind === 'mapping-rule') {
      const match = /^maprule:([^:]+):(.+)$/.exec(id);
      if (match) {
        host.clearSelection();
        host.command({ kind: 'remove-model-mapping-rule', id: match[1], itemId: match[2] });
      }
      return;
    }
    if (view === 'mappings' && elementType === 'node' && kind === 'model-field') {
      const ref = parseFieldNodeId(id);
      if (ref) {
        host.clearSelection();
        host.command({ kind: 'remove-model-field', modelId: ref.modelId, fieldId: ref.fieldId });
      }
      return;
    }
    if (view === 'mappings' && elementType === 'node' && kind === 'model') {
      host.clearSelection();
      host.command({ kind: 'remove-model', id });
      return;
    }
    if (view === 'mappings' && elementType === 'node' && kind === 'custom-code') {
      host.clearSelection();
      host.command({ kind: 'remove-custom-code', id });
      return;
    }
    if (view === 'mappings' && elementType === 'edge' && kind === 'custom-of-transformation') {
      const match = /^cctf:(.+)$/.exec(id);
      if (match) {
        host.clearSelection();
        host.command({ kind: 'set-transformation-custom-code', id: match[1], targetId: null });
      }
      return;
    }
    if (view === 'mappings' && elementType === 'edge' && kind === 'custom-of-mapping') {
      const match = /^ccmap:(.+)$/.exec(id);
      if (match) {
        host.clearSelection();
        host.command({ kind: 'set-mapping-custom-code', id: match[1], targetId: null });
      }
      return;
    }
    if (view === 'mappings' && elementType === 'node' && kind === 'transformation') {
      host.clearSelection();
      host.command({ kind: 'remove-transformation', id });
      return;
    }
    if (view === 'mappings' && elementType === 'edge' && kind === 'transform-input') {
      const match = /^tfin:([^:]+):([^:]+):(.*)$/.exec(id);
      if (match) {
        host.clearSelection();
        host.command({
          kind: 'remove-transformation-input',
          id: match[1],
          modelId: match[2],
          ...(match[3] ? { fieldId: match[3] } : {}),
        });
      }
      return;
    }
    if (view === 'mappings' && elementType === 'edge' && kind === 'transform-output') {
      const match = /^tfout:(.+)$/.exec(id);
      if (match) {
        host.clearSelection();
        host.command({ kind: 'set-transformation-output', id: match[1] });
      }
      return;
    }
    if (view === 'workflows' && elementType === 'edge' && kind === 'workflow-dependency') {
      const match = /^wfdep:(.+)->(.+)$/.exec(id);
      if (!match) return;
      const owner = host.owningWorkflowOf(match[2]);
      if (!owner) return;
      host.clearSelection();
      host.command({
        kind: 'remove-workflow-dependency',
        workflowId: owner.id,
        id: match[2],
        dependsOnStepId: match[1],
      });
      return;
    }
    if (view === 'workflows' && elementType === 'node' && kind === 'workflow-gateway') {
      host.clearSelection();
      host.command({ kind: 'remove-workflow-gateway', id });
      return;
    }
    if (view === 'workflows' && elementType === 'edge' && kind === 'wf-role') {
    const match = /^wfrole:(.+)->(.+)$/.exec(id);
    if (match) {
      const owner = host.owningWorkflowOf(match[1]);
      if (owner) {
        host.clearSelection();
        host.command({ kind: 'set-workflow-step-role', workflowId: owner.id, id: match[1] });
      }
    }
    return;
  }
  if (view === 'workflows' && elementType === 'edge' && kind === 'wf-form') {
      const match = /^wfform:(.+)->(.+)$/.exec(id);
      if (match) {
        const owner = host.owningWorkflowOf(match[1]);
        if (!owner) return;
        host.clearSelection();
        host.command({ kind: 'set-workflow-step-form', workflowId: owner.id, id: match[1] });
      }
      return;
    }
    if (view === 'workflows' && elementType === 'edge' && kind === 'wf-link') {
      const match = /^wflink:(.+)->(.+)$/.exec(id);
      if (match) {
        host.clearSelection();
        host.command({ kind: 'remove-workflow-link', sourceId: match[1], targetId: match[2] });
      }
      return;
    }
    if (elementType === 'node' && kind === 'workflow') {
      host.clearSelection();
      host.command({ kind: 'remove-workflow', id });
      return;
    }
    if (elementType === 'node' && kind === 'workflow-step') {
      const owner = host.owningWorkflowOf(id);
      if (!owner) return;
      host.clearSelection();
      host.command({ kind: 'remove-workflow-step', workflowId: owner.id, id });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'api-impl-wire') {
      // Edge ids are `apiimplwire:<operationId>@<boundedContextId>` (see context-map.ts).
      const match = /^apiimplwire:(.+)@(.+)$/.exec(id);
      if (!match) return;
      const [, operationId, boundedContextId] = match;
      const apiId = (host.model.apis ?? []).find((a) =>
        a.operations.some((o) => o.id === operationId),
      )?.id;
      if (!apiId) return;
      host.clearSelection();
      host.command({ kind: 'remove-api-operation-implementation', apiId, operationId, boundedContextId });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'ext-op-use') {
      // Edge ids are `extopuse:<systemId>-><operationId>@<siteId>` (see context-map.ts).
      const match = /^extopuse:(.+)->(.+)@(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({
        kind: 'remove-external-operation-use',
        sourceId: match[1],
        operationId: match[2],
        targetSiteId: match[3],
      });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'op-route') {
      // Edge ids are `oproute:apiop:<opId>@<proxyId>-><targetNodeId>` (see context-map.ts).
      const match = /^oproute:apiop:(.+)@(.+)->(.+)$/.exec(id);
      if (!match) return;
      const [, operationId, proxyId, targetNodeId] = match;
      const implTarget = /^apiimpl:.+@(.+)$/.exec(targetNodeId);
      const targetSiteId = implTarget ? implTarget[1] : targetNodeId;
      host.clearSelection();
      host.command({ kind: 'remove-proxy-operation-route', proxyId, operationId, targetSiteId });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'relation') {
      // Edge ids for relations are `rel:<sourceId>-><targetId>` (see relationEdgeId).
      const match = /^rel:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-relation', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'emission') {
      const match = /^emit:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-emission', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'projection') {
      const match = /^proj:(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-projection', id: match[1] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'uc-call') {
      const match = /^uccall:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-use-case-call', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'notification-trigger') {
      const match = /^notif:(.+)$/.exec(id);
      if (match) {
        host.clearSelection();
        host.command({ kind: 'set-notification-event', id: match[1], targetId: null });
      }
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'notification-recipient') {
      const match = /^notifto:([^:]+):(.+)$/.exec(id);
      if (match) {
        host.clearSelection();
        host.command({ kind: 'remove-notification-recipient', id: match[1], roleId: match[2] });
      }
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'document-query') {
      const match = /^docq:(.+)$/.exec(id);
      if (match) {
        host.clearSelection();
        host.command({ kind: 'set-document-query', id: match[1], queryServiceId: null, queryOperationId: null });
      }
      return;
    }
    if (view === 'context-map' && elementType === 'node' && kind === 'notification') {
      host.clearSelection();
      host.command({ kind: 'remove-notification', id });
      return;
    }
    if (view === 'context-map' && elementType === 'node' && kind === 'document') {
      host.clearSelection();
      host.command({ kind: 'remove-document', id });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && (kind === 'idp-trust' || kind === 'idp-service')) {
      const match = /^idp(?:trust|svc):(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'set-identity-provider', id: match[1], targetId: null });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'idp-federation') {
      const match = /^idpfed:(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'set-idp-publisher', id: match[1], targetId: null });
      return;
    }
    if (view === 'context-map' && elementType === 'node' && kind === 'identity-provider') {
      host.clearSelection();
      host.command({ kind: 'remove-identity-provider', id });
      return;
    }
    if ((view === 'context-map' || view === 'integrations') && elementType === 'edge' && (kind === 'etl-source' || kind === 'etl-write')) {
      const match = /^etl:([^:]+):(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-etl-step', etlFlowId: match[1], id: match[2] });
      return;
    }
    if ((view === 'context-map' || view === 'integrations') && elementType === 'node' && kind === 'etl-flow') {
      host.clearSelection();
      host.command({ kind: 'remove-etl-flow', id });
      return;
    }
    if (view === 'context-map' && elementType === 'node' && kind === 'ui-app') {
      host.clearSelection();
      host.command({ kind: 'delete-ui-app', id });
      return;
    }
    if (view === 'distribution' && elementType === 'edge' && kind === 'deploys') {
      const match = /^deploy:(.+)->(.+)$/.exec(id);
      if (match) {
        host.clearSelection();
        host.command({ kind: 'remove-service-module', serviceId: match[1], id: match[2] });
      }
      return;
    }
    if ((view === 'context-map' || view === 'distribution') && elementType === 'node' && kind === 'module') {
      host.clearSelection();
      host.command({ kind: 'remove-module', id });
      return;
    }
    if (view === 'distribution' && elementType === 'node') {
      // Supr on a chip inside a boundedContext box UNPACKS it — the element itself survives.
      const scene = host.sceneFor('distribution');
      const upOf = (nid: string): string | undefined => {
        const n = scene.nodes.find((x) => x.id === nid);
        return n ? n.ownerId ?? n.parentId : undefined;
      };
      for (let cur = upOf(id); cur; ) {
        if ((host.model.modules ?? []).some((cm) => cm.id === cur)) {
          host.clearSelection();
          host.command({ kind: 'remove-module-element', id: cur, elementId: id });
          return;
        }
        cur = upOf(cur);
      }
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'st-fire') {
      const match = /^stfire:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'set-scheduled-trigger-target', id: match[1], targetUseCaseId: null });
      return;
    }
    if (view === 'context-map' && elementType === 'node' && kind === 'scheduled-trigger') {
      host.clearSelection();
      host.command({ kind: 'remove-scheduled-trigger', id });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'agg-call') {
      const match = /^aggcall:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-aggregate-call', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'qs-call') {
      const match = /^qscall:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-query-call', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'external-call') {
      const match = /^extcall:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-external-call', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'ext-uc-call') {
      const match = /^extuccall:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-external-uc-call', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'agent-use') {
      const match = /^mcp:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-agent-use', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'agent-external-use') {
      const match = /^mcpx:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-agent-external-use', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'agent-mcp') {
      const match = /^mcpsv:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-agent-mcp', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'gateway-exposure') {
      const match = /^gwx:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-gateway-exposure', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'agent-gateway') {
      const match = /^aggw:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-agent-gateway', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'agent-api-op') {
      const match = /^agapi:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-agent-api-operation', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'agent-query') {
      const match = /^agqs:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-agent-query', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'agent-delegate') {
      const match = /^agag:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-agent-delegate', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'actor-agent') {
      const match = /^useag:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-actor-agent', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'agent-trigger') {
      const match = /^evag:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-agent-trigger', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (elementType === 'node' && kind === 'mcp-gateway') {
      host.clearSelection();
      host.command({ kind: 'remove-mcp-gateway', id });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'agent-rag') {
      const match = /^agrag:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-agent-rag', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'rag-source') {
      const match = /^ragsrc:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-rag-source', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (
      view === 'context-map' &&
      elementType === 'edge' &&
      (kind === 'rag-table' || kind === 'rag-api' || kind === 'rag-coarse')
    ) {
      // ragtbl/ragapi/ragcoarse run source→rag; the command speaks rag→source.
      const match = /^rag(?:tbl|api|coarse):(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-rag-source', sourceId: match[2], targetId: match[1] });
      return;
    }
    if (elementType === 'node' && kind === 'rag') {
      host.clearSelection();
      host.command({ kind: 'remove-rag', id });
      return;
    }
    if (elementType === 'node' && kind === 'rag-content-source') {
      const match = /^ragcs:(.+?):(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-rag-content-source', sourceId: match[1], uri: match[2] });
      return;
    }
    if (elementType === 'node' && kind === 'external-table') {
      host.clearSelection();
      host.command({ kind: 'remove-external-table', id });
      return;
    }
    if (elementType === 'node' && kind === 'cdc') {
      host.clearSelection();
      host.command({ kind: 'remove-cdc', id });
      return;
    }
    if (elementType === 'node' && kind === 'mcp-server') {
      host.clearSelection();
      host.command({ kind: 'remove-mcp-server', id });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'api-wire') {
      const match = /^apiwire:(.+)$/.exec(id);
      const owner = match ? host.owningApiOf(match[1]) : null;
      if (!match || !owner) return;
      host.clearSelection();
      // Unwire: clearing both targets leaves the operation published but unimplemented.
      host.command({ kind: 'set-api-operation-target', apiId: owner.id, id: match[1] });
      return;
    }
    if (elementType === 'node' && kind === 'api') {
      host.clearSelection();
      host.command({ kind: 'remove-api', id });
      return;
    }
    // An API-implementation occurrence: deleting it removes the implementation SITE,
    // never the API itself (which lives on, published where it was).
    if (elementType === 'node' && kind === 'api-impl') {
      const match = /^apiimpl:(.+)@(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-api-implementation', apiId: match[1], boundedContextId: match[2] });
      return;
    }
    if (elementType === 'node' && kind === 'proxy-api') {
      host.clearSelection();
      host.command({ kind: 'remove-proxy-api', id });
      return;
    }
    if (view === 'context-map' && elementType === 'node' && kind === 'workflow') {
      host.clearSelection();
      host.command({ kind: 'remove-workflow', id });
      return;
    }
    if (elementType === 'node' && kind === 'api-operation') {
      const owner = host.owningApiOf(id);
      if (!owner) return;
      host.clearSelection();
      host.command({ kind: 'remove-api-operation', apiId: owner.id, id });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'actor-use') {
      const match = /^use:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-actor-use', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'actor-ext') {
      const match = /^extdep:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-actor-external', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'ext-dep') {
      const match = /^xdep:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-external-dependency', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'wf-chain') {
      const match = /^wfchain:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'set-workflow-trigger', id: match[2], triggerEvent: '' });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'agent-api') {
      const match = /^agapi:(.+)->(.+)$/.exec(id);
      if (!match) return;
      host.clearSelection();
      host.command({ kind: 'remove-agent-api', sourceId: match[1], targetId: match[2] });
      return;
    }
    if (view === 'context-map' && elementType === 'edge' && kind === 'proxy-target') {
      const match = /^pxt:(.+)->(.+)$/.exec(id);
      if (!match) return;
      // Only the real wiring is deletable — a rolled-up summary edge (host → host) is not.
      if (!(host.model.proxyApis ?? []).some((px) => px.id === match[1])) return;
      host.clearSelection();
      host.command({ kind: 'set-proxy-target', id: match[1], targetId: '' });
      return;
    }
    if (elementType === 'node' && kind === 'boundedContext') {
      const hasAggregates = (host.model.aggregates ?? []).some((a) => a.boundedContextId === id);
      if (hasAggregates) return; // integrity guard: empty the boundedContext first
      host.clearSelection();
      host.command({ kind: 'remove-boundedContext', id });
      return;
    }
    if (elementType === 'node' && kind === 'system') {
      // the store guard blocks this while it still groups contexts — pull them out first
      host.clearSelection();
      host.command({ kind: 'remove-system', id });
      return;
    }
    // Deleting the composition edge from a system to what it groups ungroups it (keeps both):
    // a context detaches via set-context-system, a nested subsystem via set-system-parent.
    if (elementType === 'edge' && kind === 'contains') {
      const m = /^contains:(.+)->(.+)$/.exec(id);
      if (m && (host.model.systems ?? []).some((s) => s.id === m[1])) {
        if (host.model.boundedContexts.some((b) => b.id === m[2])) {
          host.clearSelection();
          host.command({ kind: 'set-context-system', id: m[2], parentSystemId: null });
          return;
        }
        if ((host.model.systems ?? []).some((s) => s.id === m[2])) {
          host.clearSelection();
          host.command({ kind: 'set-system-parent', id: m[2], parentSystemId: null });
          return;
        }
      }
    }
    if (elementType === 'node' && kind === 'aggregate') {
      const hasEntities = (host.model.entities ?? []).some((x) => x.aggregateId === id);
      if (hasEntities) return;
      host.clearSelection();
      host.command({ kind: 'remove-aggregate', id });
      return;
    }
    if (elementType === 'node' && kind === 'value-object') {
      const aggregateId = (host.model.valueObjects ?? []).find((v) => v.id === id)?.aggregateId ?? '';
      host.clearSelection();
      host.command({ kind: 'remove-value-object', id, aggregateId });
      return;
    }
    if (elementType === 'node' && kind === 'entity') {
      const aggregateId = (host.model.entities ?? []).find((e) => e.id === id)?.aggregateId ?? '';
      host.clearSelection();
      host.command({ kind: 'remove-entity', id, aggregateId });
      return;
    }
    if (elementType === 'node' && kind === 'field') {
      const field = [...(host.model.aggregates ?? []), ...(host.model.entities ?? [])]
        .flatMap((o) => o.fields ?? [])
        .find((f) => f.id === id);
      host.clearSelection();
      if (field?.modelId) host.command({ kind: 'remove-model-field', modelId: field.modelId, fieldId: id });
      return;
    }
    if (elementType === 'node' && kind === 'operation') {
      const owner = (host.model.aggregates ?? []).find((a) => (a.operations ?? []).some((o) => o.id === id));
      host.clearSelection();
      host.command({ kind: 'remove-operation', id, aggregateId: owner?.id ?? '' });
      return;
    }
    if (elementType === 'node' && kind === 'domain-event') {
      host.clearSelection();
      host.command({ kind: 'remove-domain-event', id });
      return;
    }
    if (elementType === 'node' && kind === 'read-model') {
      host.clearSelection();
      host.command({ kind: 'remove-read-model', id });
      return;
    }
    if (elementType === 'node' && kind === 'domain-service') {
      host.clearSelection();
      host.command({ kind: 'remove-domain-service', id });
      return;
    }
    if (elementType === 'node' && kind === 'query-service') {
      host.clearSelection();
      host.command({ kind: 'remove-query-service', id });
      return;
    }
    if (elementType === 'node' && kind === 'use-case') {
      host.clearSelection();
      host.command({ kind: 'remove-use-case', id });
      return;
    }
    if (elementType === 'node' && kind === 'external-use-case') {
      host.clearSelection();
      host.command({ kind: 'remove-external-use-case', id });
      return;
    }
    if (elementType === 'node' && kind === 'application-event') {
      host.clearSelection();
      host.command({ kind: 'remove-application-event', id });
      return;
    }
    if (elementType === 'node' && kind === 'integration-event') {
      host.clearSelection();
      host.command({ kind: 'remove-integration-event', id });
      return;
    }
    if (elementType === 'node' && kind === 'external-system') {
      host.clearSelection();
      host.command({ kind: 'remove-external-system', id });
      return;
    }
    if (elementType === 'node' && kind === 'actor') {
      host.clearSelection();
      host.command({ kind: 'remove-actor', id });
      return;
    }
    if (elementType === 'node' && kind === 'ai-agent') {
      host.clearSelection();
      host.command({ kind: 'remove-ai-agent', id });
      return;
    }
    if (elementType === 'node' && kind === 'flow') {
      host.clearSelection();
      host.command({ kind: 'remove-flow', id: id.replace(/^flow:/, '') });
      return;
    }
    if (elementType === 'node' && kind === 'process') {
      host.clearSelection();
      host.command({ kind: 'remove-process', id });
      return;
    }
    if (elementType === 'node' && kind === 'process-step') {
      const owner = host.owningProcessOf(id);
      if (!owner) return;
      host.clearSelection();
      host.command({ kind: 'remove-process-step', processId: owner.id, id });
    }
}
