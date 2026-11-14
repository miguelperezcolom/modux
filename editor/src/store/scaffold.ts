/**
 * The deterministic elements a CRUD implies.
 *
 * Relating anything to an aggregate — an actor who may run it, a screen that shows it, an
 * external system that integrates with it, another context that reads it — implies the same
 * create/update/delete trio, the same three lifecycle events, the same listing query and the same
 * REST contract. They are derived here from the aggregate alone, with ids that depend only on it,
 * so every one of those gestures REINFORCES one shared core instead of minting a parallel copy.
 *
 * Determinism is the whole design: re-deriving updates in place, and «already related» is just
 * `store.has(...)`. Ported from `application/usecases/aggregate/scaffold/`.
 */

import type { Element } from './store.js';
import { slug } from '../ids.js';
import { t } from '../i18n/index.js';

const cap = (value: unknown) => {
  const text = String(value ?? '');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
};

// ---- lifecycle events -------------------------------------------------------

/**
 * The participle follows the aggregate NAME's gender — «Reserva» is Creada, «Pedido» is Creado.
 * It matches the hand-authored samples, and getting it wrong is the kind of thing a reader
 * notices immediately in a generated event name.
 */
const feminine = (name: unknown) => String(name ?? '').trim().endsWith('a');

const participle = (aggregateName: unknown, stem: string) =>
  stem + (feminine(aggregateName) ? 'a' : 'o');

export interface LifecycleEvent {
  id: string;
  name: string;
}

/** create → Creado/a, update → Modificado/a, delete → Eliminado/a. */
export function lifecycleEvents(aggregate: Element): LifecycleEvent[] {
  return ['Cread', 'Modificad', 'Eliminad'].map((stem) => {
    const suffix = participle(aggregate.name, stem);
    return { id: `ev-${aggregate.id}${suffix}`, name: `${aggregate.name}${suffix}` };
  });
}

/** The step a CRUD use case ends with: announcing what it just did. */
const publishStep = (event: LifecycleEvent) => ({
  id: `step-publish-${event.id}`,
  name: `publish${event.name}`,
  type: 'PublishDomainEvent',
  domainEventId: event.id,
});

// ---- the use-case trio ------------------------------------------------------

/** The trio's ids. Enough to allow an actor on them, or to spot that they already exist. */
export function crudUseCaseIds(aggregateId: string): string[] {
  const suffix = cap(aggregateId);
  return [`uc-crear${suffix}`, `uc-actualizar${suffix}`, `uc-eliminar${suffix}`];
}

/** Create/update/delete, each with its persistence pipeline and its event already wired. */
export function crudUseCases(aggregate: Element): Element[] {
  const events = lifecycleEvents(aggregate);
  const ids = crudUseCaseIds(aggregate.id);
  const nameCap = cap(aggregate.name);
  const save = {
    id: 'step-save', name: `save${nameCap}`, type: 'SaveAggregate', aggregateId: aggregate.id,
  };
  const read = {
    id: 'step-read', name: `read${nameCap}`, type: 'ReadAggregate', aggregateId: aggregate.id,
  };
  return [
    useCase(ids[0], `Crear${nameCap}`, aggregate.modelId, [save, publishStep(events[0])]),
    useCase(ids[1], `Actualizar${nameCap}`, aggregate.modelId, [read, save, publishStep(events[1])]),
    // delete takes no input model: the id is the whole request
    useCase(ids[2], `Eliminar${nameCap}`, null, [{
      id: 'step-delete',
      name: `delete${nameCap}`,
      type: 'Custom',
      aggregateId: aggregate.id,
      description: t('store.default.deleteAggregateDescription', { name: nameCap }),
    }, publishStep(events[2])]),
  ];
}

const useCase = (id: string, name: string, inputModelId: unknown, steps: Element[]): Element => ({
  id, name, transactional: true, inputModelId: inputModelId ?? null, steps,
});

// ---- the listing query ------------------------------------------------------

export const listingQueryId = (aggregateId: string) => `qs-crud-${aggregateId}`;
export const listOperationId = (aggregateId: string) => `${listingQueryId(aggregateId)}-list`;

/**
 * The ONE canonical listing of an aggregate, shared by every surface that lists it. The UI used
 * to key this on the page and the API on the aggregate, which produced two queries doing the same
 * thing over the same data.
 */
export const listingQuery = (aggregate: Element, boundedContextId: string): Element => ({
  id: listingQueryId(aggregate.id),
  name: `${cap(aggregate.name)}Queries`,
  boundedContextId,
  description: t('store.default.queriesDescription', { name: aggregate.name }),
  operations: [{
    id: listOperationId(aggregate.id),
    name: 'list',
    description: t('store.default.listDescription', { name: aggregate.name }),
    responseModelId: aggregate.modelId ?? null,
    cardinality: 'Page',
  }],
});

// ---- the REST contract ------------------------------------------------------

export const crudApiId = (aggregateId: string) => `api-crud-${aggregateId}`;

/**
 * The CRUD API. Its operations REST ON the trio and the listing query rather than restating
 * them: the API is a contract over behaviour that already exists.
 */
export function crudApi(aggregate: Element, boundedContextId: string): Element {
  const ids = crudUseCaseIds(aggregate.id);
  const apiId = crudApiId(aggregate.id);
  const model = aggregate.modelId ?? null;
  // the path is public contract: it reads after the aggregate's NAME, not its id (a palette-minted
  // id is a timestamp). Mirrored in CrudApi.java.
  const base = `/${slug(String(aggregate.name ?? '')) || aggregate.id}`;
  const nameCap = cap(aggregate.name);
  const create = operation(`${apiId}-create`, `Crear${nameCap}`, 'POST', base,
    boundedContextId, { targetUseCaseId: ids[0], requestModelId: model, responseModelId: model });
  const update = operation(`${apiId}-update`, `Actualizar${nameCap}`, 'PUT', `${base}/{id}`,
    boundedContextId, { targetUseCaseId: ids[1], requestModelId: model, responseModelId: model });
  const remove = operation(`${apiId}-delete`, `Eliminar${nameCap}`, 'DELETE', `${base}/{id}`,
    boundedContextId, { targetUseCaseId: ids[2] });
  const list = operation(`${apiId}-list`, `Listar${nameCap}`, 'GET', base, boundedContextId, {
    responseModelId: model,
    targetQueryServiceId: listingQueryId(aggregate.id),
    targetQueryOperationId: listOperationId(aggregate.id),
  });
  return {
    id: apiId,
    name: `${nameCap}API`,
    description: t('store.default.crudApiDescription', { name: aggregate.name }),
    operations: [create, update, remove, list],
    implementedByBoundedContextIds: [boundedContextId],
    operationImplementations: [0, 1, 2].map((i) => ({
      apiOperationId: [create, update, remove][i].id,
      boundedContextId,
      useCaseId: ids[i],
    })),
  };
}

const operation = (
  id: string, name: string, httpMethod: string, path: string,
  targetBoundedContextId: string, rest: Record<string, unknown>,
): Element => ({ id, name, httpMethod, path, targetBoundedContextId, ...rest });
