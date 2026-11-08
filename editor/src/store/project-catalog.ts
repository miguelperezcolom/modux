/**
 * The rest of the projection: the elements the other two halves do not cover, and the EDGES.
 *
 * An edge is not stored anywhere. The store keeps «this use case's third step calls that
 * aggregate» — because a file per element is what a repository wants — and the canvas draws an
 * arrow. Turning one into the other is this file's whole job, and doing it once here is what
 * stops each view from re-deriving it slightly differently.
 *
 * Ported from `EditorModelProjection`.
 */

import type { ModuxModel } from '../model.js';
import { asList, nested, type Element, type ModelStore } from './store.js';

export const CATALOG_PROJECTED_TYPES = [
  'subscriptions', 'sagas', 'enums', 'businessRules', 'integrationEvents', 'gateways',
];

/** Use-case step types, and which edge list each contributes to. */
const CALL_EDGES: { types: string[]; field: string; edge: string }[] = [
  { types: ['CallUseCase'], field: 'useCaseId', edge: 'useCaseCalls' },
  { types: ['CallQueryService'], field: 'queryServiceId', edge: 'queryCalls' },
  { types: ['CallAggregateOperation', 'SaveAggregate'], field: 'aggregateId', edge: 'aggregateCalls' },
  { types: ['CallExternalUseCase'], field: 'externalUseCaseId', edge: 'externalUseCaseCalls' },
];

