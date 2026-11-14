/**
 * Workflows: their steps, the loose gateways that route between them, and the fusion that turned
 * processes and sagas into workflows.
 *
 * Most of this file is one grammar, enforced on every link: a JOIN is n→1, a SPLIT is 1→n, and a
 * step or a workflow flows to exactly ONE node. On top of that sits the loop rule
 * (`workflow-graph.ts`): a cycle is fine, a cycle you cannot get out of is not.
 *
 * Ported from `WorkflowEditorCommands`.
 */

import { asList, nested, type Element, type ModelStore } from '../store.js';
import { CommandError, type Handler } from '../spec.js';
import { findUnboundedLoop, memberGateways, workflowOf } from '../workflow-graph.js';
import { blank, mustGet } from './models.js';
import { t, type MessageKey } from '../../i18n/index.js';

/** The semantics each gateway kind admits. */
const SEMANTICS: Record<string, string[]> = {
  JOIN: ['ALL', 'ANY'],
  SPLIT: ['PARALLEL', 'EXCLUSIVE'],
};

export const WORKFLOW_COMMANDS: Record<string, Handler> = {
  'add-workflow': (store, command) => {
    const id = String(command.id);
    if (store.has('workflows', id)) return;
    store.put('workflows', {
      id,
      name: command.name,
      triggerAggregateId: command.triggerAggregateId ?? null,
      triggerDomainServiceId: command.triggerDomainServiceId ?? null,
      triggerUseCaseId: command.triggerUseCaseId ?? null,
      triggerEvent: command.triggerEvent ?? null,
      completionEventName: command.completionEventName ?? null,
      steps: (Array.isArray(command.workflowSteps) ? command.workflowSteps as Element[] : [])
        .map((s) => ({
          id: s.id,
          name: s.name ?? null,
          emittedEventName: s.emittedEventName ?? null,
          targetUseCaseId: s.targetUseCaseId ?? null,
          completionEventName: s.completionEventName ?? null,
          dependsOnStepIds: s.dependsOnStepIds ?? [],
        })),
    });
  },

  'remove-workflow': (store, command) => {
    store.remove('workflows', String(command.id));
  },

  /** What starts it — drawn on the canvas as event → workflow. */
  'set-workflow-trigger': (store, command) => {
    const workflow = requireWorkflow(store, command.id);
    store.patch('workflows', workflow.id, {
      triggerAggregateId: command.triggerAggregateId ?? null,
      triggerDomainServiceId: command.triggerDomainServiceId ?? null,
      triggerUseCaseId: command.triggerUseCaseId ?? null,
      triggerEvent: command.triggerEvent ?? null,
    });
  },

  // ---- steps ---------------------------------------------------------------

  'add-workflow-step': (store, command) => {
    const workflow = requireWorkflow(store, command.workflowId);
    const steps = nested(workflow.steps);
    const id = String(command.id);
    if (steps.some((s) => s.id === id)) return;
    const step = {
      id,
      name: command.name ?? null,
      emittedEventName: command.emittedEventName ?? null,
      targetUseCaseId: command.targetUseCaseId ?? null,
      completionEventName: command.completionEventName ?? null,
      dependsOnStepIds: command.dependsOnStepIds ?? [],
      type: blank(command.stepType) ? null : command.stepType,
      roleId: command.roleId ?? null,
      deadline: command.deadline ?? null,
      compensationUseCaseId: command.compensationUseCaseId ?? null,
    };
    const anchor = blank(command.afterStepId)
      ? steps.length : indexAfter(steps, String(command.afterStepId));
    store.patch('workflows', workflow.id, {
      steps: [...steps.slice(0, anchor), step, ...steps.slice(anchor)],
    });
  },

  /** The step goes, and every other step stops depending on it. */
  'remove-workflow-step': (store, command) => {
    const workflow = requireWorkflow(store, command.workflowId);
    const id = String(command.id);
    store.patch('workflows', workflow.id, {
      steps: nested(workflow.steps)
        .filter((s) => s.id !== id)
        .map((s) => (asList(s.dependsOnStepIds).includes(id)
          ? { ...s, dependsOnStepIds: asList(s.dependsOnStepIds).filter((d) => d !== id) }
          : s)),
    });
  },

  /** Replaces the step's wiring wholesale — an absent value clears. */
  'update-workflow-step': (store, command) => {
    const workflow = requireWorkflow(store, command.workflowId);
    store.patch('workflows', workflow.id, {
      steps: nested(workflow.steps).map((s) => (s.id === command.id ? {
        ...s,
        emittedEventName: command.emittedEventName ?? null,
        targetUseCaseId: command.targetUseCaseId ?? null,
        completionEventName: command.completionEventName ?? null,
      } : s)),
    });
  },

  /** The step moves to ANOTHER workflow; dependencies on steps left behind drop. */
  'move-workflow-step': (store, command) => {
    const from = requireWorkflow(store, command.workflowId);
    const to = requireWorkflow(store, command.targetId);
    if (from.id === to.id) return;
    const id = String(command.id);
    const moving = nested(from.steps).find((s) => s.id === id);
    if (!moving) throw new CommandError(t('store.unknown.step', { id: id }));

    store.patch('workflows', from.id, {
      steps: nested(from.steps)
        .filter((s) => s.id !== id)
        .map((s) => ({
          ...s,
          dependsOnStepIds: asList(s.dependsOnStepIds).filter((d) => d !== id),
        })),
    });
    const landing = new Set(nested(to.steps).map((s) => String(s.id)));
    store.patch('workflows', to.id, {
      steps: [...nested(store.get('workflows', to.id)!.steps), {
        ...moving,
        dependsOnStepIds: asList(moving.dependsOnStepIds).filter((d) => landing.has(d)),
      }],
    });
  },

  /** Who works the task. A step with a role is a human step; clearing it makes it a system one. */
  'set-workflow-step-role': stepRef('roleId', 'roles', 'store.kind.role'),

  /** The page the forms engine renders as the task's form. */
  'set-workflow-step-form': stepRef('formPageId', 'pages', 'store.kind.page'),

  // ---- dependencies --------------------------------------------------------

  'add-workflow-dependency': (store, command) => {
    const workflow = requireWorkflow(store, command.workflowId);
    const id = String(command.id);
    const dependsOn = String(command.dependsOnStepId);
    if (id === dependsOn) throw new CommandError(t('store.workflow.stepDependsOnSelf'));
    const steps = nested(workflow.steps);
    if (!steps.some((s) => s.id === dependsOn)) {
      throw new CommandError(t('store.unknown.step', { id: dependsOn }));
    }
    const candidate = steps.map((s) => (s.id === id
      && !asList(s.dependsOnStepIds).includes(dependsOn)
      ? { ...s, dependsOnStepIds: [...asList(s.dependsOnStepIds), dependsOn] }
      : s));
    // a dependency carries no condition, so a cycle made of them can never be left
    assertBounded(store, workflow.id, candidate as Element[]);
    store.patch('workflows', workflow.id, { steps: candidate });
  },

  'remove-workflow-dependency': (store, command) => {
    const workflow = requireWorkflow(store, command.workflowId);
    store.patch('workflows', workflow.id, {
      steps: nested(workflow.steps).map((s) => (s.id === command.id
        ? {
          ...s,
          dependsOnStepIds: asList(s.dependsOnStepIds)
            .filter((d) => d !== command.dependsOnStepId),
        }
        : s)),
    });
  },

  // ---- gateways ------------------------------------------------------------

  'add-workflow-gateway': (store, command) => {
    const id = String(command.id);
    if (store.has('workflowGateways', id)) return;
    store.put('workflowGateways', {
      id,
      name: command.name,
      type: command.stepType === 'SPLIT' ? 'SPLIT' : 'JOIN',
      sourceIds: [],
      targetIds: [],
    });
  },

  /** Other gateways let go of it on both sides before it disappears. */
  'remove-workflow-gateway': (store, command) => {
    const id = String(command.id);
    for (const field of ['sourceIds', 'targetIds']) {
      store.removeFromAllLists('workflowGateways', field, id);
    }
    store.remove('workflowGateways', id);
  },

  /** ALL/ANY for a join, PARALLEL/EXCLUSIVE for a split. Nothing goes back to the default. */
  'set-gateway-semantics': (store, command) => {
    const gateway = mustGet(store, 'workflowGateways', command.id, 'store.kind.gateway');
    const semantics = blank(command.type) ? null : String(command.type);
    if (semantics && !SEMANTICS[String(gateway.type)]?.includes(semantics)) {
      throw new CommandError(t('store.workflow.invalidSemantics', { type: String(gateway.type), semantics }));
    }
    store.patch('workflowGateways', gateway.id, { semantics });
  },

  /**
   * The condition guarding ONE branch. Only an EXCLUSIVE split has them — a parallel split takes
   * every branch, so a condition on one would say nothing.
   */
  'set-gateway-branch-condition': (store, command) => {
    const gateway = mustGet(store, 'workflowGateways', command.id, 'store.kind.gateway');
    if (gateway.type !== 'SPLIT' || gateway.semantics !== 'EXCLUSIVE') {
      throw new CommandError(t('store.workflow.branchConditionsOnlyExclusive'));
    }
    const target = String(command.targetId);
    if (!asList(gateway.targetIds).includes(target)) {
      throw new CommandError(t('store.workflow.branchNotFromSplit', { target }));
    }
    const kept = nested(gateway.branchConditions).filter((c) => c.targetId !== target);
    const expression = typeof command.text === 'string' ? command.text.trim() : '';
    store.patch('workflowGateways', gateway.id, {
      branchConditions: expression ? [...kept, { targetId: target, expression }] : kept,
    });
  },

  // ---- links ---------------------------------------------------------------

  /**
   * A flow link between workflow nodes. A gateway stores its own ends; a step whose target is a
   * WORKFLOW records a hand-off instead — that is the one way to reach another workflow, and it
   * is also why the two ends may legitimately belong to different ones.
   */
  'add-workflow-link': (store, command) => {
    const sourceId = String(command.sourceId);
    const targetId = String(command.targetId);
    const sourceGateway = store.get('workflowGateways', sourceId);
    const targetGateway = store.get('workflowGateways', targetId);
    const targetIsWorkflow = store.has('workflows', targetId);

    const sourceWorkflow = workflowOf(store, sourceId);
    const targetWorkflow = targetIsWorkflow ? undefined : workflowOf(store, targetId);
    if (sourceWorkflow && targetWorkflow && sourceWorkflow !== targetWorkflow) {
      throw new CommandError(t('store.workflow.endpointsInDifferentWorkflows'));
    }
    // a hand-off leaves this workflow (a sink) and cannot close a loop; every other link adds
    // one unconditioned edge, so check it before drawing
    if (!targetIsWorkflow) {
      assertLinkBounded(store, sourceWorkflow ?? targetWorkflow, sourceId, targetId);
    }

    if (targetGateway) {
      if (targetGateway.type === 'SPLIT' && asList(targetGateway.sourceIds).length
        && !asList(targetGateway.sourceIds).includes(sourceId)) {
        throw new CommandError(t('store.workflow.splitSingleInput'));
      }
      if (!sourceGateway && hasOutgoing(store, sourceId)) {
        throw new CommandError(
          t('store.workflow.nodeAlreadyFlows'));
      }
      if (sourceGateway) linkFromGateway(store, sourceGateway, targetId);
      store.addToList('workflowGateways', targetGateway.id, 'sourceIds', sourceId);
      return;
    }
    if (sourceGateway) {
      linkFromGateway(store, sourceGateway, targetId);
      return;
    }
    if (targetIsWorkflow) {
      const workflow = store.all('workflows')
        .find((wf) => nested(wf.steps).some((s) => s.id === sourceId));
      if (!workflow) throw new CommandError(t('store.unknown.step', { id: sourceId }));
      if (hasOutgoing(store, sourceId)) {
        throw new CommandError(t('store.workflow.stepAlreadyFlows'));
      }
      store.patch('workflows', workflow.id, {
        steps: nested(workflow.steps).map((s) =>
          (s.id === sourceId ? { ...s, handoffWorkflowId: targetId } : s)),
      });
      return;
    }
    throw new CommandError(t('store.workflow.linkWithoutGatewayOrWorkflow'));
  },

  'remove-workflow-link': (store, command) => {
    const sourceId = String(command.sourceId);
    const targetId = String(command.targetId);
    store.removeFromList('workflowGateways', targetId, 'sourceIds', sourceId);
    store.removeFromList('workflowGateways', sourceId, 'targetIds', targetId);
    for (const workflow of store.all('workflows')) {
      const steps = nested(workflow.steps);
      if (!steps.some((s) => s.id === sourceId && s.handoffWorkflowId === targetId)) continue;
      store.patch('workflows', workflow.id, {
        steps: steps.map((s) => (s.id === sourceId ? { ...s, handoffWorkflowId: null } : s)),
      });
    }
  },

  // ---- the fusion ----------------------------------------------------------

  /**
   * Every business process becomes a workflow, keeping its id so the references to it survive.
   * Its steps become a linear dependency chain, human steps carrying their role, deadline,
   * escalation and compensation. The process disappears.
   */
  'migrate-processes-to-workflows': (store) => {
    for (const process of store.all('processes')) {
      if (store.has('workflows', process.id)) continue;
      let previous: string | null = null;
      const steps = nested(process.steps).map((st) => {
        const step = {
          id: st.id,
          name: st.name ?? null,
          targetUseCaseId: st.useCaseId ?? null,
          dependsOnStepIds: previous ? [previous] : [],
          description: st.description ?? null,
          roleId: st.roleId ?? null,
          deadline: st.deadline ?? null,
          escalationRoleId: st.escalationRoleId ?? null,
          compensationUseCaseId: st.compensationUseCaseId ?? null,
        };
        previous = String(st.id);
        return step;
      });
      store.put('workflows', {
        id: process.id,
        name: process.name,
        description: process.description ?? null,
        triggerAggregateId: process.triggerAggregateId ?? null,
        triggerEvent: process.triggerEvent ?? null,
        completionEventName: process.onCompletionEventName ?? null,
        decisionIds: process.decisionIds ?? [],
        steps,
      });
      store.remove('processes', process.id);
    }
  },

  /**
   * The other half: every saga becomes a workflow. A step that exists only to undo another is
   * NOT a step of the chain — it becomes the compensation of the step it undid, which is what it
   * always meant. Whatever the saga said that a workflow has no field for is kept as prose,
   * because losing it silently would be worse than writing it down.
   */
  'migrate-sagas-to-workflows': (store) => {
    for (const saga of store.all('sagas')) {
      if (store.has('workflows', saga.id)) continue;
      const steps = nested(saga.steps);
      const byId = new Map(steps.map((s) => [String(s.id), s]));
      const compensators = new Set(steps.map((s) => s.compensatingStepId).filter(Boolean));

      let previous: string | null = null;
      const chain = [];
      for (const step of steps) {
        if (compensators.has(step.id)) continue;
        const compensating = step.compensatingStepId
          ? byId.get(String(step.compensatingStepId)) : undefined;
        const detail: string[] = [];
        if (step.aggregateId) {
          detail.push(t('store.default.sagaStepOperatesOn', { target: `${step.aggregateId}`
            + (step.operationId ? `.${step.operationId}` : '') }));
        }
        if (step.gatewayId) detail.push(t('store.default.sagaStepCallsGateway', { gateway: step.gatewayId }));
        if (compensating && !compensating.useCaseId) {
          detail.push(t('store.default.sagaStepCompensatedWith', { step: compensating.name }));
        }
        chain.push({
          id: step.id,
          name: step.name ?? null,
          targetUseCaseId: step.useCaseId ?? null,
          dependsOnStepIds: previous ? [previous] : [],
          compensationUseCaseId: compensating?.useCaseId ?? null,
          description: detail.length ? detail.join(' · ') : null,
        });
        previous = String(step.id);
      }

      const triggers = asList(saga.triggeringEventIds);
      const notes: string[] = [];
      if (triggers.length > 1) {
        notes.push(t('store.default.sagaAlsoTriggeredBy', { events: triggers.slice(1).join(', ') }));
      }
      if (saga.timeoutMs != null) notes.push(t('store.default.sagaTimeout', { ms: saga.timeoutMs }));
      if (saga.maxRetries != null) notes.push(t('store.default.sagaRetries', { retries: saga.maxRetries }));
      if (saga.deadLetterQueue != null) notes.push(`DLQ: ${saga.deadLetterQueue}`);

      store.put('workflows', {
        id: saga.id,
        name: saga.name,
        description: notes.length ? notes.join(' · ') : null,
        triggerEvent: triggers[0] ?? null,
        steps: chain,
      });
      // workflows live outside every context: the ones that owned the saga let go
      store.removeFromAllLists('boundedContexts', 'sagaIds', String(saga.id));
      store.remove('sagas', saga.id);
    }
  },
};

