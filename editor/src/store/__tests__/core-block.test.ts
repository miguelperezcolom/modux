/**
 * The rest of the core DDD block, ported from `EditorApiController`.
 *
 * These assert the parts a table-driven applier cannot: the guards that refuse a delete, the
 * satellite elements a command creates so the model is complete, and the handful of places where
 * a stored field is not called what the command calls it. The bookkeeping — idempotency, parent
 * lists, reference scrubbing — is `spec.ts`'s and is covered in `apply.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import { apply, applyAll, CommandError, supports } from '../apply.js';
import { crudApiId, crudUseCaseIds, lifecycleEvents, listingQueryId } from '../scaffold.js';
import { ModelStore, type Element } from '../store.js';
import { project } from '../project.js';

/** A model with one context, one aggregate in it, and one service. */
function model(extra: Record<string, Element[]> = {}): ModelStore {
  return ModelStore.from({
    boundedContexts: [{ id: 'bc-res', name: 'Reservas', aggregateIds: ['agg-reserva'], useCaseIds: [] }],
    aggregates: [{ id: 'agg-reserva', name: 'Reserva', modelId: 'model-reserva', operations: [] }],
    services: [{ id: 'svc', name: 'Servicio', moduleIds: [] }],
    ...extra,
  });
}

describe('systems (C4 grouping)', () => {
  it('creates a system, nests a context and a subsystem, and refuses to leave while occupied', () => {
    const store = model();
    applyAll(store, [
      { kind: 'add-system', id: 'sys-riu', name: 'RIU' },
      { kind: 'add-system', id: 'sys-net', name: 'RumboNet' },
      { kind: 'set-system-parent', id: 'sys-net', parentSystemId: 'sys-riu' },
      { kind: 'set-context-system', id: 'bc-res', parentSystemId: 'sys-riu' },
    ] as never);
    expect(store.get('systems', 'sys-net')?.parentSystemId).toBe('sys-riu');
    expect(store.get('boundedContexts', 'bc-res')?.parentSystemId).toBe('sys-riu');

    // a system does not leave while it still groups contexts / subsystems
    expect(() => apply(store, { kind: 'remove-system', id: 'sys-riu' } as never)).toThrow(CommandError);

    // detach both, then it goes
    applyAll(store, [
      { kind: 'set-system-parent', id: 'sys-net', parentSystemId: null },
      { kind: 'set-context-system', id: 'bc-res', parentSystemId: null },
      { kind: 'remove-system', id: 'sys-riu' },
    ] as never);
    expect(store.has('systems', 'sys-riu')).toBe(false);
    expect(store.get('boundedContexts', 'bc-res')?.parentSystemId).toBeFalsy(); // detached
  });

  it('rejects an unknown system and self-parenting', () => {
    const store = model();
    apply(store, { kind: 'add-system', id: 'sys-a', name: 'A' } as never);
    expect(() => apply(store, { kind: 'set-context-system', id: 'bc-res', parentSystemId: 'nope' } as never)).toThrow(CommandError);
    expect(() => apply(store, { kind: 'set-system-parent', id: 'sys-a', parentSystemId: 'sys-a' } as never)).toThrow(CommandError);
  });
});

describe('actors', () => {
  it('routes a use to the right list by what the target turns out to be', () => {
    const store = model({
      roles: [{ id: 'act-agente', name: 'Agente' }],
      useCases: [{ id: 'uc-reservar', name: 'Reservar' }],
      queryServices: [{ id: 'qs-dispo', name: 'Disponibilidad' }],
    });

    apply(store, { kind: 'add-actor-use', sourceId: 'act-agente', targetId: 'uc-reservar' } as never);
    apply(store, { kind: 'add-actor-use', sourceId: 'act-agente', targetId: 'qs-dispo' } as never);

    expect(store.get('roles', 'act-agente')).toMatchObject({
      allowedUseCaseIds: ['uc-reservar'],
      allowedQueryServiceIds: ['qs-dispo'],
    });
  });

  it('refuses a target that is neither', () => {
    const store = model({ roles: [{ id: 'act-agente', name: 'Agente' }] });

    expect(() => apply(store,
      { kind: 'add-actor-use', sourceId: 'act-agente', targetId: 'agg-reserva' } as never))
      .toThrow(CommandError);
  });

  it('will not delete an actor that a process step is assigned to', () => {
    const store = model({
      roles: [{ id: 'act-agente', name: 'Agente' }],
      processes: [{ id: 'pr-1', name: 'Alta', steps: [{ id: 's1', roleId: 'act-agente' }] }],
    });

    expect(() => apply(store, { kind: 'remove-actor', id: 'act-agente' } as never))
      .toThrow(/participa en procesos/);
  });
});

