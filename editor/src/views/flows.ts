import type { ModuxModel, FlowRef } from '../model.js';
import type { Scene, SceneNode, SceneEdge, DiagramLayout } from '../scene.js';
import { t } from '../i18n/index.js';

/**
 * Flows view: each flow as a pipeline — trigger aggregate → flow (coloured by
 * archetype) → target (boundedContext, external system, use case or read model).
 */

const ARCHETYPE_COLOR: Record<string, string> = {
  MATERIALIZES: '#0d9488',
  TRIGGERS: '#2563eb',
  ORCHESTRATES: '#7c3aed',
  NOTIFIES: '#ea580c',
};

const SRC_W = 150;
const SRC_H = 44;
const FLOW_W = 190;
const FLOW_H = 56;
const TGT_W = 160;
const TGT_H = 48;

function targetLabel(model: ModuxModel, flow: FlowRef): { id: string; label: string; external: boolean } {
  const external = model.externalSystems.find((x) => x.id === flow.targetId);
  if (external) return { id: external.id, label: external.name, external: true };
  const boundedContext = model.boundedContexts.find((m) => m.id === flow.targetId);
  return { id: flow.targetId, label: boundedContext?.name ?? flow.targetId, external: false };
}

export function flowsScene(model: ModuxModel, layout: DiagramLayout): Scene {
  const flows = model.flows;
  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];
  const seen = new Set<string>();

  const aggregateName = (id: string | undefined) =>
    model.aggregates?.find((a) => a.id === id)?.name ?? id ?? '?';

  flows.forEach((flow, i) => {
    const rowY = 120 + i * 130;
    const color = ARCHETYPE_COLOR[flow.archetype] ?? '#475569';

    // source: the trigger aggregate (one node per aggregate, reused across rows)
    const sourceId = flow.triggerAggregateId ?? flow.sourceId;
    if (!seen.has(sourceId)) {
      seen.add(sourceId);
      const pos = layout[sourceId] ?? { x: 160, y: rowY };
      nodes.push({
        id: sourceId,
        label: flow.triggerAggregateId ? aggregateName(flow.triggerAggregateId) : sourceId,
        x: pos.x,
        y: pos.y,
        w: SRC_W,
        h: SRC_H,
        kind: flow.triggerAggregateId ? 'aggregate' : 'boundedContext',
        symbol: flow.triggerAggregateId ? 'aggregate' : 'component',
        fill: '#ffffff',
        stroke: '#64748b',
        badge: flow.triggerAggregateId ? 'AGGREGATE' : 'BOUNDED_CONTEXT',
      });
    }

    // the flow itself
    const flowNodeId = `flow:${flow.id}`;
    const flowPos = layout[flowNodeId] ?? { x: 470, y: rowY };
    nodes.push({
      id: flowNodeId,
      label: flow.name,
      x: flowPos.x,
      y: flowPos.y,
      w: FLOW_W,
      h: FLOW_H,
      kind: 'flow',
      symbol: 'flow',
      fill: '#ffffff',
      stroke: color,
      badge: flow.archetype,
      tooltip: `Flow ${flow.name} [${flow.archetype}]${flow.readModelName ? ` → read model ${flow.readModelName}` : ''}${flow.targetUseCaseId ? ` → use case ${flow.targetUseCaseId}` : ''}`,
    });

    // target
    const target = targetLabel(model, flow);
    const targetNodeId = `tgt:${target.id}`;
    if (!seen.has(targetNodeId)) {
      seen.add(targetNodeId);
      const pos = layout[targetNodeId] ?? { x: 790, y: rowY };
      nodes.push({
        id: targetNodeId,
        label: target.label,
        x: pos.x,
        y: pos.y,
        w: TGT_W,
        h: TGT_H,
        kind: target.external ? 'external-system' : 'boundedContext',
        symbol: 'component',
        fill: target.external ? '#ffffff' : '#e0e7ff',
        stroke: '#64748b',
        dashed: target.external,
        badge: target.external ? 'EXTERNAL' : 'BOUNDED_CONTEXT',
      });
    }

    edges.push({
      id: `fe:${flow.id}:in`,
      sourceId,
      targetId: flowNodeId,
      kind: 'flow-trigger',
      label: flow.triggerEvent,
      color: '#94a3b8',
      dashed: true,
      arrow: true,
      tooltip: flow.triggerEvent ? t('views.flows.triggerEvent', { event: flow.triggerEvent }) : undefined,
    });
    edges.push({
      id: `fe:${flow.id}:out`,
      sourceId: flowNodeId,
      targetId: targetNodeId,
      kind: 'flow-delivery',
      color,
      arrow: true,
    });
  });

  return { nodes, edges };
}