/** Set a reference on one step of one workflow, checking the target exists. */
function stepRef(field: string, type: string, label: MessageKey): Handler {
  return (store, command) => {
    const workflow = requireWorkflow(store, command.workflowId);
    const id = String(command.id);
    if (!nested(workflow.steps).some((s) => s.id === id)) {
      throw new CommandError(t('store.unknown.step', { id: id }));
    }
    if (command.targetId) mustGet(store, type, command.targetId, label);
    store.patch('workflows', workflow.id, {
      steps: nested(workflow.steps).map((s) =>
        (s.id === id ? { ...s, [field]: command.targetId ?? null } : s)),
    });
  };
}

/** A join has exactly one outgoing edge; a split fans out. */
function linkFromGateway(store: ModelStore, gateway: Element, targetId: string): void {
  if (gateway.type === 'JOIN' && asList(gateway.targetIds).length
    && !asList(gateway.targetIds).includes(targetId)) {
    throw new CommandError(t('store.workflow.joinSingleOutput'));
  }
  store.addToList('workflowGateways', gateway.id, 'targetIds', targetId);
}

/** Whether a node already flows somewhere — its single outgoing edge is taken. */
function hasOutgoing(store: ModelStore, nodeId: string): boolean {
  if (store.all('workflowGateways').some((g) => asList(g.sourceIds).includes(nodeId))) return true;
  return store.all('workflows').some((wf) => nested(wf.steps).some((s) =>
    (s.id === nodeId && s.handoffWorkflowId) || asList(s.dependsOnStepIds).includes(nodeId)));
}