describe('what a module packages', () => {
  /** An element lives in exactly one module of its context, so assigning MOVES it. */
  it('moves the element out of its sibling module', () => {
    const store = model({
      modules: [
        { id: 'mod-a', boundedContextId: 'bc-res', elementIds: ['agg-reserva'] },
        { id: 'mod-b', boundedContextId: 'bc-res', elementIds: [] },
      ],
    });

    apply(store, { kind: 'add-module-element', id: 'mod-b', elementId: 'agg-reserva' } as never);

    // emptied lists are not stored at all — that is the NON_EMPTY rule the writer mirrors (§2.6)
    expect(store.get('modules', 'mod-a')?.elementIds).toBeUndefined();
    expect(store.get('modules', 'mod-b')?.elementIds).toEqual(['agg-reserva']);
  });

  it('leaves a module of ANOTHER context alone', () => {
    const store = model({
      modules: [
        { id: 'mod-otro', boundedContextId: 'bc-otro', elementIds: ['agg-reserva'] },
        { id: 'mod-b', boundedContextId: 'bc-res', elementIds: [] },
      ],
    });

    apply(store, { kind: 'add-module-element', id: 'mod-b', elementId: 'agg-reserva' } as never);

    expect(store.get('modules', 'mod-otro')?.elementIds).toEqual(['agg-reserva']);
  });
});

describe('APIs and the proxies that front them', () => {
  const withApi = () => model({
    apis: [{ id: 'api-1', name: 'Booking', operations: [] }],
    externalSystems: [{ id: 'ext-ota', name: 'OTA', dependsOnApiIds: ['api-1'] }],
  });

  it('will not delete an API somebody depends on', () => {
    expect(() => apply(withApi(), { kind: 'remove-api', id: 'api-1' } as never))
      .toThrow(/dependen de ella/);
  });

  /** Fronting an API is not meant to disconnect anyone: consumers keep consuming, via the proxy. */
  it('hands the API consumers over to a proxy put in front of it', () => {
    const store = withApi();

    apply(store, { kind: 'add-proxy-api', id: 'px-1', name: 'Proxy', targetId: 'api-1' } as never);

    expect(store.get('externalSystems', 'ext-ota')?.dependsOnApiIds).toEqual(['px-1']);
  });

  it('does not make the proxy publisher depend on its own API', () => {
    const store = model({
      apis: [{ id: 'api-1', name: 'Booking', operations: [] }],
      externalSystems: [{ id: 'ext-ota', name: 'OTA', dependsOnApiIds: ['api-1'] }],
    });

    apply(store, {
      kind: 'add-proxy-api', id: 'px-1', name: 'Proxy', targetId: 'api-1', boundedContextId: 'ext-ota',
    } as never);

    expect(store.get('externalSystems', 'ext-ota')?.dependsOnApiIds).toEqual(['api-1']);
  });

  it('hands them back when the proxy goes', () => {
    const store = withApi();
    apply(store, { kind: 'add-proxy-api', id: 'px-1', name: 'Proxy', targetId: 'api-1' } as never);

    apply(store, { kind: 'remove-proxy-api', id: 'px-1' } as never);

    expect(store.get('externalSystems', 'ext-ota')?.dependsOnApiIds).toEqual(['api-1']);
  });

  it('makes gateways and agents let go of operations that leave with their API', () => {
    const store = model({
      apis: [{ id: 'api-1', name: 'Booking', operations: [{ id: 'op-1', name: 'book' }] }],
      mcpGateways: [{ id: 'gw', apiIds: ['api-1'], apiOperationIds: ['op-1'] }],
      aiAgents: [{ id: 'ag', allowedApiOperationIds: ['op-1', 'op-otra'] }],
    });

    apply(store, { kind: 'remove-api', id: 'api-1' } as never);

    expect(store.get('mcpGateways', 'gw')).toEqual({ id: 'gw' });
    expect(store.get('aiAgents', 'ag')?.allowedApiOperationIds).toEqual(['op-otra']);
  });
});

