/**
 * The projection: the store's shape (one bucket per element type) turned into
 * the denormalized shape the editor draws from (`model.ts`).
 *
 * The Java original is `EditorModelProjection`, 951 lines. A large part of that
 * file is scoping work — deciding which bounded contexts belong to the *current*
 * project by walking services and modules, and hiding the ones wired elsewhere.
 * With one project per repository that whole question disappears: everything in
 * the tree belongs to the project, because the tree is the project.
 *
 * COVERAGE: the core block — bounded contexts and what they own, the context
 * map, actors, services and modules, APIs, the read side, flows, and the canvas
 * furniture — plus the UI block, which lives in `project-ui.ts` because it
 * answers a different question and is the half that keeps moving, and the
 * orchestration block (`project-orchestration.ts`). What is left unprojected is
 * `processes`, which have a view of their own, `decisions` and `deployments`.
 * `projectedTypes()` reports what is covered, so a host can tell the difference
 * between "empty" and "not ported" — and say so rather than draw a blank.
 */

import type {
  AggregateRef,
  ApplicationEventRef,
  BoundedContextRef,
  ContextMapRelation,
  DomainEventRef,
  DomainServiceRef,
  EntityRef,
  FlowRef,
  ModuxModel,
  ReadModelRef,
  UseCaseRef,
  ValueObjectRef,
} from '../model.js';
import { CATALOG_PROJECTED_TYPES, projectCatalog } from './project-catalog.js';
import { ORCHESTRATION_PROJECTED_TYPES, projectOrchestration } from './project-orchestration.js';
import { projectUi, UI_PROJECTED_TYPES } from './project-ui.js';
import { asList, type Element, type ModelStore } from './store.js';

/** Element types this projection reads. Anything else in the tree is passed over. */
export function projectedTypes(): string[] {
  return [
    'projects', 'services', 'modules', 'boundedContexts', 'aggregates', 'entities',
    'valueObjects', 'useCases', 'domainEvents', 'applicationEvents', 'integrationEvents', 'domainServices',
    'readModels', 'models', 'contextMapRelations', 'archimateRelations', 'roles', 'externalSystems', 'systems', 'cdcs',
    'notes', 'areas', 'urls', 'views', 'apis', 'proxyApis', 'queryServices', 'projections',
    'scheduledTriggers', 'flows', 'looseElements',
    ...UI_PROJECTED_TYPES,
    ...ORCHESTRATION_PROJECTED_TYPES,
    ...CATALOG_PROJECTED_TYPES,
  ];
}

/** Types present in the store that the projection does not read yet. */
export function unprojectedTypes(store: ModelStore): string[] {
  const covered = new Set(projectedTypes());
  return store.types().filter((type) => !covered.has(type)).sort();
}

export function project(store: ModelStore): ModuxModel {
  const owner = ownerIndex(store);

  return {
    boundedContexts: store.all('boundedContexts').map((bc) => boundedContext(store, bc, owner)),
    relations: store.all('contextMapRelations').map(relation),
    aggregates: store.all('aggregates').map((a) => aggregate(a, owner)),
    // Use cases with no owning context: they only nest under a context, so they'd vanish. Surface
    // them here for the canvas to draw top-level with a «sin asociar» badge until composed.
    looseUseCases: store.all('useCases').filter((u) => !owner.of.get(u.id)).map(useCase),
    unownedElements: CONTEXT_SCOPED_TYPES.filter((type) => NESTED_ONLY.has(type)).flatMap((type) =>
      store.all(type).filter((e) => !owner.of.get(e.id)).map((e) => ({ id: e.id, name: name(e), type }))),
    looseElements: store.all('looseElements').map((e) => ({
      id: e.id,
      name: str(e.name) ?? '',
      elementType: str(e.elementType) ?? '',
    })),
    entities: store.all('entities').map(entity),
    valueObjects: store.all('valueObjects').map((vo) => valueObject(vo, owner)),
    externalSystems: store.all('externalSystems').map(named),
    systems: store.all('systems').map((s) => ({
      id: s.id,
      name: name(s),
      parentSystemId: str(s.parentSystemId),
    })),
    cdcs: store.all('cdcs').map(named),
    services: store.all('services').map((s) => ({
      id: s.id,
      name: name(s),
      moduleIds: asList(s.moduleIds),
    })),
    modules: store.all('modules').map((m) => ({
      id: m.id,
      name: name(m),
      boundedContextId: str(m.boundedContextId) ?? '',
      main: m.main === true,
    })),
    // an actor is a `roles` element in the store — `RoleEntity` on the Java side
    actors: store.all('roles').map(named),
    models: store.all('models').map((m) => ({
      id: m.id,
      name: name(m),
      fields: (Array.isArray(m.fields) ? (m.fields as Element[]) : []).map((f) => ({
        id: f.id,
        name: name(f),
        type: str(f.type),
      })),
    })),
    notes: store.all('notes').map((n) => ({
      id: n.id,
      text: str(n.text) ?? '',
      // elements only: the edge refs are view coordinates and the editor reads them per view
      targetIds: asList(n.targetIds),
    })),
    areas: store.all('areas').map((a) => ({ id: a.id, name: str(a.title) ?? name(a) })),
    urls: store.all('urls').map((u) => ({ id: u.id, name: name(u), uri: str(u.url) ?? '' })),
    archimateRelations: store.all('archimateRelations').map((r) => ({
      id: r.id,
      sourceId: str(r.sourceId) ?? '',
      targetId: str(r.targetId) ?? '',
      type: str(r.type) ?? '',
      label: str(r.name),
      nature: r.nature === 'intent' || r.nature === 'fact' ? r.nature : undefined,
    })),
    flows: store.all('flows').map((f) => flow(f, owner)).filter(isDrawable),
    ...projectUi(store),
    ...projectOrchestration(store),
    ...projectCatalog(store),
  };
}

