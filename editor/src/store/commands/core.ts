/**
 * The core DDD / architecture command block: bounded contexts, aggregates and
 * what hangs off them, plus the strategic relations and the canvas furniture.
 *
 * Ported from `EditorApiController`'s handlers. Two deliberate departures from
 * what that file does today, both target state per `docs/design/ide-plugin.md`:
 *
 * - Context map relations are a top-level type (`contextMapRelations`), not a
 *   list inside the project — so a relation is one file, like every other
 *   element, and drawing one stops touching the project's file.
 * - There is no "current project" to look up: a repository is one project.
 */

import { asList, type Element, type ModelStore } from '../store.js';
import {
  add,
  addNested,
  CommandError,
  type Handler,
  remove,
  removeNested,
  setField,
  setNested,
} from '../spec.js';

/** A bounded context is born with its main module; the module is what a service deploys. */
const mainModuleId = (boundedContextId: string) => `${boundedContextId}-main`;

/** Give the context its main module and let the single service deploy it. */
function wireMainModule(boundedContextId: string, store: ModelStore): void {
  const moduleId = mainModuleId(boundedContextId);
  const context = store.get('boundedContexts', boundedContextId);
  if (!store.has('modules', moduleId)) {
    store.put('modules', {
      id: moduleId,
      name: context?.name ?? boundedContextId,
      boundedContextId,
      main: true,
    });
  }
  const alreadyDeployed = store.all('services')
    .some((s) => asList(s.moduleIds).includes(moduleId));
  if (alreadyDeployed) return;
  const service = store.all('services')[0];
  if (service) store.addToList('services', service.id, 'moduleIds', moduleId);
}

/**
 * Where a note's target belongs. An edge ref carries «->» and is a presentation coordinate, not
 * a model reference — it names two endpoints in a view, and nothing resolves it as an id.
 */
const listForTarget = (target: string) => (target.includes('->') ? 'edgeRefs' : 'targetIds');

/** Owners an invariant may hang from, in resolution order. */
const INVARIANT_OWNERS = ['aggregates', 'valueObjects', 'entities'];

/** The stub state model an aggregate is born with, so it is complete from birth. */
const stateModelId = (aggregateId: string) => `model-${aggregateId.replace(/^agg-/, '')}`;

/**
 * Context-scoped store types → the list a bounded context keeps their ids in. No list: the element
 * names its context itself (`boundedContextId`).
 */
const CONTEXT_MEMBERSHIP: Record<string, { list?: string }> = {
  aggregates: { list: 'aggregateIds' },
  useCases: { list: 'useCaseIds' },
  domainEvents: { list: 'domainEventIds' },
  applicationEvents: { list: 'applicationEventIds' },
  domainServices: { list: 'domainServiceIds' },
  readModels: { list: 'readModelIds' },
  projections: { list: 'projectionIds' },
  integrationEvents: {},
  queryServices: {},
};