describe('external systems', () => {
  const twoSystems = () => model({
    externalSystems: [
      { id: 'ext-pms', name: 'PMS' },
      { id: 'ext-ota', name: 'OTA' },
    ],
  });

  it('refuses to nest a system inside something that lives within it', () => {
    const store = twoSystems();
    apply(store, { kind: 'set-external-system-parent', id: 'ext-ota', parentId: 'ext-pms' } as never);

    expect(() => apply(store,
      { kind: 'set-external-system-parent', id: 'ext-pms', parentId: 'ext-ota' } as never))
      .toThrow(/en círculo/);
  });

  /** Containment says everything a dependency edge between the pair was saying. */
  it('drops the pair dependency once one contains the other', () => {
    const store = twoSystems();
    apply(store, { kind: 'add-external-dependency', sourceId: 'ext-ota', targetId: 'ext-pms' } as never);

    apply(store, { kind: 'set-external-system-parent', id: 'ext-ota', parentId: 'ext-pms' } as never);

    expect(store.get('externalSystems', 'ext-ota')?.dependsOnExternalSystemIds).toBeUndefined();
  });

  it('retypes the edge instead of leaving both flavours', () => {
    const store = twoSystems();
    apply(store, { kind: 'add-external-dependency', sourceId: 'ext-ota', targetId: 'ext-pms' } as never);

    apply(store, {
      kind: 'add-external-dependency', sourceId: 'ext-ota', targetId: 'ext-pms', type: 'CQRS',
    } as never);

    expect(store.get('externalSystems', 'ext-ota')?.dependsOnExternalSystemIds).toBeUndefined();
    expect(store.get('externalSystems', 'ext-ota')?.cqrsExternalSystemIds).toEqual(['ext-pms']);
  });

  it('lets the contracts a departing system published survive, unattributed', () => {
    const store = model({
      externalSystems: [{ id: 'ext-pms', name: 'PMS' }],
      apis: [{ id: 'api-1', name: 'PMS API', publishedByExternalSystemId: 'ext-pms' }],
    });

    apply(store, { kind: 'remove-external-system', id: 'ext-pms' } as never);

    expect(store.has('apis', 'api-1')).toBe(true);
    expect(store.get('apis', 'api-1')?.publishedByExternalSystemId).toBeUndefined();
  });

  /** An external call is an inbound ACL, held by the context that owns the use case. */
  it('wires an inbound ACL on the context that owns the called use case', () => {
    const store = model({
      externalSystems: [{ id: 'ext-ota', name: 'OTA' }],
      useCases: [{ id: 'uc-reservar', name: 'Reservar' }],
      boundedContexts: [{ id: 'bc-res', name: 'Reservas', useCaseIds: ['uc-reservar'] }],
    });

    apply(store, { kind: 'add-external-call', sourceId: 'ext-ota', targetId: 'uc-reservar' } as never);

    expect(store.get('boundedContexts', 'bc-res')?.acls).toEqual([expect.objectContaining({
      externalSystem: 'ext-ota', direction: 'INBOUND', translatedUseCaseIds: ['uc-reservar'],
    })]);
  });

  it('takes the ACL away again when it no longer translates anything', () => {
    const store = model({
      externalSystems: [{ id: 'ext-ota', name: 'OTA' }],
      useCases: [{ id: 'uc-reservar', name: 'Reservar' }],
      boundedContexts: [{ id: 'bc-res', name: 'Reservas', useCaseIds: ['uc-reservar'] }],
    });
    apply(store, { kind: 'add-external-call', sourceId: 'ext-ota', targetId: 'uc-reservar' } as never);

    apply(store, { kind: 'remove-external-call', sourceId: 'ext-ota', targetId: 'uc-reservar' } as never);

    expect(store.get('boundedContexts', 'bc-res')?.acls).toBeUndefined();
  });
});

