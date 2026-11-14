import type { ModuxModel } from '../model.js';
import type { Scene, SceneNode, SceneEdge, DiagramLayout } from '../scene.js';
import { t } from '../i18n/index.js';

/**
 * Processes view: each process as a horizontal chain — trigger → steps
 * (HUMAN steps amber with role and deadline) → completion event. Compensations
 * hang from their step as dashed red satellites.
 */

const PROC_W = 190;
const PROC_H = 56;
const STEP_W = 170;
const STEP_H = 52;

export function processesScene(model: ModuxModel, layout: DiagramLayout): Scene {
  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];

  const boundedContextName = (id: string | undefined) =>
    model.boundedContexts.find((m) => m.id === id)?.name;

  (model.processes ?? []).forEach((process, pi) => {
    const rowY = 140 + pi * 240;
    const pos = layout[process.id] ?? { x: 150, y: rowY };
    nodes.push({
      id: process.id,
      label: process.name,
      x: pos.x,
      y: pos.y,
      w: PROC_W,
      h: PROC_H,
      kind: 'process',
      symbol: 'process',
      fill: '#f5f3ff',
      stroke: '#7c3aed',
      badge: `PROCESS${process.sla ? ` · SLA ${process.sla}` : ''}`,
      tooltip:
        process.name +
        (boundedContextName(process.ownerBoundedContextId)
          ? t('views.processes.tooltipContext', { context: boundedContextName(process.ownerBoundedContextId) })
          : '') +
        (process.triggerEvent ? t('views.processes.tooltipTrigger', { event: process.triggerEvent }) : ''),
    });

    let previousId = process.id;
    process.steps.forEach((step, si) => {
      const human = step.type === 'HUMAN';
      const stepPos = layout[step.id] ?? { x: 150 + (si + 1) * 240, y: rowY };
      nodes.push({
        id: step.id,
        label: step.name,
        x: stepPos.x,
        y: stepPos.y,
        w: STEP_W,
        h: STEP_H,
        kind: 'process-step',
        symbol: human ? 'person' : 'gear',
        fill: human ? '#fef3c7' : '#ffffff',
        stroke: human ? '#d97706' : '#64748b',
        badge: human
          ? `HUMAN${step.roleId ? ` · ${step.roleId}` : ''}${step.deadline ? ` · ⏱ ${step.deadline}` : ''}`
          : 'AUTOMATED',
        tooltip: `${step.name}${step.useCaseId ? ` — use case ${step.useCaseId}` : ''}${step.deadline ? ` · deadline ${step.deadline}` : ''}`,
      });
      edges.push({
        id: `pe:${process.id}:${si}`,
        sourceId: previousId,
        targetId: step.id,
        kind: 'process-seq',
        label: si === 0 ? process.triggerEvent : undefined,
        color: '#64748b',
        arrow: true,
      });
      if (step.compensationUseCaseId) {
        const compId = `comp:${step.id}`;
        const compPos = layout[compId] ?? { x: stepPos.x, y: stepPos.y + 90 };
        nodes.push({
          id: compId,
          label: step.compensationUseCaseId,
          x: compPos.x,
          y: compPos.y,
          w: STEP_W,
          h: 36,
          kind: 'compensation',
          symbol: 'undo',
          fill: '#ffffff',
          stroke: '#dc2626',
          dashed: true,
          badge: t('views.processes.compensationBadge'),
        });
        edges.push({
          id: `pc:${step.id}`,
          sourceId: step.id,
          targetId: compId,
          kind: 'process-compensation',
          color: '#dc2626',
          dashed: true,
          arrow: true,
        });
      }
      previousId = step.id;
    });

    if (process.onCompletionEventName) {
      const doneId = `done:${process.id}`;
      const donePos = layout[doneId] ?? { x: 150 + (process.steps.length + 1) * 240, y: rowY };
      nodes.push({
        id: doneId,
        label: process.onCompletionEventName,
        x: donePos.x,
        y: donePos.y,
        w: STEP_W,
        h: 40,
        kind: 'completion-event',
        symbol: 'event',
        fill: '#dcfce7',
        stroke: '#16a34a',
        badge: t('views.processes.completionBadge'),
      });
      edges.push({
        id: `pd:${process.id}`,
        sourceId: previousId,
        targetId: doneId,
        kind: 'process-completion',
        color: '#16a34a',
        arrow: true,
      });
    }
  });

  return { nodes, edges };
}
