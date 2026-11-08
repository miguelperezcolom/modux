import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { apply, CommandError } from '../apply.js';
import { retypeTargets } from '../commands/retype.js';
import { migrate } from '../legacy.js';
import { ModelStore, type Element } from '../store.js';

const retype = (store: ModelStore, id: string, from: string, to: string) =>
  apply(store, { kind: 'change-element-type', id, from, to });

/** A context with an aggregate (with a value object and an entity), an event, and loose bits. */
function small(): ModelStore {
  return ModelStore.from({
    boundedContexts: [{ id: 'c1', name: 'Ventas', aggregateIds: ['a1', 'a2'], domainEventIds: ['e1'], useCaseIds: ['u1'] }],
    aggregates: [
      { id: 'a1', name: 'Pedido', modelId: 'm1', invariants: [], operations: [{ id: 'op1', name: 'confirmar' }], valueObjectIds: ['v1'] },
      { id: 'a2', name: 'Linea', modelId: 'm2', invariants: [{ id: 'i1', name: 'cantidad > 0' }], operations: [], valueObjectIds: [], persistenceType: 'JPA' },
    ],
    entities: [{ id: 'n1', name: 'Detalle', parentAggregateId: 'a1', isCollection: true, invariants: [] }],
    valueObjects: [{ id: 'v1', name: 'Importe', type: 'Record', invariants: [] }],
    domainEvents: [{ id: 'e1', name: 'PedidoCreado', modelId: 'm1', topicName: 'ventas.pedido', replayable: true }],
    useCases: [{ id: 'u1', name: 'Crear', steps: [] }],
    views: [{ id: 'vw', name: 'Vista', memberIds: ['a2', 'e1', 'v1'] }],
  } as unknown as Record<string, Element[]>);
}

describe('change-element-type', () => {
  it('offers only conversions within the family', () => {
    expect(retypeTargets('aggregate').sort()).toEqual(['entity', 'value-object']);
    expect(retypeTargets('domain-event').sort()).toEqual(['application-event', 'integration-event']);
    expect(retypeTargets('use-case')).toEqual(['policy']);
    expect(retypeTargets('actor')).toEqual([]);
  });

  it('refuses a conversion across families', () => {
    expect(() => retype(small(), 'a2', 'aggregate', 'domain-event')).toThrow(CommandError);
  });

  it('turns an aggregate into an entity: same id, shared fields kept, out of the context list', () => {
    const s = small();
    retype(s, 'a2', 'aggregate', 'entity');
    expect(s.has('aggregates', 'a2')).toBe(false);
    const e = s.get('entities', 'a2')!;
    // (the store never keeps empty / false / null values — they read as absent)
    expect(e).toEqual({ id: 'a2', name: 'Linea', modelId: 'm2', invariants: [{ id: 'i1', name: 'cantidad > 0' }] });
    // persistenceType (aggregate-only) is dropped; a context does not translate to a parent aggregate
    expect(s.get('boundedContexts', 'c1')!.aggregateIds).toEqual(['a1']);
    expect(s.changes().deleted).toContainEqual(expect.objectContaining({ type: 'aggregates', id: 'a2' }));
  });

  it('turns an entity into an aggregate of its parent aggregate\'s context', () => {
    const s = small();
    retype(s, 'n1', 'entity', 'aggregate');
    expect(s.get('aggregates', 'n1')).toEqual({ id: 'n1', name: 'Detalle' });
    expect(s.get('boundedContexts', 'c1')!.aggregateIds).toContain('n1');
  });

  it('moves between an aggregate\'s value objects and its entities', () => {
    const s = small();
    retype(s, 'v1', 'value-object', 'entity');
    expect(s.get('entities', 'v1')!.parentAggregateId).toBe('a1');
    expect(s.get('aggregates', 'a1')!.valueObjectIds).toBeUndefined();

    retype(s, 'n1', 'entity', 'value-object');
    expect(s.get('aggregates', 'a1')!.valueObjectIds).toEqual(['n1']);
  });

  it('turns a domain event into an integration event of the same context, keeping delivery settings', () => {
    const s = small();
    retype(s, 'e1', 'domain-event', 'integration-event');
    expect(s.get('integrationEvents', 'e1')).toMatchObject({
      name: 'PedidoCreado', boundedContextId: 'c1', payloadModelId: 'm1', topicName: 'ventas.pedido', replayable: true,
    });
    expect(s.get('boundedContexts', 'c1')!.domainEventIds).toBeUndefined();
  });

  it('flips use case and policy in place', () => {
    const s = small();
    retype(s, 'u1', 'use-case', 'policy');
    expect(s.get('useCases', 'u1')!.policy).toBe(true);
    retype(s, 'u1', 'policy', 'use-case');
    expect(s.get('useCases', 'u1')!.policy).toBeUndefined();
  });

  it('refuses rather than drop content the new type cannot hold', () => {
    const s = small();
    // a1 has an operation (and is the parent of n1, which blocks first): use a clean aggregate with one
    s.patch('aggregates', 'a2', { operations: [{ id: 'op2', name: 'ajustar' }] });
    expect(() => retype(s, 'a2', 'aggregate', 'entity')).toThrow(/perdería operations/);
    expect(s.has('aggregates', 'a2')).toBe(true);              // untouched
  });

  it('refuses while something points at it through a type-specific field, and says what', () => {
    const s = small();
    expect(() => retype(s, 'a1', 'aggregate', 'entity')).toThrow(/entities\/n1\.parentAggregateId/);
    expect(s.has('aggregates', 'a1')).toBe(true);
  });

  it('is not blocked by views (they reference by id, whatever the type)', () => {
    const s = small();
    retype(s, 'v1', 'value-object', 'entity');
    expect(s.get('views', 'vw')!.memberIds).toContain('v1');
  });

  it('blocks a real event that projections, steps and integration events consume (cqrs pattern)', () => {
    const raw = parse(readFileSync(fileURLToPath(
      new URL('../../../../sample/patterns/cqrs/model-driven-store.yaml', import.meta.url)), 'utf8')) as Record<string, unknown>;
    const s = ModelStore.from(Object.fromEntries(Object.entries(raw).filter(([, v]) =>
      Array.isArray(v) && v.length && v.every((e) => e && typeof e === 'object' && 'id' in e))) as Record<string, Element[]>);
    migrate(s);
    let message = '';
    try { retype(s, 'ev-pedidoCreado', 'domain-event', 'application-event'); } catch (e) { message = (e as Error).message; }
    expect(message).toMatch(/projections\/proj-pedidos-view\.handlers\[0\]\.domainEventId/);
    expect(message).toMatch(/integrationEvents\/ie-pedidoCreado\.sourceDomainEventId/);
    expect(s.has('domainEvents', 'ev-pedidoCreado')).toBe(true);
  });
});
