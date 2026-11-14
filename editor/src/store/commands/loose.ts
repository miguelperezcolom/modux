/**
 * Free-standing (loose) nested elements — operations, invariants, fields and use-case steps.
 *
 * These four normally live INSIDE their parent (an aggregate's operations, an owner's invariants, a
 * model's fields, a use case's steps), so they cannot exist owner-less there. To let them be created
 * on the canvas and associated later, a loose one lives in its own top-level `looseElements` bucket
 * (which the Java generator ignores, like mockups) until a composition edge ADOPTS it — moving it
 * into the parent's nested array, the shape the generator already reads. Adoption reuses the same id,
 * so the node never jumps.
 */

import { nested, type Element, type ModelStore } from '../store.js';
import { CommandError, type Handler } from '../spec.js';
import { t, type MessageKey } from '../../i18n/index.js';

const mustGet = (store: ModelStore, type: string, id: unknown, label: MessageKey): Element => {
  const el = store.get(type, id == null ? undefined : String(id));
  if (!el) throw new CommandError(t('store.error.unknownKind', { kind: t(label), id: String(id) }));
  return el;
};

/** Owners an invariant may hang from, in resolution order (same as add-invariant). */
const INVARIANT_OWNERS = ['aggregates', 'valueObjects', 'entities'];

/** Move a loose element into its parent's nested array by element type. */
function graft(store: ModelStore, id: string, name: string, elementType: string, ownerId: string): void {
  if (elementType === 'operation') {
    const agg = mustGet(store, 'aggregates', ownerId, 'store.kind.aggregate');
    const ops = nested(agg.operations);
    if (!ops.some((o) => o.id === id)) {
      store.patch('aggregates', agg.id, { operations: [...ops, { id, name, type: 'CUSTOM' }] });
    }
  } else if (elementType === 'use-case-step') {
    const uc = mustGet(store, 'useCases', ownerId, 'store.kind.useCase');
    const steps = nested(uc.steps);
    if (!steps.some((s) => s.id === id)) {
      store.patch('useCases', uc.id, { steps: [...steps, { id, name, type: 'Custom' }] });
    }
  } else if (elementType === 'field') {
    const model = mustGet(store, 'models', ownerId, 'store.kind.model');
    const fields = nested(model.fields);
    if (!fields.some((f) => f.id === id)) {
      store.patch('models', model.id, {
        fields: [...fields, { id, name, basicType: true, type: 'string', validations: [] }],
      });
    }
  } else if (elementType === 'invariant') {
    // Polymorphic owner: an aggregate, value object or entity.
    const ownerType = INVARIANT_OWNERS.find((t) => store.has(t, ownerId));
    if (!ownerType) throw new CommandError(t('store.loose.invariantOwner'));
    const owner = store.get(ownerType, ownerId)!;
    const invs = nested(owner.invariants);
    if (!invs.some((i) => i.id === id)) {
      store.patch(ownerType, ownerId, { invariants: [...invs, { id, name, conditions: [] }] });
    }
  } else if (elementType === 'read-model') {
    // Owned by a bounded context (or an aggregate → its context). Adopt into whichever it landed on,
    // and list it under the context (projections and other read-side wiring look it up there).
    if (store.has('aggregates', ownerId)) {
      const bc = store.get('aggregates', ownerId)?.boundedContextId as string | undefined;
      store.put('readModels', { id, name, aggregateId: ownerId, boundedContextId: bc ?? null });
      if (bc) store.addToList('boundedContexts', bc, 'readModelIds', id);
    } else if (store.has('boundedContexts', ownerId)) {
      store.put('readModels', { id, name, boundedContextId: ownerId, aggregateId: null });
      store.addToList('boundedContexts', ownerId, 'readModelIds', id);
    } else {
      throw new CommandError(t('store.loose.readModelOwner'));
    }
  } else if (elementType === 'external-table') {
    const ext = mustGet(store, 'externalSystems', ownerId, 'store.kind.externalSystem');
    const tables = nested(ext.tables);
    if (!tables.some((t) => t.id === id)) {
      store.patch('externalSystems', ext.id, { tables: [...tables, { id, name }] });
    }
  } else if (elementType === 'integration-event') {
    mustGet(store, 'boundedContexts', ownerId, 'store.kind.context');
    store.put('integrationEvents', { id, name, boundedContextId: ownerId });
  } else {
    throw new CommandError(t('store.unknown.looseType', { id: elementType }));
  }
}

export const LOOSE_COMMANDS: Record<string, Handler> = {
  'add-loose-element': (store, command) => {
    const id = String(command.id);
    if (store.has('looseElements', id)) return;
    store.put('looseElements', {
      id,
      name: String(command.name ?? ''),
      elementType: String(command.elementType),
    });
  },

  'remove-loose-element': (store, command) => {
    store.remove('looseElements', String(command.id));
  },

  /** Compose a loose element into a parent: graft it into the parent's nested array, drop the loose. */
  'adopt-loose-element': (store, command) => {
    const id = String(command.id);
    const loose = mustGet(store, 'looseElements', id, 'store.kind.looseElement');
    graft(store, id, String(loose.name ?? ''), String(loose.elementType), String(command.ownerId));
    store.remove('looseElements', id);
  },
};
