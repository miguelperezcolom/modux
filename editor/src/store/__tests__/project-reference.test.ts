/**
 * Referencing another modux project.
 *
 * This was the last command left unported, and for a reason worth keeping: it needs to READ
 * another model off disk, and the applier does no I/O — that purity is what lets every other
 * command be tested without files. So the work is split, and these tests follow the split: the
 * host resolves and reads, the applier copies in what it was handed.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { setLanguage } from '../../i18n/index.js';
import { apply } from '../apply.js';
import { referenceIdFor, snapshotOf } from '../project-snapshot.js';
import { ModelStore, type Element } from '../store.js';

beforeAll(() => setLanguage('es'));

/** Another project's store, as the host would have read it. */
const otherProject = () => ModelStore.from({
  projects: [{ id: 'checkin', name: 'Checkin' }],
  useCases: [
    { id: 'uc-entrar', name: 'Entrar', exposedAsRest: true },
    { id: 'uc-mcp', name: 'Consultar', exposedAsMcp: true },
    { id: 'uc-interno', name: 'Recalcular' },
  ],
});

describe('the snapshot: what another project shows to the outside', () => {
  /** Only the exposed ones: copying its internals in would put its private decisions on our map. */
  it('copies the exposed use cases and nothing else', () => {
    const snapshot = snapshotOf(otherProject(), 'checkin');

    expect(snapshot.name).toBe('Checkin');
    expect(snapshot.useCases.map((u) => u.id)).toEqual(['uc-entrar', 'uc-mcp']);
  });

  it('falls back to the repository name when the project does not give one', () => {
    const store = ModelStore.from({ useCases: [] });

    expect(snapshotOf(store, 'checkin').name).toBe('checkin');
  });

  it('names the reference after the repository, whatever the coordinate looks like', () => {
    expect(referenceIdFor({ gitUrl: 'git@github.com:acme/checkin.git' })).toBe('proj-checkin');
    expect(referenceIdFor({ path: '../../checkin/modux' })).toBe('proj-checkin');
    expect(referenceIdFor({})).toBe('proj-referencia');
  });
});

describe('the applier, over a snapshot somebody else read', () => {
  const reference = (extra: Record<string, unknown> = {}) => ({
    kind: 'add-project-reference',
    referencedProject: { gitUrl: 'git@github.com:acme/checkin.git', branch: 'main' },
    snapshot: snapshotOf(otherProject(), 'checkin'),
    ...extra,
  });

  it('lands the other project as an external system carrying its surface', () => {
    const store = ModelStore.from({});

    apply(store, reference() as never);

    const system = store.get('externalSystems', 'proj-checkin')!;
    expect(system.name).toBe('Checkin');
    expect((system.useCases as Element[]).map((u) => u.name)).toEqual(['Entrar', 'Consultar']);
  });

  /** The copies are OURS: two referenced projects sharing a use-case id must not collide. */
  it('gives the copied use cases ids of this project’s own making', () => {
    const store = ModelStore.from({});

    apply(store, reference() as never);

    expect((store.get('externalSystems', 'proj-checkin')!.useCases as Element[])[0].id)
      .toBe('proj-checkin-uc-entrar');
  });

  it('keeps the coordinate, which is what refreshing later needs', () => {
    const store = ModelStore.from({});

    apply(store, reference() as never);

    expect(store.get('externalSystems', 'proj-checkin')?.referencedProject)
      .toEqual({ gitUrl: 'git@github.com:acme/checkin.git', branch: 'main' });
  });

  it('refuses a coordinate that says nothing', () => {
    expect(() => apply(ModelStore.from({}),
      { kind: 'add-project-reference', referencedProject: {}, snapshot: { name: 'x', useCases: [] } } as never))
      .toThrow(/URL git o el path/);
  });

  /** Without a snapshot there is nothing to copy — and the applier will not go and read one. */
  it('refuses to invent a reference the host could not read', () => {
    expect(() => apply(ModelStore.from({}),
      { kind: 'add-project-reference', referencedProject: { path: '../x' } } as never))
      .toThrow(/sin datos que copiar/);
  });

  it('re-referencing replaces the snapshot, which is what a refresh is', () => {
    const store = ModelStore.from({});
    apply(store, reference() as never);

    const evolved = otherProject();
    evolved.put('useCases', { id: 'uc-nuevo', name: 'Salir', exposedAsRest: true });
    apply(store, reference({ snapshot: snapshotOf(evolved, 'checkin') }) as never);

    expect((store.get('externalSystems', 'proj-checkin')!.useCases as Element[]).map((u) => u.name))
      .toEqual(['Entrar', 'Consultar', 'Salir']);
    expect(store.all('externalSystems')).toHaveLength(1);
  });
});