function assertBounded(store: ModelStore, workflowId: string, steps: Element[]): void {
  const loop = findUnboundedLoop(steps, memberGateways(store, workflowId));
  if (loop) throw new CommandError(loop);
}

function assertLinkBounded(
  store: ModelStore, workflowId: string | undefined, from: string, to: string,
): void {
  const steps = workflowId
    ? nested(store.get('workflows', workflowId)?.steps)
    // both ends still loose: fall back to the whole flow graph
    : store.all('workflows').flatMap((wf) => nested(wf.steps));
  const gateways = workflowId
    ? memberGateways(store, workflowId) : store.all('workflowGateways');
  const loop = findUnboundedLoop(steps as Element[], gateways, [[from, to]]);
  if (loop) throw new CommandError(loop);
}

const indexAfter = (steps: Element[], afterStepId: string) => {
  const at = steps.findIndex((s) => s.id === afterStepId);
  return at < 0 ? steps.length : at + 1;
};

function requireWorkflow(store: ModelStore, id: unknown): Element {
  const workflow = store.get('workflows', String(id));
  if (!workflow) throw new CommandError(t('store.unknown.workflow', { id: String(id) }));
  return workflow;
}

/** Element shapes this block creates, for the schema-defaults check in tests. */
export const WORKFLOW_TYPES: string[] = ['workflows', 'workflowGateways'];