describe('what things do', () => {
  it('wires a call to the aggregate’s only operation, and leaves the choice open otherwise', () => {
    const one = model({ useCases: [{ id: 'uc-1', name: 'Reservar' }] });
    one.put('aggregates', {
      id: 'agg-reserva', name: 'Reserva', operations: [{ id: 'op-confirmar', name: 'confirmar' }],
    });
    apply(one, { kind: 'add-aggregate-call', sourceId: 'uc-1', targetId: 'agg-reserva' } as never);
    expect((one.get('useCases', 'uc-1')!.steps as Element[])[0].operationId).toBe('op-confirmar');

    const two = model({ useCases: [{ id: 'uc-1', name: 'Reservar' }] });
    two.put('aggregates', {
      id: 'agg-reserva', name: 'Reserva', operations: [{ id: 'a' }, { id: 'b' }],
    });
    apply(two, { kind: 'add-aggregate-call', sourceId: 'uc-1', targetId: 'agg-reserva' } as never);
    expect((two.get('useCases', 'uc-1')!.steps as Element[])[0].operationId).toBeUndefined();
  });

  it('refuses a use case that calls itself', () => {
    const store = model({ useCases: [{ id: 'uc-1', name: 'Reservar' }] });

    expect(() => apply(store,
      { kind: 'add-use-case-call', sourceId: 'uc-1', targetId: 'uc-1' } as never))
      .toThrow(/a sí mismo/);
  });

  /** `emits` is a comma-separated list of event NAMES — the stored shape, not a list of ids. */
  it('appends the event name to the first operation’s emits', () => {
    const store = model({ domainEvents: [{ id: 'ev-creada', name: 'ReservaCreada' }] });
    store.put('aggregates', {
      id: 'agg-reserva', name: 'Reserva', operations: [{ id: 'op-1', name: 'crear', emits: 'Otro' }],
    });

    apply(store, { kind: 'add-emission', sourceId: 'agg-reserva', targetId: 'ev-creada' } as never);

    expect((store.get('aggregates', 'agg-reserva')!.operations as Element[])[0].emits)
      .toBe('Otro,ReservaCreada');
  });

  it('edits a use case contract and its steps: custom work goes before the publishing', () => {
    const store = model({
      models: [{ id: 'm-in', name: 'In' }],
      domainEvents: [{ id: 'ev', name: 'Hecho' }],
      useCases: [{ id: 'uc', name: 'Hacer', steps: [] }],
    });
    apply(store, { kind: 'add-emission', sourceId: 'uc', targetId: 'ev' } as never);
    apply(store, { kind: 'add-use-case-step', useCaseId: 'uc', id: 's1', name: 'hacer' } as never);
    apply(store, { kind: 'set-use-case-step-intent', useCaseId: 'uc', stepId: 's1', intent: 'Hace la cosa' } as never);
    apply(store, { kind: 'set-use-case-contract', id: 'uc', inputModelId: 'm-in', exposedAsRest: true } as never);

    const uc = store.get('useCases', 'uc')!;
    expect((uc.steps as Element[]).map((s) => s.type)).toEqual(['Custom', 'PublishDomainEvent']);
    expect((uc.steps as Element[])[0].intent).toBe('Hace la cosa');
    expect(uc).toMatchObject({ inputModelId: 'm-in', exposedAsRest: true });

    apply(store, { kind: 'move-use-case-step', useCaseId: 'uc', stepId: 's1', delta: 1 } as never);
    expect((store.get('useCases', 'uc')!.steps as Element[]).map((s) => s.id)[1]).toBe('s1');
    expect(() => apply(store, { kind: 'set-use-case-contract', id: 'uc', inputModelId: 'no-existe' } as never)).toThrow(CommandError);
    apply(store, { kind: 'set-use-case-contract', id: 'uc', inputModelId: null } as never);
    expect(store.get('useCases', 'uc')!.inputModelId).toBeUndefined();
    expect(project(store).looseUseCases?.find((u) => u.id === 'uc')).toMatchObject({ exposedAsRest: true });
  });

  it('describes an element, top-level or nested, and clears it', () => {
    const store = model();
    store.put('aggregates', { id: 'agg-reserva', name: 'Reserva', operations: [{ id: 'op-1', name: 'crear' }] });
    apply(store, { kind: 'set-element-description', type: 'aggregate', id: 'agg-reserva', description: 'Una reserva' } as never);
    apply(store, { kind: 'set-element-description', type: 'operation', id: 'op-1', description: 'La crea' } as never);
    expect(store.get('aggregates', 'agg-reserva')?.description).toBe('Una reserva');
    expect((store.get('aggregates', 'agg-reserva')!.operations as Element[])[0].description).toBe('La crea');
    expect(project(store).descriptions?.['agg-reserva']).toBe('Una reserva');
    apply(store, { kind: 'set-element-description', type: 'aggregate', id: 'agg-reserva', description: '  ' } as never);
    expect(store.get('aggregates', 'agg-reserva')?.description).toBeUndefined();
  });

  it('writes operations with the field the generator reads, and describes them', () => {
    const store = model();
    apply(store, { kind: 'add-operation', aggregateId: 'agg-reserva', id: 'op-1', name: 'cancelar' } as never);
    apply(store, { kind: 'set-operation-intent', id: 'op-1', intent: 'Cancela la reserva' } as never);
    expect((store.get('aggregates', 'agg-reserva')!.operations as Element[])[0])
      .toEqual({ id: 'op-1', name: 'cancelar', type: 'CUSTOM', intent: 'Cancela la reserva' });
    expect(project(store).aggregates?.[0].operations?.[0]).toMatchObject({ name: 'cancelar', intent: 'Cancela la reserva' });
  });

  it('gives a service a valid port of its own', () => {
    const store = model({ services: [{ id: 'a', name: 'A', moduleIds: [] }, { id: 'b', name: 'B', moduleIds: [] }] });
    apply(store, { kind: 'set-service-port', id: 'a', port: '8081' } as never);
    expect(store.get('services', 'a')?.port).toBe(8081);
    expect(project(store).services?.find((s) => s.id === 'a')?.port).toBe(8081);
    expect(() => apply(store, { kind: 'set-service-port', id: 'b', port: 8081 } as never)).toThrow(/ya lo usa/);
    expect(() => apply(store, { kind: 'set-service-port', id: 'b', port: 'abc' } as never)).toThrow(/no es un puerto/);
    apply(store, { kind: 'set-service-port', id: 'a', port: '' } as never);
    expect(store.get('services', 'a')?.port).toBeUndefined();
  });

  it('aims a scheduled trigger with the field the generator reads, on a Spring cron', () => {
    const store = model({ useCases: [{ id: 'uc-detectar', name: 'DetectarRetrasos' }] });
    apply(store, { kind: 'add-scheduled-trigger', id: 'st-1', name: 'Diario' } as never);
    apply(store, { kind: 'set-element-context', type: 'scheduledTriggers', id: 'st-1', boundedContextId: 'bc-res' } as never);
    apply(store, { kind: 'set-scheduled-trigger-target', id: 'st-1', targetUseCaseId: 'uc-detectar' } as never);
    expect(store.get('scheduledTriggers', 'st-1')).toMatchObject({ useCaseId: 'uc-detectar', cronExpression: '0 0 0 * * *' });
    expect(store.get('scheduledTriggers', 'st-1')?.targetUseCaseId).toBeUndefined();
    expect(store.get('boundedContexts', 'bc-res')?.scheduledTriggerIds).toEqual(['st-1']);
    expect(() => apply(store, { kind: 'set-scheduled-trigger-cron', id: 'st-1', cronExpression: '0 6 * * *' } as never))
      .toThrow(/seis campos/);
    apply(store, { kind: 'set-scheduled-trigger-cron', id: 'st-1', cronExpression: '0 0 6 * * *' } as never);
    expect(project(store).boundedContexts.find((c) => c.id === 'bc-res')?.scheduledTriggers)
      .toEqual([{ id: 'st-1', name: 'Diario', cronExpression: '0 0 6 * * *', useCaseId: 'uc-detectar' }]);
  });

  it('lets a use case publish a domain event as a step, and takes it back', () => {
    const store = model({
      domainEvents: [{ id: 'ev-devuelto', name: 'LibroDevuelto' }],
      useCases: [{ id: 'uc-devolver', name: 'Devolver', steps: [{ id: 's1', name: 'devolver', type: 'Custom' }] }],
    });
    apply(store, { kind: 'add-emission', sourceId: 'uc-devolver', targetId: 'ev-devuelto' } as never);
    apply(store, { kind: 'add-emission', sourceId: 'uc-devolver', targetId: 'ev-devuelto' } as never);
    expect((store.get('useCases', 'uc-devolver')!.steps as Element[]).map((s) => s.type)).toEqual(['Custom', 'PublishDomainEvent']);
    apply(store, { kind: 'remove-emission', sourceId: 'uc-devolver', targetId: 'ev-devuelto' } as never);
    expect((store.get('useCases', 'uc-devolver')!.steps as Element[]).map((s) => s.type)).toEqual(['Custom']);
  });

  it('gives an emitter with no operations a stub to carry the emission, and takes it back', () => {
    const store = model({ domainEvents: [{ id: 'ev-creada', name: 'ReservaCreada' }] });

    apply(store, { kind: 'add-emission', sourceId: 'agg-reserva', targetId: 'ev-creada' } as never);
    expect((store.get('aggregates', 'agg-reserva')!.operations as Element[])[0])
      .toMatchObject({ id: 'op-emit-ev-creada', emits: 'ReservaCreada' });

    apply(store, { kind: 'remove-emission', sourceId: 'agg-reserva', targetId: 'ev-creada' } as never);
    expect(store.get('aggregates', 'agg-reserva')?.operations).toBeUndefined();
  });

  it('does not emit the same event twice, whatever the case', () => {
    const store = model({ domainEvents: [{ id: 'ev-creada', name: 'ReservaCreada' }] });
    store.put('aggregates', {
      id: 'agg-reserva', name: 'Reserva', operations: [{ id: 'op-1', emits: 'reservacreada' }],
    });

    apply(store, { kind: 'add-emission', sourceId: 'agg-reserva', targetId: 'ev-creada' } as never);

    expect((store.get('aggregates', 'agg-reserva')!.operations as Element[])[0].emits)
      .toBe('reservacreada');
  });
});

