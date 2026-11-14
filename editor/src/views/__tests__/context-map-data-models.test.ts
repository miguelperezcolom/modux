import { describe, it, expect } from 'vitest';
import { setLanguage } from '../../i18n/index.js';
import { contextMapScene, stageDataModelIds, withoutOffStageDataModels } from '../context-map.js';
import { baseModel } from './fixtures.js';

setLanguage('en');

// A project like Tickets: contexts and actors on the strategic level, plus a crowd of data
// models (use-case inputs, event payloads, read-model shapes) that no context owns in the YAML.
const ticketsModel = () =>
  baseModel({
    boundedContexts: [
      { id: 'bc-sales', name: 'Sales', subdomainType: 'CORE' },
      { id: 'bc-payments', name: 'Payments', subdomainType: 'SUPPORTING' },
    ],
    aggregates: [{ id: 'agg-concert', name: 'Concert', boundedContextId: 'bc-sales', modelId: 'm-concert-state' }],
    externalSystems: [{ id: 'ext-psp', name: 'PSP' }],
    models: [
      { id: 'm-concert-state', name: 'Concert', fields: [{ id: 'f1', name: 'title' }] },
      { id: 'm-close-sale-input', name: 'CloseSaleInput', fields: [{ id: 'f1', name: 'saleId' }] },
      { id: 'm-payment-accepted', name: 'PaymentAccepted', fields: [{ id: 'f1', name: 'amount' }] },
      { id: 'm-concert-row', name: 'ConcertRow' },
    ],
    modelMappings: [
      { id: 'mm-1', name: 'CloseSaleInput2PaymentAccepted', sourceModelId: 'm-close-sale-input', targetModelId: 'm-payment-accepted' },
    ],
  } as never);

const kinds = (scene: ReturnType<typeof contextMapScene>) => scene.nodes.map((n) => n.kind);

describe('system map — data models are not strategic elements', () => {
  it('draws no data model on the base sheet, even when the stored layout has refs for them', () => {
    const model = ticketsModel();
    const layout = {
      'bc-sales': { x: 0, y: 0 },
      'm-close-sale-input': { x: 10, y: 10 },
      'm-payment-accepted': { x: 20, y: 20 },
      'm-concert-row': { x: 30, y: 30 },
    };
    const scene = contextMapScene(model, layout, {}, new Set(), false, undefined, stageDataModelIds(model, null));
    expect(kinds(scene)).not.toContain('model');
    expect(scene.nodes.map((n) => n.id)).toEqual(expect.arrayContaining(['bc-sales', 'bc-payments', 'ext-psp']));
    // Their mapping edge has no endpoints on stage, so it folds away too.
    expect(scene.edges.some((e) => e.kind === 'model-mapping')).toBe(false);
  });

  it('defaults to the strategic rule when no stage set is passed', () => {
    expect(kinds(contextMapScene(ticketsModel(), {}))).not.toContain('model');
  });

  it('does not draw them even with expand-all (the Yugo tree)', () => {
    const model = ticketsModel();
    const scene = contextMapScene(model, {}, {}, new Set(), true, undefined, stageDataModelIds(model, null));
    expect(kinds(scene)).not.toContain('model');
    expect(kinds(scene)).not.toContain('model-field');
  });

  it('a curated view draws the data models that are members of it — and their mapping', () => {
    const model = ticketsModel();
    const ids = stageDataModelIds(model, ['bc-sales', 'm-close-sale-input', 'm-payment-accepted']);
    expect([...ids].sort()).toEqual(['m-close-sale-input', 'm-payment-accepted']);
    const scene = contextMapScene(model, {}, {}, new Set(), false, undefined, ids);
    const drawn = scene.nodes.filter((n) => n.kind === 'model').map((n) => n.id).sort();
    expect(drawn).toEqual(['m-close-sale-input', 'm-payment-accepted']);
    expect(scene.edges.some((e) => e.kind === 'model-mapping')).toBe(true);
  });

  it('never stages a state model, even as a member (it lives inside its aggregate)', () => {
    const model = ticketsModel();
    expect(stageDataModelIds(model, ['m-concert-state']).size).toBe(0);
  });
});

describe('withoutOffStageDataModels — stale refs leave the base sheet on the next write', () => {
  it('drops positions, sizes, fills and unfold state of data models and their field chips', () => {
    const model = ticketsModel();
    const next = withoutOffStageDataModels(model, {
      nodes: {
        'bc-sales': { x: 1, y: 2 },
        'm-close-sale-input': { x: 3, y: 4 },
        'fld:m-close-sale-input:f1': { x: 5, y: 6 },
      },
      edges: { 'mapping:mm-1': [{ x: 0, y: 0 }] },
      sizes: { 'm-concert-row': { w: 10, h: 10 }, 'bc-sales': { w: 300, h: 200 } },
      fills: { 'm-payment-accepted': '#fff' },
      expanded: ['bc-sales', 'm-close-sale-input'],
    });
    expect(Object.keys(next.nodes)).toEqual(['bc-sales']);
    expect(Object.keys(next.sizes ?? {})).toEqual(['bc-sales']);
    expect(next.fills).toEqual({});
    expect(next.expanded).toEqual(['bc-sales']);
  });

  it('returns the very same layout when there is nothing to drop', () => {
    const layout = { nodes: { 'bc-sales': { x: 1, y: 2 } }, edges: {}, sizes: {} };
    expect(withoutOffStageDataModels(ticketsModel(), layout)).toBe(layout);
  });
});
