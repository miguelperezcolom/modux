import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { setLanguage } from '../../i18n/index.js';
import { apply, applyAll, CommandError, unsupported } from '../apply.js';
import { asList, ModelStore } from '../store.js';

beforeAll(() => setLanguage('es'));

/** Read a list field the way consuming code does: absent and empty are one thing. */
const list = (store: ModelStore, type: string, id: string, field: string) =>
  asList(store.get(type, id)![field]);

/** A store with one service, so bounded contexts have somewhere to deploy. */
function storeWithService(): ModelStore {
  return ModelStore.from({ services: [{ id: 'svc', name: 'Service', moduleIds: [] }] });
}

function withContext(id = 'bc-booking'): ModelStore {
  const store = storeWithService();
  apply(store, { kind: 'add-boundedContext', id, name: 'Booking' });
  return store;
}

describe('bounded contexts', () => {
  it('is born with its main module, deployed by the service', () => {
    const store = withContext();

    expect(store.get('modules', 'bc-booking-main')).toMatchObject({
      boundedContextId: 'bc-booking',
      main: true,
    });
    expect(list(store, 'services', 'svc', 'moduleIds')).toEqual(['bc-booking-main']);
  });

  it('is idempotent by id', () => {
    const store = withContext();
    apply(store, { kind: 'add-boundedContext', id: 'bc-booking', name: 'Otro' });

    expect(store.all('boundedContexts')).toHaveLength(1);
    expect(store.get('boundedContexts', 'bc-booking')!.name).toBe('Booking');
  });

  it('refuses to delete while it still holds aggregates', () => {
    const store = withContext();
    apply(store, { kind: 'add-aggregate', id: 'agg-booking', name: 'Booking', boundedContextId: 'bc-booking' });

    expect(() => apply(store, { kind: 'remove-boundedContext', id: 'bc-booking' }))
      .toThrow(/tiene agregados/);
    expect(store.has('boundedContexts', 'bc-booking')).toBe(true);
  });

  it('takes its modules and relations with it when deleted', () => {
    const store = withContext();
    apply(store, { kind: 'add-boundedContext', id: 'bc-billing', name: 'Billing' });
    apply(store, { kind: 'add-relation', sourceId: 'bc-booking', targetId: 'bc-billing', type: 'CUSTOMER_SUPPLIER' });

    apply(store, { kind: 'remove-boundedContext', id: 'bc-booking' });

    expect(store.has('modules', 'bc-booking-main')).toBe(false);
    expect(list(store, 'services', 'svc', 'moduleIds')).toEqual(['bc-billing-main']);
    expect(store.all('contextMapRelations')).toHaveLength(0);
  });
});

describe('aggregates', () => {
  it('is born referentially complete: stub state model plus back-reference', () => {
    const store = withContext();
    apply(store, { kind: 'add-aggregate', id: 'agg-booking', name: 'Booking', boundedContextId: 'bc-booking' });

    expect(store.get('aggregates', 'agg-booking')!.modelId).toBe('model-booking');
    expect(store.get('models', 'model-booking')).toBeDefined();
    expect(list(store, 'boundedContexts', 'bc-booking', 'aggregateIds')).toEqual(['agg-booking']);
  });

  it('rejects an unknown bounded context', () => {
    const store = storeWithService();

    expect(() => apply(store, { kind: 'add-aggregate', id: 'agg-x', name: 'X', boundedContextId: 'nope' }))
      .toThrow(CommandError);
  });

  it('refuses to delete while it still holds entities', () => {
    const store = withContext();
    apply(store, { kind: 'add-aggregate', id: 'agg-booking', name: 'Booking', boundedContextId: 'bc-booking' });
    apply(store, { kind: 'add-entity', id: 'ent-leg', name: 'Leg', aggregateId: 'agg-booking' });

    expect(() => apply(store, { kind: 'remove-aggregate', id: 'agg-booking' })).toThrow(/tiene entidades/);
  });

  it('clears its back-reference when deleted', () => {
    const store = withContext();
    apply(store, { kind: 'add-aggregate', id: 'agg-booking', name: 'Booking', boundedContextId: 'bc-booking' });
    apply(store, { kind: 'remove-aggregate', id: 'agg-booking', boundedContextId: 'bc-booking' });

    expect(list(store, 'boundedContexts', 'bc-booking', 'aggregateIds')).toEqual([]);
  });
});