describe('processes, where order is data', () => {
  const process = () => model({
    processes: [{ id: 'pr-1', name: 'Alta', steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }],
  });
  const stepIds = (store: ModelStore) =>
    (store.get('processes', 'pr-1')!.steps as Element[]).map((s) => s.id);

  it('adds after the named step, and at the end when none is named', () => {
    const store = process();
    apply(store, { kind: 'add-process-step', processId: 'pr-1', id: 'x', afterStepId: 'a' } as never);
    apply(store, { kind: 'add-process-step', processId: 'pr-1', id: 'z' } as never);

    expect(stepIds(store)).toEqual(['a', 'x', 'b', 'c', 'z']);
  });

  /** A move with no anchor goes to the FRONT — the only unambiguous «nowhere» for a move. */
  it('moves to the front when no anchor is given', () => {
    const store = process();

    apply(store, { kind: 'move-process-step', processId: 'pr-1', id: 'c' } as never);

    expect(stepIds(store)).toEqual(['c', 'a', 'b']);
  });

  it('moves after the anchor without duplicating the step', () => {
    const store = process();

    apply(store, { kind: 'move-process-step', processId: 'pr-1', id: 'a', afterStepId: 'b' } as never);

    expect(stepIds(store)).toEqual(['b', 'a', 'c']);
  });
});

