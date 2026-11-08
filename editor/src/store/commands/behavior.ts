/**
 * What things DO: an aggregate's operations, the events they emit, and the steps a use case runs.
 *
 * Almost every command here is really «draw an arrow», and an arrow between two elements is
 * stored as a STEP on the caller. That is the asymmetry worth knowing: the callee never learns it
 * is being called, so removing a call only ever touches the caller's own file.
 *
 * Ported from `EditorApiController`.
 */

import { nested, type Element, type ModelStore } from '../store.js';
import { CommandError, type Handler } from '../spec.js';

/** Step types that stand for «this use case reaches into that aggregate». */
const AGGREGATE_STEPS = ['CallAggregateOperation', 'SaveAggregate'];

export const BEHAVIOR_COMMANDS: Record<string, Handler> = {
  'add-operation': (store, command) => {
    const aggregate = mustGet(store, 'aggregates', command.aggregateId, 'Agregado');
    const id = String(command.id);
    const operations = nested(aggregate.operations);
    if (operations.some((o) => o.id === id)) return;
    store.patch('aggregates', aggregate.id, {
      operations: [...operations, { id, name: command.name, kind: 'CUSTOM' }],
    });
  },

  'remove-operation': (store, command) => {
    const id = String(command.id);
    const owner = store.findOwner(['aggregates'], 'operations', id);
    if (!owner) return;
    store.patch(owner.type, owner.element.id, {
      operations: nested(owner.element.operations).filter((o) => o.id !== id),
    });
  },

  /**
   * Who emits what. Two different mechanisms behind one gesture: a use case emits an APPLICATION
   * event as a step in its pipeline, while an aggregate or domain service emits a DOMAIN event
   * from one of its operations. The target's type decides which.
   */
  'add-emission': (store, command) => {
    const targetId = String(command.targetId);
    if (store.has('applicationEvents', targetId)) {
      const event = store.get('applicationEvents', targetId)!;
      const useCase = store.get('useCases', String(command.sourceId));
      if (!useCase) {
        throw new CommandError('Solo los casos de uso emiten eventos de aplicación;'
          + ` emisor desconocido: ${command.sourceId}`);
      }
      const steps = nested(useCase.steps);
      if (steps.some((step) => step.applicationEventId === targetId)) return;
      store.patch('useCases', useCase.id, {
        steps: [...steps, {
          id: `step-emit-${targetId}`,
          name: `publish${event.name ?? targetId}`,
          type: 'PublishApplicationEvent',
          applicationEventId: targetId,
        }],
      });
      return;
    }
    const event = store.get('domainEvents', targetId);
    if (!event) throw new CommandError(`Evento de dominio desconocido: ${targetId}`);
    // A use case publishes a domain event as one of its steps (as the CRUD trio does): the
    // event carries what the use case decided, so it goes out after the steps before it.
    const publisher = store.get('useCases', String(command.sourceId));
    if (publisher) {
      const steps = nested(publisher.steps);
      if (steps.some((step) => step.type === 'PublishDomainEvent' && step.domainEventId === targetId)) return;
      store.patch('useCases', publisher.id, {
        steps: [...steps, {
          id: `step-publish-${targetId}`,
          name: `publish${event.name ?? targetId}`,
          type: 'PublishDomainEvent',
          domainEventId: targetId,
        }],
      });
      return;
    }
    const emitter = findEmitter(store, String(command.sourceId));
    const operations = withEmissionAdded(nested(emitter.element.operations), event);
    if (operations) store.patch(emitter.type, emitter.element.id, { operations });
  },

  'remove-emission': (store, command) => {
    const targetId = String(command.targetId);
    if (store.has('applicationEvents', targetId)) {
      const useCase = store.get('useCases', String(command.sourceId));
      if (!useCase) return;
      store.patch('useCases', useCase.id, {
        steps: nested(useCase.steps).filter((step) => step.applicationEventId !== targetId),
      });
      return;
    }
    const event = store.get('domainEvents', targetId);
    if (!event) throw new CommandError(`Evento de dominio desconocido: ${targetId}`);
    const publisher = store.get('useCases', String(command.sourceId));
    if (publisher) {
      store.patch('useCases', publisher.id, {
        steps: nested(publisher.steps).filter((step) => !(step.type === 'PublishDomainEvent' && step.domainEventId === targetId)),
      });
      return;
    }
    for (const type of ['aggregates', 'domainServices']) {
      const emitter = store.get(type, String(command.sourceId));
      if (!emitter) continue;
      store.patch(type, emitter.id, {
        operations: withEmissionRemoved(nested(emitter.operations), event),
      });
    }
  },

  /** A use case reaches into an aggregate. Wired to its only operation when there is just one. */
  'add-aggregate-call': (store, command) => {
    const useCase = mustGet(store, 'useCases', command.sourceId, 'Caso de uso');
    const aggregate = mustGet(store, 'aggregates', command.targetId, 'Agregado');
    const steps = nested(useCase.steps);
    const already = steps.some((step) =>
      AGGREGATE_STEPS.includes(String(step.type)) && step.aggregateId === aggregate.id);
    if (already) return;
    const operations = nested(aggregate.operations);
    store.patch('useCases', useCase.id, {
      steps: [...steps, {
        id: `step-call-${aggregate.id}`,
        name: `call${capitalize(String(aggregate.name ?? aggregate.id))}`,
        type: 'CallAggregateOperation',
        aggregateId: aggregate.id,
        // an unambiguous choice is made for you; anything else is left to be chosen
        operationId: operations.length === 1 ? operations[0].id : null,
      }],
    });
  },

  'remove-aggregate-call': (store, command) => {
    const useCase = store.get('useCases', String(command.sourceId));
    if (!useCase) return;
    store.patch('useCases', useCase.id, {
      steps: nested(useCase.steps).filter((step) => !(
        AGGREGATE_STEPS.includes(String(step.type)) && step.aggregateId === command.targetId)),
    });
  },

  'add-use-case-call': (store, command) => {
    const source = mustGet(store, 'useCases', command.sourceId, 'Caso de uso');
    const target = mustGet(store, 'useCases', command.targetId, 'Caso de uso');
    if (source.id === target.id) {
      throw new CommandError('Un caso de uso no puede invocarse a sí mismo');
    }
    const steps = nested(source.steps);
    if (steps.some((step) => step.type === 'CallUseCase' && step.useCaseId === target.id)) return;
    store.patch('useCases', source.id, {
      steps: [...steps, {
        id: `step-call-${target.id}`,
        name: `call${capitalize(String(target.name ?? target.id))}`,
        type: 'CallUseCase',
        useCaseId: target.id,
      }],
    });
  },

  'remove-use-case-call': (store, command) => {
    const source = store.get('useCases', String(command.sourceId));
    if (!source) return;
    store.patch('useCases', source.id, {
      steps: nested(source.steps).filter((step) =>
        !(step.type === 'CallUseCase' && step.useCaseId === command.targetId)),
    });
  },

  'add-query-call': (store, command) => {
    const source = mustGet(store, 'useCases', command.sourceId, 'Caso de uso');
    const target = mustGet(store, 'queryServices', command.targetId, 'Query service');
    const steps = nested(source.steps);
    if (steps.some((step) => step.queryServiceId === target.id)) return;
    store.patch('useCases', source.id, {
      steps: [...steps, {
        id: `step-query-${target.id}`,
        name: `query${capitalize(String(target.name ?? target.id))}`,
        type: 'CallQueryService',
        queryServiceId: target.id,
      }],
    });
  },

  'remove-query-call': (store, command) => {
    const source = store.get('useCases', String(command.sourceId));
    if (!source) return;
    store.patch('useCases', source.id, {
      steps: nested(source.steps).filter((step) => step.queryServiceId !== command.targetId),
    });
  },

  'add-use-case-step': (store, command) => {
    const useCase = mustGet(store, 'useCases', command.useCaseId, 'Caso de uso');
    const id = String(command.id);
    const steps = nested(useCase.steps);
    if (steps.some((step) => step.id === id)) return;
    store.patch('useCases', useCase.id, {
      steps: [...steps, { id, name: command.name, type: 'Custom' }],
    });
  },

  'remove-use-case-step': (store, command) => {
    const useCase = store.get('useCases', String(command.useCaseId));
    if (!useCase) return;
    store.patch('useCases', useCase.id, {
      steps: nested(useCase.steps).filter((step) => step.id !== command.id),
    });
  },
};

