import { describe, it, expect } from 'vitest';
import { setLanguage } from '../../i18n/index.js';
import { aggregatesScene } from '../aggregates.js';
import { baseModel } from './fixtures.js';

// The scenes below are built while the suite is collected (before any hook runs), so the
// language is set at import time.
setLanguage('es');

const model = () =>
  baseModel({
    boundedContexts: [{ id: 'mod-reservas', name: 'Reservas', subdomainType: 'CORE' }],
    aggregates: [
      {
        id: 'agg-reserva',
        name: 'Reserva',
        boundedContextId: 'mod-reservas',
        invariants: [
          { id: 'inv-overbooking', name: 'Sin overbooking' },
          { id: 'inv-fechas', name: 'Fechas coherentes' },
        ],
      },
    ],
    entities: [{ id: 'ent-linea', name: 'Línea', aggregateId: 'agg-reserva' }],
  });

describe('aggregatesScene — invariants first class', () => {
  const scene = aggregatesScene(model(), {});

  it('orbits the invariants around their aggregate', () => {
    const inv = scene.nodes.find((n) => n.id === 'inv-overbooking')!;
    expect(inv.kind).toBe('invariant');
    expect(inv.badge).toContain('INVARIANTE');
  });

  it('wires the protection edge, dashed', () => {
    const edge = scene.edges.find((e) => e.id === 'protects:agg-reserva->inv-fechas')!;
    expect(edge.kind).toBe('invariant-containment');
    expect(edge.dashed).toBe(true);
  });

  it('counts them on the aggregate badge', () => {
    const agg = scene.nodes.find((n) => n.id === 'agg-reserva')!;
    expect(agg.badge).toContain('⚖2');
  });
});
