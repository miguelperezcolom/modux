/**
 * What a free-form view can show, checked against a real pattern store: `sample/patterns/cqrs`
 * is the case that exposed the gap — half of its elements (events, projection, read model, query
 * service, models) resolved to nothing, so a view over it could not show them.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { beforeAll, describe, expect, it } from 'vitest';
import { migrate } from '../../store/legacy.js';
import { project } from '../../store/project.js';
import { apply } from '../../store/apply.js';
import { ModelStore, type Element } from '../../store/store.js';
import { catalogEntries, type CatalogEntry } from '../catalog.js';

const CQRS = fileURLToPath(new URL('../../../../sample/patterns/cqrs/model-driven-store.yaml', import.meta.url));

/**
 * Types a view does not draw as a node: configuration, relations (drawn as edges between the
 * elements they join), the view definitions themselves, and canvas furniture.
 */
const NOT_DRAWN = new Set([
  'projects', 'deployments',
  'contextMapRelations', 'archimateRelations', 'flows', 'modelMappings',
  'views', 'notes', 'areas',
]);

function load(path = CQRS): ModelStore {
  const raw = parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  const lists = Object.fromEntries(
    Object.entries(raw).filter(([, value]) =>
      Array.isArray(value) && value.length > 0 && value.every((e) => e && typeof e === 'object' && 'id' in e)),
  ) as Record<string, Element[]>;
  const store = ModelStore.from(lists);
  migrate(store);
  return store;
}

describe('the catalog a view can show (cqrs pattern)', () => {
  let store: ModelStore;
  let byId: Map<string, CatalogEntry>;

  beforeAll(() => {
    store = load();
    byId = new Map(catalogEntries(project(store)).map((e) => [e.id, e]));
  });

  it('offers every drawable element of the store', () => {
    const missing = store.types()
      .filter((type) => !NOT_DRAWN.has(type))
      .flatMap((type) => store.all(type).map((e) => `${type}/${e.id}`))
      .filter((key) => !byId.has(key.split('/')[1]));

    expect(missing).toEqual([]);
  });

  it('draws each type as its own kind', () => {
    expect(byId.get('ev-pedidoCreado')?.kind).toBe('event');
    expect(byId.get('ie-pedidoCreado')?.kind).toBe('integration-event');
    expect(byId.get('pedidos-view')?.kind).toBe('read-model');
    expect(byId.get('qs-pedidos')?.kind).toBe('query-service');
    expect(byId.get('proj-pedidos-view')?.kind).toBe('projector');
    expect(byId.get('model-pedido')?.kind).toBe('model');
    expect(byId.get('uc-crearPedido')?.kind).toBe('usecase');
  });

  it('knows which context nests what (the view derives composition from it)', () => {
    // listed by the context (domainEventIds) and named by the element (boundedContextId)
    expect(byId.get('ev-pedidoCreado')?.ownerId).toBe('ventas-write');
    expect(byId.get('qs-pedidos')?.ownerId).toBe('ventas-read');
  });

  it('moves an element to another context, whichever way the store records ownership', () => {
    const s = load();
    const ownerOf = (id: string) => catalogEntries(project(s)).find((e) => e.id === id)?.ownerId;
    for (const id of ['ev-pedidoCreado', 'qs-pedidos', 'pedidos-view', 'uc-crearPedido', 'pedido']) {
      const e = catalogEntries(project(s)).find((x) => x.id === id)!;
      const target = e.ownerId === 'ventas-write' ? 'ventas-read' : 'ventas-write';
      apply(s, { kind: 'set-element-context', type: e.contextType, id, boundedContextId: target } as never);
      expect([id, ownerOf(id)]).toEqual([id, target]);
    }
    // and detaches it with no target
    apply(s, { kind: 'set-element-context', type: 'domainEvents', id: 'ev-pedidoCreado' } as never);
    expect(ownerOf('ev-pedidoCreado')).toBeUndefined();
  });

  it('lists each element once', () => {
    const ids = catalogEntries(project(store)).map((e) => e.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});

const PATTERNS = ['acl', 'bff', 'cqrs', 'event-driven', 'event-sourcing', 'integraciones', 'proceso-humano', 'saga'];

describe.each(PATTERNS)('the catalog a view can show (%s pattern)', (pattern) => {
  it('offers every drawable element of the store', () => {
    const store = load(fileURLToPath(new URL(`../../../../sample/patterns/${pattern}/model-driven-store.yaml`, import.meta.url)));
    const ids = new Set(catalogEntries(project(store)).map((e) => e.id));
    const missing = store.types()
      .filter((type) => !NOT_DRAWN.has(type))
      .flatMap((type) => store.all(type).map((e) => `${type}/${e.id}`))
      .filter((key) => !ids.has(key.slice(key.indexOf('/') + 1)));
    expect(missing).toEqual([]);
  });

  it('renames every element it offers, through the real command', () => {
    const store = load(fileURLToPath(new URL(`../../../../sample/patterns/${pattern}/model-driven-store.yaml`, import.meta.url)));
    const entries = catalogEntries(project(store));
    for (const e of entries) {
      apply(store, { kind: 'rename-element', type: e.renameType, id: e.id, name: `renamed-${e.id}` } as never);
    }
    const after = new Map(catalogEntries(project(store)).map((e) => [e.id, e.label]));
    const notRenamed = entries.filter((e) => after.get(e.id) !== `renamed-${e.id}`).map((e) => `${e.renameType}/${e.id}`);
    expect(notRenamed).toEqual([]);
  });
});