/**
 * A flow's TARGET is stored; its SOURCE is not — it is whichever context owns whatever fires the
 * flow. Deriving it rather than storing it is what keeps the two from disagreeing: move an
 * aggregate to another context and every flow it triggers follows, with nothing to update.
 *
 * Mirrors `FlowContextMapCoherenceService.analyzeOne` on the Java side.
 */
function flow(f: Element, owner: OwnerIndex): FlowRef {
  const trigger = str(f.triggerAggregateId) ?? str(f.triggerDomainServiceId) ?? str(f.triggerUseCaseId);
  return {
    id: f.id,
    name: name(f),
    sourceId: (trigger ? owner.of.get(trigger) : undefined) ?? '',
    targetId: str(f.targetBoundedContextId) ?? '',
    archetype: f.archetype as FlowRef['archetype'],
    triggerAggregateId: str(f.triggerAggregateId),
    triggerEvent: str(f.triggerEvent),
    targetUseCaseId: str(f.targetUseCaseId),
    readModelName: str(f.readModelName),
  };
}

/** A flow missing either end is not an edge yet; the canvas has nothing to draw it between. */
const isDrawable = (f: FlowRef) => Boolean(f.sourceId && f.targetId);

/**
 * Which bounded context owns each element.
 *
 * The store records ownership in two directions depending on the type — a
 * context lists its aggregate ids, while a use case may instead name its
 * context. Indexing both once here keeps every projection below a lookup.
 */
/** Types whose elements belong to a bounded context — listed by it, or naming it themselves. */
const CONTEXT_SCOPED_TYPES = ['useCases', 'domainEvents', 'applicationEvents', 'integrationEvents', 'domainServices',
  'readModels', 'queryServices', 'projections', 'scheduledTriggers'];

/**
 * The context-scoped types that are reachable ONLY through their owning context in the projection
 * (use cases have `looseUseCases`, projections are top-level, scheduled triggers are not drawn).
 */
const NESTED_ONLY = new Set(['domainEvents', 'applicationEvents', 'integrationEvents', 'domainServices',
  'readModels', 'queryServices']);

interface OwnerIndex {
  /** element id → bounded context id */
  of: Map<string, string>;
  /** value object id → aggregate id (a VO lives in an aggregate's valueObjectIds, not a context's). */
  voAgg: Map<string, string>;
}

function ownerIndex(store: ModelStore): OwnerIndex {
  const of = new Map<string, string>();
  for (const context of store.all('boundedContexts')) {
    for (const field of ['aggregateIds', 'useCaseIds', 'valueObjectIds', 'domainEventIds', 'readModelIds',
      'domainServiceIds', 'applicationEventIds', 'projectionIds']) {
      for (const id of asList(context[field])) of.set(id, context.id);
    }
  }
  // the other direction: elements that name their context themselves
  for (const type of CONTEXT_SCOPED_TYPES) {
    for (const element of store.all(type)) {
      const declared = str(element.boundedContextId);
      if (declared) of.set(element.id, declared);
    }
  }
  // A value object's owner is the AGGREGATE that lists it — not a context. Resolved separately so
  // vo.aggregateId is real (it was always '' before, which hid VO ownership and free-standing state).
  const voAgg = new Map<string, string>();
  for (const agg of store.all('aggregates')) {
    for (const voId of asList(agg.valueObjectIds)) voAgg.set(voId, agg.id);
  }
  return { of, voAgg };
}