describe('value objects', () => {
  function storeWithAggregate(): ModelStore {
    const store = withContext();
    apply(store, { kind: 'add-aggregate', id: 'agg-booking', name: 'Booking', boundedContextId: 'bc-booking' });
    return store;
  }

  it('defaults its type to Record and links to its aggregate', () => {
    const store = storeWithAggregate();
    apply(store, { kind: 'add-value-object', id: 'vo-money', name: 'Money', aggregateId: 'agg-booking' });

    expect(store.get('valueObjects', 'vo-money')!.type).toBe('Record');
    expect(list(store, 'aggregates', 'agg-booking', 'valueObjectIds')).toEqual(['vo-money']);
  });

  it('moves between aggregates without leaving a dangling reference', () => {
    const store = storeWithAggregate();
    apply(store, { kind: 'add-aggregate', id: 'agg-other', name: 'Other', boundedContextId: 'bc-booking' });
    apply(store, { kind: 'add-value-object', id: 'vo-money', name: 'Money', aggregateId: 'agg-booking' });

    apply(store, { kind: 'set-value-object-aggregate', id: 'vo-money', aggregateId: 'agg-other' });

    expect(list(store, 'aggregates', 'agg-booking', 'valueObjectIds')).toEqual([]);
    expect(list(store, 'aggregates', 'agg-other', 'valueObjectIds')).toEqual(['vo-money']);
  });
});

describe('invariants', () => {
  function storeWithOwners(): ModelStore {
    const store = withContext();
    apply(store, { kind: 'add-aggregate', id: 'agg-booking', name: 'Booking', boundedContextId: 'bc-booking' });
    apply(store, { kind: 'add-entity', id: 'ent-leg', name: 'Leg', aggregateId: 'agg-booking' });
    apply(store, { kind: 'add-value-object', id: 'vo-money', name: 'Money', aggregateId: 'agg-booking' });
    return store;
  }

  it.each([
    ['aggregates', 'agg-booking'],
    ['entities', 'ent-leg'],
    ['valueObjects', 'vo-money'],
  ])('hangs from a %s owner', (type, ownerId) => {
    const store = storeWithOwners();
    apply(store, { kind: 'add-invariant', id: 'inv-1', name: 'No overlap', ownerId });

    expect(store.get(type, ownerId)!.invariants).toEqual([{ id: 'inv-1', name: 'No overlap' }]);
  });

  it('finds its owner again when the condition is edited', () => {
    const store = storeWithOwners();
    apply(store, { kind: 'add-invariant', id: 'inv-1', name: 'No overlap', ownerId: 'ent-leg' });

    apply(store, {
      kind: 'set-invariant-condition',
      id: 'inv-1',
      expression: 'from < to',
      errorMessage: 'Rango inválido',
    });

    expect(store.get('entities', 'ent-leg')!.invariants).toEqual([{
      id: 'inv-1',
      name: 'No overlap',
      conditions: [{ id: 'inv-1-cond', expression: 'from < to', errorMessage: 'Rango inválido' }],
    }]);
  });

  it('clears the condition when both expression and message go blank', () => {
    const store = storeWithOwners();
    apply(store, { kind: 'add-invariant', id: 'inv-1', name: 'No overlap', ownerId: 'agg-booking' });
    apply(store, { kind: 'set-invariant-condition', id: 'inv-1', expression: 'x', errorMessage: 'y' });

    apply(store, { kind: 'set-invariant-condition', id: 'inv-1', expression: '  ', errorMessage: '' });

    expect((store.get('aggregates', 'agg-booking')!.invariants as any[])[0].conditions).toBeUndefined();
  });

  it('removes from whichever owner holds it', () => {
    const store = storeWithOwners();
    apply(store, { kind: 'add-invariant', id: 'inv-1', name: 'No overlap', ownerId: 'vo-money' });

    apply(store, { kind: 'remove-invariant', id: 'inv-1' });

    expect(store.get('valueObjects', 'vo-money')!.invariants).toBeUndefined();
  });

  it('rejects an unknown owner', () => {
    const store = storeWithOwners();

    expect(() => apply(store, { kind: 'add-invariant', id: 'inv-1', name: 'X', ownerId: 'nope' }))
      .toThrow(/unknown owner/);
  });
});

describe('relations', () => {
  it('does not duplicate a context map relation', () => {
    const store = withContext();
    apply(store, { kind: 'add-boundedContext', id: 'bc-billing', name: 'Billing' });
    const command = { kind: 'add-relation', sourceId: 'bc-booking', targetId: 'bc-billing', type: 'PARTNERSHIP' };

    apply(store, command);
    apply(store, command);

    expect(store.all('contextMapRelations')).toHaveLength(1);
  });

  it('inverts an archimate relation', () => {
    const store = withContext();
    apply(store, { kind: 'add-archimate-relation', id: 'ar-1', sourceId: 'a', targetId: 'b', type: 'serving' });

    apply(store, { kind: 'invert-archimate-relation', id: 'ar-1' });

    expect(store.get('archimateRelations', 'ar-1')).toMatchObject({ sourceId: 'b', targetId: 'a' });
  });
});

