import '../index.js';
import type { ModuxEditor } from '../modux-editor.js';
import type { ModuxCommand } from '../commands.js';
import type { EditorLayout } from '../scene.js';
import { demoModel } from './demo-model.js';

const LAYOUT_KEY = 'modux-editor-demo-layout';

const editor = document.querySelector('modux-editor') as ModuxEditor;
const logEl = document.querySelector('#event-log') as HTMLElement;

const model = structuredClone(demoModel);
let layout: EditorLayout = {};
try {
  layout = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? '{}');
} catch {
  layout = {};
}

editor.model = model;
editor.layout = layout;

function log(kind: string, detail: unknown): void {
  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = `<span class="log-kind">${kind}</span> ${detail == null ? '' : JSON.stringify(detail)}`;
  logEl.prepend(line);
  while (logEl.children.length > 40) logEl.lastChild?.remove();
}

function applyCommand(command: ModuxCommand): void {
  switch (command.kind) {
    case 'add-relation':
      model.relations.push({
        sourceId: command.sourceId,
        targetId: command.targetId,
        type: command.type,
      });
      break;
    case 'remove-relation':
      model.relations = model.relations.filter(
        (r) => !(r.sourceId === command.sourceId && r.targetId === command.targetId),
      );
      break;
    case 'add-boundedContext':
      model.boundedContexts.push({ id: command.id, name: command.name, subdomainType: command.subdomainType });
      break;
    case 'add-aggregate':
      (model.aggregates ??= []).push({ id: command.id, name: command.name, boundedContextId: command.boundedContextId ?? '' });
      break;
    case 'remove-boundedContext':
      model.boundedContexts = model.boundedContexts.filter((m) => m.id !== command.id);
      model.relations = model.relations.filter(
        (r) => r.sourceId !== command.id && r.targetId !== command.id,
      );
      break;
    case 'remove-aggregate':
      model.aggregates = (model.aggregates ?? []).filter((a) => a.id !== command.id);
      break;
    case 'add-flow':
      model.flows.push({
        id: command.id, name: command.name, archetype: command.archetype as never,
        sourceId: '', targetId: command.targetId,
        triggerAggregateId: command.triggerAggregateId, triggerEvent: command.triggerEvent,
      });
      break;
    case 'remove-flow':
      model.flows = model.flows.filter((f) => f.id !== command.id);
      break;
    case 'add-process':
      (model.processes ??= []).push({
        id: command.id, name: command.name, ownerBoundedContextId: command.boundedContextId,
        triggerAggregateId: command.triggerAggregateId, triggerEvent: command.triggerEvent,
        steps: command.steps ?? [],
      });
      break;
    case 'remove-process':
      model.processes = (model.processes ?? []).filter((p) => p.id !== command.id);
      break;
    case 'add-process-step': {
      const process = (model.processes ?? []).find((p) => p.id === command.processId);
      if (process) {
        const index = command.afterStepId
          ? process.steps.findIndex((s) => s.id === command.afterStepId) + 1
          : process.steps.length;
        process.steps.splice(index, 0, {
          id: command.id, name: command.name, type: command.stepType,
          roleId: command.roleId, deadline: command.deadline,
          useCaseId: command.useCaseId, compensationUseCaseId: command.compensationUseCaseId,
        });
      }
      break;
    }
    case 'remove-process-step': {
      const process = (model.processes ?? []).find((p) => p.id === command.processId);
      if (process) process.steps = process.steps.filter((s) => s.id !== command.id);
      break;
    }
    case 'move-process-step': {
      const process = (model.processes ?? []).find((p) => p.id === command.processId);
      const step = process?.steps.find((s) => s.id === command.id);
      if (process && step) {
        process.steps = process.steps.filter((s) => s.id !== command.id);
        const index = command.afterStepId
          ? process.steps.findIndex((s) => s.id === command.afterStepId) + 1
          : 0;
        process.steps.splice(index, 0, step);
      }
      break;
    }
    case 'update-process-step': {
      const step = (model.processes ?? [])
        .find((p) => p.id === command.processId)
        ?.steps.find((s) => s.id === command.id);
      if (step) {
        step.roleId = command.roleId;
        step.deadline = command.deadline;
        step.compensationUseCaseId = command.compensationUseCaseId;
      }
      break;
    }
    case 'rename-element': {
      const list =
        command.type === 'boundedContext' ? model.boundedContexts
        : command.type === 'aggregate' ? model.aggregates ?? []
        : model.entities ?? [];
      const el = (list as { id: string; name: string }[]).find((x) => x.id === command.id);
      if (el) el.name = command.name;
      break;
    }
    // The wiring the «materialize» button emits (so the demo recomputes backing).
    case 'add-actor-use': {
      if (!(model.actorUses ?? []).some((c) => c.actorId === command.sourceId && c.targetId === command.targetId))
        (model.actorUses ??= []).push({ actorId: command.sourceId, targetId: command.targetId });
      break;
    }
    case 'add-use-case-call': {
      if (!(model.useCaseCalls ?? []).some((c) => c.sourceId === command.sourceId && c.targetId === command.targetId))
        (model.useCaseCalls ??= []).push({ sourceId: command.sourceId, targetId: command.targetId });
      break;
    }
    case 'add-aggregate-call': {
      if (!(model.aggregateCalls ?? []).some((c) => c.sourceId === command.sourceId && c.targetId === command.targetId))
        (model.aggregateCalls ??= []).push({ sourceId: command.sourceId, targetId: command.targetId });
      break;
    }
    case 'add-query-call': {
      if (!(model.queryCalls ?? []).some((c) => c.sourceId === command.sourceId && c.targetId === command.targetId))
        (model.queryCalls ??= []).push({ sourceId: command.sourceId, targetId: command.targetId });
      break;
    }
    case 'add-external-uc-call': {
      if (!(model.externalUseCaseCalls ?? []).some((c) => c.sourceId === command.sourceId && c.targetId === command.targetId))
        (model.externalUseCaseCalls ??= []).push({ sourceId: command.sourceId, targetId: command.targetId });
      break;
    }
    case 'add-emission': {
      if (!(model.useCaseEmissions ?? []).some((e) => e.sourceId === command.sourceId && e.domainEventId === command.targetId))
        (model.useCaseEmissions ??= []).push({ sourceId: command.sourceId, domainEventId: command.targetId });
      break;
    }
    case 'set-api-operation-target': {
      const op = (model.apis ?? []).flatMap((a) => a.operations).find((o) => o.id === command.id);
      if (op) op.targetUseCaseId = command.targetUseCaseId;
      break;
    }
  }
  // New object identity so Lit re-renders.
  editor.model = { ...model };
}

editor.addEventListener('modux-command', (e) => {
  const { command } = (e as CustomEvent).detail;
  applyCommand(command);
  log('command', command);
});

editor.addEventListener('layout-changed', (e) => {
  const { layout: next } = (e as CustomEvent).detail;
  layout = next;
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
  log('layout-changed', Object.keys(next['context-map'] ?? {}).length + ' nodes positioned');
});

editor.addEventListener('modux-select', (e) => {
  log('select', (e as CustomEvent).detail);
});

editor.addEventListener('modux-activate', (e) => {
  log('activate (doble click → abrir formulario en Mateu)', (e as CustomEvent).detail);
});