/**
 * Add a domain event to what an emitter's operations announce.
 *
 * `emits` is a comma-separated list of event NAMES, not ids — that is the stored shape, and
 * matching case-insensitively on the name is how a duplicate is spotted. An emitter with no
 * operation yet gets a stub, so the arrow can be drawn before the operation is thought of.
 * Returns null when there is nothing to change.
 */
function withEmissionAdded(operations: Element[], event: Element): Element[] | null {
  const eventName = String(event.name ?? '').trim();
  const already = operations.some((op) => emitsOf(op)
    .some((name) => name.toLowerCase() === eventName.toLowerCase()));
  if (already) return null;
  if (!operations.length) {
    return [{
      id: `op-emit-${event.id}`,
      name: `emit${eventName}`,
      emits: eventName,
      kind: 'CUSTOM',
    }];
  }
  const [first, ...rest] = operations;
  const emits = first.emits && String(first.emits).trim()
    ? `${first.emits},${eventName}` : eventName;
  return [{ ...first, emits }, ...rest];
}

function withEmissionRemoved(operations: Element[], event: Element): Element[] {
  const eventName = String(event.name ?? '').trim().toLowerCase();
  return operations
    .map((op) => ({
      ...op,
      emits: emitsOf(op).filter((name) => name.toLowerCase() !== eventName).join(','),
    }))
    // a stub minted just to carry this emission leaves with it
    .filter((op) => !(String(op.id).startsWith('op-emit-') && !op.emits));
}

const emitsOf = (operation: Element) =>
  String(operation.emits ?? '').split(',').map((name) => name.trim()).filter(Boolean);

/** An aggregate or a domain service — the two things that emit domain events. */
function findEmitter(store: ModelStore, id: string): { type: string; element: Element } {
  for (const type of ['aggregates', 'domainServices']) {
    const element = store.get(type, id);
    if (element) return { type, element };
  }
  throw new CommandError('Solo agregados y servicios de dominio emiten eventos de dominio;'
    + ` emisor desconocido: ${id}`);
}

function mustGet(store: ModelStore, type: string, id: unknown, label: string): Element {
  const element = store.get(type, String(id));
  if (!element) throw new CommandError(`${label} desconocido: ${id}`);
  return element;
}

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

/** Element shapes this block creates, for the schema-defaults check in tests. */
export const BEHAVIOR_TYPES: string[] = [];