describe('topology', () => {
  it('moves a module between services instead of deploying it twice', () => {
    const store = withContext();
    apply(store, { kind: 'add-service', id: 'svc-2', name: 'Second' });

    apply(store, { kind: 'add-service-module', id: 'svc-2', targetId: 'bc-booking-main' });

    expect(list(store, 'services', 'svc', 'moduleIds')).toEqual([]);
    expect(list(store, 'services', 'svc-2', 'moduleIds')).toEqual(['bc-booking-main']);
  });
});

describe('change tracking', () => {
  it('reports only the files an edit touched', () => {
    const store = withContext();
    store.clearChanges();

    const changes = apply(store, {
      kind: 'add-aggregate', id: 'agg-booking', name: 'Booking', boundedContextId: 'bc-booking',
    });

    // the aggregate, its stub model, and the parent whose back-reference grew
    expect(changes.written).toHaveLength(3);
    expect(changes.written).toContainEqual({ type: 'aggregates', id: 'agg-booking' });
    expect(changes.written).toContainEqual({ type: 'models', id: 'model-booking' });
    expect(changes.written).toContainEqual({ type: 'boundedContexts', id: 'bc-booking' });
    expect(changes.deleted).toEqual([]);
  });

  it('reports deletions as file removals', () => {
    const store = withContext();
    apply(store, { kind: 'add-note', id: 'note-1', text: 'hola' });

    const changes = apply(store, { kind: 'remove-note', id: 'note-1' });

    expect(changes.deleted).toEqual([{ type: 'notes', id: 'note-1' }]);
    expect(changes.written).toEqual([]);
  });

  it('does not touch a file when nothing actually changed', () => {
    const store = withContext();
    store.clearChanges();

    const changes = apply(store, { kind: 'remove-note', id: 'does-not-exist' });

    expect(changes.written).toEqual([]);
    expect(changes.deleted).toEqual([]);
  });
});

describe('batches', () => {
  it('leaves the store untouched when one command in the batch fails', () => {
    const store = withContext();
    const before = JSON.stringify(store.toData());

    expect(() => applyAll(store, [
      { kind: 'add-aggregate', id: 'agg-ok', name: 'Ok', boundedContextId: 'bc-booking' },
      { kind: 'add-aggregate', id: 'agg-bad', name: 'Bad', boundedContextId: 'nope' },
    ])).toThrow(CommandError);

    expect(JSON.stringify(store.toData())).toBe(before);
  });

  it('applies a whole batch when every command lands', () => {
    const store = withContext();

    const changes = applyAll(store, [
      { kind: 'add-aggregate', id: 'agg-a', name: 'A', boundedContextId: 'bc-booking' },
      { kind: 'add-aggregate', id: 'agg-b', name: 'B', boundedContextId: 'bc-booking' },
    ]);

    expect(list(store, 'boundedContexts', 'bc-booking', 'aggregateIds')).toEqual(['agg-a', 'agg-b']);
    expect(changes.written.length).toBeGreaterThan(0);
  });
});

describe('coverage', () => {
  it('rejects a command kind it does not know instead of silently dropping it', () => {
    const store = withContext();

    expect(() => apply(store, { kind: 'no-existe-este-comando' } as never))
      .toThrow(/no soportado/);
  });

  it('reports which kinds are missing', () => {
    expect(unsupported(['add-aggregate', 'no-existe'])).toEqual(['no-existe']);
  });

  /**
   * The vocabulary the editor can emit is `commands.ts`, and the applier has to answer for all
   * of it. Reading the union at test time rather than listing the kinds here is what makes this
   * hold: a command added to the editor with no handler fails HERE, not in front of a user.
   */
  it('handles every command kind the editor declares', () => {
    const union = readFileSync(
      fileURLToPath(new URL('../../commands.ts', import.meta.url)), 'utf8');
    const declared = [...union.matchAll(/kind: '([a-z0-9-]+)'/g)].map((m) => m[1]);

    expect(new Set(declared).size).toBeGreaterThan(250);
    // no exceptions left: every kind the editor can emit has a handler
    expect(unsupported([...new Set(declared)])).toEqual([]);
  });
});
