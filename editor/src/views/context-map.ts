import type {
  ModuxModel, ContextMapRelationType, FlowRef, FieldRef, ReferencedProject, UiComponentNodeRef,
} from '../model.js';
import type { Scene, SceneNode, SceneEdge, DiagramLayout, ViewLayout } from '../scene.js';
import { menuNodeId, flattenMenu } from './ui.js';
import { fieldNodeId } from './mappings.js';
import { t, type MessageKey } from '../i18n/index.js';

/**
 * How a referenced project's whereabouts read in a tooltip. A migrated model may know none —
 * the reference still holds its snapshot; what it cannot do is refresh itself.
 */
function whereItLives(ref: ReferencedProject): string {
  if (ref.gitUrl) return t('views.contextMap.livesAt', { where: `${ref.gitUrl}${ref.branch ? ` (${ref.branch})` : ''}` });
  if (ref.path) return t('views.contextMap.livesAt', { where: ref.path });
  return t('views.contextMap.livesNowhere');
}

/** A field child, labelled «nombre ∗ : tipo» (∗ = required, [tipo] = collection). */
function fieldChildDesc(model: ModuxModel, f: FieldRef): { id: string; name: string; kind: 'field' } {
  const base =
    f.typeKind === 'primitive'
      ? f.typeRef || t('views.aggregates.defaultPrimitive')
      : [...(model.valueObjects ?? []), ...(model.entities ?? []), ...(model.aggregates ?? [])].find(
          (x) => x.id === f.typeRef,
        )?.name ?? t('views.placeholder.type');
  const typeLabel = f.collection ? `[${base}]` : base;
  return { id: f.id, name: `${f.name}${f.required ? ' ∗' : ''} : ${typeLabel}`, kind: 'field' };
}

/**
 * Context-map view adapter: projects the modux model into a generic Scene.
 * Colours and abbreviations mirror the server-side ContextMapSvgRenderer so
 * both projections stay visually consistent.
 */

const SUBDOMAIN_FILL: Record<string, string> = {
  CORE: '#fef3c7',
  SUPPORTING: '#e0e7ff',
  GENERIC: '#f1f5f9',
};

const RELATION_ABBREV: Record<ContextMapRelationType, string> = {
  PARTNERSHIP: 'P',
  SHARED_KERNEL: 'SK',
  CUSTOMER_SUPPLIER: 'C/S',
  CONFORMIST: 'CF',
  OPEN_HOST_SERVICE: 'OHS',
  ANTI_CORRUPTION_LAYER: 'ACL',
  PUBLISHED_LANGUAGE: 'PL',
  SEPARATE_WAYS: 'SW',
};

export type FlowCoherence = 'OK' | 'MISSING_RELATION' | 'REVERSED' | 'EXTERNAL' | 'INTERNAL';

const FLOW_COLOR: Record<FlowCoherence, string> = {
  OK: '#16a34a',
  MISSING_RELATION: '#f59e0b',
  REVERSED: '#d97706',
  EXTERNAL: '#64748b',
  INTERNAL: '#94a3b8',
};

const NODE_W = 168;
const NODE_H = 56;

/** Canvas id of an API-implementation occurrence (same ApiRef, one node per site). */
export function apiImplNodeId(apiId: string, boundedContextId: string): string {
  return `apiimpl:${apiId}@${boundedContextId}`;
}

/** Canvas id of an operation occurrence at a SITE (a proxy or a bounded context). */
export function apiOpOccurrenceId(operationId: string, siteId: string): string {
  return `apiop:${operationId}@${siteId}`;
}

/**
 * The three forms a container node can take, ranked by how much it reveals. The level
 * picks the default; the chevron toggles to the OTHER meaningful form: from `full` it
 * folds everything away, from `compact` it unfolds everything the level supports, and
/**
 * API-implementation occurrences of a bounded context (the SAME ApiRef the external
 * system publishes, so the box looks exactly like the API at its publisher; only the
 * site differs).
 */
function apiImplChildren(model: ModuxModel, boundedContextId: string): ChildDesc[] {
  const apiById = new Map((model.apis ?? []).map((a) => [a.id, a]));
  return (model.apiImplementations ?? [])
    .filter((impl) => impl.boundedContextId === boundedContextId && apiById.has(impl.apiId))
    .map((impl): ChildDesc => ({
      id: apiImplNodeId(impl.apiId, impl.boundedContextId),
      name: apiById.get(impl.apiId)!.name,
      kind: 'api-impl',
    }));
}

/** The operations a proxy fronts (those of its target API). */
function proxyOps(
  model: ModuxModel,
  px: NonNullable<ModuxModel['proxyApis']>[number],
): { id: string; name: string }[] {
  const target = px.targetApiId ? (model.apis ?? []).find((a) => a.id === px.targetApiId) : undefined;
  return target?.operations ?? [];
}

// Child boxes (an element revealed by expanding its owner) are free nodes with
// their own absolute position; these are just their default dimensions.
const CHILD_W = 108;
const CHILD_H = 32;
const CHILD_MAX_W = 240;

/**
 * Width for a free child box that fits its label. No DOM here (the scene builder
 * runs headless in tests), so we estimate from the label length at the 13px
 * 600-weight label font — a slight over-estimate, then clamped. Longer names
 * stop growing at CHILD_MAX_W and the canvas ellipsises whatever still overflows.
 */
function childBoxWidth(label: string): number {
  const fitted = Math.ceil(label.length * 7.6) + 26; // ~char width + horizontal padding
  return Math.min(CHILD_MAX_W, Math.max(CHILD_W + 12, fitted));
}

export function relationEdgeId(sourceId: string, targetId: string): string {
  return `rel:${sourceId}->${targetId}`;
}

/**
 * Client-side approximation of FlowContextMapCoherenceService — enough for
 * live feedback while editing; the server linter remains authoritative.
 */
export function flowCoherence(model: ModuxModel, flow: FlowRef): FlowCoherence {
  const externalIds = new Set(model.externalSystems.map((e) => e.id));
  if (flow.sourceId === flow.targetId) return 'INTERNAL';
  if (externalIds.has(flow.sourceId) || externalIds.has(flow.targetId)) return 'EXTERNAL';
  // Relations always exist where flows do (they derive from them); the signal
  // now is whether the pair carries a strategic annotation yet.
  if (
    model.relations.some(
      (r) => r.sourceId === flow.sourceId && r.targetId === flow.targetId && r.declared,
    )
  ) {
    return 'OK';
  }
  if (
    model.relations.some(
      (r) => r.sourceId === flow.targetId && r.targetId === flow.sourceId && r.declared,
    )
  ) {
    return 'REVERSED';
  }
  return 'MISSING_RELATION';
}

/**
 * The ownership tree as a flat child → owner map, over the WHOLE model (expansion
 * ignored). The editor migrates pre-Archi sheets with it: child positions stored
 * as offsets from their container become absolute by walking this chain.
 */
export function ownershipIndex(
  model: ModuxModel,
  mode: 'unified' | 'distribution' = 'unified',
): Map<string, string> {
  const owners = new Map<string, string>();
  if (mode === 'distribution') {
    for (const m of model.boundedContexts) {
      const modules = (model.modules ?? []).filter((cm) => cm.boundedContextId === m.id);
      if (modules.length <= 1) continue;
      // Unassigned elements hang off the context itself (the loose packing pool).
      for (const d of boundedContextElementDescs(model, m)) owners.set(d.id, m.id);
      for (const cm of modules) {
        owners.set(cm.id, m.id);
        for (const eid of cm.elementIds ?? []) owners.set(eid, cm.id);
      }
    }
    return owners;
  }
  const apiOps = (apiId: string, siteId: string | null, ownerId: string) => {
    const api = (model.apis ?? []).find((a) => a.id === apiId);
    for (const op of api?.operations ?? []) {
      owners.set(siteId ? apiOpOccurrenceId(op.id, siteId) : op.id, ownerId);
    }
  };
  for (const m of model.boundedContexts) {
    for (const d of boundedContextElementDescs(model, m)) owners.set(d.id, m.id);
    for (const impl of apiImplChildren(model, m.id)) {
      owners.set(impl.id, m.id);
      const parsed = /^apiimpl:(.+)@(.+)$/.exec(impl.id);
      if (parsed) apiOps(parsed[1], parsed[2], impl.id);
    }
    // A context rolls up into its system (C4 landscape) — so a folded coupling deep inside
    // surfaces at the SYSTEM one level up, exactly like a subsystem folds into its external.
    if (m.parentSystemId) owners.set(m.id, m.parentSystemId);
  }
  for (const s of model.systems ?? []) {
    if (s.parentSystemId) owners.set(s.id, s.parentSystemId);
  }
  for (const x of model.externalSystems) {
    if (x.parentExternalSystemId) owners.set(x.id, x.parentExternalSystemId);
    for (const u of x.useCases ?? []) owners.set(u.id, x.id);
    for (const t of x.tables ?? []) owners.set(t.id, x.id);
    for (const sv of x.mcpServers ?? []) owners.set(sv.id, x.id);
  }
  for (const a of model.apis ?? []) {
    if (a.publishedByExternalSystemId) owners.set(a.id, a.publishedByExternalSystemId);
    apiOps(a.id, null, a.id);
  }
  for (const px of model.proxyApis ?? []) {
    if (px.publishedByExternalSystemId) owners.set(px.id, px.publishedByExternalSystemId);
    if (px.targetApiId) apiOps(px.targetApiId, px.id, px.id);
  }
  // A workflow's steps roll up into it: a dependency edge between two folded steps folds away.
  for (const w of model.workflows ?? []) {
    for (const s of w.steps) owners.set(s.id, w.id);
  }
  // A process's steps roll up into it the same way.
  for (const p of model.processes ?? []) {
    for (const s of p.steps) owners.set(s.id, p.id);
  }
  // A UI app's menu entries roll up into the app (menu nodes carry synthetic ids).
  for (const app of model.uiApps ?? []) {
    for (const { entry, path } of flattenMenu(app)) owners.set(menuNodeId(app.id, entry, path), app.id);
  }
  // An ETL flow's steps roll up into the flow.
  for (const f of model.etlFlows ?? []) {
    for (const s of f.steps ?? []) owners.set(s.id, f.id);
  }
  // A data model's field chips roll up into the model.
  for (const dm of model.models ?? []) {
    for (const f of dm.fields ?? []) owners.set(fieldNodeId(dm.id, f.id), dm.id);
  }
  // A mockup's component chips roll up into their PARENT chip (top-level ones into the mockup).
  for (const mk of model.mockups ?? []) {
    const walk = (items: UiComponentNodeRef[] | undefined, parentChip: string | null) => {
      for (const c of items ?? []) {
        const chip = componentNodeId(mk.id, c.id);
        owners.set(chip, parentChip ?? mk.id);
        walk(c.children, chip);
      }
    };
    walk(mk.content, null);
  }
  return owners;
}

/**
 * Ownership for the roll-up pass — `ownershipIndex` plus one link it deliberately omits: an API
 * implemented by a context homes THERE. The base index leaves such APIs ownerless (they render
 * top-level, and giving them an owner would make the layout treat their position as relative to
 * the context — see the absolute-position resolver in the editor). The re-anchor path wants the
 * opposite: so a `Rumbo-JDBC → RumboNet-component` serving edge folds up to `Rumbo → RumboNet`
 * when neither endpoint is a member, this index sends the API to its implementing context. An
 * external publisher still wins (it is the API's real home on the map).
 */
export function rollupOwnershipIndex(
  model: ModuxModel,
  mode: 'unified' | 'distribution' = 'unified',
): Map<string, string> {
  const owners = ownershipIndex(model, mode);
  for (const impl of model.apiImplementations ?? []) {
    const api = (model.apis ?? []).find((a) => a.id === impl.apiId);
    if (api?.publishedByExternalSystemId) continue;
    if (!owners.has(impl.apiId)) owners.set(impl.apiId, impl.boundedContextId);
  }
  // A hand-drawn composition/aggregation is whole→part (diamond at the source): the PART rolls up
  // into the WHOLE. So when the part is hidden or dropped from a view, its relations re-anchor to
  // the whole — the same way a real nesting would. A real owner (parentSystemId…) still wins.
  for (const r of model.archimateRelations ?? []) {
    if ((r.type === 'composition' || r.type === 'aggregation') && r.sourceId !== r.targetId
      && !owners.has(r.targetId)) {
      owners.set(r.targetId, r.sourceId);
    }
  }
  return owners;
}

/** Deterministic circular fallback, same spirit as the server renderer. */
function defaultPosition(index: number, total: number): { x: number; y: number } {
  const angle = (2 * Math.PI * index) / Math.max(total, 1) - Math.PI / 2;
  return {
    x: 480 + 300 * Math.cos(angle),
    y: 340 + 240 * Math.sin(angle),
  };
}

interface ChildDesc {
  id: string;
  name: string;
  kind:
    | 'aggregate'
    | 'entity'
    | 'value-object'
    | 'field'
    | 'invariant'
    | 'operation'
    | 'use-case'
    | 'domain-event'
    | 'application-event'
    | 'integration-event'
    | 'read-model'
    | 'domain-service'
    | 'query-service'
    | 'external-use-case'
    | 'external-table'
    | 'mcp-server'
    | 'api-operation'
    | 'api-op-occurrence'
    | 'api'
    | 'api-impl'
    | 'proxy-api'
    | 'scheduled-trigger'
    | 'etl-flow'
    | 'notification'
    | 'document'
    | 'ui'
    | 'ui-app'
    | 'external-system'
    | 'system'
    | 'boundedContext'
    | 'workflow-step'
    | 'process-step'
    | 'menu-group'
    | 'menu-item'
    | 'etl-step'
    | 'model-field'
    | 'component'
    | 'module';
  /** Policies keep use-case behaviour (gestures, CRUD) but wear the lilac sticky. */
  policy?: boolean;
  /** Per-node glyph/badge override (mockup components vary by their Mateu kind). */
  symbol?: string;
  badge?: string;
}

const POLICY_STYLE = { symbol: 'flow', fill: '#f3e8ff', stroke: '#7e22ce' };

const CHILD_STYLE: Record<ChildDesc['kind'], { symbol: string; fill: string; stroke: string }> = {
  aggregate: { symbol: 'aggregate', fill: '#f5f3ff', stroke: '#8b5cf6' },
  entity: { symbol: 'entity', fill: '#f0fdfa', stroke: '#14b8a6' },
  'value-object': { symbol: 'value-object', fill: '#faf5ff', stroke: '#a855f7' },
  field: { symbol: 'field', fill: '#f8fafc', stroke: '#64748b' },
  invariant: { symbol: 'shield', fill: '#f0fdfa', stroke: '#0f766e' },
  operation: { symbol: 'operation', fill: '#f5f3ff', stroke: '#7c3aed' },
  'use-case': { symbol: 'usecase', fill: '#ecfeff', stroke: '#06b6d4' },
  'domain-event': { symbol: 'event', fill: '#fff7ed', stroke: '#f59e0b' },
  'application-event': { symbol: 'event', fill: '#fefce8', stroke: '#eab308' },
  'integration-event': { symbol: 'event', fill: '#fff1f2', stroke: '#e11d48' },
  'read-model': { symbol: 'readmodel', fill: '#ecfdf5', stroke: '#10b981' },
  'domain-service': { symbol: 'gear', fill: '#fff1f2', stroke: '#f43f5e' },
  'query-service': { symbol: 'lens', fill: '#f0f9ff', stroke: '#0284c7' },
  'external-use-case': { symbol: 'usecase', fill: '#f8fafc', stroke: '#64748b' },
  'external-system': { symbol: 'component', fill: '#ffffff', stroke: '#64748b' },
  system: { symbol: 'component', fill: '#f8fafc', stroke: '#475569' },
  boundedContext: { symbol: 'component', fill: '#eef2ff', stroke: '#94a3b8' },
  'external-table': { symbol: 'readmodel', fill: '#fefce8', stroke: '#a16207' },
  'mcp-server': { symbol: 'robot', fill: '#faf5ff', stroke: '#9333ea' },
  'api-operation': { symbol: 'usecase', fill: '#eef2ff', stroke: '#4f46e5' },
  'api-op-occurrence': { symbol: 'usecase', fill: '#eef2ff', stroke: '#4f46e5' },
  api: { symbol: 'interface', fill: '#eef2ff', stroke: '#4f46e5' },
  'api-impl': { symbol: 'interface', fill: '#eef2ff', stroke: '#4f46e5' },
  'proxy-api': { symbol: 'interface', fill: '#ecfeff', stroke: '#0e7490' },
  'scheduled-trigger': { symbol: 'clock', fill: '#fffbeb', stroke: '#d97706' },
  'etl-flow': { symbol: 'gear', fill: '#f0fdfa', stroke: '#0f766e' },
  notification: { symbol: 'event', fill: '#fdf2f8', stroke: '#db2777' },
  document: { symbol: 'readmodel', fill: '#f8fafc', stroke: '#475569' },
  'ui-app': { symbol: 'component', fill: '#f0f9ff', stroke: '#0ea5e9' },
  ui: { symbol: 'interface', fill: '#f0f9ff', stroke: '#0ea5e9' },
  'workflow-step': { symbol: 'gear', fill: '#ede9fe', stroke: '#6d28d9' },
  'process-step': { symbol: 'gear', fill: '#f5f3ff', stroke: '#7c3aed' },
  'menu-group': { symbol: 'process', fill: '#f0f9ff', stroke: '#7dd3fc' },
  'menu-item': { symbol: 'process', fill: '#ffffff', stroke: '#7dd3fc' },
  'etl-step': { symbol: 'gear', fill: '#f0fdfa', stroke: '#0f766e' },
  'model-field': { symbol: 'field', fill: '#faf5ff', stroke: '#a78bfa' },
  component: { symbol: 'component', fill: '#f0f9ff', stroke: '#0ea5e9' },
  module: { symbol: 'component', fill: '#ffffff', stroke: '#334155' },
};

