import { describe, it, expect } from 'vitest';
import { setLanguage } from '../../i18n/index.js';
import { contextMapScene, distributionScene } from '../context-map.js';
import { baseModel } from './fixtures.js';

// The scenes below are built while the suite is collected (before any hook runs), so the
// language is set at import time.
setLanguage('es');

const strategicModel = () =>
  baseModel({
    boundedContexts: [
      {
        id: 'mod-reservas',
        name: 'Reservas',
        subdomainType: 'CORE',
        useCases: [{ id: 'uc-book', name: 'Reservar' }],
        domainEvents: [],
      },
      { id: 'mod-facturas', name: 'Facturación', subdomainType: 'SUPPORTING' },
    ],
    aggregates: [{ id: 'agg-reserva', name: 'Reserva', boundedContextId: 'mod-reservas' }],
    externalSystems: [{ id: 'ext-pms', name: 'PMS' }],
    relations: [
      {
        sourceId: 'mod-reservas',
        targetId: 'mod-facturas',
        type: null,
        inferredType: 'CUSTOMER_SUPPLIER',
        declared: false,
        reasons: 'llamada a Facturar',
      },
    ],
  });

describe('contextMapScene — free boxes, folded by default (Archi style)', () => {
  const scene = contextMapScene(strategicModel(), {});

  it('shows contexts and external systems as plain boxes — no children on stage', () => {
    const ids = scene.nodes.map((n) => n.id);
    expect(ids).toContain('mod-reservas');
    expect(ids).toContain('mod-facturas');
    expect(ids).toContain('ext-pms');
    expect(ids).not.toContain('agg-reserva');
    expect(ids).not.toContain('uc-book');
  });

  it('nothing nests: no node carries a geometric parent', () => {
    expect(scene.nodes.every((n) => !n.parentId)).toBe(true);
  });

  it('a context with content wears the chevron (it hides more)', () => {
    const core = scene.nodes.find((n) => n.id === 'mod-reservas')!;
    expect(core.collapsible).toBe(true);
    expect(core.collapsed).toBe(true);
  });

  it('badges the subdomain type', () => {
    const core = scene.nodes.find((n) => n.id === 'mod-reservas')!;
    expect(core.badge).toBe('CORE');
  });

  it('labels the inferred relation with ≈ABBREV (approximation, not annotation)', () => {
    const rel = scene.edges.find((e) => e.kind === 'relation')!;
    expect(rel.label).toMatch(/^≈/);
    expect(rel.tooltip).toContain('INFERIDO');
  });

  it('drops the ≈ when the pair is declared', () => {
    const m = strategicModel();
    m.relations[0] = { ...m.relations[0], type: 'CUSTOMER_SUPPLIER', declared: true };
    const s = contextMapScene(m, {});
    const rel = s.edges.find((e) => e.kind === 'relation')!;
    expect(rel.label).not.toMatch(/^≈/);
  });
});