function boundedContext(store: ModelStore, bc: Element, owner: OwnerIndex): BoundedContextRef {
  const owns = (element: Element) => owner.of.get(element.id) === bc.id;
  const service = store.all('services').find((s) =>
    asList(s.moduleIds).some((moduleId) => store.get('modules', moduleId)?.boundedContextId === bc.id));

  return {
    id: bc.id,
    name: name(bc),
    subdomainType: bc.subdomainType as BoundedContextRef['subdomainType'],
    parentSystemId: str(bc.parentSystemId),
    serviceId: service?.id,
    useCases: store.all('useCases').filter(owns).map(useCase),
    domainEvents: store.all('domainEvents').filter(owns).map(domainEvent),
    applicationEvents: store.all('applicationEvents').filter(owns).map(named) as ApplicationEventRef[],
    integrationEvents: store.all('integrationEvents').filter(owns).map(named) as ApplicationEventRef[],
    domainServices: store.all('domainServices').filter(owns).map(named) as DomainServiceRef[],
    readModels: store.all('readModels').filter(owns).map((rm) => ({
      id: rm.id,
      name: name(rm),
      aggregateId: str(rm.aggregateId),
    })) as ReadModelRef[],
    queryServices: store.all('queryServices').filter(owns).map((qs) => ({
      id: qs.id,
      name: name(qs),
      operations: nestedNamed(qs.operations),
    })),
  };
}

function useCase(uc: Element): UseCaseRef {
  const steps = Array.isArray(uc.steps) ? (uc.steps as Element[]) : [];
  return {
    id: uc.id,
    name: name(uc),
    policy: uc.policy === true,
    stepIds: steps.map((s) => s.id),
    steps: steps.map((s) => ({
      id: s.id,
      name: str(s.name),
      type: str(s.type),
      customCodeId: str(s.customCodeId),
      // a step's targets: what the canvas draws every call and publish edge from
      aggregateId: str(s.aggregateId),
      operationId: str(s.operationId),
      useCaseId: str(s.useCaseId),
      queryServiceId: str(s.queryServiceId),
      queryOperationId: str(s.queryOperationId),
      domainEventId: str(s.domainEventId),
      applicationEventId: str(s.applicationEventId),
      externalUseCaseId: str(s.externalUseCaseId),
      modelMappingId: str(s.modelMappingId),
    })),
    inputModelId: str(uc.inputModelId),
  };
}

const domainEvent = (event: Element): DomainEventRef => ({ id: event.id, name: name(event) });

const aggregate = (agg: Element, owner: OwnerIndex): AggregateRef => ({
  id: agg.id,
  name: name(agg),
  boundedContextId: owner.of.get(agg.id) ?? '',
  modelId: str(agg.modelId),
  invariants: nestedNamed(agg.invariants),
  operations: nestedNamed(agg.operations),
});

const entity = (ent: Element): EntityRef => ({
  id: ent.id,
  name: name(ent),
  aggregateId: str(ent.parentAggregateId) ?? '',
  modelId: str(ent.modelId),
  invariants: nestedNamed(ent.invariants),
});

const valueObject = (vo: Element, owner: OwnerIndex): ValueObjectRef => ({
  id: vo.id,
  name: name(vo),
  aggregateId: owner.voAgg.get(vo.id) ?? '',
  type: str(vo.type),
  invariants: nestedNamed(vo.invariants),
});

const named = (element: Element) => ({ id: element.id, name: name(element) });

function nestedNamed(value: unknown): { id: string; name: string }[] {
  return Array.isArray(value)
    ? (value as Element[]).map((item) => ({ id: item.id, name: name(item) }))
    : [];
}

/** The editor identifies a relation by its endpoints; the store keeps an id for the file name. */
function relation(rel: Element): ContextMapRelation {
  return {
    sourceId: str(rel.sourceBoundedContextId) ?? '',
    targetId: str(rel.targetBoundedContextId) ?? '',
    type: (rel.type as ContextMapRelation['type']) ?? null,
    declared: true,
  };
}

const name = (element: Element) => str(element.name) ?? element.id;
const str = (value: unknown) => (typeof value === 'string' && value ? value : undefined);