export const CORE_COMMANDS: Record<string, Handler> = {
  // ---- bounded contexts --------------------------------------------------

  'add-boundedContext': add({
    type: 'boundedContexts',
    init: (c) => ({
      subdomainType: c.subdomainType ?? null,
      aggregateIds: [],
      useCaseIds: [],
      valueObjectIds: [],
    }),
    after: (id, store) => wireMainModule(id, store),
  }),

  'remove-boundedContext': (store, command) => {
    const id = String(command.id);
    const context = store.get('boundedContexts', id);
    if (!context) return;
    if (asList(context.aggregateIds).length > 0) {
      throw new CommandError(`El bounded context ${id} tiene agregados; bórralos primero`);
    }
    // The strategic relations that mention it go with it.
    for (const relation of store.all('contextMapRelations')) {
      if (relation.sourceBoundedContextId === id || relation.targetBoundedContextId === id) {
        store.remove('contextMapRelations', relation.id);
      }
    }
    // So do its modules — services let go of them first.
    for (const module of store.all('modules').filter((m) => m.boundedContextId === id)) {
      store.removeFromAllLists('services', 'moduleIds', module.id);
      store.remove('modules', module.id);
    }
    store.remove('boundedContexts', id);
  },

  // ---- systems (group bounded contexts, C4 landscape) --------------------

  'add-system': add({
    type: 'systems',
    init: (c) => ({ parentSystemId: c.parentSystemId ?? null }),
  }),

  'remove-system': remove({
    type: 'systems',
    // a system does not leave while it still groups contexts (or nested systems) — detach first
    guards: [
      {
        type: 'boundedContexts', field: 'parentSystemId',
        message: (id) => `El sistema ${id} agrupa contextos; sácalos primero`,
      },
      {
        type: 'systems', field: 'parentSystemId',
        message: (id) => `El sistema ${id} contiene subsistemas; sácalos primero`,
      },
    ],
  }),

  // Put a bounded context inside a system (parentSystemId: null detaches it back to top level).
  'set-context-system': setField({
    type: 'boundedContexts',
    field: 'parentSystemId',
    from: 'parentSystemId',
    map: (value, _command, store) => {
      if (value && !store.has('systems', value)) {
        throw new CommandError(`Sistema desconocido: ${value}`);
      }
      return value ?? null;
    },
  }),

  'add-cdc': add({ type: 'cdcs' }),
  'remove-cdc': remove({ type: 'cdcs' }),

  // Nest a system inside another (parentSystemId: null detaches it). No self-parenting.
  'set-system-parent': setField({
    type: 'systems',
    field: 'parentSystemId',
    from: 'parentSystemId',
    map: (value, command, store) => {
      if (value && value === command.id) throw new CommandError('Un sistema no puede contenerse a sí mismo');
      if (value && !store.has('systems', value)) throw new CommandError(`Sistema desconocido: ${value}`);
      return value ?? null;
    },
  }),

  // ---- aggregates and their contents -------------------------------------

  'add-aggregate': add({
    type: 'aggregates',
    // Optional owner: an aggregate can be born free-standing (dropped on the canvas) and be tied to
    // a context later by drawing a composition edge — see set-aggregate-context.
    parent: { type: 'boundedContexts', from: 'boundedContextId', list: 'aggregateIds', required: false },
    stubs: (c) => [{
      type: 'models',
      element: { id: stateModelId(String(c.id)), name: c.name, fields: [], mappings: [] },
    }],
    init: (c) => ({
      modelId: stateModelId(String(c.id)),
      eventSourced: false,
      invariants: [],
      operations: [],
      valueObjectIds: [],
    }),
  }),

  'remove-aggregate': remove({
    type: 'aggregates',
    guards: [{
      type: 'entities',
      field: 'parentAggregateId',
      message: (id) => `El agregado ${id} tiene entidades; bórralas primero`,
    }],
    parent: { type: 'boundedContexts', from: 'boundedContextId', list: 'aggregateIds' },
  }),

  /** Tie a (possibly free-standing) aggregate to a bounded context, or detach it (no target). */
  'set-aggregate-context': (store, command) => {
    const id = String(command.id);
    if (!store.has('aggregates', id)) throw new CommandError(`Agregado desconocido: ${id}`);
    const target = command.boundedContextId as string | undefined;
    if (target && !store.has('boundedContexts', target)) {
      throw new CommandError(`Contexto desconocido: ${target}`);
    }
    store.removeFromAllLists('boundedContexts', 'aggregateIds', id);
    if (target) store.addToList('boundedContexts', target, 'aggregateIds', id);
  },

  'add-entity': add({
    type: 'entities',
    // Optional owner: an entity can be born free-standing and tied to an aggregate later
    // (set-entity-aggregate) by drawing a composition edge.
    parent: { type: 'aggregates', from: 'aggregateId', required: false },
    init: (c) => ({ parentAggregateId: c.aggregateId ?? null, isCollection: false, invariants: [] }),
  }),

  'remove-entity': remove({ type: 'entities' }),

  'set-entity-aggregate': setField({
    type: 'entities',
    field: 'parentAggregateId',
    from: 'aggregateId',
    map: (value, _command, store) => {
      if (!store.has('aggregates', value)) {
        throw new CommandError(`Agregado desconocido: ${value}`);
      }
      return value;
    },
  }),

  'add-value-object': add({
    type: 'valueObjects',
    // Optional owner: free-standing, tied to an aggregate later via set-value-object-aggregate.
    parent: { type: 'aggregates', from: 'aggregateId', list: 'valueObjectIds', required: false },
    init: (c) => ({
      type: c.type && String(c.type).trim() ? c.type : 'Record',
      valuesJson: '[]',
      fieldsJson: '[]',
      invariants: [],
    }),
  }),

  'remove-value-object': remove({
    type: 'valueObjects',
    parent: { type: 'aggregates', from: 'aggregateId', list: 'valueObjectIds' },
  }),

  'set-value-object-aggregate': (store, command) => {
    const id = String(command.id);
    if (!store.has('valueObjects', id)) throw new CommandError(`Value object desconocido: ${id}`);
    const target = command.aggregateId as string | undefined;
    if (target && !store.has('aggregates', target)) {
      throw new CommandError(`Agregado desconocido: ${target}`);
    }
    store.removeFromAllLists('aggregates', 'valueObjectIds', id);
    if (target) store.addToList('aggregates', target, 'valueObjectIds', id);
  },

  // ---- invariants: nested, with three possible owners ---------------------

  'add-invariant': addNested({
    owners: INVARIANT_OWNERS,
    list: 'invariants',
    ownerFrom: ['ownerId', 'aggregateId'],
    init: () => ({ conditions: [] }),
  }),

  'remove-invariant': removeNested({ owners: INVARIANT_OWNERS, list: 'invariants' }),

  'set-invariant-condition': setNested({
    owners: INVARIANT_OWNERS,
    list: 'invariants',
    patch: (invariant, command) => {
      const expression = String(command.expression ?? '').trim();
      const errorMessage = String(command.errorMessage ?? '').trim();
      const blank = !expression && !errorMessage;
      return {
        conditions: blank ? [] : [{
          id: `${invariant.id}-cond`,
          expression: command.expression ?? null,
          warning: false,
          errorMessage: command.errorMessage ?? null,
        }],
      };
    },
  }),

  // ---- domain surface ----------------------------------------------------

  'add-domain-event': add({ type: 'domainEvents', parent: { type: 'aggregates', from: 'aggregateId', required: false } }),
  'remove-domain-event': remove({ type: 'domainEvents' }),
  'add-application-event': add({ type: 'applicationEvents' }),
  'remove-application-event': remove({ type: 'applicationEvents' }),
  'add-integration-event': add({
    type: 'integrationEvents',
    init: (c) => ({ boundedContextId: c.boundedContextId ?? null }),
  }),
  'remove-integration-event': remove({ type: 'integrationEvents' }),
  'add-domain-service': add({ type: 'domainServices' }),
  'remove-domain-service': remove({ type: 'domainServices' }),
  'add-read-model': add({ type: 'readModels', init: (c) => ({ aggregateId: c.aggregateId ?? null }) }),
  'remove-read-model': remove({ type: 'readModels' }),

  'add-use-case': add({
    type: 'useCases',
    parent: { type: 'boundedContexts', from: 'boundedContextId', list: 'useCaseIds', required: false },
    init: (c) => ({ policy: c.policy ?? false, steps: [] }),
  }),

  'remove-use-case': remove({
    type: 'useCases',
    parent: { type: 'boundedContexts', from: 'boundedContextId', list: 'useCaseIds' },
    detach: [{ type: 'roles', field: 'allowedUseCaseIds' }],
  }),

  /** Tie a free-standing use case to a context, or detach it (no target). */
  'set-use-case-context': (store, command) => {
    const id = String(command.id);
    if (!store.has('useCases', id)) throw new CommandError(`Caso de uso desconocido: ${id}`);
    const target = command.boundedContextId as string | undefined;
    if (target && !store.has('boundedContexts', target)) {
      throw new CommandError(`Contexto desconocido: ${target}`);
    }
    store.removeFromAllLists('boundedContexts', 'useCaseIds', id);
    if (target) store.addToList('boundedContexts', target, 'useCaseIds', id);
  },

  /**
   * Move a context-scoped element (aggregate, use case, event, read model, service, projection…) to
   * a bounded context, or detach it (no target). Ownership is recorded two ways depending on the
   * type — the context lists the id, or the element names the context — and the projection reads
   * both, with the element's own field winning. So both are rewritten: the id leaves every
   * context's list and joins the target's, and a `boundedContextId` the element carries is set too,
   * or a stale one would keep it where it was. What the canvas emits when an element is dropped
   * into a context.
   */
  'set-element-context': (store, command) => {
    const type = String(command.type ?? '');
    const spec = CONTEXT_MEMBERSHIP[type];
    if (!spec) throw new CommandError(`set-element-context no soportado para: ${type}`);
    const id = String(command.id);
    const element = store.get(type, id);
    if (!element) throw new CommandError(`Elemento desconocido: ${type}/${id}`);
    const target = (command.boundedContextId as string | undefined) || undefined;
    if (target && !store.has('boundedContexts', target)) throw new CommandError(`Contexto desconocido: ${target}`);
    if (spec.list) {
      store.removeFromAllLists('boundedContexts', spec.list, id);
      if (target) store.addToList('boundedContexts', target, spec.list, id);
    }
    if (!spec.list || 'boundedContextId' in element) store.patch(type, id, { boundedContextId: target ?? null });
  },

  // ---- strategic relations (top-level, one file each) ---------------------

  'add-relation': (store, command) => {
    const source = String(command.sourceId);
    const target = String(command.targetId);
    const duplicate = store.all('contextMapRelations').some(
      (r) => r.sourceBoundedContextId === source && r.targetBoundedContextId === target);
    if (duplicate) return;
    store.put('contextMapRelations', {
      id: `rel-${source}-${target}`,
      sourceBoundedContextId: source,
      targetBoundedContextId: target,
      type: command.type ?? null,
      upstreamRoles: [],
    });
  },

  'remove-relation': remove({ type: 'contextMapRelations' }),
  'set-relation-type': setField({ type: 'contextMapRelations', field: 'type' }),

  'add-archimate-relation': add({
    type: 'archimateRelations',
    init: (c) => ({ sourceId: c.sourceId, targetId: c.targetId, type: c.type, nature: c.nature ?? null }),
  }),

  'remove-archimate-relation': remove({ type: 'archimateRelations' }),
  'set-archimate-relation-type': setField({ type: 'archimateRelations', field: 'type' }),
  'set-archimate-relation-nature': setField({ type: 'archimateRelations', field: 'nature' }),

  'invert-archimate-relation': (store, command) => {
    const relation = store.get('archimateRelations', String(command.id));
    if (!relation) return;
    store.patch('archimateRelations', relation.id, {
      sourceId: relation.targetId,
      targetId: relation.sourceId,
    });
  },

  // ---- canvas furniture --------------------------------------------------

  // a note IS its text, and the command carries that text in `name` — the store has no `name`
  'add-note': (store, command) => {
    const id = String(command.id);
    if (store.has('notes', id)) return;
    store.put('notes', { id, text: command.name ?? null, targetIds: [], edgeRefs: [] });
  },

  'remove-note': remove({ type: 'notes' }),
  'add-area': add({ type: 'areas', init: (c) => ({ title: c.title ?? null, memberIds: [] }) }),
  'remove-area': remove({ type: 'areas' }),
  // the address is stored as `url`; `uri` is only what the command calls it
  'add-url': add({ type: 'urls', init: (c) => ({ url: c.uri ?? null }) }),

  /** The url goes, and every service that answered at it stops claiming to. */
  'remove-url': remove({ type: 'urls', detach: [{ type: 'services', field: 'urlIds' }] }),

  /**
   * A note annotates either an element (a plain id) or a relation (an edge ref carrying «->»),
   * and the two are kept in different lists — an edge ref is not an element id and must not end
   * up somewhere that resolves ids.
   */
  'note-attach': (store, command) => {
    const note = store.get('notes', String(command.id));
    if (!note) throw new CommandError(`Nota desconocida: ${command.id}`);
    const target = String(command.targetId);
    store.addToList('notes', note.id, listForTarget(target), target);
  },

  'note-detach': (store, command) => {
    const note = store.get('notes', String(command.id));
    if (!note) return;
    const target = String(command.targetId);
    store.removeFromList('notes', note.id, listForTarget(target), target);
  },

  // ---- topology ----------------------------------------------------------

  'add-module': add({
    type: 'modules',
    parent: { type: 'boundedContexts', from: 'boundedContextId', required: false },
    init: (c) => ({ boundedContextId: c.boundedContextId ?? null, main: false, elementIds: [] }),
  }),

  'remove-module': (store, command) => {
    const id = String(command.id);
    store.removeFromAllLists('services', 'moduleIds', id);
    store.remove('modules', id);
  },

  'add-service': add({
    type: 'services',
    init: () => ({ moduleIds: [] }),
    // Contexts drawn before any service exists have main modules nothing deploys: the new
    // service takes them, as it would have had it been there first (see wireMainModule).
    after: (id, store) => {
      const deployed = new Set(store.all('services').flatMap((s) => asList(s.moduleIds)));
      for (const m of store.all('modules')) {
        if (m.main === true && !deployed.has(m.id)) store.addToList('services', id, 'moduleIds', m.id);
      }
      // the generator builds the services the project lists — one drawn and not listed is ignored
      const project = store.all('projects')[0];
      if (project) store.addToList('projects', project.id, 'serviceIds', id);
    },
  }),
  'remove-service': remove({ type: 'services' }),
  'add-service-module': (store, command) => {
    const service = String(command.id);
    if (!store.has('services', service)) throw new CommandError(`Servicio desconocido: ${service}`);
    // A module is deployed by exactly one service.
    store.removeFromAllLists('services', 'moduleIds', String(command.targetId));
    store.addToList('services', service, 'moduleIds', String(command.targetId));
  },
  'remove-service-module': (store, command) => {
    store.removeFromList('services', String(command.id), 'moduleIds', String(command.targetId));
  },
};

/** Element shapes this block creates, for the schema-defaults check in tests. */
export const CORE_TYPES: string[] = [
  'boundedContexts', 'systems', 'cdcs', 'aggregates', 'entities', 'valueObjects', 'models', 'modules', 'services',
  'domainEvents', 'applicationEvents', 'integrationEvents', 'domainServices', 'readModels', 'useCases',
  'contextMapRelations', 'archimateRelations', 'notes', 'areas', 'urls',
];

export type { Element };