describe('contextMapScene — expansion brings children as free nodes with diamonds', () => {
  it('an expanded context reveals its content, tied by contains edges', () => {
    const scene = contextMapScene(strategicModel(), {}, {}, new Set(['mod-reservas']));
    const agg = scene.nodes.find((n) => n.id === 'agg-reserva')!;
    expect(agg.parentId).toBeUndefined(); // free box
    expect(agg.ownerId).toBe('mod-reservas'); // logical containment (yugo/3D)
    const edge = scene.edges.find((e) => e.id === 'contains:mod-reservas->agg-reserva')!;
    expect(edge.kind).toBe('contains');
    expect(edge.sourceId).toBe('mod-reservas');
    // the neighbour stays folded: expansion is per element
    expect(scene.nodes.some((n) => n.ownerId === 'mod-facturas')).toBe(false);
  });

  it('an expanded API unfolds its operations; a folded one stays a plain box', () => {
    const model = baseModel({
      ...strategicModel(),
      apis: [
        { id: 'api-a', name: 'A', operations: [{ id: 'op-1', name: 'op1' }] },
        { id: 'api-b', name: 'B', operations: [{ id: 'op-2', name: 'op2' }] },
      ],
    });
    const scene = contextMapScene(model, {}, {}, new Set(['api-a']));
    const op = scene.nodes.find((n) => n.id === 'op-1')!;
    expect(op.ownerId).toBe('api-a');
    expect(scene.edges.some((e) => e.id === 'contains:api-a->op-1')).toBe(true);
    expect(scene.nodes.find((n) => n.id === 'op-2')).toBeUndefined();
    const b = scene.nodes.find((n) => n.id === 'api-b')!;
    expect(b.collapsible).toBe(true);
    expect(b.collapsed).toBe(true);
  });

  it('cascade: system → API → operations, one expansion at a time', () => {
    const model = baseModel({
      ...strategicModel(),
      externalSystems: [{ id: 'ext-pms', name: 'PMS' }],
      apis: [{
        id: 'api-pms', name: 'PMS API',
        operations: [{ id: 'op-pms', name: 'consulta' }],
        publishedByExternalSystemId: 'ext-pms',
      }],
    });
    // folded system: nothing of its content on stage
    const folded = contextMapScene(model, {});
    expect(folded.nodes.find((n) => n.id === 'api-pms')).toBeUndefined();
    // expanded system: the API joins as a free box with its chevron
    const sys = contextMapScene(model, {}, {}, new Set(['ext-pms']));
    const api = sys.nodes.find((n) => n.id === 'api-pms')!;
    expect(api.ownerId).toBe('ext-pms');
    expect(api.collapsible).toBe(true);
    expect(sys.nodes.find((n) => n.id === 'op-pms')).toBeUndefined();
    // API expanded too: its operation arrives, chained by diamonds
    const open = contextMapScene(model, {}, {}, new Set(['ext-pms', 'api-pms']));
    expect(open.nodes.find((n) => n.id === 'op-pms')?.ownerId).toBe('api-pms');
    expect(open.edges.some((e) => e.id === 'contains:ext-pms->api-pms')).toBe(true);
    expect(open.edges.some((e) => e.id === 'contains:api-pms->op-pms')).toBe(true);
  });

  it('an implemented API is a child of its context, expandable to occurrences', () => {
    const model = baseModel({
      ...strategicModel(),
      apis: [{ id: 'api-impl', name: 'Impl API', operations: [{ id: 'op-i', name: 'op' }] }],
      apiImplementations: [{ apiId: 'api-impl', boundedContextId: 'mod-reservas' }],
    });
    const open = contextMapScene(model, {}, {}, new Set(['mod-reservas', 'apiimpl:api-impl@mod-reservas']));
    const impl = open.nodes.find((n) => n.id === 'apiimpl:api-impl@mod-reservas')!;
    expect(impl.ownerId).toBe('mod-reservas');
    const occ = open.nodes.find((n) => n.id === 'apiop:op-i@mod-reservas')!;
    expect(occ.ownerId).toBe('apiimpl:api-impl@mod-reservas');
  });
});