describe('the CRUD every consumer reinforces', () => {
  it('derives one shared core, whoever asks for it', () => {
    const store = model({ roles: [{ id: 'act-agente', name: 'Agente' }] });

    apply(store, { kind: 'add-actor-crud', sourceId: 'act-agente', targetId: 'agg-reserva' } as never);

    const ids = crudUseCaseIds('agg-reserva');
    expect(ids).toEqual(['uc-crearAgg-reserva', 'uc-actualizarAgg-reserva', 'uc-eliminarAgg-reserva']);
    for (const id of ids) expect(store.has('useCases', id)).toBe(true);
    expect(store.get('boundedContexts', 'bc-res')?.useCaseIds).toEqual(expect.arrayContaining(ids));
    expect(store.get('roles', 'act-agente')?.allowedUseCaseIds).toEqual(ids);
  });

  /** «Reserva» is Creada, not Creado: the participle follows the aggregate name's gender. */
  it('names the lifecycle events with the right gender', () => {
    const feminine = lifecycleEvents({ id: 'agg-reserva', name: 'Reserva' });
    const masculine = lifecycleEvents({ id: 'agg-pedido', name: 'Pedido' });

    expect(feminine.map((e) => e.name))
      .toEqual(['ReservaCreada', 'ReservaModificada', 'ReservaEliminada']);
    expect(masculine.map((e) => e.name))
      .toEqual(['PedidoCreado', 'PedidoModificado', 'PedidoEliminado']);
  });

  it('adds the contract and the listing query only when somebody integrates', () => {
    const store = model({
      roles: [{ id: 'act', name: 'Agente' }],
      externalSystems: [{ id: 'ext-ota', name: 'OTA' }],
    });

    apply(store, { kind: 'add-actor-crud', sourceId: 'act', targetId: 'agg-reserva' } as never);
    expect(store.has('apis', crudApiId('agg-reserva'))).toBe(false);

    apply(store, { kind: 'add-external-crud', sourceId: 'ext-ota', targetId: 'agg-reserva' } as never);
    expect(store.has('apis', crudApiId('agg-reserva'))).toBe(true);
    expect(store.has('queryServices', listingQueryId('agg-reserva'))).toBe(true);
    expect(store.get('externalSystems', 'ext-ota')?.dependsOnApiIds)
      .toEqual([crudApiId('agg-reserva')]);
  });

  it('is idempotent: two consumers derive the same elements, not two sets', () => {
    const store = model({
      roles: [{ id: 'act-a', name: 'A' }, { id: 'act-b', name: 'B' }],
    });

    apply(store, { kind: 'add-actor-crud', sourceId: 'act-a', targetId: 'agg-reserva' } as never);
    apply(store, { kind: 'add-actor-crud', sourceId: 'act-b', targetId: 'agg-reserva' } as never);

    expect(store.all('useCases')).toHaveLength(3);
    expect(store.get('boundedContexts', 'bc-res')?.useCaseIds).toHaveLength(3);
  });

  /** The derived use cases leave with the LAST consumer, not the first. */
  it('keeps the use cases while another actor is still allowed on them', () => {
    const store = model({
      roles: [{ id: 'act-a', name: 'A' }, { id: 'act-b', name: 'B' }],
    });
    apply(store, { kind: 'add-actor-crud', sourceId: 'act-a', targetId: 'agg-reserva' } as never);
    apply(store, { kind: 'add-actor-crud', sourceId: 'act-b', targetId: 'agg-reserva' } as never);

    apply(store, { kind: 'remove-actor-crud', sourceId: 'act-a', targetId: 'agg-reserva' } as never);
    expect(store.all('useCases')).toHaveLength(3);

    apply(store, { kind: 'remove-actor-crud', sourceId: 'act-b', targetId: 'agg-reserva' } as never);
    expect(store.all('useCases')).toHaveLength(0);
  });

  it('refuses an aggregate that belongs to no context', () => {
    const store = ModelStore.from({
      aggregates: [{ id: 'agg-suelto', name: 'Suelto' }],
      roles: [{ id: 'act', name: 'A' }],
    });

    expect(() => apply(store,
      { kind: 'add-actor-crud', sourceId: 'act', targetId: 'agg-suelto' } as never))
      .toThrow(/no pertenece a ningún bounded context/);
  });
});