export function projectCatalog(store: ModelStore): Partial<ModuxModel> {
  const edges = callEdges(store);

  return {
    ...edges,

    apis: store.all('apis').map((a) => ({
      id: a.id,
      name: name(a),
      publishedByExternalSystemId: str(a.publishedByExternalSystemId),
      operations: nested(a.operations).map((o) => ({
        id: o.id,
        name: name(o as Element),
        httpMethod: str(o.httpMethod),
        path: str(o.path),
        targetBoundedContextId: str(o.targetBoundedContextId ?? o.boundedContextId),
        targetUseCaseId: str(o.targetUseCaseId),
        targetQueryServiceId: str(o.targetQueryServiceId),
        targetQueryOperationId: str(o.targetQueryOperationId),
      })),
    })),

    proxyApis: store.all('proxyApis').map((p) => ({
      id: p.id,
      name: name(p),
      targetApiId: str(p.targetApiId),
      publishedByExternalSystemId: str(p.publishedByExternalSystemId),
    })),

    /** Where an API is implemented — the SAME API, at several sites. */
    apiImplementations: store.all('apis').flatMap((a) =>
      asList(a.implementedByBoundedContextIds).map((boundedContextId) => ({
        apiId: a.id, boundedContextId,
      }))),

    apiOperationImplementations: store.all('apis').flatMap((a) =>
      nested(a.operationImplementations).map((w) => ({
        apiId: a.id,
        operationId: String(w.operationId),
        boundedContextId: String(w.boundedContextId),
        useCaseId: String(w.useCaseId ?? ''),
      }))),

    proxyOperationRoutes: store.all('proxyApis').flatMap((p) =>
      nested(p.operationRoutes).map((r) => ({
        proxyId: p.id,
        operationId: String(r.operationId),
        targetSiteId: String(r.targetSiteId),
      }))),

    externalOperationUses: store.all('externalSystems').flatMap((x) =>
      nested(x.apiOperationUses).map((u) => ({
        externalSystemId: x.id,
        operationId: String(u.operationId),
        siteId: String(u.siteId),
      }))),

    projections: store.all('projections').map((p) => ({
      id: p.id,
      name: name(p),
      readModelId: str(p.readModelId),
      readModelName: str(store.get('readModels', str(p.readModelId))?.name) ?? str(p.readModelId),
      handledEventIds: [...new Set(nested(p.handlers)
        .map((h) => str(h.domainEventId))
        .filter((id): id is string => Boolean(id)))],
      sourceAggregateId: str(p.aggregateId),
      boundedContextId: store.findByListMember('boundedContexts', 'projectionIds', p.id)?.id,
      sourceExternalUseCaseId: str(p.externalUseCaseId),
      sourceExternalTableId: str(p.externalTableId),
    })),

    subscriptions: store.all('subscriptions').map((s) => ({
      id: s.id,
      name: name(s),
      eventName: str(s.eventName),
      consumerGroup: str(s.consumerGroup),
      actions: nested(s.actions).map((a) => ({
        type: str(a.type),
        useCaseId: str(a.useCaseId),
        sagaId: str(a.sagaId),
        projectionId: str(a.projectionId),
      })),
    })),

    processes: store.all('processes').map((p) => ({
      id: p.id,
      name: name(p),
      triggerAggregateId: str(p.triggerAggregateId),
      triggerEvent: str(p.triggerEvent),
      ownerBoundedContextId: str(p.boundedContextId),
      onCompletionEventName: str(p.onCompletionEventName),
      sla: str(p.sla),
      steps: nested(p.steps).map((s) => ({
        id: s.id,
        name: name(s as Element),
        type: (str(s.type) ?? 'AUTOMATED') as 'AUTOMATED' | 'HUMAN',
        useCaseId: str(s.useCaseId),
        roleId: str(s.roleId),
        deadline: str(s.deadline),
        compensationUseCaseId: str(s.compensationUseCaseId),
      })),
    })),

    /** Legacy sagas awaiting their fusion into workflows — the migrate button counts them. */
    sagas: store.all('sagas').map((s) => ({ id: s.id, name: name(s) })),

    // Data types and outbound gateways: nothing draws them as edges, but a view can show them.
    enums: store.all('enums').map((e) => ({ id: e.id, name: name(e) })),
    gateways: store.all('gateways').map((g) => ({ id: g.id, name: name(g) })),

    views: store.all('views').map((v) => ({
      id: v.id,
      name: name(v),
      kind: str(v.kind) ?? 'CURATED',
      memberIds: asList(v.memberIds),
    })),

    identityProviders: store.all('identityProviders').map((i) => ({
      id: i.id,
      name: name(i),
      type: str(i.type),
      issuer: str(i.issuer),
      publishedByExternalSystemId: str(i.publishedByExternalSystemId),
    })),

    notifications: store.all('notifications').map((n) => ({
      id: n.id,
      name: name(n),
      ownerBoundedContextId: str(n.ownerBoundedContextId),
      eventId: str(n.eventId),
      channels: asList(n.channels),
      recipientRoleIds: asList(n.recipientRoleIds),
    })),

    documents: store.all('documents').map((d) => ({
      id: d.id,
      name: name(d),
      ownerBoundedContextId: str(d.ownerBoundedContextId),
      kind: str(d.kind),
      modelId: str(d.modelId),
      queryServiceId: str(d.queryServiceId),
      queryOperationId: str(d.queryOperationId),
    })),

    etlFlows: store.all('etlFlows').map((f) => ({
      id: f.id,
      name: name(f),
      ownerBoundedContextId: str(f.ownerBoundedContextId),
      identityProviderId: str(f.identityProviderId),
      steps: nested(f.steps).map((s) => ({
        id: s.id,
        name: str(s.name),
        type: str(s.type) ?? '',
        externalTableId: str(s.externalTableId),
        apiId: str(s.apiId),
        operationId: str(s.operationId),
        eventId: str(s.targetId),
        mappingId: str(s.mappingId),
      })),
    })),

    /** Actors: what they may run, and what they lean on. */
    actorUses: store.all('roles').flatMap((r) => [
      ...asList(r.allowedUseCaseIds),
      ...asList(r.allowedQueryServiceIds),
    ].map((targetId) => ({ actorId: r.id, targetId }))),

    actorExternalDependencies: store.all('roles').flatMap((r) =>
      asList(r.externalSystemIds).map((externalSystemId) => ({ actorId: r.id, externalSystemId }))),

    /** External system → what it leans on. A CQRS edge is a different claim, so it keeps its type. */
    externalSystemDependencies: store.all('externalSystems').flatMap((x) => [
      ...asList(x.dependsOnExternalSystemIds).map((targetId) => ({ sourceId: x.id, targetId, type: 'DEPENDS' })),
      ...asList(x.dependsOnApiIds).map((targetId) => ({ sourceId: x.id, targetId, type: 'DEPENDS' })),
      ...asList(x.cqrsExternalSystemIds).map((targetId) => ({ sourceId: x.id, targetId, type: 'CQRS' })),
    ]),

    /** An external system calling one of OURS: the inbound ACLs, read off the contexts. */
    externalCalls: store.all('boundedContexts').flatMap((bc) =>
      nested(bc.acls)
        .filter((a) => String(a.direction).toUpperCase() === 'INBOUND' && a.externalSystem)
        .flatMap((a) => asList(a.translatedUseCaseIds).map((useCaseId) => ({
          externalSystemId: String(a.externalSystem), useCaseId,
        })))),

    /**
     * Who emits a DOMAIN event. An aggregate or a domain service announces it from an operation,
     * as a comma-separated list of event NAMES — so the name has to be resolved back to an id,
     * which is why this is not just a field read.
     */
    emissions: [
      ...operationEmissions(store, 'aggregates'),
      ...operationEmissions(store, 'domainServices'),
      // a use case emits an APPLICATION event as a step of its pipeline
      ...store.all('useCases').flatMap((uc) => nested(uc.steps)
        .filter((s) => s.type === 'PublishApplicationEvent' && s.applicationEventId)
        .map((s) => ({ sourceId: uc.id, domainEventId: String(s.applicationEventId) }))),
    ],

    useCaseEmissions: store.all('useCases').flatMap((uc) => nested(uc.steps)
      .filter((s) => s.type === 'PublishDomainEvent' && s.domainEventId)
      .map((s) => ({ sourceId: uc.id, domainEventId: String(s.domainEventId) }))),

    /** An aggregate naming another through a field of its state model. */
    aggregateReferences: aggregateReferences(store),

    descriptions: descriptions(store),
  } as Partial<ModuxModel>;
}