describe('contextMapScene — relations never hide (roll-up to the visible ancestor)', () => {
  const coupledModel = () =>
    baseModel({
      ...strategicModel(),
      boundedContexts: [
        {
          id: 'mod-reservas', name: 'Reservas', subdomainType: 'CORE',
          useCases: [{ id: 'uc-book', name: 'Reservar' }], domainEvents: [],
        },
        {
          id: 'mod-facturas', name: 'Facturación', subdomainType: 'SUPPORTING',
          useCases: [{ id: 'uc-bill', name: 'Facturar' }, { id: 'uc-notify', name: 'Avisar' }],
        },
      ],
      useCaseCalls: [
        { sourceId: 'uc-book', targetId: 'uc-bill' },
        { sourceId: 'uc-book', targetId: 'uc-notify' },
      ],
    });

  it('a folded context shows its children\'s couplings, re-anchored at its box', () => {
    const scene = contextMapScene(coupledModel(), {});
    const rolled = scene.edges.filter((e) => e.kind === 'uc-call');
    expect(rolled).toHaveLength(1); // two calls collapse onto the same pair: one line
    expect(rolled[0].sourceId).toBe('mod-reservas');
    expect(rolled[0].targetId).toBe('mod-facturas');
    expect(rolled[0].tooltip).toContain('plegado');
  });

  it('half-open: the visible child anchors fine, the folded side rolls up', () => {
    const scene = contextMapScene(coupledModel(), {}, {}, new Set(['mod-reservas']));
    const rolled = scene.edges.filter((e) => e.kind === 'uc-call');
    expect(rolled).toHaveLength(1);
    expect(rolled[0].sourceId).toBe('uc-book');
    expect(rolled[0].targetId).toBe('mod-facturas');
  });

  it('fully open: the fine edges return, one per call', () => {
    const scene = contextMapScene(coupledModel(), {}, {}, new Set(['mod-reservas', 'mod-facturas']));
    const fine = scene.edges.filter((e) => e.kind === 'uc-call');
    expect(fine.map((e) => `${e.sourceId}->${e.targetId}`).sort()).toEqual([
      'uc-book->uc-bill',
      'uc-book->uc-notify',
    ]);
  });

  it('internal couplings fold WITH the box (both ends inside)', () => {
    const model = baseModel({
      ...coupledModel(),
      useCaseCalls: [{ sourceId: 'uc-bill', targetId: 'uc-notify' }],
    });
    const folded = contextMapScene(model, {});
    expect(folded.edges.filter((e) => e.kind === 'uc-call')).toHaveLength(0);
    const open = contextMapScene(model, {}, {}, new Set(['mod-facturas']));
    expect(open.edges.filter((e) => e.kind === 'uc-call')).toHaveLength(1);
  });
});

describe('contextMapScene — expandAll (the yugo wants the whole tree)', () => {
  it('unfolds everything without touching the expanded set', () => {
    const model = baseModel({
      ...strategicModel(),
      externalSystems: [
        { id: 'ext-rumbo', name: 'Rumbo', useCases: [{ id: 'xuc-r', name: 'R' }] },
        { id: 'ext-ventus', name: 'Ventus', parentExternalSystemId: 'ext-rumbo' },
      ],
      apis: [{
        id: 'api-v', name: 'V API',
        operations: [{ id: 'op-v', name: 'consulta' }],
        publishedByExternalSystemId: 'ext-ventus',
      }],
    });
    const scene = contextMapScene(model, {}, {}, new Set(), true);
    const byId = new Map(scene.nodes.map((n) => [n.id, n]));
    expect(byId.get('agg-reserva')?.ownerId).toBe('mod-reservas');
    expect(byId.get('xuc-r')?.ownerId).toBe('ext-rumbo');
    expect(byId.get('ext-ventus')?.ownerId).toBe('ext-rumbo');
    expect(byId.get('api-v')?.ownerId).toBe('ext-ventus');
    expect(byId.get('op-v')?.ownerId).toBe('api-v');
  });
});

describe('contextMapScene — subsystems', () => {
  it('a subsystem never floats top-level: it enters through its parent, with its diamond', () => {
    const model = baseModel({
      ...strategicModel(),
      externalSystems: [
        { id: 'ext-rumbo', name: 'Rumbo' },
        { id: 'ext-ventus', name: 'Ventus', parentExternalSystemId: 'ext-rumbo' },
      ],
    });
    const folded = contextMapScene(model, {});
    expect(folded.nodes.find((n) => n.id === 'ext-ventus')).toBeUndefined();
    const unfolded = contextMapScene(model, {}, undefined, new Set(['ext-rumbo']));
    const sub = unfolded.nodes.find((n) => n.id === 'ext-ventus')!;
    expect(sub.ownerId).toBe('ext-rumbo');
    expect(sub.parentId).toBeUndefined();
    expect(unfolded.edges.some((e) => e.id === 'contains:ext-rumbo->ext-ventus')).toBe(true);
  });

  it('a subsystem with content wears its own chevron and unfolds it', () => {
    const model = baseModel({
      ...strategicModel(),
      externalSystems: [
        { id: 'ext-rumbo', name: 'Rumbo' },
        {
          id: 'ext-ventus', name: 'Ventus', parentExternalSystemId: 'ext-rumbo',
          useCases: [{ id: 'xuc-1', name: 'Disponibilidad' }],
          tables: [{ id: 'xt-1', name: 'RESERVAS' }],
        },
      ],
    });
    const parent = contextMapScene(model, {}, undefined, new Set(['ext-rumbo']));
    const sub = parent.nodes.find((n) => n.id === 'ext-ventus')!;
    expect(sub.collapsible).toBe(true);
    expect(parent.nodes.find((n) => n.id === 'xuc-1')).toBeUndefined();
    const open = contextMapScene(model, {}, undefined, new Set(['ext-rumbo', 'ext-ventus']));
    expect(open.nodes.find((n) => n.id === 'xuc-1')?.ownerId).toBe('ext-ventus');
    expect(open.nodes.find((n) => n.id === 'xt-1')?.ownerId).toBe('ext-ventus');
  });

  it('an orphaned parent reference falls back to top-level', () => {
    const model = baseModel({
      ...strategicModel(),
      externalSystems: [{ id: 'ext-ventus', name: 'Ventus', parentExternalSystemId: 'ext-gone' }],
    });
    const scene = contextMapScene(model, {});
    expect(scene.nodes.find((n) => n.id === 'ext-ventus')).toBeDefined();
  });
});