describe('renaming', () => {
  it('writes the name wherever that element type keeps it', () => {
    const store = model({
      notes: [{ id: 'n1', text: 'antes' }],
      roles: [{ id: 'act', name: 'antes' }],
    });

    apply(store, { kind: 'rename-element', type: 'note', id: 'n1', name: 'después' } as never);
    apply(store, { kind: 'rename-element', type: 'actor', id: 'act', name: 'después' } as never);

    // a note IS its text; it has no name
    expect(store.get('notes', 'n1')).toEqual({ id: 'n1', text: 'después' });
    expect(store.get('roles', 'act')?.name).toBe('después');
  });

  it('reaches into a nested item, whichever owner holds it', () => {
    const store = model();
    store.put('aggregates', {
      id: 'agg-reserva', name: 'Reserva', operations: [{ id: 'op-1', name: 'antes' }],
    });

    apply(store, { kind: 'rename-element', type: 'operation', id: 'op-1', name: 'después' } as never);

    expect((store.get('aggregates', 'agg-reserva')!.operations as Element[])[0].name).toBe('después');
  });

  it('carries a rename to the companions still named after their owner', () => {
    const store = model();
    apply(store, { kind: 'add-boundedContext', id: 'bc-x', name: 'Contexto' } as never);
    apply(store, { kind: 'add-aggregate', id: 'agg-x', name: 'Agregado', boundedContextId: 'bc-x' } as never);

    apply(store, { kind: 'rename-element', type: 'boundedContext', id: 'bc-x', name: 'Prestamos' } as never);
    apply(store, { kind: 'rename-element', type: 'aggregate', id: 'agg-x', name: 'Libro' } as never);

    expect(store.get('modules', 'bc-x-main')?.name).toBe('Prestamos');
    expect(store.get('models', 'model-x')?.name).toBe('Libro');
  });

  it('lets a service drawn after the contexts deploy their main modules', () => {
    const store = ModelStore.from({ projects: [{ id: 'p', name: 'P' }] });
    apply(store, { kind: 'add-boundedContext', id: 'bc-a', name: 'A' } as never);
    apply(store, { kind: 'add-service', id: 'svc-1', name: 'Uno' } as never);
    apply(store, { kind: 'add-service', id: 'svc-2', name: 'Dos' } as never);
    expect(store.get('services', 'svc-1')?.moduleIds).toEqual(['bc-a-main']);
    expect(store.get('services', 'svc-2')?.moduleIds).toBeUndefined();   // nothing left over
    expect(store.get('projects', 'p')?.serviceIds).toEqual(['svc-1', 'svc-2']);
  });

  it('names the CRUD API path after the aggregate, not its (possibly minted) id', () => {
    const store = model({
      boundedContexts: [{ id: 'bc-res', name: 'Reservas', aggregateIds: ['aggregate-1794138423702'] }, { id: 'bc-2', name: 'Otro' }],
      aggregates: [{ id: 'aggregate-1794138423702', name: 'Línea Pedido', modelId: 'm' }],
    });
    apply(store, { kind: 'add-context-crud', sourceId: 'bc-2', targetId: 'aggregate-1794138423702' } as never);
    const ops = store.get('apis', crudApiId('aggregate-1794138423702'))!.operations as Element[];
    expect(ops.map((o) => o.path)).toEqual(['/linea-pedido', '/linea-pedido/{id}', '/linea-pedido/{id}', '/linea-pedido']);
  });

  it('keeps an app title in step with its name until it has its own', () => {
    const store = model();
    apply(store, { kind: 'create-ui-app', id: 'app', name: 'App UI' } as never);
    apply(store, { kind: 'rename-element', type: 'ui-app', id: 'app', name: 'Backoffice' } as never);
    expect(store.get('uiAdapters', 'app')).toMatchObject({ name: 'Backoffice', title: 'Backoffice' });
    store.patch('uiAdapters', 'app', { title: 'Portal interno' });
    apply(store, { kind: 'rename-element', type: 'ui-app', id: 'app', name: 'Otra' } as never);
    expect(store.get('uiAdapters', 'app')?.title).toBe('Portal interno');
  });

  it('leaves a companion alone once it has a name of its own', () => {
    const store = model({ models: [{ id: 'model-reserva', name: 'EstadoReserva' }] });
    apply(store, { kind: 'rename-element', type: 'aggregate', id: 'agg-reserva', name: 'Booking' } as never);
    expect(store.get('models', 'model-reserva')?.name).toBe('EstadoReserva');
  });

  it('says so for a kind it does not know', () => {
    expect(() => apply(model(), { kind: 'rename-element', type: 'inventado', id: 'x' } as never))
      .toThrow(/no soportado/);
  });

  it('ignores a rename of something that is not there', () => {
    const store = model();
    expect(() => apply(store,
      { kind: 'rename-element', type: 'actor', id: 'fantasma', name: 'x' } as never)).not.toThrow();
  });
});