/** The tooltip noun of each child kind (message keys: translated where rendered). */
const CHILD_TOOLTIP: Record<ChildDesc['kind'], MessageKey> = {
  aggregate: 'views.contextMap.child.aggregate',
  entity: 'views.contextMap.child.entity',
  'value-object': 'views.contextMap.child.valueObject',
  field: 'views.contextMap.child.field',
  invariant: 'views.contextMap.child.invariant',
  operation: 'views.contextMap.child.operation',
  'use-case': 'views.contextMap.child.useCase',
  'domain-event': 'views.contextMap.child.domainEvent',
  'application-event': 'views.contextMap.child.applicationEvent',
  'integration-event': 'views.contextMap.child.integrationEvent',
  'read-model': 'views.contextMap.child.readModel',
  'domain-service': 'views.contextMap.child.domainService',
  'query-service': 'views.contextMap.child.queryService',
  'external-use-case': 'views.contextMap.child.externalUseCase',
  'external-system': 'views.contextMap.child.externalSystem',
  system: 'views.contextMap.child.system',
  boundedContext: 'views.contextMap.child.boundedContext',
  'external-table': 'views.contextMap.child.externalTable',
  'mcp-server': 'views.contextMap.child.mcpServer',
  'api-operation': 'views.contextMap.child.apiOperation',
  'api-op-occurrence': 'views.contextMap.child.apiOpOccurrence',
  api: 'views.contextMap.child.api',
  'api-impl': 'views.contextMap.child.apiImpl',
  'proxy-api': 'views.contextMap.child.proxyApi',
  'scheduled-trigger': 'views.contextMap.child.scheduledTrigger',
  'etl-flow': 'views.contextMap.child.etlFlow',
  notification: 'views.contextMap.child.notification',
  document: 'views.contextMap.child.document',
  'ui-app': 'views.contextMap.child.uiApp',
  ui: 'views.contextMap.child.ui',
  'workflow-step': 'views.contextMap.child.workflowStep',
  'process-step': 'views.contextMap.child.processStep',
  'menu-group': 'views.contextMap.child.menuGroup',
  'menu-item': 'views.contextMap.child.menuItem',
  'etl-step': 'views.contextMap.child.etlStep',
  'model-field': 'views.contextMap.child.modelField',
  component: 'views.contextMap.child.component',
  module: 'views.contextMap.child.module',
};

/** `cmp:<hostId>:<componentId>` — the scene id of a mockup component chip. */
function componentNodeId(hostId: string, componentId: string): string {
  return `cmp:${hostId}:${componentId}`;
}

/** `cmp:<mockupId>:<componentId>` → its parts, or null. */
function parseComponentNodeId(id: string): { mockupId: string; componentId: string } | null {
  const m = /^cmp:([^:]+):(.+)$/.exec(id);
  return m ? { mockupId: m[1], componentId: m[2] } : null;
}

/** Locate a component by id anywhere in a content tree. */
function findComponentById(
  components: UiComponentNodeRef[] | undefined, id: string,
): UiComponentNodeRef | null {
  for (const c of components ?? []) {
    if (c.id === id) return c;
    const hit = findComponentById(c.children, id);
    if (hit) return hit;
  }
  return null;
}

/** A Mateu component's canvas glyph + badge, by its kind (a button looks like a button…). */
function componentGlyph(kind: string): { symbol: string; badge: string } {
  const k = kind.toLowerCase();
  if (k.includes('button')) return { symbol: 'usecase', badge: t('views.contextMap.component.button') };
  if (k.includes('field')) return { symbol: 'field', badge: t('views.aggregates.fieldBadge') };
  if (k === 'tab') return { symbol: 'component', badge: t('views.contextMap.component.tab') };
  if (k.includes('tab')) return { symbol: 'component', badge: t('views.contextMap.component.tabs') };
  if (k.includes('grid') || k.includes('table') || k.includes('list') || k.includes('crud')) {
    return { symbol: 'readmodel', badge: t('views.contextMap.component.listing') };
  }
  if (k.includes('text') || k === 'label' || k.includes('html')) return { symbol: 'note', badge: t('views.contextMap.component.text') };
  if (k.includes('layout') || k.includes('section') || k.includes('card') || k.includes('panel')) {
    return { symbol: 'component', badge: 'LAYOUT' };
  }
  return { symbol: 'component', badge: kind.toUpperCase() };
}

/** One component as a canvas child chip (glyph and badge by its Mateu kind). */
function componentChild(mockupId: string, c: UiComponentNodeRef): ChildDesc {
  const g = componentGlyph(c.kind);
  return {
    id: componentNodeId(mockupId, c.id),
    name: c.title || c.label || c.text || c.kind,
    kind: 'component',
    symbol: g.symbol,
    badge: g.badge,
  };
}

/** Default container size that fits `childCount` boxes in a grid. */
function boundedContextElementDescs(
  model: ModuxModel,
  boundedContext: ModuxModel['boundedContexts'][number],
): ChildDesc[] {
  return [
    ...(model.aggregates ?? [])
      .filter((a) => a.boundedContextId === boundedContext.id)
      .map((a): ChildDesc => {
        // What the aggregate holds shows on the chip: 🗂 entities, ◈ value objects,
        // ⚖ invariants (its reason to exist).
        const entN = (model.entities ?? []).filter((e) => e.aggregateId === a.id).length;
        const voN = (model.valueObjects ?? []).filter((v) => v.aggregateId === a.id).length;
        const invN = (a.invariants ?? []).length;
        const fN = (a.fields ?? []).length;
        const opN = (a.operations ?? []).length;
        const chips =
          (fN ? ` ∷${fN}` : '') +
          (opN ? ` ⚙${opN}` : '') +
          (entN ? ` 🗂${entN}` : '') +
          (voN ? ` ◈${voN}` : '') +
          (invN ? ` ⚖${invN}` : '');
        return { id: a.id, name: `${a.name}${chips}`, kind: 'aggregate' };
      }),
    ...(boundedContext.useCases ?? []).map(
      (u): ChildDesc => ({ id: u.id, name: u.name, kind: 'use-case', policy: u.policy }),
    ),
    ...(boundedContext.domainEvents ?? []).map(
      (ev): ChildDesc => ({ id: ev.id, name: ev.name, kind: 'domain-event' }),
    ),
    ...(boundedContext.readModels ?? []).map(
      (rm): ChildDesc => ({ id: rm.id, name: rm.name, kind: 'read-model' }),
    ),
    ...(boundedContext.domainServices ?? []).map(
      (ds): ChildDesc => ({ id: ds.id, name: ds.name, kind: 'domain-service' }),
    ),
    ...(boundedContext.applicationEvents ?? []).map(
      (ev): ChildDesc => ({ id: ev.id, name: ev.name, kind: 'application-event' }),
    ),
    ...(boundedContext.integrationEvents ?? []).map(
      (ev): ChildDesc => ({ id: ev.id, name: ev.name, kind: 'integration-event' }),
    ),
    ...(boundedContext.queryServices ?? []).map(
      (qs): ChildDesc => ({ id: qs.id, name: qs.name, kind: 'query-service' }),
    ),
    ...(boundedContext.scheduledTriggers ?? []).map(
      (t): ChildDesc => ({ id: t.id, name: t.name, kind: 'scheduled-trigger' }),
    ),
    ...(model.etlFlows ?? [])
      .filter((f) => f.ownerBoundedContextId === boundedContext.id)
      .map((f): ChildDesc => ({ id: f.id, name: f.name, kind: 'etl-flow' })),
    ...(model.notifications ?? [])
      .filter((n) => n.ownerBoundedContextId === boundedContext.id)
      .map((n): ChildDesc => ({ id: n.id, name: n.name, kind: 'notification' })),
    ...(model.documents ?? [])
      .filter((d) => d.ownerBoundedContextId === boundedContext.id)
      .map((d): ChildDesc => ({ id: d.id, name: d.name, kind: 'document' })),
    ...(model.uis ?? [])
      .filter((u) => u.boundedContextId === boundedContext.id)
      .map((u): ChildDesc => ({ id: u.id, name: u.name, kind: 'ui' })),
    ...(model.uiApps ?? [])
      .filter((a) => (boundedContext.uiAppIds ?? []).includes(a.id))
      .map((a): ChildDesc => ({ id: a.id, name: a.name, kind: 'ui-app' })),
  ];
}

/**
 * A bounded context at the detail level: the boundedContext itself as a resizable
 * container plus one small box per aggregate and per use case (both hang off the
 * boundedContext — there is no aggregate→use-case link). Child positions are offsets
 * from the container centre (stored in `layout` under the child id, falling back
 * to a grid); the container size comes from `sizes`. Children are draggable and
 * become connectable once relations between them are added.
 */
/** ArchiMate 3 notation, per relationship type (drawn source → target). */
export const ARCHIMATE_NOTATION: Record<string, Partial<SceneEdge>> = {
  association: {},
  composition: { markerStart: 'diamond' },
  aggregation: { markerStart: 'diamond-hollow' },
  assignment: { markerStart: 'ball', markerEnd: 'arrow' },
  realization: { markerEnd: 'hollow-triangle', dashArray: '2 3' },
  specialization: { markerEnd: 'hollow-triangle' },
  serving: { markerEnd: 'open-arrow' },
  access: { markerEnd: 'open-arrow', dashArray: '2 3' },
  influence: { markerEnd: 'open-arrow', dashArray: '2 3' },
  triggering: { markerEnd: 'arrow' },
  flow: { markerEnd: 'arrow', dashArray: '6 4' },
};

const ARCHIMATE_LABEL_KEY: Record<string, MessageKey> = {
  association: 'views.archimate.association',
  composition: 'views.archimate.composition',
  aggregation: 'views.archimate.aggregation',
  assignment: 'views.archimate.assignment',
  realization: 'views.archimate.realization',
  specialization: 'views.archimate.specialization',
  serving: 'views.archimate.serving',
  access: 'views.archimate.access',
  influence: 'views.archimate.influence',
  triggering: 'views.archimate.triggering',
  flow: 'views.archimate.flow',
};

/**
 * Human names for the picker and tooltips. Each entry is a getter, so it reads in the language
 * current at access time (never at import).
 */
export const ARCHIMATE_LABEL: Record<string, string> = Object.defineProperties(
  {} as Record<string, string>,
  Object.fromEntries(
    Object.entries(ARCHIMATE_LABEL_KEY).map(([type, key]) => [type, { get: () => t(key), enumerable: true }]),
  ),
);

/**
 * The stand-alone data models a unified-canvas sheet draws as top-level boxes.
 *
 * A data model (`models/*.yaml`: a use case's input/output, an event payload, a read-model
 * shape…) is not a strategic element — it has no owning context in the YAML, so on the system
 * map it could only float loose, burying the actors, contexts and APIs under dozens of DTO
 * boxes. The base sheet (`memberIds` absent) therefore draws NONE; a curated view draws the
 * ones the user made members of it (that is how a model is deliberately put on a canvas). State
 * models never qualify: they are an aggregate/entity's own fields, shown inside it.
 */
export function stageDataModelIds(
  model: ModuxModel,
  memberIds?: Iterable<string> | null,
): Set<string> {
  if (!memberIds) return new Set();
  const members = new Set(memberIds);
  const stateModelIds = new Set<string>([
    ...(model.aggregates ?? []).map((a) => a.modelId),
    ...(model.entities ?? []).map((e) => e.modelId),
  ].filter((id): id is string => !!id));
  return new Set(
    (model.models ?? []).map((dm) => dm.id).filter((id) => members.has(id) && !stateModelIds.has(id)),
  );
}

/**
 * The base sheet without the geometry of data models it no longer draws (see
 * {@link stageDataModelIds}): their positions, sizes, fills and unfold state — field chips
 * included. Layouts saved before the rule carried a ref per model; dropping them on the next
 * write keeps `diagrams/base.yaml` from hoarding dead refs. Returns the same object when there
 * is nothing to drop.
 */
export function withoutOffStageDataModels(model: ModuxModel, layout: ViewLayout): ViewLayout {
  const modelIds = new Set((model.models ?? []).map((dm) => dm.id));
  if (!modelIds.size) return layout;
  const offStage = (id: string) => {
    if (modelIds.has(id)) return true;
    const field = /^fld:([^:]+):/.exec(id);
    return !!field && modelIds.has(field[1]);
  };
  const strip = <T>(rec: Record<string, T> | undefined) => {
    if (!rec || !Object.keys(rec).some(offStage)) return rec;
    return Object.fromEntries(Object.entries(rec).filter(([id]) => !offStage(id)));
  };
  const nodes = strip(layout.nodes)!;
  const sizes = strip(layout.sizes);
  const fills = strip(layout.fills);
  const expanded = layout.expanded?.some(offStage) ? layout.expanded.filter((id) => !offStage(id)) : layout.expanded;
  if (nodes === layout.nodes && sizes === layout.sizes && fills === layout.fills && expanded === layout.expanded) {
    return layout;
  }
  return {
    ...layout,
    nodes,
    ...(sizes ? { sizes } : {}),
    ...(fills ? { fills } : {}),
    ...(expanded ? { expanded } : {}),
  };
}

export function contextMapScene(
  model: ModuxModel,
  layout: DiagramLayout,
  sizes: Record<string, { w: number; h: number }> = {},
  expandedIds: ReadonlySet<string> = new Set(),
  expandAll = false,
  rollup?: Map<string, string>,
  dataModelIds: ReadonlySet<string> = new Set(),
): Scene {
  return buildScene(model, layout, 'unified', sizes, expandedIds, expandAll, rollup, dataModelIds);
}

/** The distribution lens: contexts as module packagers, plus services and infrastructure. */
export function distributionScene(
  model: ModuxModel,
  layout: DiagramLayout,
  sizes: Record<string, { w: number; h: number }> = {},
  expandedIds: ReadonlySet<string> = new Set(),
  expandAll = false,
  rollup?: Map<string, string>,
): Scene {
  return buildScene(model, layout, 'distribution', sizes, expandedIds, expandAll, rollup);
}

