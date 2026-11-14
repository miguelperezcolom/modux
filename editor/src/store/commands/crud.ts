/**
 * Relating a consumer to an aggregate, which is what implies a CRUD.
 *
 * Four gestures land here — an actor who may run it, a UI app that shows it, an external system
 * that integrates with it, another bounded context that reads it — and they all reinforce ONE
 * derived core (`scaffold.ts`) rather than each minting its own. What differs between them is
 * only how far the derivation goes: an actor needs the use cases, an integration needs the REST
 * contract on top. Ported from `EditorApiController`.
 */

import { asList, nested, type Element, type ModelStore } from '../store.js';
import {
  crudApi, crudApiId, crudUseCaseIds, crudUseCases, lifecycleEvents, listingQuery, listingQueryId,
} from '../scaffold.js';
import { CommandError, type Handler } from '../spec.js';
import { t } from '../../i18n/index.js';

export const CRUD_COMMANDS: Record<string, Handler> = {
  /** An actor may run the aggregate's CRUD. */
  'add-actor-crud': (store, command) => {
    const actor = store.get('roles', String(command.sourceId));
    if (!actor) throw new CommandError(t('store.unknown.actor', { id: command.sourceId }));
    const aggregate = requireAggregate(store, command.targetId);
    ensureCrudCore(store, aggregate);
    for (const id of crudUseCaseIds(aggregate.id)) {
      store.addToList('roles', actor.id, 'allowedUseCaseIds', id);
    }
  },

  /**
   * The actor stops being allowed, and the derived use cases leave WITH the last consumer —
   * unless something else has since come to depend on them, in which case they stay.
   */
  'remove-actor-crud': (store, command) => {
    const aggregate = requireAggregate(store, command.targetId);
    const crudIds = crudUseCaseIds(aggregate.id);
    const actorId = String(command.sourceId);
    for (const id of crudIds) store.removeFromList('roles', actorId, 'allowedUseCaseIds', id);

    const calledByStep = new Set(store.all('useCases')
      .flatMap((uc) => nested(uc.steps))
      .map((step) => step.useCaseId)
      .filter(Boolean) as string[]);
    const allowedElsewhere = new Set(store.all('roles')
      .filter((r) => r.id !== actorId)
      .flatMap((r) => asList(r.allowedUseCaseIds)));
    for (const id of crudIds) {
      if (calledByStep.has(id) || allowedElsewhere.has(id)) continue;
      store.removeFromAllLists('boundedContexts', 'useCaseIds', id);
      store.remove('useCases', id);
    }
  },

  /** Another bounded context integrates with the aggregate: it needs the contract, not the trio. */
  'add-context-crud': (store, command) => {
    if (!store.has('boundedContexts', String(command.sourceId))) {
      throw new CommandError(t('store.unknown.boundedContext', { id: command.sourceId }));
    }
    ensureCrudApi(store, requireAggregate(store, command.targetId));
  },

  /** Nothing to undo: the API is shared, so unrelating one consumer leaves it standing. */
  'remove-context-crud': () => {},

  /**
   * An external system integrates with the aggregate through its CRUD API, and its calls arrive
   * through an inbound anti-corruption layer — the translation belongs on our side.
   */
  'add-external-crud': (store, command) => {
    const external = store.get('externalSystems', String(command.sourceId));
    if (!external) throw new CommandError(t('store.unknown.externalSystem', { id: command.sourceId }));
    const aggregate = requireAggregate(store, command.targetId);
    const apiId = ensureCrudApi(store, aggregate);
    const context = ensureCrudCore(store, aggregate);
    wireInboundAcl(store, context, external, crudUseCaseIds(aggregate.id));
    store.addToList('externalSystems', external.id, 'dependsOnApiIds', apiId);
  },

  'remove-external-crud': (store, command) => {
    store.removeFromList('externalSystems', String(command.sourceId), 'dependsOnApiIds',
      crudApiId(String(command.targetId)));
  },
};

/**
 * The consumer-agnostic core: the trio and its lifecycle events, owned by the aggregate's
 * bounded context. Idempotent, and returns that context because every caller needs it next.
 */
function ensureCrudCore(store: ModelStore, aggregate: Element): Element {
  const context = store.findByListMember('boundedContexts', 'aggregateIds', aggregate.id);
  if (!context) {
    throw new CommandError(
      t('store.crud.aggregateWithoutContext', { id: aggregate.id }));
  }
  for (const useCase of crudUseCases(aggregate)) {
    if (!store.has('useCases', useCase.id)) store.put('useCases', useCase);
    store.addToList('boundedContexts', context.id, 'useCaseIds', useCase.id);
  }
  for (const event of lifecycleEvents(aggregate)) {
    if (!store.has('domainEvents', event.id)) store.put('domainEvents', { ...event });
    store.addToList('boundedContexts', context.id, 'domainEventIds', event.id);
  }
  return store.get('boundedContexts', context.id)!;
}

/** The core plus the listing query and the REST contract. Returns the API's id. */
function ensureCrudApi(store: ModelStore, aggregate: Element): string {
  const context = ensureCrudCore(store, aggregate);
  if (!store.has('queryServices', listingQueryId(aggregate.id))) {
    store.put('queryServices', listingQuery(aggregate, context.id));
  }
  const apiId = crudApiId(aggregate.id);
  if (!store.has('apis', apiId)) store.put('apis', crudApi(aggregate, context.id));
  return apiId;
}

/** One inbound ACL per external system, carrying every use case it may reach. */
function wireInboundAcl(
  store: ModelStore, context: Element, external: Element, useCaseIds: string[],
): void {
  const acls = nested(context.acls);
  const existing = acls.find((a) =>
    a.externalSystem === external.id && String(a.direction).toUpperCase() === 'INBOUND');
  if (existing) {
    const translated = asList(existing.translatedUseCaseIds);
    const missing = useCaseIds.filter((id) => !translated.includes(id));
    if (!missing.length) return;
    store.patch('boundedContexts', context.id, {
      acls: acls.map((a) => (a === existing
        ? { ...a, translatedUseCaseIds: [...translated, ...missing] } : a)),
    });
    return;
  }
  store.patch('boundedContexts', context.id, {
    acls: [...acls, {
      id: `acl-${external.id}-${context.id}`,
      name: `Acl${capitalize(String(external.name ?? external.id))}`,
      externalSystem: external.id,
      direction: 'INBOUND',
      translatedDomainEventIds: [],
      translatedUseCaseIds: [...useCaseIds],
    }],
  });
}

function requireAggregate(store: ModelStore, id: unknown): Element {
  const aggregate = store.get('aggregates', String(id));
  if (!aggregate) throw new CommandError(t('store.unknown.aggregate', { id: String(id) }));
  return aggregate;
}

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

/** Element shapes this block creates, for the schema-defaults check in tests. */
export const CRUD_TYPES: string[] = ['useCases', 'domainEvents', 'queryServices', 'apis'];