describe('the shapes the store actually uses', () => {
  /** The address is stored as `url`; `uri` is only what the command calls it. */
  it('writes a url’s address under the name the store reads', () => {
    const store = model();

    apply(store, { kind: 'add-url', id: 'u1', name: 'API', uri: 'https://api.acme.com' } as never);

    expect(store.get('urls', 'u1')).toMatchObject({ url: 'https://api.acme.com' });
    expect(store.get('urls', 'u1')?.uri).toBeUndefined();
  });

  it('unlinks a url from the services that answered at it', () => {
    const store = model({ urls: [{ id: 'u1', name: 'API' }] });
    apply(store, { kind: 'add-service-url', serviceId: 'svc', id: 'u1' } as never);

    apply(store, { kind: 'remove-url', id: 'u1' } as never);

    expect(store.get('services', 'svc')?.urlIds).toBeUndefined();
  });

  /** An edge ref is a view coordinate, not an element id, and is kept apart from ids. */
  it('keeps a note’s element targets and edge refs in different lists', () => {
    const store = model({ notes: [{ id: 'n1', text: 'ojo' }] });

    apply(store, { kind: 'note-attach', id: 'n1', targetId: 'agg-reserva' } as never);
    apply(store, { kind: 'note-attach', id: 'n1', targetId: 'bc-res->bc-otro' } as never);

    expect(store.get('notes', 'n1')).toMatchObject({
      targetIds: ['agg-reserva'],
      edgeRefs: ['bc-res->bc-otro'],
    });
  });

  it('takes a note’s text from what the command calls its name', () => {
    const store = model();

    apply(store, { kind: 'add-note', id: 'n1', name: 'un aviso' } as never);

    expect(store.get('notes', 'n1')).toEqual({ id: 'n1', text: 'un aviso' });
  });
});

describe('the block as a whole', () => {
  it('covers every core command the editor can emit', () => {
    const kinds = [
      'add-actor', 'add-actor-use', 'add-actor-crud', 'add-actor-external', 'add-view',
      'add-view-member', 'add-module-element', 'add-service-url', 'add-api', 'add-api-operation',
      'set-api-publisher', 'add-proxy-api', 'set-proxy-target', 'add-query-service',
      'add-projection', 'add-scheduled-trigger', 'set-scheduled-trigger-target',
      'add-external-system', 'set-external-system-parent', 'add-external-use-case',
      'add-external-table', 'add-mcp-server', 'add-external-call', 'add-external-uc-call',
      'add-external-dependency', 'add-external-crud', 'add-operation', 'add-emission',
      'add-aggregate-call', 'add-use-case-call', 'add-query-call', 'add-use-case-step',
      'add-flow', 'add-process', 'add-process-step', 'move-process-step', 'update-process-step',
      'add-context-crud', 'add-ui', 'add-ui-assignment', 'add-ui-serving', 'set-ui-context',
      'add-ui-crud', 'rename-element',
    ];

    expect(kinds.filter((kind) => !supports(kind))).toEqual([]);
  });

  /** A failed command in a batch must leave nothing behind — not even the elements it derived. */
  it('rolls a whole gesture back when one command in it fails', () => {
    const store = model({ roles: [{ id: 'act', name: 'A' }] });

    expect(() => applyAll(store, [
      { kind: 'add-actor-crud', sourceId: 'act', targetId: 'agg-reserva' },
      { kind: 'add-actor-use', sourceId: 'act', targetId: 'no-existe' },
    ] as never)).toThrow(CommandError);

    expect(store.all('useCases')).toEqual([]);
    expect(store.get('roles', 'act')?.allowedUseCaseIds).toBeUndefined();
  });
});
