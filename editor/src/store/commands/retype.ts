/**
 * Changing what an element IS — an aggregate that turns out to be an entity, a domain event that
 * should have been an integration event. The element keeps its id (so every view that shows it
 * keeps showing it) and moves to the other bucket, which on disk is a file moving directory.
 *
 * Two rules keep this from corrupting the model:
 *
 * - **A closed list.** Only conversions within a family make sense (structure, events, use case vs
 *   policy). An actor never becomes a read model; there is nothing to carry across.
 * - **Blocking, not rewriting.** If anything else points at the element through a type-specific
 *   field (a use-case step's `aggregateId`, an entity's parent…), the change is refused and the
 *   references are named: the user decides what they should point at. Type-agnostic references —
 *   views, notes, areas, ArchiMate relations — are by id only and carry over untouched. The same
 *   goes for the element's own content: a non-empty list the new type cannot hold (an aggregate's
 *   operations) blocks too, rather than vanish.
 *
 * What survives is the id, the name, the description, the fields the family shares (an event's
 * topic and delivery settings, a structure's model and invariants), and its place: ownership is
 * translated to the target's way of recording it (a context's list, an aggregate's list, or a
 * field on the element).
 */

import { asList, type Element, type ModelStore } from '../store.js';
import { CommandError, type Handler } from '../spec.js';
import { t } from '../../i18n/index.js';

interface Retype {
  /** Store bucket. */
  type: string;
  family: 'structure' | 'event' | 'behavior';
  /** Name the user reads. */
  label: string;
  /** use case vs policy share a bucket; the flag tells them apart. */
  policy?: boolean;
}

/** The closed list: every type that can be changed, keyed by the name commands use. */
export const RETYPES: Record<string, Retype> = {
  aggregate: { type: 'aggregates', family: 'structure', get label() { return t('store.retype.type.aggregate'); } },
  entity: { type: 'entities', family: 'structure', get label() { return t('store.retype.type.entity'); } },
  'value-object': { type: 'valueObjects', family: 'structure', get label() { return t('store.retype.type.valueObject'); } },
  'domain-event': { type: 'domainEvents', family: 'event', get label() { return t('store.retype.type.domainEvent'); } },
  'application-event': { type: 'applicationEvents', family: 'event', get label() { return t('store.retype.type.applicationEvent'); } },
  'integration-event': { type: 'integrationEvents', family: 'event', get label() { return t('store.retype.type.integrationEvent'); } },
  'use-case': { type: 'useCases', family: 'behavior', get label() { return t('store.retype.type.useCase'); }, policy: false },
  policy: { type: 'useCases', family: 'behavior', get label() { return t('store.retype.type.policy'); }, policy: true },
};

/** What `from` can be turned into (same family, not itself). */
export function retypeTargets(from: string): string[] {
  const source = RETYPES[from];
  if (!source) return [];
  return Object.keys(RETYPES).filter((k) => k !== from && RETYPES[k].family === source.family);
}

/** Fields carried across, per family — beyond id, name and description. */
const SHARED: Record<Retype['family'], string[]> = {
  structure: ['modelId', 'invariants'],
  event: ['topicName', 'serializationFormat', 'deadLetterQueueEnabled', 'deadLetterQueueName', 'replayable',
    'maxDeliveryAttempts', 'schemaVersion', 'compressionType'],
  behavior: [],
};

/** What a freshly created element of each type starts with (mirrors the add-* commands). */
const FRESH: Record<string, () => Element> = {
  aggregates: () => ({ eventSourced: false, invariants: [], operations: [], valueObjectIds: [] }) as unknown as Element,
  entities: () => ({ isCollection: false, invariants: [] }) as unknown as Element,
  valueObjects: () => ({ type: 'Record', valuesJson: '[]', fieldsJson: '[]', invariants: [] }) as unknown as Element,
  domainEvents: () => ({}) as Element,
  applicationEvents: () => ({}) as Element,
  integrationEvents: () => ({}) as Element,
};

/** The bounded-context list each context-owned type is recorded in (integration events name it themselves). */
const CONTEXT_LIST: Record<string, string> = {
  aggregates: 'aggregateIds', domainEvents: 'domainEventIds', applicationEvents: 'applicationEventIds',
};

/**
 * Where an element is referenced WITHOUT depending on its type — these keep working after the
 * change. Anything else blocks it. `self` slots are the ownership records this command rewrites.
 */
const TYPE_AGNOSTIC = new Set(['views', 'notes', 'areas', 'archimateRelations', 'looseElements']);