function buildScene(
  model: ModuxModel,
  layout: DiagramLayout,
  mode: 'unified' | 'distribution',
  sizes: Record<string, { w: number; h: number }> = {},
  toggledIds: ReadonlySet<string> = new Set(),
  expandAll = false,
  rollup?: Map<string, string>,
  dataModelIds: ReadonlySet<string> = new Set(),
): Scene {
  const distributionLevel = mode === 'distribution';
  // The yugo wants the WHOLE containment tree — its own folding decides what shows.
  // Everything with children joins the set — the whole containment tree unfolds.
  if (expandAll) {
    const all = new Set(toggledIds);
    for (const m of model.boundedContexts) all.add(m.id);
    for (const s of model.systems ?? []) all.add(s.id);
    for (const a of model.aggregates ?? []) all.add(a.id);
    for (const x of model.externalSystems) all.add(x.id);
    for (const a of model.apis ?? []) all.add(a.id);
    for (const px of model.proxyApis ?? []) all.add(px.id);
    for (const impl of model.apiImplementations ?? []) {
      all.add(apiImplNodeId(impl.apiId, impl.boundedContextId));
    }
    for (const cm of model.modules ?? []) all.add(cm.id);
    toggledIds = all;
  }
  // Fine-grained edges always TRY to draw; the nodeIds guards roll them up or
  // drop them when their endpoints are folded away.
  const detailed = !distributionLevel;
  const externalIds = new Set(model.externalSystems.map((x) => x.id));
  const nestedApis = (model.apis ?? []).filter(
    (a) => a.publishedByExternalSystemId && externalIds.has(a.publishedByExternalSystemId),
  );
  const nestedApiIds = new Set(nestedApis.map((a) => a.id));
  const nestedProxies = (model.proxyApis ?? []).filter(
    (px) => px.publishedByExternalSystemId && externalIds.has(px.publishedByExternalSystemId),
  );
  const nestedProxyIds = new Set(nestedProxies.map((px) => px.id));
  // The distribution level narrows the cast: boundedContexts, services and infrastructure —
  // the strategic nodes (externals, APIs, workflows, floating ETLs) stay on the
  // other levels.
  // ---- the ownership tree (Archi style) ------------------------------------
  // Nodes are ALWAYS independent boxes; containment is a drawn relation (the
  // filled diamond on the owner's side). Expanding a node brings its children
  // on stage as free nodes ringed around it, tied by their composition edge.
  const apiById = new Map((model.apis ?? []).map((a) => [a.id, a]));
  const proxyById = new Map((model.proxyApis ?? []).map((px) => [px.id, px]));

  /** Direct children of an element in the ownership tree (mode-aware). */
  // Fields are the primary content; a value object / entity used as a field's TYPE shows
  // UNDER that field, not loose. Those not yet used by any field stay loose (transitional).
  const fieldOwnersAll = [...(model.aggregates ?? []), ...(model.entities ?? [])];
  const fieldById = new Map<string, FieldRef>();
  const referencedTypeIds = new Set<string>();
  fieldOwnersAll.forEach((o) =>
    (o.fields ?? []).forEach((f) => {
      fieldById.set(f.id, f);
      if (f.typeKind !== 'primitive' && f.typeRef) referencedTypeIds.add(f.typeRef);
    }),
  );

  const ownedChildren = (id: string, kind: string): ChildDesc[] => {
    if (distributionLevel) {
      if (kind === 'boundedContext') {
        // A context with just its main module has nothing to distribute: the
        // module stays implicit and the context is the deployment target.
        const modules = (model.modules ?? []).filter((cm) => cm.boundedContextId === id);
        if (modules.length <= 1) return [];
        // Unassigned elements ride along as loose boxes: they are what you drag
        // into a module to package it.
        const assigned = new Set(modules.flatMap((cm) => cm.elementIds ?? []));
        const bc = model.boundedContexts.find((m) => m.id === id);
        const loose = bc
          ? boundedContextElementDescs(model, bc).filter((e) => !assigned.has(e.id))
          : [];
        return [
          ...modules.map((cm): ChildDesc => ({ id: cm.id, name: cm.name, kind: 'module' })),
          ...loose,
        ];
      }
      if (kind === 'module') {
        const cm = (model.modules ?? []).find((x) => x.id === id);
        const bc = model.boundedContexts.find((m) => m.id === cm?.boundedContextId);
        if (!cm || !bc) return [];
        const byId = new Map(boundedContextElementDescs(model, bc).map((e) => [e.id, e]));
        return (cm.elementIds ?? [])
          .map((eid) => byId.get(eid))
          .filter((e): e is ChildDesc => !!e);
      }
      return [];
    }
    switch (kind) {
      case 'system': {
        // A system holds nested systems and the bounded contexts grouped under it.
        return [
          ...(model.systems ?? [])
            .filter((s) => s.parentSystemId === id)
            .map((s): ChildDesc => ({ id: s.id, name: s.name, kind: 'system' })),
          ...model.boundedContexts
            .filter((m) => m.parentSystemId === id)
            .map((m): ChildDesc => ({ id: m.id, name: m.name, kind: 'boundedContext' })),
        ];
      }
      case 'boundedContext': {
        const bc = model.boundedContexts.find((m) => m.id === id);
        return bc ? [...apiImplChildren(model, id), ...boundedContextElementDescs(model, bc)] : [];
      }
      case 'external-system': {
        const x = model.externalSystems.find((s) => s.id === id);
        return [
          ...model.externalSystems
            .filter((s) => s.parentExternalSystemId === id)
            .map((s): ChildDesc => ({ id: s.id, name: s.name, kind: 'external-system' })),
          ...nestedApis
            .filter((a) => a.publishedByExternalSystemId === id)
            .map((a): ChildDesc => ({ id: a.id, name: a.name, kind: 'api' })),
          ...nestedProxies
            .filter((px) => px.publishedByExternalSystemId === id)
            .map((px): ChildDesc => ({ id: px.id, name: px.name, kind: 'proxy-api' })),
          ...(x?.useCases ?? []).map(
            (u): ChildDesc => ({ id: u.id, name: u.name, kind: 'external-use-case' }),
          ),
          ...(x?.tables ?? []).map(
            (t): ChildDesc => ({ id: t.id, name: t.name, kind: 'external-table' }),
          ),
          ...(x?.mcpServers ?? []).map(
            (s): ChildDesc => ({ id: s.id, name: s.name, kind: 'mcp-server' }),
          ),
        ];
      }
      case 'aggregate': {
        // Its FIELDS and invariants; plus any value objects / entities it defines that
        // no field uses yet (loose "types waiting to be used").
        const agg = (model.aggregates ?? []).find((a) => a.id === id);
        const opLabel = (o: { name: string; inputModelId?: string; outputModelId?: string }) => {
          const nm = (mid?: string) => (mid ? model.models?.find((m) => m.id === mid)?.name ?? '' : '');
          const inN = nm(o.inputModelId);
          const outN = nm(o.outputModelId);
          return `${o.name}(${inN})${outN ? ` : ${outN}` : ''}`;
        };
        return [
          ...(agg?.fields ?? []).map((f) => fieldChildDesc(model, f)),
          ...(agg?.operations ?? []).map((o): ChildDesc => ({ id: o.id, name: opLabel(o), kind: 'operation' })),
          ...(agg?.invariants ?? []).map((iv): ChildDesc => ({ id: iv.id, name: iv.name, kind: 'invariant' })),
          ...(model.valueObjects ?? [])
            .filter((v) => v.aggregateId === id && !referencedTypeIds.has(v.id))
            .map((v): ChildDesc => ({ id: v.id, name: v.name, kind: 'value-object' })),
          ...(model.entities ?? [])
            .filter((e) => e.aggregateId === id && !referencedTypeIds.has(e.id))
            .map((e): ChildDesc => ({ id: e.id, name: e.name, kind: 'entity' })),
        ];
      }
      case 'entity': {
        const ent = (model.entities ?? []).find((e) => e.id === id);
        return [
          ...(ent?.fields ?? []).map((f) => fieldChildDesc(model, f)),
          ...(ent?.invariants ?? []).map((iv): ChildDesc => ({ id: iv.id, name: iv.name, kind: 'invariant' })),
        ];
      }
      case 'value-object': {
        const vo = (model.valueObjects ?? []).find((v) => v.id === id);
        return (vo?.invariants ?? []).map((iv): ChildDesc => ({ id: iv.id, name: iv.name, kind: 'invariant' }));
      }
      case 'field': {
        // Expanding a field reveals its TYPE — the value object / entity / aggregate it
        // points at (primitives have nothing to expand).
        const f = fieldById.get(id);
        if (!f || f.typeKind === 'primitive' || !f.typeRef) return [];
        const vo = (model.valueObjects ?? []).find((v) => v.id === f.typeRef);
        if (vo) return [{ id: vo.id, name: vo.name, kind: 'value-object' }];
        const ent = (model.entities ?? []).find((e) => e.id === f.typeRef);
        if (ent) return [{ id: ent.id, name: ent.name, kind: 'entity' }];
        const agg = (model.aggregates ?? []).find((a) => a.id === f.typeRef);
        if (agg) return [{ id: agg.id, name: agg.name, kind: 'aggregate' }];
        return [];
      }
      case 'api':
        return (apiById.get(id)?.operations ?? []).map(
          (op): ChildDesc => ({ id: op.id, name: op.name, kind: 'api-operation' }),
        );
      case 'api-impl': {
        const impl = /^apiimpl:(.+)@(.+)$/.exec(id);
        const api = impl ? apiById.get(impl[1]) : undefined;
        return (api?.operations ?? []).map(
          (op): ChildDesc => ({
            id: apiOpOccurrenceId(op.id, impl![2]),
            name: op.name,
            kind: 'api-op-occurrence',
          }),
        );
      }
      case 'proxy-api': {
        const px = proxyById.get(id);
        return px
          ? proxyOps(model, px).map(
              (op): ChildDesc => ({
                id: apiOpOccurrenceId(op.id, id),
                name: op.name,
                kind: 'api-op-occurrence',
              }),
            )
          : [];
      }
      case 'workflow': {
        // Its steps (joins/splits included) hang inside it; their dependency arrows are drawn
        // between them (see workflowStepEdges) and roll up when the workflow is folded.
        const w = (model.workflows ?? []).find((x) => x.id === id);
        return (w?.steps ?? []).map((s): ChildDesc => ({ id: s.id, name: s.name, kind: 'workflow-step' }));
      }
      case 'process': {
        // A process is a linear chain of steps; the ordering arrows (processStepEdges) roll up
        // with it when folded.
        const p = (model.processes ?? []).find((x) => x.id === id);
        return (p?.steps ?? []).map((s): ChildDesc => ({ id: s.id, name: s.name, kind: 'process-step' }));
      }
      case 'ui-app': {
        // The app's menu tree, flattened (like the UI lens): each entry a child, groups vs leaves;
        // what each entry drives (use case / aggregate / query / app) is drawn by menuEdges.
        const app = (model.uiApps ?? []).find((a) => a.id === id);
        if (!app) return [];
        return flattenMenu(app).map(({ entry, path }): ChildDesc => ({
          id: menuNodeId(app.id, entry, path),
          name: entry.label,
          kind: entry.children?.length ? 'menu-group' : 'menu-item',
        }));
      }
      case 'etl-flow': {
        // The integrator's pipeline: source/transform/write steps hang inside it; the flow arrows
        // between phases (etlPipeEdges) roll up with it.
        const f = (model.etlFlows ?? []).find((x) => x.id === id);
        return (f?.steps ?? []).map((s): ChildDesc => ({ id: s.id, name: s.name ?? s.id, kind: 'etl-step' }));
      }
      case 'model': {
        // A data model's fields (synthetic chip ids); the field-to-field mapping rules join them.
        const dm = (model.models ?? []).find((x) => x.id === id);
        return (dm?.fields ?? []).map((f): ChildDesc => ({
          id: fieldNodeId(id, f.id), name: f.name, kind: 'model-field',
        }));
      }
      case 'mockup': {
        // The mockup's TOP-LEVEL components; each expands to its own children (nested tree).
        const mk = (model.mockups ?? []).find((x) => x.id === id);
        return (mk?.content ?? []).map((c) => componentChild(id, c));
      }
      case 'component': {
        // A component chip (id `cmp:<mockupId>:<componentId>`) reveals its children.
        const ref = parseComponentNodeId(id);
        if (!ref) return [];
        const mk = (model.mockups ?? []).find((x) => x.id === ref.mockupId);
        const comp = findComponentById(mk?.content, ref.componentId);
        return (comp?.children ?? []).map((c) => componentChild(ref.mockupId, c));
      }
      default:
        return [];
    }
  };

  const nodes: SceneNode[] = [];
  const containsEdges: SceneEdge[] = [];

  /** A child born without a stored position rings around its owner. */
  const childDefault = (
    owner: { x: number; y: number },
    i: number,
    total: number,
  ): { x: number; y: number } => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(total, 1);
    const r = 160 + 12 * Math.min(total, 14);
    return { x: owner.x + r * Math.cos(angle), y: owner.y + r * Math.sin(angle) };
  };

  /** Emits the (expanded) children of an owner as free nodes plus their diamonds. */
  const emitChildren = (
    ownerId: string,
    ownerKind: string,
    ownerName: string,
    ownerPos: { x: number; y: number },
  ): void => {
    const kids = ownedChildren(ownerId, ownerKind);
    kids.forEach((k, i) => {
      const pos = layout[k.id] ?? childDefault(ownerPos, i, kids.length);
      const grand = ownedChildren(k.id, k.kind);
      const expanded = toggledIds.has(k.id) && grand.length > 0;
      const style = k.policy ? POLICY_STYLE : CHILD_STYLE[k.kind];
      const subsystem = k.kind === 'external-system';
      // A bounded context (or nested system) inside a system is a CONTAINER, not a leaf chip:
      // it keeps its own box and can be resized and expanded into its aggregates/use-cases.
      const container = k.kind === 'boundedContext' || k.kind === 'system';
      const kSize = sizes[k.id];
      nodes.push({
        id: k.id,
        label: k.name,
        kind: k.kind,
        x: pos.x,
        y: pos.y,
        w: kSize?.w ?? (subsystem ? 150 : container ? NODE_W : childBoxWidth(k.name)),
        h: kSize?.h ?? (subsystem ? 44 : container ? NODE_H : CHILD_H + 4),
        symbol: k.symbol ?? style.symbol,
        fill: style.fill,
        stroke: style.stroke,
        badge: k.badge,
        dashed: subsystem || undefined,
        resizable: container || undefined,
        ownerId,
        collapsible: grand.length > 0,
        collapsed: grand.length > 0 && !expanded,
        tooltip: t('views.contextMap.childTooltip', {
          kind: k.policy ? 'Policy' : t(CHILD_TOOLTIP[k.kind]), name: k.name, owner: ownerName,
        }),
      });
      containsEdges.push({
        id: `contains:${ownerId}->${k.id}`,
        sourceId: ownerId,
        targetId: k.id,
        kind: 'contains',
        color: '#94a3b8',
        tooltip: t('views.contextMap.containsEdge', { owner: ownerName, name: k.name }),
      });
      if (expanded) emitChildren(k.id, k.kind, k.name, pos);
    });
  };

  // State models belong to an aggregate/entity (its fields) — never drawn as a free node.
  const stateModelIds = new Set<string>([
    ...(model.aggregates ?? []).map((a) => a.modelId),
    ...(model.entities ?? []).map((e) => e.modelId),
  ].filter((id): id is string => !!id));

  const allNodes = [
    // A context grouped under a system enters the stage through that system's expansion, not at the
    // top level — except in the distribution lens, where systems aren't drawn and it must show.
    ...model.boundedContexts
      .filter((m) => !m.parentSystemId || distributionLevel)
      .map((m) => ({ ref: m, external: false, api: false, proxy: false })),
    ...(distributionLevel ? [] : (model.systems ?? []))
      // nested systems enter through their parent's expansion, never top-level
      .filter((s) => !s.parentSystemId)
      .map((s) => ({ ref: s, external: false, api: false, proxy: false, system: true })),
    ...(distributionLevel ? [] : model.externalSystems)
      // subsystems enter the stage through their parent's expansion, never top-level
      .filter((e) => !e.parentExternalSystemId || !externalIds.has(e.parentExternalSystemId))
      .map((e) => ({ ref: e, external: true, api: false, proxy: false })),
    ...(distributionLevel ? [] : (model.apis ?? [])
      .filter((a) => !nestedApiIds.has(a.id))
      .map((a) => ({ ref: a, external: false, api: true, proxy: false }))),
    ...(distributionLevel ? [] : (model.proxyApis ?? [])
      .filter((px) => !nestedProxyIds.has(px.id))
      .map((px) => ({ ref: px, external: false, api: false, proxy: true }))),
    ...(distributionLevel ? [] : (model.workflows ?? []).map((w) => ({
      ref: w,
      external: false,
      api: false,
      proxy: false,
      workflow: true,
    }))),
    ...(distributionLevel ? [] : (model.processes ?? []).map((p) => ({
      ref: p,
      external: false,
      api: false,
      proxy: false,
      process: true,
    }))),
    // An aggregate/entity's STATE model is its own data shape (its fields live there) — not a
    // separate node. A stand-alone data model is not strategic either: it only takes the stage
    // where a curated view lists it (see stageDataModelIds) — never loose on the system map.
    ...(distributionLevel ? [] : (model.models ?? [])
      .filter((dm) => !stateModelIds.has(dm.id) && dataModelIds.has(dm.id))
      .map((dm) => ({
        ref: dm,
        external: false,
        api: false,
        proxy: false,
        dataModel: true,
      }))),
    ...(distributionLevel ? [] : (model.pages ?? []).map((pg) => ({
      ref: pg,
      external: false,
      api: false,
      proxy: false,
      uiPage: true,
    }))),
    ...(distributionLevel ? [] : (model.mockups ?? []).map((mk) => ({
      ref: mk,
      external: false,
      api: false,
      proxy: false,
      mockup: true,
    }))),
    // ETL flows without owner (legacy) still float; owned ones enter through their context.
    ...(distributionLevel ? [] : (model.etlFlows ?? [])
      .filter((f) => !f.ownerBoundedContextId)
      .map((f) => ({
        ref: f,
        external: false,
        api: false,
        proxy: false,
        etl: true,
      }))),
    ...(model.identityProviders ?? []).map((idp) => ({
      ref: idp,
      external: false,
      api: false,
      proxy: false,
      idp: true,
    })),
    ...(distributionLevel ? [] : (model.cdcs ?? []).map((c) => ({
      ref: c,
      external: false,
      api: false,
      proxy: false,
      cdc: true,
    }))),
  ];

  allNodes.forEach((entry, i) => {
    const pos = layout[entry.ref.id] ?? defaultPosition(i, allNodes.length);
    if ('cdc' in entry && entry.cdc) {
      const c = entry.ref as NonNullable<ModuxModel['cdcs']>[number];
      nodes.push({
        id: c.id,
        label: c.name,
        kind: 'cdc',
        symbol: 'flow',
        fill: '#ecfeff',
        stroke: '#0891b2',
        badge: 'CDC',
        tooltip: t('views.contextMap.cdcTooltip', { name: c.name }),
        x: pos.x,
        y: pos.y,
        w: NODE_W,
        h: NODE_H,
      });
      return;
    }
    if ('idp' in entry && entry.idp) {
      const idp = entry.ref as NonNullable<ModuxModel['identityProviders']>[number];
      const federated = !!idp.publishedByExternalSystemId;
      nodes.push({
        id: idp.id,
        label: idp.name,
        kind: 'identity-provider',
        symbol: 'key',
        fill: federated ? '#ffffff' : '#fefce8',
        stroke: '#ca8a04',
        dashed: federated,
        badge: idp.type ?? 'IDP',
        tooltip: t(federated ? 'views.contextMap.idpTooltipFederated' : 'views.contextMap.idpTooltip', { name: idp.name }),
        x: pos.x,
        y: pos.y,
        w: NODE_W,
        h: NODE_H,
      });
      return;
    }
    if ('etl' in entry && entry.etl) {
      const f = entry.ref as NonNullable<ModuxModel['etlFlows']>[number];
      const kids = ownedChildren(f.id, 'etl-flow');
      const expanded = toggledIds.has(f.id) && kids.length > 0;
      nodes.push({
        id: f.id,
        label: f.name,
        kind: 'etl-flow',
        symbol: 'gear',
        fill: '#f0fdfa',
        stroke: '#0f766e',
        dashed: true,
        badge: 'ETL',
        tooltip: t('views.contextMap.etlTooltip', { name: f.name }),
        collapsible: kids.length > 0,
        collapsed: kids.length > 0 && !expanded,
        x: pos.x,
        y: pos.y,
        w: NODE_W,
        h: NODE_H,
      });
      if (expanded) emitChildren(f.id, 'etl-flow', f.name, pos);
      return;
    }
    if ('workflow' in entry && entry.workflow) {
      const w = entry.ref as NonNullable<ModuxModel['workflows']>[number];
      const kids = ownedChildren(w.id, 'workflow');
      const expanded = toggledIds.has(w.id) && kids.length > 0;
      nodes.push({
        id: w.id,
        label: w.name,
        kind: 'workflow',
        symbol: 'process',
        fill: '#ede9fe',
        stroke: '#6d28d9',
        dashed: true,
        badge: 'WORKFLOW',
        tooltip: t('views.contextMap.workflowTooltip', { name: w.name }) + (w.triggerEvent ? t('views.contextMap.startsOn', { event: w.triggerEvent }) : ''),
        collapsible: kids.length > 0,
        collapsed: kids.length > 0 && !expanded,
        x: pos.x,
        y: pos.y,
        w: NODE_W,
        h: NODE_H,
      });
      if (expanded) emitChildren(w.id, 'workflow', w.name, pos);
      return;
    }
    if ('process' in entry && entry.process) {
      const p = entry.ref as NonNullable<ModuxModel['processes']>[number];
      const kids = ownedChildren(p.id, 'process');
      const expanded = toggledIds.has(p.id) && kids.length > 0;
      nodes.push({
        id: p.id,
        label: p.name,
        kind: 'process',
        symbol: 'process',
        fill: '#f5f3ff',
        stroke: '#7c3aed',
        badge: `PROCESS${p.sla ? ` · SLA ${p.sla}` : ''}`,
        tooltip: t('views.contextMap.processTooltip', { name: p.name }) + (p.triggerEvent ? t('views.contextMap.startsOn', { event: p.triggerEvent }) : ''),
        collapsible: kids.length > 0,
        collapsed: kids.length > 0 && !expanded,
        x: pos.x,
        y: pos.y,
        w: NODE_W,
        h: NODE_H,
      });
      if (expanded) emitChildren(p.id, 'process', p.name, pos);
      return;
    }
    if ('dataModel' in entry && entry.dataModel) {
      const dm = entry.ref as NonNullable<ModuxModel['models']>[number];
      const kids = ownedChildren(dm.id, 'model');
      const expanded = toggledIds.has(dm.id) && kids.length > 0;
      nodes.push({
        id: dm.id,
        label: dm.name,
        kind: 'model',
        symbol: 'readmodel',
        fill: '#ffffff',
        stroke: '#8b5cf6',
        badge: 'MODEL',
        tooltip: t('views.contextMap.dataModelTooltip', { name: dm.name }),
        collapsible: kids.length > 0,
        collapsed: kids.length > 0 && !expanded,
        x: pos.x,
        y: pos.y,
        w: NODE_W,
        h: NODE_H,
      });
      if (expanded) emitChildren(dm.id, 'model', dm.name, pos);
      return;
    }
    if ('uiPage' in entry && entry.uiPage) {
      const pg = entry.ref as NonNullable<ModuxModel['pages']>[number];
      nodes.push({
        id: pg.id,
        label: pg.name,
        kind: 'page',
        symbol: 'page',
        fill: '#f0f9ff',
        stroke: '#0ea5e9',
        badge: pg.type ? `${t('views.contextMap.pageBadge')} · ${pg.type}` : t('views.contextMap.pageBadge'),
        tooltip: `${t('views.contextMap.pageTooltip', { name: pg.name })}${pg.route ? ` · ${pg.route}` : ''}${pg.type ? ` (${pg.type})` : ''}`,
        x: pos.x,
        y: pos.y,
        w: NODE_W,
        h: NODE_H,
      });
      return;
    }
    if ('mockup' in entry && entry.mockup) {
      const mk = entry.ref as NonNullable<ModuxModel['mockups']>[number];
      const kids = ownedChildren(mk.id, 'mockup');
      const expanded = toggledIds.has(mk.id) && kids.length > 0;
      nodes.push({
        id: mk.id,
        label: mk.name,
        kind: 'mockup',
        symbol: 'interface',
        fill: '#f0f9ff',
        stroke: '#0ea5e9',
        dashed: true,
        badge: 'MOCKUP',
        tooltip: t(mk.pageId ? 'views.contextMap.mockupTooltip' : 'views.contextMap.mockupTooltipLoose', { name: mk.name }),
        collapsible: kids.length > 0,
        collapsed: kids.length > 0 && !expanded,
        x: pos.x,
        y: pos.y,
        w: NODE_W,
        h: NODE_H,
      });
      if (expanded) emitChildren(mk.id, 'mockup', mk.name, pos);
      return;
    }
    if (entry.proxy) {
      const px = entry.ref as NonNullable<ModuxModel['proxyApis']>[number];
      const kids = ownedChildren(px.id, 'proxy-api');
      const expanded = toggledIds.has(px.id) && kids.length > 0;
      nodes.push({
        id: px.id,
        label: px.name,
        kind: 'proxy-api',
        symbol: 'interface',
        fill: '#ecfeff',
        stroke: '#0e7490',
        badge: 'PROXY API',
        tooltip: t('views.contextMap.proxyTooltip', { name: px.name }),
        collapsible: kids.length > 0,
        collapsed: kids.length > 0 && !expanded,
        x: pos.x,
        y: pos.y,
        w: NODE_W,
        h: NODE_H,
      });
      if (expanded) emitChildren(px.id, 'proxy-api', px.name, pos);
      return;
    }
    if (entry.api) {
      const a = entry.ref as NonNullable<ModuxModel['apis']>[number];
      const kids = ownedChildren(a.id, 'api');
      const expanded = toggledIds.has(a.id) && kids.length > 0;
      nodes.push({
        id: a.id,
        label: a.name,
        kind: 'api',
        symbol: 'interface',
        fill: '#eef2ff',
        stroke: '#4f46e5',
        badge: 'API',
        tooltip: t('views.contextMap.apiTooltip', { name: a.name }),
        collapsible: kids.length > 0,
        collapsed: kids.length > 0 && !expanded,
        x: pos.x,
        y: pos.y,
        w: NODE_W,
        h: NODE_H,
      });
      if (expanded) emitChildren(a.id, 'api', a.name, pos);
      return;
    }
    if (entry.external) {
      const x = entry.ref as ModuxModel['externalSystems'][number];
      const kids = ownedChildren(x.id, 'external-system');
      const expanded = toggledIds.has(x.id) && kids.length > 0;
      const xSize = sizes[x.id];
      nodes.push({
        id: x.id,
        label: x.name,
        kind: 'external-system',
        symbol: 'component',
        fill: '#ffffff',
        stroke: '#64748b',
        dashed: true,
        badge: x.referencedProject ? t('views.contextMap.projectBadge') : 'EXTERNAL',
        tooltip: x.referencedProject
          ? t('views.contextMap.projectTooltip', { name: x.name, where: whereItLives(x.referencedProject) })
          : t('views.contextMap.externalSystemTooltip', { name: x.name }),
        collapsible: kids.length > 0,
        collapsed: kids.length > 0 && !expanded,
        resizable: true,
        x: pos.x,
        y: pos.y,
        w: xSize?.w ?? NODE_W,
        h: xSize?.h ?? NODE_H,
      });
      if (expanded) emitChildren(x.id, 'external-system', x.name, pos);
      return;
    }
    if ('system' in entry && entry.system) {
      const s = entry.ref as NonNullable<ModuxModel['systems']>[number];
      const kids = ownedChildren(s.id, 'system');
      const expanded = toggledIds.has(s.id) && kids.length > 0;
      const sSize = sizes[s.id];
      nodes.push({
        id: s.id,
        label: s.name,
        kind: 'system',
        symbol: 'component',
        fill: '#f8fafc',
        stroke: '#475569',
        badge: t('views.contextMap.systemBadge'),
        tooltip: t('views.contextMap.systemTooltip', { name: s.name }),
        collapsible: kids.length > 0,
        collapsed: kids.length > 0 && !expanded,
        resizable: true,
        x: pos.x,
        y: pos.y,
        w: sSize?.w ?? NODE_W,
        h: sSize?.h ?? NODE_H,
      });
      if (expanded) emitChildren(s.id, 'system', s.name, pos);
      return;
    }
    const m = entry.ref as ModuxModel['boundedContexts'][number];
    const subdomain = m.subdomainType ?? 'GENERIC';
    const kids = ownedChildren(m.id, 'boundedContext');
    const expanded = toggledIds.has(m.id) && kids.length > 0;
    const mSize = sizes[m.id];
    nodes.push({
      id: m.id,
      label: m.name,
      kind: 'boundedContext',
      symbol: 'component',
      fill: SUBDOMAIN_FILL[subdomain],
      stroke: '#94a3b8',
      badge: subdomain,
      tooltip: distributionLevel && kids.length === 0
        ? t('views.contextMap.singleModuleTooltip', { name: m.name })
        : t('views.contextMap.contextTooltip', { name: m.name, subdomain }),
      collapsible: kids.length > 0,
      collapsed: kids.length > 0 && !expanded,
      resizable: true,
      x: pos.x,
      y: pos.y,
      w: mSize?.w ?? NODE_W,
      h: mSize?.h ?? NODE_H,
    });
    if (expanded) emitChildren(m.id, 'boundedContext', m.name, pos);
  });
  // Free-standing elements: born loose (no owner yet), they show at top level with a «sin asociar»
  // badge until a composition edge ties them to their parent. Their contents still expand normally.
  // Aggregate (no context), entity and value object (no aggregate) share this treatment.
  if (!distributionLevel) {
    const looseGroups: { items: { id: string; name: string; policy?: boolean }[]; kind: ChildDesc['kind']; noun: string }[] = [
      { items: (model.aggregates ?? []).filter((a) => !a.boundedContextId), kind: 'aggregate', noun: t('views.aggregates.ownerAggregate') },
      { items: (model.entities ?? []).filter((e) => !e.aggregateId), kind: 'entity', noun: t('views.aggregates.ownerEntity') },
      { items: (model.valueObjects ?? []).filter((v) => !v.aggregateId), kind: 'value-object', noun: t('views.aggregates.ownerValueObject') },
      { items: model.looseUseCases ?? [], kind: 'use-case', noun: t('views.contextMap.loose.useCase') },
    ];
    let looseIdx = 0;
    for (const group of looseGroups) {
      for (const el of group.items) {
        const style = el.policy ? POLICY_STYLE : CHILD_STYLE[group.kind];
        const pos = layout[el.id] ?? { x: 60 + (looseIdx % 5) * 200, y: 60 + Math.floor(looseIdx / 5) * 120 };
        looseIdx++;
        const grand = ownedChildren(el.id, group.kind);
        const expanded = toggledIds.has(el.id) && grand.length > 0;
        const eSize = sizes[el.id];
        nodes.push({
          id: el.id,
          label: el.name,
          kind: group.kind,
          symbol: style.symbol,
          fill: style.fill,
          stroke: style.stroke,
          badge: t('views.contextMap.looseBadge'),
          dashed: true,
          resizable: true,
          collapsible: grand.length > 0,
          collapsed: grand.length > 0 && !expanded,
          tooltip: t('views.contextMap.looseTooltip', { name: el.name, noun: group.noun }),
          x: pos.x,
          y: pos.y,
          w: eSize?.w ?? NODE_W,
          h: eSize?.h ?? NODE_H,
        });
        if (expanded) emitChildren(el.id, group.kind, el.name, pos);
      }
    }
    // Free-standing nested elements (operation/invariant/field/step): loose until adopted into a
    // parent. They have no children to expand — just the box with its badge.
    const looseKindOf: Record<string, ChildDesc['kind']> = {
      operation: 'operation', invariant: 'invariant', field: 'field', 'use-case-step': 'operation',
      'read-model': 'read-model', 'external-table': 'external-table', 'integration-event': 'integration-event',
    };
    const looseNounOf: Record<string, MessageKey> = {
      operation: 'views.contextMap.loose.operation', invariant: 'views.contextMap.loose.invariant',
      field: 'views.contextMap.loose.field', 'use-case-step': 'views.contextMap.loose.step',
      'read-model': 'views.contextMap.loose.readModel', 'external-table': 'views.contextMap.loose.table',
      'integration-event': 'views.contextMap.loose.integrationEvent',
    };
    for (const el of model.looseElements ?? []) {
      const kind = looseKindOf[el.elementType] ?? 'operation';
      const style = CHILD_STYLE[kind];
      const pos = layout[el.id] ?? { x: 60 + (looseIdx % 5) * 200, y: 60 + Math.floor(looseIdx / 5) * 120 };
      looseIdx++;
      nodes.push({
        id: el.id,
        label: el.name,
        kind,
        symbol: style.symbol,
        fill: style.fill,
        stroke: style.stroke,
        badge: t('views.contextMap.looseBadge'),
        dashed: true,
        tooltip: t('views.contextMap.looseTooltip', {
          name: el.name, noun: t(looseNounOf[el.elementType] ?? 'views.contextMap.loose.element'),
        }),
        x: pos.x,
        y: pos.y,
        w: sizes[el.id]?.w ?? childBoxWidth(el.name),
        h: sizes[el.id]?.h ?? CHILD_H + 4,
      });
    }
  }
  // Business actors, AI agents, knowledge bases and MCP gateways live outside every
  // context — and outside the distribution lens, which is about packaging.
  const actorsAndAgents = distributionLevel
    ? { actors: [], aiAgents: [], rags: [], mcpGateways: [] }
    : {
        actors: model.actors ?? [],
        aiAgents: model.aiAgents ?? [],
        rags: model.rags ?? [],
        mcpGateways: model.mcpGateways ?? [],
      };
  const totalTop =
    allNodes.length +
    actorsAndAgents.actors.length +
    actorsAndAgents.aiAgents.length +
    actorsAndAgents.rags.length +
    actorsAndAgents.mcpGateways.length;
  actorsAndAgents.actors.forEach((a, i) => {
    const pos = layout[a.id] ?? defaultPosition(allNodes.length + i, totalTop);
    nodes.push({
      id: a.id,
      label: a.name,
      x: pos.x,
      y: pos.y,
      w: 132,
      h: 48,
      kind: 'actor',
      symbol: 'person',
      fill: '#ffffff',
      stroke: '#64748b',
      badge: 'ACTOR',
      tooltip: `${a.name} (actor)`,
    });
  });
  actorsAndAgents.aiAgents.forEach((a, i) => {
    const pos =
      layout[a.id] ??
      defaultPosition(allNodes.length + (model.actors ?? []).length + i, totalTop);
    nodes.push({
      id: a.id,
      label: a.name,
      x: pos.x,
      y: pos.y,
      w: 132,
      h: 48,
      kind: 'ai-agent',
      symbol: 'robot',
      fill: a.external ? '#ffffff' : '#faf5ff',
      stroke: '#9333ea',
      dashed: !!a.external,
      badge: a.external ? t('views.contextMap.externalAiAgentBadge') : t('views.eventstorming.aiAgentBadge'),
      tooltip: a.external
        ? t('views.contextMap.externalAiAgentTooltip', { name: a.name })
        : t('views.contextMap.aiAgentTooltip', { name: a.name }),
    });
  });
  actorsAndAgents.mcpGateways.forEach((g, i) => {
    const pos =
      layout[g.id] ??
      defaultPosition(
        allNodes.length +
          (model.actors ?? []).length +
          (model.aiAgents ?? []).length +
          (model.rags ?? []).length +
          i,
        totalTop,
      );
    nodes.push({
      id: g.id,
      label: g.name,
      x: pos.x,
      y: pos.y,
      w: 148,
      h: 48,
      kind: 'mcp-gateway',
      symbol: 'plug',
      fill: '#f5f3ff',
      stroke: '#7c3aed',
      badge: t('views.contextMap.mcpGatewayBadge'),
      tooltip: t('views.contextMap.mcpGatewayTooltip', { name: g.name }),
    });
  });
  const ragContentEdges: SceneEdge[] = [];
  actorsAndAgents.rags.forEach((r, i) => {
    const pos =
      layout[r.id] ??
      defaultPosition(
        allNodes.length + (model.actors ?? []).length + (model.aiAgents ?? []).length + i,
        totalTop,
      );
    nodes.push({
      id: r.id,
      label: r.name,
      x: pos.x,
      y: pos.y,
      w: 132,
      h: 48,
      kind: 'rag',
      symbol: 'lens',
      fill: '#ecfeff',
      stroke: '#0e7490',
      badge: 'RAG',
      tooltip: t('views.contextMap.ragTooltip', { name: r.name }),
    });
    // External content sources hang as small satellites (repo, web, ftp…).
    (r.contentSources ?? []).forEach((s, si) => {
      const satelliteId = `ragcs:${r.id}:${s.uri}`;
      const satPos = layout[satelliteId] ?? { x: pos.x + 170, y: pos.y - 30 + si * 44 };
      nodes.push({
        id: satelliteId,
        label: s.uri.replace(/^[a-z+]+:\/\//, '').slice(0, 24),
        x: satPos.x,
        y: satPos.y,
        w: 150,
        h: 34,
        kind: 'rag-content-source',
        fill: '#ffffff',
        stroke: '#0e7490',
        dashed: true,
        badge: s.type,
        tooltip: `${s.type}: ${s.uri}`,
      });
      ragContentEdges.push({
        id: `ragcse:${r.id}:${s.uri}`,
        sourceId: satelliteId,
        targetId: r.id,
        kind: 'rag-content',
        color: '#0e7490',
        dashed: true,
        arrow: true,
        tooltip: t('views.eventstorming.feedsIndex'),
      });
    });
  });
  // Distribution level: the services join the map — they say WHERE boundedContexts deploy —
  // and the infrastructure they lean on shows up too (db, broker, engines).
  if (distributionLevel) {
    const services = model.services ?? [];
    services.forEach((svc, i) => {
      const pos = layout[svc.id] ?? defaultPosition(allNodes.length + i, allNodes.length + services.length);
      nodes.push({
        id: svc.id,
        label: svc.name,
        kind: 'service',
        symbol: 'gear',
        fill: '#f8fafc',
        stroke: '#334155',
        badge: t('views.contextMap.serviceBadge'),
        tooltip: t('views.contextMap.serviceTooltip', { name: svc.name }),
        x: pos.x,
        y: pos.y,
        w: NODE_W,
        h: NODE_H,
      });
    });
    const urls = model.urls ?? [];
    urls.forEach((u, i) => {
      const pos = layout[u.id] ?? defaultPosition(allNodes.length + services.length + i,
        allNodes.length + services.length + urls.length);
      nodes.push({
        id: u.id,
        label: u.name,
        kind: 'url',
        symbol: 'interface',
        fill: '#f8fafc',
        stroke: '#0e7490',
        badge: 'URL',
        tooltip: t('views.contextMap.urlTooltip', { name: u.url ?? u.name }),
        x: pos.x,
        y: pos.y,
        w: NODE_W,
        h: NODE_H,
      });
    });
    const infra: { id: string; label: string; badge: string; symbol: string; tooltip: string }[] = [];
    [...new Set(services.filter((sv) => sv.database).map((sv) => sv.database as string))].forEach((db) =>
      infra.push({ id: `infra-db:${db}`, label: db, badge: t('views.integrations.dbBadge'), symbol: 'readmodel',
        tooltip: t('views.contextMap.databaseTooltip', { db }) }));
    if (services.some((sv) => sv.outboxEnabled)) {
      infra.push({ id: 'infra-broker', label: t('views.contextMap.brokerLabel'), badge: 'BROKER', symbol: 'event',
        tooltip: t('views.contextMap.brokerTooltip') });
    }
    if ((model.workflows ?? []).length) {
      infra.push({ id: 'infra-workflow-engine', label: 'Workflow engine', badge: 'ENGINE', symbol: 'process',
        tooltip: t('views.contextMap.workflowEngineTooltip') });
    }
    if ((model.pages ?? []).length) {
      infra.push({ id: 'infra-forms-engine', label: 'Forms engine', badge: 'ENGINE', symbol: 'interface',
        tooltip: t('views.contextMap.formsEngineTooltip') });
    }
    infra.forEach((inf, i) => {
      const pos = layout[inf.id] ?? defaultPosition(allNodes.length + services.length + urls.length + i,
        allNodes.length + services.length + urls.length + infra.length);
      nodes.push({
        id: inf.id,
        label: inf.label,
        kind: 'infrastructure',
        symbol: inf.symbol,
        fill: '#fffbeb',
        stroke: '#92400e',
        dashed: true,
        badge: inf.badge,
        tooltip: inf.tooltip,
        x: pos.x,
        y: pos.y,
        w: NODE_W,
        h: NODE_H,
      });
    });
  }
  // Children must paint over every container, not just their own.
  nodes.sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));

  // Relations are 100% derived from concrete dependencies; the type is an annotation.
  const relationEdges: SceneEdge[] = model.relations.map((r) => ({
    id: relationEdgeId(r.sourceId, r.targetId),
    sourceId: r.sourceId,
    targetId: r.targetId,
    kind: 'relation',
    label: r.type
      ? RELATION_ABBREV[r.type]
      : r.inferredType
        ? `≈${RELATION_ABBREV[r.inferredType]}`
        : '?',
    color: r.declared ? '#475569' : '#94a3b8',
    dashed: !r.declared,
    arrow: true,
    tooltip: r.type
      ? `${r.type} (${r.sourceId} upstream → ${r.targetId} downstream)${r.reasons ? ` — ${r.reasons}` : ''}`
      : r.inferredType
        ? `${t('views.contextMap.relationInferred', { type: r.inferredType })}${r.reasons ? ` — ${r.reasons}` : ''}`
        : `${t('views.contextMap.relationDerived')}${r.reasons ? ` — ${r.reasons}` : ''}`,
  }));

  const flowEdges: SceneEdge[] = model.flows.map((f) => {
    const coherence = flowCoherence(model, f);
    // At the detail level a flow anchors on the concrete pieces when they are
    // visible: the trigger event in the source context and (for MATERIALIZES)
    // the read model in the target — the drawing mirrors the intent.
    const sourceBoundedContext = detailed ? model.boundedContexts.find((m) => m.id === f.sourceId) : undefined;
    const sourceEvent =
      sourceBoundedContext?.domainEvents?.find((ev) => ev.name === f.triggerEvent) ??
      sourceBoundedContext?.applicationEvents?.find((ev) => ev.name === f.triggerEvent);
    const targetReadModel =
      detailed && f.readModelName
        ? model.boundedContexts
            .find((m) => m.id === f.targetId)
            ?.readModels?.find((rm) => rm.name === f.readModelName)
        : undefined;
    const targetUseCase =
      detailed && f.targetUseCaseId
        ? model.boundedContexts
            .find((m) => m.id === f.targetId)
            ?.useCases?.find((u) => u.id === f.targetUseCaseId)
        : undefined;
    return {
      id: `flow:${f.id}`,
      sourceId: sourceEvent?.id ?? f.sourceId,
      targetId: targetUseCase?.id ?? targetReadModel?.id ?? f.targetId,
      kind: 'flow',
      label: f.name,
      color: FLOW_COLOR[coherence],
      dashed: true,
      arrow: true,
      tooltip: `Flow ${f.name} [${f.archetype}] — ${coherence}`,
    };
  });

  // API implementation sites (the SAME published API, also implemented in bounded
  // contexts): the occurrences nest INSIDE their context above; here only the list
  // survives, feeding the proxy-routing edges below.
  const implApiIds = new Map((model.apis ?? []).map((a) => [a.id, a]));
  const implBoundedContextIds = new Set(model.boundedContexts.map((m) => m.id));
  const implEntries = (model.apiImplementations ?? []).filter(
    (impl) => implApiIds.has(impl.apiId) && implBoundedContextIds.has(impl.boundedContextId),
  );

  // ── UIs: the declared human interface — loose ones float like loose APIs ──
  (model.uis ?? [])
    .filter((u) => !u.boundedContextId)
    .forEach((u, i) => {
      const pos = layout[u.id] ?? { x: 180 + i * 200, y: 40 };
      nodes.push({
        id: u.id,
        label: u.name,
        x: pos.x,
        y: pos.y,
        w: 150,
        h: 44,
        kind: 'ui',
        symbol: 'interface',
        fill: '#f0f9ff',
        stroke: '#0ea5e9',
        badge: 'UI',
        tooltip: t('views.contextMap.looseUiTooltip', { name: u.name }),
      });
    });

  // Emission edges (aggregate/use case → domain event) only exist at the detail
  // level, where publisher and event both render as children.
  const stagedIds = new Set(nodes.map((n) => n.id));
  // Relations never hide. An edge whose endpoint folded away re-anchors at the
  // nearest VISIBLE ancestor of the ownership chain, so a folded box keeps
  // showing its children's coupling. The guards below see THROUGH the folds:
  // an id counts when some visible ancestor can stand for it — the roll-up
  // pass at the end does the re-anchoring. In a SCOPED view the caller hands in
  // an ownership index built over the WHOLE model, so an endpoint the view
  // filtered out (an API, a component) still resolves to the visible member that
  // owns it — that is how a lower level's coupling surfaces one level up.
  const owners = rollup ?? ownershipIndex(model, mode);
  const repCache = new Map<string, string | null>();
  const representative = (id: string): string | null => {
    const cached = repCache.get(id);
    if (cached !== undefined) return cached;
    let cur: string | undefined = id;
    for (let guard = 0; cur && guard < 16; guard++) {
      if (stagedIds.has(cur)) {
        repCache.set(id, cur);
        return cur;
      }
      cur = owners.get(cur);
    }
    repCache.set(id, null);
    return null;
  };
  const nodeIds = { has: (id: string) => representative(id) !== null };
  /**
   * Re-anchors every edge at its endpoints' representatives. Edges whose two
   * ends fold into the SAME box are internal — they fold with it. Several
   * edges collapsing onto the same (kind, source, target) merge into one.
   */
  const reanchorEdges = (edges: SceneEdge[]): SceneEdge[] => {
    const seen = new Set<string>();
    const out: SceneEdge[] = [];
    for (const e of edges) {
      if (e.kind === 'contains' || e.targetId.startsWith('edgeanchor:')) {
        out.push(e);
        continue;
      }
      const s = representative(e.sourceId);
      const tg = representative(e.targetId);
      if (!s || !tg || s === tg) continue;
      if (s === e.sourceId && tg === e.targetId) {
        out.push(e);
        continue;
      }
      const key = `${e.kind}|${s}|${tg}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        ...e,
        sourceId: s,
        targetId: tg,
        tooltip: t('views.contextMap.rolledUpEdge', { tooltip: e.tooltip ?? e.kind }),
      });
    }
    return out;
  };

  // Deployment wiring (distribution level): service → the code boundedContexts it deploys,
  // plus the infrastructure each service leans on.
  const deployEdges: SceneEdge[] = distributionLevel
    ? [
        ...(model.services ?? []).flatMap((svc) =>
          (svc.moduleIds ?? [])
            .map((cmId): SceneEdge | null => {
              if (!nodeIds.has(svc.id)) return null;
              // A hidden single module (the main one) deploys through its context box.
              const target = nodeIds.has(cmId)
                ? cmId
                : (model.modules ?? []).find((cm) => cm.id === cmId)?.boundedContextId;
              if (!target || !nodeIds.has(target)) return null;
              return {
                id: `deploy:${svc.id}->${cmId}`,
                sourceId: svc.id,
                targetId: target,
                kind: 'deploys',
                color: '#334155',
                dashed: true,
                arrow: true,
                tooltip: t('views.contextMap.edge.deployedIn', { name: svc.name }),
              };
            })
            .filter((e): e is SceneEdge => e !== null),
        ),
        ...(model.services ?? []).flatMap((svc) =>
          (svc.urlIds ?? [])
            .filter((uid) => nodeIds.has(svc.id) && nodeIds.has(uid))
            .map((uid): SceneEdge => ({
              id: `svcurl:${svc.id}->${uid}`,
              sourceId: svc.id,
              targetId: uid,
              kind: 'service-url',
              color: '#0e7490',
              arrow: true,
              tooltip: t('views.contextMap.edge.answersAtUrl', { name: svc.name }),
            })),
        ),
        ...(model.services ?? []).flatMap((svc): SceneEdge[] => {
          const out: SceneEdge[] = [];
          if (svc.database && nodeIds.has(`infra-db:${svc.database}`) && nodeIds.has(svc.id)) {
            out.push({
              id: `infradb:${svc.id}`,
              sourceId: svc.id,
              targetId: `infra-db:${svc.database}`,
              kind: 'infra-uses',
              color: '#92400e',
              dashed: true,
              arrow: true,
              tooltip: t('views.contextMap.edge.persistsIn', { name: svc.name, db: svc.database }),
            });
          }
          if (svc.outboxEnabled && nodeIds.has('infra-broker') && nodeIds.has(svc.id)) {
            out.push({
              id: `infrabroker:${svc.id}`,
              sourceId: svc.id,
              targetId: 'infra-broker',
              kind: 'infra-uses',
              color: '#92400e',
              dashed: true,
              arrow: true,
              tooltip: t('views.contextMap.edge.publishesViaOutbox', { name: svc.name }),
            });
          }
          return out;
        }),
      ]
    : [];
  const emissionEdges: SceneEdge[] = detailed
    ? (model.emissions ?? [])
        .filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.domainEventId))
        .map((e) => ({
          id: `emit:${e.sourceId}->${e.domainEventId}`,
          sourceId: e.sourceId,
          targetId: e.domainEventId,
          kind: 'emission',
          color: '#f59e0b',
          dashed: true,
          arrow: true,
          tooltip: t('views.eventstorming.emits'),
        }))
    : [];

  // Aggregate-state projections (aggregate → read model, possibly cross-context),
  // visible at the detail level where both render as children.
  const projectionEdges: SceneEdge[] = detailed
    ? (model.projections ?? [])
        .map((p) => ({
          p,
          source: p.sourceAggregateId ?? p.sourceExternalUseCaseId ?? p.sourceExternalTableId,
        }))
        .filter(({ p, source }) => source && p.readModelId)
        .filter(({ p, source }) => nodeIds.has(source!) && nodeIds.has(p.readModelId!))
        .map(({ p, source }) => ({
          id: `proj:${p.id}`,
          sourceId: source!,
          targetId: p.readModelId!,
          kind: 'projection',
          color: '#0d9488',
          dashed: true,
          arrow: true,
          tooltip: p.sourceAggregateId
            ? t('views.contextMap.edge.projectionState', { name: p.name, readModel: p.readModelName ?? p.readModelId })
            : t('views.contextMap.edge.projectionPolling', { name: p.name, readModel: p.readModelName ?? p.readModelId }),
        }))
    : [];

  // API operations wired to their implementers: operation chip → use case/policy at
  // the detail level; at the contexts level the API box points at the boundedContext.
  const apiWireEdges: SceneEdge[] = (model.apis ?? []).flatMap((api) =>
    api.operations.flatMap((op) => {
      // A READ operation rests on a query service; a command operation on a use case.
      const queryTarget =
        detailed && op.targetQueryServiceId && nodeIds.has(op.targetQueryServiceId)
          ? op.targetQueryServiceId
          : null;
      const target =
        detailed && op.targetUseCaseId && nodeIds.has(op.targetUseCaseId)
          ? op.targetUseCaseId
          : queryTarget
            ? queryTarget
            : op.targetBoundedContextId && nodeIds.has(op.targetBoundedContextId)
              ? op.targetBoundedContextId
              : null; // fine wiring is invisible at the contexts level unless a boundedContext is set
      if (!target) return [];
      // Global wiring always paints from the operation AS PUBLISHED (per-site wiring —
      // apiOperationImplementations — carries its own site and paints from there).
      const source = detailed && nodeIds.has(op.id) ? op.id : api.id;
      if (!nodeIds.has(source)) return [];
      return [
        {
          id: `apiwire:${op.id}`,
          sourceId: source,
          targetId: target,
          kind: 'api-wire',
          color: '#4f46e5',
          dashed: true,
          arrow: true,
          tooltip:
            target === queryTarget
              ? t('views.contextMap.edge.readsFrom', { name: op.name, target })
              : t('views.contextMap.edge.implementedBy', { name: op.name, target }),
        },
      ];
    }),
  );

  // Use case → use case invocations, visible when both render as children.
  const callEdges: SceneEdge[] = detailed
    ? (model.useCaseCalls ?? [])
        .filter((c) => nodeIds.has(c.sourceId) && nodeIds.has(c.targetId))
        .map((c) => ({
          id: `uccall:${c.sourceId}->${c.targetId}`,
          sourceId: c.sourceId,
          targetId: c.targetId,
          kind: 'uc-call',
          color: '#0891b2',
          dashed: true,
          arrow: true,
          tooltip: t('views.contextMap.edge.invokes'),
        }))
    : [];

  // Identity: who validates whose tokens, and where federated IdPs come from.
  const idpEdges: SceneEdge[] = [
    ...model.boundedContexts
      .filter((mo) => mo.identityProviderId && nodeIds.has(mo.id) && nodeIds.has(mo.identityProviderId))
      .map((mo): SceneEdge => ({
        id: `idptrust:${mo.id}`,
        sourceId: mo.id,
        targetId: mo.identityProviderId!,
        kind: 'idp-trust',
        color: '#ca8a04',
        label: t('views.contextMap.edge.validatesTokensOf'),
        dashed: true,
        arrow: true,
        tooltip: t('views.contextMap.edge.validatesTokens', { name: mo.name }),
      })),
    ...(model.etlFlows ?? [])
      .filter((f) => f.identityProviderId && nodeIds.has(f.identityProviderId))
      .flatMap((f): SceneEdge[] => {
        const el = nodeIds.has(f.id) ? f.id : f.ownerBoundedContextId && nodeIds.has(f.ownerBoundedContextId) ? f.ownerBoundedContextId : null;
        if (!el) return [];
        return [{
          id: `idpsvc:${f.id}`,
          sourceId: el,
          targetId: f.identityProviderId!,
          kind: 'idp-service',
          color: '#ca8a04',
          label: t('views.contextMap.edge.serviceIdentity'),
          dashed: true,
          arrow: true,
          tooltip: t('views.contextMap.edge.runsWithServiceIdentity', { name: f.name }),
        }];
      }),
    ...(model.identityProviders ?? [])
      .filter((idp) => idp.publishedByExternalSystemId && nodeIds.has(idp.id) && nodeIds.has(idp.publishedByExternalSystemId!))
      .map((idp): SceneEdge => ({
        id: `idpfed:${idp.id}`,
        sourceId: idp.publishedByExternalSystemId!,
        targetId: idp.id,
        kind: 'idp-federation',
        color: '#ca8a04',
        label: t('views.contextMap.edge.publishes'),
        dashed: true,
        arrow: true,
        tooltip: t('views.contextMap.edge.federatedIdp'),
      })),
  ];

  // Scheduled trigger → the use case (or policy) it fires, on a cron.
  const triggerFireEdges: SceneEdge[] = detailed
    ? model.boundedContexts
        .flatMap((mo) => mo.scheduledTriggers ?? [])
        .filter((st) => st.useCaseId && nodeIds.has(st.id) && nodeIds.has(st.useCaseId))
        .map((st) => ({
          id: `stfire:${st.id}->${st.useCaseId}`,
          sourceId: st.id,
          targetId: st.useCaseId!,
          kind: 'st-fire',
          color: '#d97706',
          label: st.cronExpression ?? 'cron',
          dashed: true,
          arrow: true,
          tooltip: t('views.contextMap.firesOn', { cron: st.cronExpression ?? 'cron' }),
        }))
    : [];

  // Use case → aggregate: a CallAggregateOperation/SaveAggregate step, derived.
  const aggCallEdges: SceneEdge[] = detailed
    ? (model.aggregateCalls ?? [])
        .filter((c) => nodeIds.has(c.sourceId) && nodeIds.has(c.targetId))
        .map((c) => ({
          id: `aggcall:${c.sourceId}->${c.targetId}`,
          sourceId: c.sourceId,
          targetId: c.targetId,
          kind: 'agg-call',
          color: '#b45309',
          dashed: true,
          arrow: true,
          tooltip: t('views.contextMap.edge.operatesOnAggregate'),
        }))
    : [];

  // Use case → query service consumption, and actor → use case/query service usage.
  const queryEdges: SceneEdge[] = detailed
    ? (model.queryCalls ?? [])
        .filter((c) => nodeIds.has(c.sourceId) && nodeIds.has(c.targetId))
        .map((c) => ({
          id: `qscall:${c.sourceId}->${c.targetId}`,
          sourceId: c.sourceId,
          targetId: c.targetId,
          kind: 'qs-call',
          color: '#0d9488',
          dashed: true,
          arrow: true,
          tooltip: t('views.contextMap.edge.queries'),
        }))
    : [];
  const actorUseEdges: SceneEdge[] = detailed
    ? (model.actorUses ?? [])
        .filter((u) => nodeIds.has(u.actorId) && nodeIds.has(u.targetId))
        .map((u) => ({
          id: `use:${u.actorId}->${u.targetId}`,
          sourceId: u.actorId,
          targetId: u.targetId,
          kind: 'actor-use',
          color: '#6366f1',
          arrow: true,
          tooltip: t('views.contextMap.edge.usesDerivesUi'),
        }))
    : [];

  const actorExternalEdges: SceneEdge[] = (model.actorExternalDependencies ?? [])
    .filter((d) => nodeIds.has(d.actorId) && nodeIds.has(d.externalSystemId))
    .map((d) => ({
      id: `extdep:${d.actorId}->${d.externalSystemId}`,
      sourceId: d.actorId,
      targetId: d.externalSystemId,
      kind: 'actor-ext',
      color: '#64748b',
      dashed: true,
      arrow: true,
      tooltip: t('views.contextMap.edge.dependsOn'),
    }));

  // A dependency on a nested API/proxy that is hidden at this detail level rolls
  // up to the system hosting it (depending on it implies depending on the host).
  const apiPublisher = new Map([
    ...(model.apis ?? [])
      .filter((a) => a.publishedByExternalSystemId)
      .map((a): [string, string] => [a.id, a.publishedByExternalSystemId!]),
    ...(model.proxyApis ?? [])
      .filter((px) => px.publishedByExternalSystemId)
      .map((px): [string, string] => [px.id, px.publishedByExternalSystemId!]),
  ]);
  const rollUp = (id: string) => (nodeIds.has(id) ? id : (apiPublisher.get(id) ?? id));
  const externalDependencyEdges: SceneEdge[] = [
    ...new Map(
      (model.externalSystemDependencies ?? [])
        .map((d) => ({
          sourceId: d.sourceId,
          targetId: rollUp(d.targetId),
          cqrs: d.type === 'CQRS',
        }))
        .filter(
          (d) => nodeIds.has(d.sourceId) && nodeIds.has(d.targetId) && d.sourceId !== d.targetId,
        )
        .map((d): [string, SceneEdge] => [
          `xdep:${d.sourceId}->${d.targetId}`,
          {
            id: `xdep:${d.sourceId}->${d.targetId}`,
            sourceId: d.sourceId,
            targetId: d.targetId,
            kind: 'ext-dep',
            color: d.cqrs ? '#7c3aed' : '#64748b',
            label: d.cqrs ? 'CQRS' : 'dep',
            dashed: true,
            arrow: true,
            tooltip: d.cqrs ? t('views.contextMap.edge.cqrs') : t('views.contextMap.edge.dependsOn'),
          },
        ]),
    ).values(),
  ];
  // Workflows on the strategic map: what they orchestrate and what fires them.
  // A hidden child (use case / event at the coarse level) rolls up to its context.
  const boundedContextOfChild = new Map<string, string>();
  for (const m of model.boundedContexts) {
    for (const u of m.useCases ?? []) boundedContextOfChild.set(u.id, m.id);
    for (const ev of m.domainEvents ?? []) boundedContextOfChild.set(ev.id, m.id);
    for (const ev of m.applicationEvents ?? []) boundedContextOfChild.set(ev.id, m.id);
    for (const qs of m.queryServices ?? []) boundedContextOfChild.set(qs.id, m.id);
  }
  const rollUpChild = (id: string) => (nodeIds.has(id) ? id : (boundedContextOfChild.get(id) ?? id));
  const eventIdByName = new Map<string, string>();
  for (const m of model.boundedContexts) {
    for (const ev of m.domainEvents ?? []) eventIdByName.set(ev.name, ev.id);
    for (const ev of m.applicationEvents ?? []) eventIdByName.set(ev.name, ev.id);
  }
  const workflowCallEdges: SceneEdge[] = [
    ...new Map(
      (model.workflows ?? [])
        .flatMap((w) =>
          (w.steps ?? [])
            .filter((st) => st.targetUseCaseId)
            .map((st) => ({ sourceId: w.id, targetId: rollUpChild(st.targetUseCaseId!) })),
        )
        .filter((d) => nodeIds.has(d.sourceId) && nodeIds.has(d.targetId))
        .map((d): [string, SceneEdge] => [
          `wfcall:${d.sourceId}->${d.targetId}`,
          {
            id: `wfcall:${d.sourceId}->${d.targetId}`,
            sourceId: d.sourceId,
            targetId: d.targetId,
            kind: 'wf-call',
            color: '#7c3aed',
            dashed: true,
            arrow: true,
            tooltip: t('views.contextMap.edge.orchestrates'),
          },
        ]),
    ).values(),
  ];
  const workflowTriggerEdges: SceneEdge[] = [
    ...new Map(
      (model.workflows ?? [])
        .filter((w) => w.triggerEvent && eventIdByName.has(w.triggerEvent))
        .map((w) => ({
          sourceId: rollUpChild(eventIdByName.get(w.triggerEvent!)!),
          targetId: w.id,
          label: w.triggerEvent!,
        }))
        .filter((d) => nodeIds.has(d.sourceId) && nodeIds.has(d.targetId))
        .map((d): [string, SceneEdge] => [
          `wftrig:${d.sourceId}->${d.targetId}`,
          {
            id: `wftrig:${d.sourceId}->${d.targetId}`,
            sourceId: d.sourceId,
            targetId: d.targetId,
            kind: 'wf-trigger',
            color: '#f59e0b',
            label: d.label,
            dashed: true,
            arrow: true,
            tooltip: t('views.contextMap.edge.triggersWorkflow'),
          },
        ]),
    ).values(),
  ];

  // RAG → structured sources beyond read models: external tables (chips only in
  // detailed mode — they roll up to their system) and APIs (always visible).
  const tableSystem = new Map<string, string>();
  for (const x of model.externalSystems) {
    for (const t of x.tables ?? []) tableSystem.set(t.id, x.id);
  }
  // Notifications: the event firing them and the roles they reach.
  const notificationEdges: SceneEdge[] = (model.notifications ?? []).flatMap((n): SceneEdge[] => {
    const el = nodeIds.has(n.id) ? n.id : n.ownerBoundedContextId && nodeIds.has(n.ownerBoundedContextId) ? n.ownerBoundedContextId : null;
    if (!el) return [];
    const out: SceneEdge[] = [];
    if (n.eventId) {
      const ev = nodeIds.has(n.eventId) ? n.eventId : boundedContextOfChild.get(n.eventId);
      if (ev && nodeIds.has(ev) && ev !== el) {
        out.push({
          id: `notif:${n.id}`,
          sourceId: ev,
          targetId: el,
          kind: 'notification-trigger',
          color: '#db2777',
          label: t('views.contextMap.edge.triggers'),
          dashed: true,
          arrow: true,
          tooltip: t('views.contextMap.edge.notificationTrigger', { name: n.name }),
        });
      }
    }
    for (const roleId of n.recipientRoleIds ?? []) {
      if (!nodeIds.has(roleId)) continue;
      out.push({
        id: `notifto:${n.id}:${roleId}`,
        sourceId: el,
        targetId: roleId,
        kind: 'notification-recipient',
        color: '#db2777',
        label: (n.channels ?? [])[0]?.toLowerCase() ?? t('views.contextMap.edge.notifies'),
        dashed: true,
        arrow: true,
        tooltip: t('views.contextMap.edge.notifiesRole', { name: n.name }),
      });
    }
    return out;
  });

  // Reports fed by a query operation (the qs chip at the detail level).
  const documentEdges: SceneEdge[] = (model.documents ?? []).flatMap((d): SceneEdge[] => {
    const el = nodeIds.has(d.id) ? d.id : d.ownerBoundedContextId && nodeIds.has(d.ownerBoundedContextId) ? d.ownerBoundedContextId : null;
    if (!el || !d.queryServiceId) return [];
    const qs = nodeIds.has(d.queryServiceId) ? d.queryServiceId : boundedContextOfChild.get(d.queryServiceId);
    if (!qs || !nodeIds.has(qs) || qs === el) return [];
    return [{
      id: `docq:${d.id}`,
      sourceId: qs,
      targetId: el,
      kind: 'document-query',
      color: '#475569',
      label: t('views.contextMap.edge.feeds'),
      dashed: true,
      arrow: true,
      tooltip: t('views.contextMap.edge.queryFeedsReport', { name: d.name }),
    }];
  });

  // ETL steps drawn as data lines: sources flow INTO the integrator, writes leave it.
  const etlEdges: SceneEdge[] = (model.etlFlows ?? []).flatMap((f) =>
    (f.steps ?? []).flatMap((s): SceneEdge[] => {
      const flowEl = nodeIds.has(f.id)
        ? f.id
        : f.ownerBoundedContextId && nodeIds.has(f.ownerBoundedContextId)
          ? f.ownerBoundedContextId
          : null;
      if (!flowEl) return [];
      const ref = s.externalTableId ?? s.operationId ?? s.apiId ?? s.eventId;
      if (!ref) return []; // transforms live inside the flow
      let el = ref;
      if (!nodeIds.has(el) && s.operationId && s.apiId) el = s.apiId;
      if (!nodeIds.has(el) && s.externalTableId) el = tableSystem.get(s.externalTableId) ?? el;
      if (!nodeIds.has(el)) el = rollUp(el);
      if (!nodeIds.has(el)) el = boundedContextOfChild.get(ref) ?? el;
      if (!nodeIds.has(el) || el === flowEl) return [];
      const source = s.type.startsWith('SOURCE');
      return [{
        id: `etl:${f.id}:${s.id}`,
        sourceId: source ? el : flowEl,
        targetId: source ? flowEl : el,
        kind: source ? 'etl-source' : 'etl-write',
        color: '#0f766e',
        label: s.type === 'SOURCE_PULL' ? 'pull' : s.type === 'SOURCE_CONSUMER' ? 'consume'
          : s.type === 'WRITE_API' ? 'api' : s.type === 'WRITE_DB' ? t('views.integrations.dbEdge') : t('views.integrations.eventEdge'),
        dashed: true,
        arrow: true,
        tooltip: source
          ? t(s.type === 'SOURCE_PULL' ? 'views.contextMap.edge.readsHerePull' : 'views.contextMap.edge.readsHereConsumer', { name: f.name })
          : t('views.integrations.writesHere', { name: f.name }),
      }];
    }),
  );


  const ragTableEdges: SceneEdge[] = [
    ...new Map(
      (model.rags ?? [])
        .flatMap((r) =>
          (r.sourceExternalTableIds ?? []).map((tid) => ({
            sourceId: nodeIds.has(tid) ? tid : (tableSystem.get(tid) ?? tid),
            targetId: r.id,
            name: r.name,
          })),
        )
        .filter((d) => nodeIds.has(d.sourceId) && nodeIds.has(d.targetId))
        .map((d): [string, SceneEdge] => [
          `ragtbl:${d.sourceId}->${d.targetId}`,
          {
            id: `ragtbl:${d.sourceId}->${d.targetId}`,
            sourceId: d.sourceId,
            targetId: d.targetId,
            kind: 'rag-table',
            color: '#0e7490',
            dashed: true,
            arrow: true,
            tooltip: t('views.contextMap.edge.indexesTable', { name: d.name }),
          },
        ]),
    ).values(),
  ];
  const ragApiEdges: SceneEdge[] = [
    ...new Map(
      (model.rags ?? [])
        .flatMap((r) =>
          (r.sourceApiIds ?? []).map((aid) => ({
            sourceId: rollUp(aid),
            targetId: r.id,
            name: r.name,
          })),
        )
        .filter((d) => nodeIds.has(d.sourceId) && nodeIds.has(d.targetId))
        .map((d): [string, SceneEdge] => [
          `ragapi:${d.sourceId}->${d.targetId}`,
          {
            id: `ragapi:${d.sourceId}->${d.targetId}`,
            sourceId: d.sourceId,
            targetId: d.targetId,
            kind: 'rag-api',
            color: '#0e7490',
            dashed: true,
            arrow: true,
            tooltip: t('views.contextMap.edge.indexesApi', { name: d.name }),
          },
        ]),
    ).values(),
  ];

  // RAG → coarse sources: a whole external system or a whole context.
  const ragCoarseEdges: SceneEdge[] = [
    ...new Map(
      (model.rags ?? [])
        .flatMap((r) => [
          ...(r.sourceExternalSystemIds ?? []).map((xid) => ({ sourceId: xid, targetId: r.id, name: r.name })),
          ...(r.sourceBoundedContextIds ?? []).map((mid) => ({ sourceId: mid, targetId: r.id, name: r.name })),
        ])
        .filter((d) => nodeIds.has(d.sourceId) && nodeIds.has(d.targetId))
        .map((d): [string, SceneEdge] => [
          `ragcoarse:${d.sourceId}->${d.targetId}`,
          {
            id: `ragcoarse:${d.sourceId}->${d.targetId}`,
            sourceId: d.sourceId,
            targetId: d.targetId,
            kind: 'rag-coarse',
            color: '#0e7490',
            dashed: true,
            arrow: true,
            tooltip: t('views.contextMap.edge.indexesContent', { name: d.name }),
          },
        ]),
    ).values(),
  ];

  // Agent → whole API (or proxy): its full tool surface, at every detail level.
  const agentApiEdges: SceneEdge[] = [
    ...new Map(
      (model.agentApiUses ?? [])
        .map((u) => ({ sourceId: u.agentId, targetId: rollUp(u.apiId) }))
        .filter((d) => nodeIds.has(d.sourceId) && nodeIds.has(d.targetId))
        .map((d): [string, SceneEdge] => [
          `agapi:${d.sourceId}->${d.targetId}`,
          {
            id: `agapi:${d.sourceId}->${d.targetId}`,
            sourceId: d.sourceId,
            targetId: d.targetId,
            kind: 'agent-api',
            color: '#9333ea',
            dashed: true,
            arrow: true,
            tooltip: t('views.contextMap.edge.consumesWholeApi'),
          },
        ]),
    ).values(),
  ];

  // Workflow chaining: A's completion event is B's trigger — drawn directly.
  const completionOf = (w: NonNullable<ModuxModel['workflows']>[number]) =>
    w.onCompletionEventName || `${w.name.replace(/\s+/g, '')}Completado`;
  const workflowChainEdges: SceneEdge[] = (model.workflows ?? []).flatMap((b) =>
    !b.triggerEvent
      ? []
      : (model.workflows ?? [])
          .filter((a) => a.id !== b.id && completionOf(a) === b.triggerEvent)
          .filter((a) => nodeIds.has(a.id) && nodeIds.has(b.id))
          .map((a) => ({
            id: `wfchain:${a.id}->${b.id}`,
            sourceId: a.id,
            targetId: b.id,
            kind: 'wf-chain',
            color: '#f59e0b',
            label: b.triggerEvent!,
            dashed: true,
            arrow: true,
            tooltip: t('views.contextMap.edge.completionTriggersWorkflow'),
          })),
  );

  // Inside a workflow: the step→step dependency DAG. Steps are children of the workflow, so these
  // roll up with it when it is folded (both ends re-anchor to the workflow → the edge drops).
  const workflowStepEdges: SceneEdge[] = (model.workflows ?? []).flatMap((w) => {
    const stepIds = new Set(w.steps.map((s) => s.id));
    const nameOf = new Map(w.steps.map((s) => [s.id, s.name]));
    return w.steps.flatMap((step) =>
      (step.dependsOnStepIds ?? [])
        .filter((id) => stepIds.has(id))
        .map((dep): SceneEdge => ({
          id: `wfdep:${dep}->${step.id}`,
          sourceId: dep,
          targetId: step.id,
          kind: 'workflow-dependency',
          color: '#6d28d9',
          arrow: true,
          tooltip: t('views.workflows.dependencyTooltip', { name: step.name, dependency: nameOf.get(dep) ?? dep }),
        })),
    );
  });

  // Inside a process: the linear step→step chain. The first step hangs from the process by its
  // `contains:` edge, so only the links BETWEEN steps are drawn here; they roll up when folded.
  const processStepEdges: SceneEdge[] = (model.processes ?? []).flatMap((p) =>
    p.steps.slice(1).map((step, i): SceneEdge => ({
      id: `pseq:${p.steps[i].id}->${step.id}`,
      sourceId: p.steps[i].id,
      targetId: step.id,
      kind: 'process-seq',
      color: '#64748b',
      arrow: true,
      tooltip: t('views.contextMap.edge.follows', { name: step.name, previous: p.steps[i].name }),
    })),
  );

  // A mockup stands for a page: the visual and the semantic page, tied by an edge.
  const mockupEdges: SceneEdge[] = (model.mockups ?? [])
    .filter((mk) => mk.pageId && (model.pages ?? []).some((p) => p.id === mk.pageId))
    .map((mk): SceneEdge => ({
      id: `mockupof:${mk.id}->${mk.pageId}`,
      sourceId: mk.id,
      targetId: mk.pageId!,
      kind: 'mockup-of',
      color: '#0ea5e9',
      dashed: true,
      arrow: true,
      tooltip: t('views.contextMap.edge.pageMockup'),
    }));

  // A menu entry → what it drives (page, use case, aggregate CRUD, query listing, another app).
  const menuEdges: SceneEdge[] = (model.uiApps ?? []).flatMap((app) =>
    flattenMenu(app).flatMap(({ entry, path }): SceneEdge[] => {
      const src = menuNodeId(app.id, entry, path);
      const out: SceneEdge[] = [];
      if (entry.pageId && (model.pages ?? []).some((p) => p.id === entry.pageId)) {
        out.push({ id: `menupage:${src}->${entry.pageId}`, sourceId: src, targetId: entry.pageId,
          kind: 'menu-page', color: '#64748b', markerStart: 'ball', markerEnd: 'arrow', tooltip: t('views.contextMap.edge.opensPage') });
      }
      if (entry.uiAdapterId && (model.uiApps ?? []).some((a) => a.id === entry.uiAdapterId)) {
        out.push({ id: `menuapp:${src}->${entry.uiAdapterId}`, sourceId: src, targetId: entry.uiAdapterId,
          kind: 'menu-app', color: '#64748b', arrow: true, tooltip: t('views.contextMap.edge.opensApp') });
      }
      if (entry.useCaseId) {
        out.push({ id: `menuuc:${src}->${entry.useCaseId}`, sourceId: src, targetId: entry.useCaseId,
          kind: 'menu-use-case', color: '#06b6d4', dashed: true, arrow: true, tooltip: t('views.contextMap.edge.launchesUseCase') });
      }
      if (entry.aggregateId) {
        out.push({ id: `menuagg:${src}->${entry.aggregateId}`, sourceId: src, targetId: entry.aggregateId,
          kind: 'menu-aggregate', label: 'CRUD', color: '#8b5cf6', dashed: true, arrow: true, tooltip: t('views.contextMap.edge.crudOverAggregate') });
      }
      if (entry.queryOperationId) {
        out.push({ id: `menuqop:${src}->${entry.queryOperationId}`, sourceId: src, targetId: entry.queryOperationId,
          kind: 'menu-query-operation', label: t('views.ui.listingEdge'), color: '#0284c7', dashed: true, arrow: true, tooltip: t('views.contextMap.edge.queryListing') });
      }
      return out;
    }),
  );

  // Inside an ETL flow: the pipeline source → transform → write, paired by phase like the
  // integrations lens. Rolls up with the flow when folded.
  const etlPhaseOf = (type: string): 0 | 1 | 2 =>
    type.startsWith('SOURCE') ? 0 : type === 'TRANSFORM' ? 1 : 2;
  const etlPipeEdges: SceneEdge[] = (model.etlFlows ?? []).flatMap((f) => {
    const steps = f.steps ?? [];
    const byPhase: [typeof steps, typeof steps, typeof steps] = [[], [], []];
    for (const s of steps) byPhase[etlPhaseOf(s.type)].push(s);
    const out: SceneEdge[] = [];
    for (const phase of [1, 2] as const) {
      byPhase[phase].forEach((s, row) => {
        const prevCol = byPhase[(phase - 1) as 0 | 1];
        const prev = prevCol[Math.min(row, prevCol.length - 1)];
        if (prev) {
          out.push({
            id: `etlpipe:${f.id}:${prev.id}->${s.id}`,
            sourceId: prev.id,
            targetId: s.id,
            kind: 'etl-pipe',
            color: '#0f766e',
            arrow: true,
            tooltip: t('views.integrations.pipeEdge'),
          });
        }
      });
    }
    return out;
  });

  // Model mappings: a labeled edge between two models, plus a thin field→field thread per rule
  // (visible when both models are expanded; folds up to the mapping edge otherwise).
  const mappingEdges: SceneEdge[] = (model.modelMappings ?? []).flatMap((mm): SceneEdge[] => {
    if (!mm.sourceModelId || !mm.targetModelId) return [];
    const out: SceneEdge[] = [{
      id: `mapping:${mm.id}`,
      sourceId: mm.sourceModelId,
      targetId: mm.targetModelId,
      kind: 'model-mapping',
      color: '#7c3aed',
      label: mm.name,
      arrow: true,
      tooltip: t('views.contextMap.edge.mappingRules', { name: mm.name }),
    }];
    for (const r of mm.rules ?? []) {
      if (!r.sourceFieldId || !r.targetFieldId) continue;
      out.push({
        id: `maprule:${mm.id}:${r.id}`,
        sourceId: fieldNodeId(mm.sourceModelId, r.sourceFieldId),
        targetId: fieldNodeId(mm.targetModelId, r.targetFieldId),
        kind: 'mapping-rule',
        color: '#a78bfa',
        dashed: true,
        arrow: true,
        tooltip: t('views.contextMap.edge.mappingRule', { name: mm.name }),
      });
    }
    return out;
  });

  // The proxy → API wiring: teal, at every detail level, endpoints roll up too.
  const proxyTargetEdges: SceneEdge[] = [
    ...new Map(
      (model.proxyApis ?? [])
        .filter((px) => px.targetApiId)
        .map((px) => ({ sourceId: rollUp(px.id), targetId: rollUp(px.targetApiId!) }))
        .filter(
          (d) => nodeIds.has(d.sourceId) && nodeIds.has(d.targetId) && d.sourceId !== d.targetId,
        )
        .map((d): [string, SceneEdge] => [
          `pxt:${d.sourceId}->${d.targetId}`,
          {
            id: `pxt:${d.sourceId}->${d.targetId}`,
            sourceId: d.sourceId,
            targetId: d.targetId,
            kind: 'proxy-target',
            color: '#0e7490',
            dashed: true,
            arrow: true,
            tooltip: t('views.contextMap.edge.proxyOf'),
          },
        ]),
    ).values(),
  ];

  // API implementation wiring: the occurrence nests in its bounded context (that IS the
  // "implemented here"), and every proxy fronting that API also routes to it (teal, like
  // the proxy → published-API edge).
  const apiImplEdges: SceneEdge[] = implEntries.flatMap((impl) => {
    const nid = apiImplNodeId(impl.apiId, impl.boundedContextId);
    if (!nodeIds.has(nid)) return [];
    const edges: SceneEdge[] = [];
    for (const px of (model.proxyApis ?? []).filter((p) => p.targetApiId === impl.apiId)) {
      const sid = rollUp(px.id);
      if (nodeIds.has(sid) && sid !== nid) {
        edges.push({
          id: `pxr:${sid}->${nid}`,
          sourceId: sid,
          targetId: nid,
          kind: 'proxy-route',
          color: '#0e7490',
          // A derived route, not a relation the user drew: dotted, toned down and
          // arrow-less so it never reads like a serving/association from the proxy.
          dashArray: '2 5',
          arrow: false,
          faint: true,
          tooltip: t('views.contextMap.edge.proxyRoutes'),
        });
      }
    }
    return edges;
  });

  // Per-operation routing: a proxy operation occurrence → the implementation SITE it is
  // served from (the published API node, or the api-impl occurrence in a context). Only
  // paintable at the operations level, where the source chips exist.
  const opRouteEdges: SceneEdge[] = (model.proxyOperationRoutes ?? []).flatMap((r) => {
    const px = (model.proxyApis ?? []).find((p) => p.id === r.proxyId);
    if (!px?.targetApiId) return [];
    const sourceId = apiOpOccurrenceId(r.operationId, r.proxyId);
    const targetNodeId =
      r.targetSiteId === px.targetApiId
        ? px.targetApiId
        : apiImplNodeId(px.targetApiId, r.targetSiteId);
    if (!nodeIds.has(sourceId) || !nodeIds.has(targetNodeId)) return [];
    return [{
      id: `oproute:${sourceId}->${targetNodeId}`,
      sourceId,
      targetId: targetNodeId,
      kind: 'op-route',
      color: '#0e7490',
      arrow: true,
      tooltip: t('views.contextMap.edge.routesOperationTo'),
    }];
  });

  // External system → a specific API operation. Precise chip when visible (operations
  // level); coarser levels roll up to the operation's SITE (published API, proxy or the
  // implementation occurrence), all of which render at every level.
  const extOpUseEdges: SceneEdge[] = [
    ...new Map(
      (model.externalOperationUses ?? [])
        .map((u) => {
          if (!nodeIds.has(u.externalSystemId)) return null;
          const owningApi = (model.apis ?? []).find((a) =>
            a.operations.some((o) => o.id === u.operationId),
          );
          if (!owningApi) return null;
          const isPublishedSite = u.siteId === owningApi.id;
          const precise = isPublishedSite
            ? u.operationId
            : apiOpOccurrenceId(u.operationId, u.siteId);
          let target: string | null = nodeIds.has(precise) ? precise : null;
          if (!target) {
            if (isPublishedSite || (model.proxyApis ?? []).some((p) => p.id === u.siteId)) {
              target = rollUp(u.siteId);
            } else {
              // Implementation site: the impl chip when visible, else its context.
              const implChip = apiImplNodeId(owningApi.id, u.siteId);
              target = nodeIds.has(implChip) ? implChip : u.siteId;
            }
          }
          if (!target || !nodeIds.has(target) || target === u.externalSystemId) return null;
          return { u, target };
        })
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .map((d): [string, SceneEdge] => [
          `extopuse:${d.u.externalSystemId}->${d.u.operationId}@${d.u.siteId}`,
          {
            id: `extopuse:${d.u.externalSystemId}->${d.u.operationId}@${d.u.siteId}`,
            sourceId: d.u.externalSystemId,
            targetId: d.target,
            kind: 'ext-op-use',
            color: '#64748b',
            label: 'op',
            dashed: true,
            arrow: true,
            tooltip: t('views.contextMap.edge.callsOperation'),
          },
        ]),
    ).values(),
  ];

  // Per-site wiring: the operation AT a site (a bounded-context implementation, or a
  // proxy) → the use case serving it there (which may live in any context). Source: the
  // occurrence chip when unfolded, else the site's own node (impl chip / proxy, rolled
  // up to its host when folded away).
  const apiOpImplWireEdges: SceneEdge[] = detailed
    ? (model.apiOperationImplementations ?? []).flatMap((w) => {
        if (!nodeIds.has(w.useCaseId)) return [];
        const source = nodeIds.has(apiOpOccurrenceId(w.operationId, w.boundedContextId))
          ? apiOpOccurrenceId(w.operationId, w.boundedContextId)
          : nodeIds.has(apiImplNodeId(w.apiId, w.boundedContextId))
            ? apiImplNodeId(w.apiId, w.boundedContextId)
            : nodeIds.has(rollUp(w.boundedContextId))
              ? rollUp(w.boundedContextId)
              : null;
        if (!source) return [];
        return [{
          id: `apiimplwire:${w.operationId}@${w.boundedContextId}`,
          sourceId: source,
          targetId: w.useCaseId,
          kind: 'api-impl-wire',
          color: '#4f46e5',
          dashed: true,
          arrow: true,
          tooltip: t('views.contextMap.edge.implementedHereBy'),
        }];
      })
    : [];

  const agentUseEdges: SceneEdge[] = detailed
    ? (model.agentUses ?? [])
        .filter((u) => nodeIds.has(u.agentId) && nodeIds.has(u.useCaseId))
        .map((u) => ({
          id: `mcp:${u.agentId}->${u.useCaseId}`,
          sourceId: u.agentId,
          targetId: u.useCaseId,
          kind: 'agent-use',
          color: '#9333ea',
          dashed: true,
          arrow: true,
          tooltip: t('views.contextMap.edge.consumesViaMcpExposed'),
        }))
    : [];
  // Agent → knowledge base, and knowledge base → the read models it indexes.
  // RAGs and agents are top-level, so these edges show at BOTH detail levels
  // (the rag → read model one needs the chip, hence detailed only).
  const agentRagEdges: SceneEdge[] = (model.agentRags ?? [])
    .filter((u) => nodeIds.has(u.agentId) && nodeIds.has(u.ragId))
    .map((u) => ({
      id: `agrag:${u.agentId}->${u.ragId}`,
      sourceId: u.agentId,
      targetId: u.ragId,
      kind: 'agent-rag',
      color: '#0e7490',
      dashed: true,
      arrow: true,
      tooltip: t('views.contextMap.edge.queriesKnowledgeBase'),
    }));
  const ragSourceEdges: SceneEdge[] = detailed
    ? (model.rags ?? [])
        .filter((r) => nodeIds.has(r.id))
        .flatMap((r) =>
          (r.sourceReadModelIds ?? [])
            .filter((rmId) => nodeIds.has(rmId))
            .map((rmId) => ({
              id: `ragsrc:${r.id}->${rmId}`,
              sourceId: r.id,
              targetId: rmId,
              kind: 'rag-source',
              color: '#0e7490',
              dashed: true,
              arrow: true,
              tooltip: t('views.contextMap.edge.indexesReadModel', { name: r.name }),
            })),
        )
    : [];
  const agentExternalUseEdges: SceneEdge[] = detailed
    ? (model.agentExternalUses ?? [])
        .filter((u) => nodeIds.has(u.agentId) && nodeIds.has(u.externalUseCaseId))
        .map((u) => ({
          id: `mcpx:${u.agentId}->${u.externalUseCaseId}`,
          sourceId: u.agentId,
          targetId: u.externalUseCaseId,
          kind: 'agent-external-use',
          color: '#9333ea',
          dashed: true,
          arrow: true,
          tooltip: t('views.contextMap.edge.callsExternalOperation'),
        }))
    : [];
  const agentMcpEdges: SceneEdge[] = detailed
    ? (model.agentMcpUses ?? [])
        .filter((u) => nodeIds.has(u.agentId) && nodeIds.has(u.mcpServerId))
        .map((u) => ({
          id: `mcpsv:${u.agentId}->${u.mcpServerId}`,
          sourceId: u.agentId,
          targetId: u.mcpServerId,
          kind: 'agent-mcp',
          color: '#9333ea',
          dashed: true,
          arrow: true,
          tooltip: t('views.contextMap.edge.consumesMcpServerTools'),
        }))
    : [];
  // Gateway exposures: whatever the gateway aggregates/exposes, when visible.
  const gatewayExposureEdges: SceneEdge[] = (model.mcpGateways ?? []).flatMap((g) =>
    [
      ...(g.mcpServerIds ?? []),
      ...(g.apiIds ?? []),
      ...(g.apiOperationIds ?? []),
      ...(g.useCaseIds ?? []),
      ...(g.ragIds ?? []),
    ]
      .filter((target) => nodeIds.has(g.id) && nodeIds.has(target))
      .map((target) => ({
        id: `gwx:${g.id}->${target}`,
        sourceId: g.id,
        targetId: target,
        kind: 'gateway-exposure',
        color: '#7c3aed',
        dashed: true,
        arrow: true,
        tooltip: t('views.contextMap.edge.aggregatesAsMcpTool'),
      })),
  );
  const agentGatewayEdges: SceneEdge[] = (model.agentGatewayUses ?? [])
    .filter((u) => nodeIds.has(u.agentId) && nodeIds.has(u.gatewayId))
    .map((u) => ({
      id: `aggw:${u.agentId}->${u.gatewayId}`,
      sourceId: u.agentId,
      targetId: u.gatewayId,
      kind: 'agent-gateway',
      color: '#9333ea',
      dashed: true,
      arrow: true,
      tooltip: t('views.contextMap.edge.consumesMcpGatewayTools'),
    }));
  const agentApiOpEdges: SceneEdge[] = detailed
    ? (model.agentApiOpUses ?? [])
        .filter((u) => nodeIds.has(u.agentId) && nodeIds.has(u.apiOperationId))
        .map((u) => ({
          id: `agapi:${u.agentId}->${u.apiOperationId}`,
          sourceId: u.agentId,
          targetId: u.apiOperationId,
          kind: 'agent-api-op',
          color: '#9333ea',
          dashed: true,
          arrow: true,
          tooltip: t('views.contextMap.edge.callsApiOperationAsTool'),
        }))
    : [];
  const agentQueryEdges: SceneEdge[] = detailed
    ? (model.agentQueryUses ?? [])
        .filter((u) => nodeIds.has(u.agentId) && nodeIds.has(u.queryServiceId))
        .map((u) => ({
          id: `agqs:${u.agentId}->${u.queryServiceId}`,
          sourceId: u.agentId,
          targetId: u.queryServiceId,
          kind: 'agent-query',
          color: '#0d9488',
          dashed: true,
          arrow: true,
          tooltip: t('views.contextMap.edge.queriesQueryService'),
        }))
    : [];
  const agentDelegationEdges: SceneEdge[] = (model.agentDelegations ?? [])
    .filter((u) => nodeIds.has(u.agentId) && nodeIds.has(u.delegateAgentId))
    .map((u) => ({
      id: `agag:${u.agentId}->${u.delegateAgentId}`,
      sourceId: u.agentId,
      targetId: u.delegateAgentId,
      kind: 'agent-delegate',
      color: '#9333ea',
      arrow: true,
      tooltip: t('views.contextMap.edge.delegatesToAgent'),
    }));
  const actorAgentEdges: SceneEdge[] = (model.actorAgentUses ?? [])
    .filter((u) => nodeIds.has(u.actorId) && nodeIds.has(u.agentId))
    .map((u) => ({
      id: `useag:${u.actorId}->${u.agentId}`,
      sourceId: u.actorId,
      targetId: u.agentId,
      kind: 'actor-agent',
      color: '#6366f1',
      arrow: true,
      tooltip: t('views.contextMap.edge.talksToAgent'),
    }));
  const agentTriggerEdges: SceneEdge[] = detailed
    ? (model.agentTriggers ?? [])
        .filter((u) => nodeIds.has(u.eventId) && nodeIds.has(u.agentId))
        .map((u) => ({
          id: `evag:${u.eventId}->${u.agentId}`,
          sourceId: u.eventId,
          targetId: u.agentId,
          kind: 'agent-trigger',
          color: '#f59e0b',
          dashed: true,
          arrow: true,
          tooltip: t('views.contextMap.edge.eventTriggersAgent'),
        }))
    : [];
  const externalCallEdges: SceneEdge[] = detailed
    ? (model.externalCalls ?? [])
        .filter((c) => nodeIds.has(c.externalSystemId) && nodeIds.has(c.useCaseId))
        .map((c) => ({
          id: `extcall:${c.externalSystemId}->${c.useCaseId}`,
          sourceId: c.externalSystemId,
          targetId: c.useCaseId,
          kind: 'external-call',
          color: '#7c3aed',
          arrow: true,
          tooltip: t('views.contextMap.edge.callsViaAcl'),
        }))
    : [];
  const externalUcCallEdges: SceneEdge[] = detailed
    ? (model.externalUseCaseCalls ?? [])
        .filter((c) => nodeIds.has(c.sourceId) && nodeIds.has(c.targetId))
        .map((c) => ({
          id: `extuccall:${c.sourceId}->${c.targetId}`,
          sourceId: c.sourceId,
          targetId: c.targetId,
          kind: 'ext-uc-call',
          color: '#64748b',
          dashed: true,
          arrow: true,
          tooltip: t('views.contextMap.edge.callsDerivesGateway'),
        }))
    : [];

  // ── UI assignments: apps/pages assigned to the declared interface ─────────
  const uiAssignmentEdges: SceneEdge[] = (model.uis ?? []).flatMap((u) => [
    ...[...(u.appIds ?? []), ...(u.pageIds ?? [])].map((target): SceneEdge => ({
      id: `uiasg:${u.id}->${target}`,
      sourceId: target,
      targetId: u.id,
      kind: 'ui-assignment',
      color: '#0ea5e9',
      markerStart: 'ball',
      markerEnd: 'arrow',
      tooltip: t('views.ui.uiAssignmentEdge'),
    })),
    // serving: la interfaz SIRVE al actor (flecha abierta hacia la persona)
    ...(u.actorIds ?? []).map((actor): SceneEdge => ({
      id: `uisrv:${u.id}->${actor}`,
      sourceId: u.id,
      targetId: actor,
      kind: 'ui-serving',
      color: '#0ea5e9',
      markerEnd: 'open-arrow',
      tooltip: t('views.ui.uiServingEdge'),
    })),
  ]);

  // ── ArchiMate: the hand-drawn vocabulary, with its notation ────────────────
  // A relation is a FACT (real coupling: generates, validates, rolls up) or an INTENT (a top-down
  // sketch: no code weight). The rule is structural — a line between two LANDSCAPE nodes (system,
  // context, external system, actor, agent…) with no concrete artifact is intent by nature; anything
  // touching an API/operation/event/aggregate is a fact — with an escape hatch (`nature`) for the
  // rare real-but-abstract case (a CDC drawn context→context). Reconciled after re-anchoring below.
  const strategicIds = new Set<string>([
    ...model.boundedContexts.map((m) => m.id),
    ...(model.systems ?? []).map((s) => s.id),
    ...model.externalSystems.map((x) => x.id),
    ...(model.actors ?? []).map((a) => a.id),
    ...(model.aiAgents ?? []).map((a) => a.id),
    ...(model.rags ?? []).map((r) => r.id),
    ...(model.mcpGateways ?? []).map((g) => g.id),
  ]);
  const relationNature = (r: NonNullable<ModuxModel['archimateRelations']>[number]): 'intent' | 'fact' =>
    r.nature ?? (strategicIds.has(r.sourceId) && strategicIds.has(r.targetId) ? 'intent' : 'fact');
  const archimateEdges: SceneEdge[] = (model.archimateRelations ?? []).map((r) => ({
    id: `archi:${r.id}`,
    sourceId: r.sourceId,
    targetId: r.targetId,
    kind: 'archimate-relation',
    color: '#475569',
    label: r.label || undefined,
    nature: relationNature(r),
    ...(ARCHIMATE_NOTATION[r.type] ?? {}),
    tooltip: `${ARCHIMATE_LABEL[r.type] ?? r.type} (ArchiMate)${r.label ? ` · ${r.label}` : ''}${t('views.contextMap.edge.archimateHint')}`,
  }));

  const reanchored = reanchorEdges([
      ...containsEdges,
      ...archimateEdges,
      ...uiAssignmentEdges,
      ...deployEdges,
      ...relationEdges,
      ...flowEdges,
      ...emissionEdges,
      ...projectionEdges,
      ...apiWireEdges,
      ...callEdges,
      ...triggerFireEdges,
      ...idpEdges,
      ...notificationEdges,
      ...documentEdges,
      ...etlEdges,
      ...aggCallEdges,
      ...queryEdges,
      ...actorUseEdges,
      ...actorExternalEdges,
      ...externalDependencyEdges,
      ...proxyTargetEdges,
      ...apiImplEdges,
      ...opRouteEdges,
      ...extOpUseEdges,
      ...apiOpImplWireEdges,
      ...workflowCallEdges,
      ...workflowTriggerEdges,
      ...workflowChainEdges,
      ...workflowStepEdges,
      ...processStepEdges,
      ...menuEdges,
      ...mockupEdges,
      ...etlPipeEdges,
      ...mappingEdges,
      ...agentApiEdges,
      ...ragTableEdges,
      ...ragApiEdges,
      ...ragCoarseEdges,
      ...agentUseEdges,
      ...agentExternalUseEdges,
      ...agentMcpEdges,
      ...gatewayExposureEdges,
      ...agentGatewayEdges,
      ...agentApiOpEdges,
      ...agentQueryEdges,
      ...agentDelegationEdges,
      ...actorAgentEdges,
      ...agentTriggerEdges,
      ...agentRagEdges,
      ...ragSourceEdges,
      ...ragContentEdges,
      ...externalCallEdges,
      ...externalUcCallEdges,
    ]);

  // Reconcile sketches against facts. An INTENT that a FACT already realizes (same visible
  // endpoints, after roll-up) is BACKED: drop it and let the solid fact stand for it (one line).
  // An intent with no backing is PROPOSED: draw it tentative (dashed, muted). Facts are untouched.
  const factPairs = new Set(
    reanchored
      .filter((e) => e.kind === 'archimate-relation' && e.nature === 'fact')
      .map((e) => `${e.sourceId} ${e.targetId}`),
  );
  const edges = reanchored.flatMap((e): SceneEdge[] => {
    if (e.kind !== 'archimate-relation' || e.nature !== 'intent') return [e];
    if (factPairs.has(`${e.sourceId} ${e.targetId}`)) return []; // backed → merged into the fact
    return [{
      ...e,
      dashArray: '6 4',
      color: '#94a3b8',
      faint: true,
      tooltip: `${t('views.contextMap.edge.sketch')}${e.label ? ` · ${e.label}` : ''}${t('views.contextMap.edge.sketchHint')}`,
    }];
  });

  return { nodes, edges };
}