/** The call edges, all four read from the same walk over the same steps. */
function callEdges(store: ModelStore): Record<string, { sourceId: string; targetId: string }[]> {
  const out: Record<string, { sourceId: string; targetId: string }[]> =
    Object.fromEntries(CALL_EDGES.map((e) => [e.edge, []]));
  for (const useCase of store.all('useCases')) {
    for (const step of nested(useCase.steps)) {
      for (const kind of CALL_EDGES) {
        if (!kind.types.includes(String(step.type))) continue;
        const target = step[kind.field];
        if (target) out[kind.edge].push({ sourceId: useCase.id, targetId: String(target) });
      }
    }
  }
  return out;
}

/** `emits` is a comma-separated list of event NAMES; the canvas needs ids. */
function operationEmissions(store: ModelStore, type: string) {
  const idByName = new Map(store.all('domainEvents')
    .filter((e) => typeof e.name === 'string')
    .map((e) => [String(e.name).trim().toLowerCase(), e.id]));
  return store.all(type).flatMap((emitter) => nested(emitter.operations)
    .flatMap((op) => String(op.emits ?? '').split(','))
    .map((eventName) => idByName.get(eventName.trim().toLowerCase()))
    .filter((id): id is string => Boolean(id))
    .map((domainEventId) => ({ sourceId: emitter.id, domainEventId })));
}

/**
 * One aggregate referencing another, through a field of its state model whose type IS that
 * aggregate. Derived rather than declared: the reference is a modelling consequence, and asking
 * for it twice is asking for the two to disagree.
 */
function aggregateReferences(store: ModelStore) {
  const aggregateByModel = new Map(store.all('aggregates')
    .filter((a) => a.modelId)
    .map((a) => [String(a.modelId), a.id]));
  const out: { sourceAggregateId: string; targetAggregateId: string; label?: string }[] = [];
  for (const aggregate of store.all('aggregates')) {
    const model = store.get('models', str(aggregate.modelId));
    if (!model) continue;
    for (const field of nested(model.fields)) {
      const target = str(field.modelId) ? aggregateByModel.get(String(field.modelId)) : undefined;
      if (target && target !== aggregate.id) {
        out.push({ sourceAggregateId: aggregate.id, targetAggregateId: target, label: str(field.name) });
      }
    }
  }
  return out;
}

/** Every element's free-text description, by id — what the canvas shows on hover. */
function descriptions(store: ModelStore): Record<string, string> {
  const out: Record<string, string> = {};
  for (const type of store.types()) {
    for (const element of store.all(type)) {
      const description = str(element.description);
      if (description) out[element.id] = description;
    }
  }
  return out;
}

const name = (element: Element) => str(element.name) ?? element.id;
const str = (value: unknown) => (typeof value === 'string' && value ? value : undefined);
