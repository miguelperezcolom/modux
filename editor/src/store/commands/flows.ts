/**
 * Flows and processes: what happens across contexts, and what happens step by step.
 *
 * A flow is an edge on the context map with a reason — something happened here, so that other
 * side hears about it. A process is an ordered list of steps, and «ordered» is the whole of its
 * difficulty: the position of a step is data, so adding, moving and removing all have to say
 * exactly where. Ported from `EditorApiController`.
 */

import { nested, type Element, type ModelStore } from '../store.js';
import { add, CommandError, type Handler, remove } from '../spec.js';
import { t } from '../../i18n/index.js';

export const FLOW_COMMANDS: Record<string, Handler> = {
  'add-flow': add({
    type: 'flows',
    init: (c) => ({
      archetype: c.archetype ?? null,
      triggerAggregateId: c.triggerAggregateId ?? null,
      triggerEvent: c.triggerEvent ?? null,
      targetBoundedContextId: c.targetId ?? null,
      readModelName: c.readModelName ?? null,
      targetUseCaseId: c.targetUseCaseId ?? null,
      triggerDomainServiceId: c.triggerDomainServiceId ?? null,
      triggerUseCaseId: c.triggerUseCaseId ?? null,
    }),
  }),

  'remove-flow': remove({ type: 'flows' }),

  'add-process': add({
    type: 'processes',
    init: (c) => ({
      triggerAggregateId: c.triggerAggregateId ?? null,
      triggerEvent: c.triggerEvent ?? null,
      boundedContextId: c.boundedContextId ?? null,
      steps: (Array.isArray(c.steps) ? (c.steps as Element[]) : []).map((s) => ({
        id: s.id,
        name: s.name ?? null,
        type: s.type ?? null,
        useCaseId: s.useCaseId ?? null,
        roleId: s.roleId ?? null,
        deadline: s.deadline ?? null,
        compensationUseCaseId: s.compensationUseCaseId ?? null,
      })),
    }),
  }),

  'remove-process': remove({ type: 'processes' }),

  'add-process-step': (store, command) => {
    const process = requireProcess(store, command.processId);
    const id = String(command.id);
    const steps = nested(process.steps);
    if (steps.some((step) => step.id === id)) return;
    const step = {
      id,
      name: command.name ?? null,
      // a step nobody is named for is one the system runs itself
      type: command.stepType ?? 'AUTOMATED',
      useCaseId: command.useCaseId ?? null,
      roleId: command.roleId ?? null,
      deadline: command.deadline ?? null,
      compensationUseCaseId: command.compensationUseCaseId ?? null,
    };
    store.patch('processes', process.id, {
      steps: spliceAfter(steps, step, command.afterStepId as string | undefined, steps.length),
    });
  },

  'remove-process-step': (store, command) => {
    const process = requireProcess(store, command.processId);
    store.patch('processes', process.id, {
      steps: nested(process.steps).filter((step) => step.id !== command.id),
    });
  },

  /** Reposition a step. No `afterStepId` means the front — the only unambiguous «nowhere». */
  'move-process-step': (store, command) => {
    const process = requireProcess(store, command.processId);
    const steps = nested(process.steps);
    const step = steps.find((s) => s.id === command.id);
    if (!step) throw new CommandError(t('store.unknown.step', { id: command.id }));
    const rest = steps.filter((s) => s.id !== command.id);
    store.patch('processes', process.id, {
      steps: spliceAfter(rest, step, command.afterStepId as string | undefined, 0),
    });
  },

  /**
   * Edit a step's assignment fields. Deliberately narrow: who runs it, by when, and what undoes
   * it. Its name, type and use case are its identity and are not moved from here.
   */
  'update-process-step': (store, command) => {
    const process = requireProcess(store, command.processId);
    store.patch('processes', process.id, {
      steps: nested(process.steps).map((step) => (step.id === command.id ? {
        ...step,
        roleId: command.roleId ?? null,
        deadline: command.deadline ?? null,
        compensationUseCaseId: command.compensationUseCaseId ?? null,
      } : step)),
    });
  },
};

/** Insert `step` after `afterStepId`, or at `fallback` when there is no such anchor. */
function spliceAfter(
  steps: Element[], step: Element, afterStepId: string | undefined, fallback: number,
): Element[] {
  const anchor = afterStepId == null ? -1 : steps.findIndex((s) => s.id === afterStepId);
  const index = afterStepId == null ? fallback : (anchor < 0 ? steps.length : anchor + 1);
  return [...steps.slice(0, index), step, ...steps.slice(index)];
}

function requireProcess(store: ModelStore, id: unknown): Element {
  const process = store.get('processes', String(id));
  if (!process) throw new CommandError(t('store.unknown.process', { id: String(id) }));
  return process;
}

/** Element shapes this block creates, for the schema-defaults check in tests. */
export const FLOW_TYPES: string[] = ['flows', 'processes'];
