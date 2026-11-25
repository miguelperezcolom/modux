/**
 * ArchiMate elements with no modux concept (a node, a database, a topic, a business process…):
 * documentation only, so that any system can be described — stored, projected, listed in the
 * catalog as `am:<concept>`, and related through the ArchiMate matrix.
 */
import { describe, expect, it } from 'vitest';
import { applyAll } from '../store/apply.js';
import { ModelStore } from '../store/store.js';
import { project } from '../store/project.js';
import { catalogEntries } from '../archi-prototype/catalog.js';
import { canDraw, validRelations } from '../archi-prototype/magic.js';
import { ARCHIMATE_CONCEPTS } from '../archi-prototype/archimate-concepts.js';
import { connectionOptions, type GestureHost } from '../gestures.js';
import type { ModuxModel } from '../model.js';

describe('archimate elements', () => {
  it('are stored, projected, renamed and listed in the catalog as am:<concept>', () => {
    const store = ModelStore.from({});
    applyAll(store, [
      { kind: 'add-archimate-element', id: 'system-software-1', name: 'Postgres', concept: 'SystemSoftware' },
      { kind: 'rename-element', type: 'archimate-element', id: 'system-software-1', name: 'pagos-db' },
    ] as never);
    const m = project(store);
    expect(m.archimateElements).toEqual([{ id: 'system-software-1', name: 'pagos-db', concept: 'SystemSoftware' }]);
    expect(catalogEntries(m).find((e) => e.id === 'system-software-1'))
      .toMatchObject({ kind: 'am:SystemSoftware', label: 'pagos-db', renameType: 'archimate-element' });

    applyAll(store, [{ kind: 'remove-archimate-element', id: 'system-software-1' }] as never);
    expect(project(store).archimateElements).toEqual([]);
  });

  it('relate to modux elements through the full ArchiMate matrix', () => {
    // a database serves a bounded context (drawn as an application component)
    expect(canDraw('serving', 'am:SystemSoftware', 'component')).toBe('forward');
    // a topic (artifact) realizes an event
    expect(canDraw('realization', 'am:Artifact', 'event')).toBe('forward');
    // a node is assigned a piece of system software
    expect(canDraw('assignment', 'am:Node', 'am:SystemSoftware')).toBe('forward');
    // every concept in the palette is known to the matrix
    for (const c of ARCHIMATE_CONCEPTS) expect(validRelations(`am:${c.concept}`, `am:${c.concept}`).length, c.concept).toBeGreaterThan(0);
  });
});

describe('API operation ⇆ implementer', () => {
  const model = {
    boundedContexts: [{ id: 'ctx', name: 'Pagos', useCases: [{ id: 'uc', name: 'Cobrar' }] }],
    externalSystems: [],
    apis: [{ id: 'api', name: 'Pagos API', operations: [{ id: 'op', name: 'cobrar' }] }],
  } as unknown as ModuxModel;

  it('lists operations in the catalog, owned by their API', () => {
    expect(catalogEntries(model).find((e) => e.id === 'op')).toMatchObject({ kind: 'api-operation', ownerId: 'api' });
  });

  for (const [from, to, target] of [['op', 'uc', { targetUseCaseId: 'uc' }], ['uc', 'op', { targetUseCaseId: 'uc' }], ['op', 'ctx', { boundedContextId: 'ctx' }]] as const) {
    it(`wires ${from} → ${to} as who implements the operation`, () => {
      const sent: unknown[] = [];
      const host = { model, command: (c: unknown) => sent.push(c) } as unknown as GestureHost;
      const opts = connectionOptions(host, from, to);
      expect(opts.map((o) => o.id)).toContain('api-op-impl');
      opts.find((o) => o.id === 'api-op-impl')!.apply();
      expect(sent).toEqual([{ kind: 'set-api-operation-target', apiId: 'api', id: 'op', ...target }]);
    });
  }
});