export const RETYPE_COMMANDS: Record<string, Handler> = {
  'change-element-type': (store, command) => {
    const id = String(command.id ?? '');
    const from = RETYPES[String(command.from ?? '')];
    const to = RETYPES[String(command.to ?? '')];
    if (!from || !to) throw new CommandError(t('store.retype.unknownTypes', { from: String(command.from), to: String(command.to) }));
    if (from.family !== to.family || from === to) {
      throw new CommandError(t('store.retype.incompatible', { from: from.label.toLowerCase(), to: to.label.toLowerCase() }));
    }
    const element = store.get(from.type, id);
    if (!element) throw new CommandError(t('store.unknown.element', { id: `${from.type}/${id}` }));

    // Same bucket (use case ↔ policy): it is a flag.
    if (from.type === to.type) {
      store.patch(from.type, id, { policy: to.policy === true });
      return;
    }

    const blockers = references(store, id, from.type);
    if (blockers.length) {
      const shown = blockers.slice(0, 5).join(', ') + (blockers.length > 5 ? t('store.retype.andMore', { count: blockers.length - 5 }) : '');
      throw new CommandError(t('store.retype.referenced', { name: name(element), refs: shown }));
    }
    const lost = Object.entries(element)
      .filter(([k, v]) => Array.isArray(v) && v.length > 0 && !SHARED[to.family].includes(k) && !(k in FRESH[to.type]()))
      .map(([k]) => k);
    if (lost.length) {
      throw new CommandError(t('store.retype.wouldLose', { name: name(element), fields: lost.join(', ') }));
    }

    // Where it lives now, read before the move.
    const ownerAggregate = aggregateOf(store, from.type, element);
    const ownerContext = contextOf(store, from.type, element) ?? (ownerAggregate ? aggregateContext(store, ownerAggregate) : undefined);

    // Leave the old place…
    if (CONTEXT_LIST[from.type]) store.removeFromAllLists('boundedContexts', CONTEXT_LIST[from.type], id);
    if (from.type === 'valueObjects') store.removeFromAllLists('aggregates', 'valueObjectIds', id);
    store.remove(from.type, id);

    // …become the new type…
    const next: Element = { ...FRESH[to.type](), id } as Element;
    for (const k of ['name', 'description', ...SHARED[to.family]]) if (element[k] !== undefined) next[k] = element[k];
    if (to.family === 'event') {
      // the payload model is `modelId` on domain/application events, `payloadModelId` on integration ones
      const model = element.modelId ?? element.payloadModelId;
      if (model !== undefined) next[to.type === 'integrationEvents' ? 'payloadModelId' : 'modelId'] = model;
    }
    if (to.type === 'entities') next.parentAggregateId = ownerAggregate ?? null;
    if (to.type === 'integrationEvents') next.boundedContextId = ownerContext ?? null;
    store.put(to.type, next);

    // …and take the equivalent place.
    if (CONTEXT_LIST[to.type] && ownerContext) store.addToList('boundedContexts', ownerContext, CONTEXT_LIST[to.type], id);
    if (to.type === 'valueObjects' && ownerAggregate) store.addToList('aggregates', ownerAggregate, 'valueObjectIds', id);
  },
};

/**
 * Every place that points at `id` through a type-specific field, as `type/elementId.path`.
 * Skips the element itself, the type-agnostic buckets, and the ownership slots this command
 * rewrites (a context's list for the source type, an aggregate's value-object list).
 */
function references(store: ModelStore, id: string, sourceType: string): string[] {
  const found: string[] = [];
  const own = (type: string, path: string) =>
    (type === 'boundedContexts' && path === CONTEXT_LIST[sourceType])
    || (type === 'aggregates' && sourceType === 'valueObjects' && path === 'valueObjectIds');
  for (const type of store.types()) {
    if (TYPE_AGNOSTIC.has(type)) continue;
    for (const el of store.all(type)) {
      if (type === sourceType && el.id === id) continue;
      walk(el, '', (path) => { if (!own(type, path.replace(/\[\d+\]$/, ''))) found.push(`${type}/${el.id}${path ? '.' + path : ''}`); });
    }
  }
  return found;

  function walk(value: unknown, path: string, hit: (path: string) => void): void {
    if (value === id && path !== 'id') { hit(path); return; }
    if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`, hit));
    else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) if (!(path === '' && k === 'id')) walk(v, path ? `${path}.${k}` : k, hit);
    }
  }
}

function aggregateOf(store: ModelStore, type: string, el: Element): string | undefined {
  if (type === 'entities') return str(el.parentAggregateId);
  if (type === 'valueObjects') return store.all('aggregates').find((a) => asList(a.valueObjectIds).includes(el.id))?.id;
  return undefined;
}

function contextOf(store: ModelStore, type: string, el: Element): string | undefined {
  const declared = str(el.boundedContextId);
  if (declared) return declared;
  const list = CONTEXT_LIST[type];
  return list ? store.all('boundedContexts').find((c) => asList(c[list]).includes(el.id))?.id : undefined;
}

const aggregateContext = (store: ModelStore, aggregateId: string) =>
  store.all('boundedContexts').find((c) => asList(c.aggregateIds).includes(aggregateId))?.id;

const str = (value: unknown) => (typeof value === 'string' && value ? value : undefined);
const name = (el: Element) => str(el.name) ?? el.id;