describe('distributionScene — the distribution lens (pure topology)', () => {
  it('hides the strategic cast', () => {
    const scene = distributionScene(strategicModel(), {});
    const ids = scene.nodes.map((n) => n.id);
    expect(ids).not.toContain('ext-pms');
    expect(ids).not.toContain('agg-reserva');
  });

  it('keeps a single main module implicit — the context is the deployment target', () => {
    const model = baseModel({
      ...strategicModel(),
      modules: [
        { id: 'mod-reservas-main', name: 'Reservas', boundedContextId: 'mod-reservas', main: true },
      ],
      services: [{ id: 'svc-1', name: 'S1', moduleIds: ['mod-reservas-main'] }],
    });
    const scene = distributionScene(model, {});
    expect(scene.nodes.map((n) => n.id)).not.toContain('mod-reservas-main');
    const deploy = scene.edges.find((e) => e.kind === 'deploys')!;
    expect(deploy.targetId).toBe('mod-reservas');
    // the edge still remembers WHICH module it deploys, so Supr keeps working
    expect(deploy.id).toBe('deploy:svc-1->mod-reservas-main');
  });

  it('an expanded context offers modules AND its loose elements to package', () => {
    const model = baseModel({
      ...strategicModel(),
      modules: [
        { id: 'mod-reservas-main', name: 'Reservas', boundedContextId: 'mod-reservas', main: true, elementIds: ['uc-book'] },
        { id: 'mod-reservas-read', name: 'Reservas read', boundedContextId: 'mod-reservas' },
      ],
    });
    const scene = distributionScene(model, {}, {}, new Set(['mod-reservas', 'mod-reservas-main']));
    // the aggregate is unassigned: it floats off the context, ready to be packed
    expect(scene.nodes.find((n) => n.id === 'agg-reserva')?.ownerId).toBe('mod-reservas');
    // the packed use case hangs off ITS module
    expect(scene.nodes.find((n) => n.id === 'uc-book')?.ownerId).toBe('mod-reservas-main');
    expect(scene.edges.some((e) => e.id === 'contains:mod-reservas-main->uc-book')).toBe(true);
  });

  it('a second module unfolds through the context, as free boxes with diamonds', () => {
    const model = baseModel({
      ...strategicModel(),
      modules: [
        { id: 'mod-reservas-main', name: 'Reservas', boundedContextId: 'mod-reservas', main: true },
        { id: 'mod-reservas-read', name: 'Reservas read', boundedContextId: 'mod-reservas' },
      ],
      services: [{ id: 'svc-1', name: 'S1', moduleIds: ['mod-reservas-main', 'mod-reservas-read'] }],
    });
    const scene = distributionScene(model, {}, {}, new Set(['mod-reservas']));
    const main = scene.nodes.find((n) => n.id === 'mod-reservas-main')!;
    expect(main.ownerId).toBe('mod-reservas');
    expect(scene.edges.some((e) => e.id === 'contains:mod-reservas->mod-reservas-read')).toBe(true);
    const deploys = scene.edges.filter((e) => e.kind === 'deploys');
    expect(deploys.map((e) => e.targetId).sort()).toEqual(['mod-reservas-main', 'mod-reservas-read']);
  });
});
