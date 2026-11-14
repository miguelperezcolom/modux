import type { ModuxModel } from '../model.js';
import type { Scene, SceneNode, SceneEdge, DiagramLayout } from '../scene.js';
import { t as i18n } from '../i18n/index.js';

/**
 * Integraciones view: every ETL integrator as a container with its pipeline
 * unfolded — sources (pull/consumer) → transforms → writes (api/db/event) —
 * plus the external systems (with their legacy tables), APIs and events it
 * touches, wired step by step. The heir of the old «Procesos» slot: this is
 * where the data-moving side of the system lives.
 */

const FLOW_W = 560;
const FLOW_HEADER = 34;
const FLOW_PAD = 14;
const STEP_W = 150;
const STEP_H = 40;
const STEP_GAP = 12;
const SAT_W = 150;
const SAT_H = 40;

const PHASE_OF = (type: string): 0 | 1 | 2 =>
  type.startsWith('SOURCE') ? 0 : type === 'TRANSFORM' ? 1 : 2;

const STEP_STYLE: Record<0 | 1 | 2, { fill: string; stroke: string; symbol: string }> = {
  0: { fill: '#f0f9ff', stroke: '#0284c7', symbol: 'lens' },
  1: { fill: '#f0fdfa', stroke: '#0f766e', symbol: 'gear' },
  2: { fill: '#f5f3ff', stroke: '#7c3aed', symbol: 'event' },
};

export function integrationsScene(model: ModuxModel, layout: DiagramLayout): Scene {
  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];
  const flows = model.etlFlows ?? [];
  const boundedContextName = new Map(model.boundedContexts.map((m) => [m.id, m.name]));
  const eventName = new Map(
    model.boundedContexts.flatMap((m) => [
      ...(m.domainEvents ?? []).map((ev) => [ev.id, ev.name] as const),
      ...(m.applicationEvents ?? []).map((ev) => [ev.id, ev.name] as const),
    ]),
  );

  // ---- integrators: the pipeline unfolded in three columns ------------------
  let flowY = 140;
  for (const f of flows) {
    const steps = f.steps ?? [];
    const byPhase: [typeof steps, typeof steps, typeof steps] = [[], [], []];
    steps.forEach((s) => byPhase[PHASE_OF(s.type)].push(s));
    const rows = Math.max(1, ...byPhase.map((c) => c.length));
    const h = FLOW_HEADER + FLOW_PAD + rows * (STEP_H + STEP_GAP);
    const pos = layout[f.id] ?? { x: 420, y: flowY };
    flowY = pos.y + h + 110;
    nodes.push({
      id: f.id,
      label: f.name,
      x: pos.x,
      y: pos.y,
      w: FLOW_W,
      h,
      kind: 'etl-flow',
      symbol: 'gear',
      badge: 'ETL',
      container: true,
      fill: '#ffffff',
      stroke: '#0f766e',
      tooltip: f.ownerBoundedContextId
        ? i18n('views.integrations.flowTooltipOwned', { name: f.name, context: boundedContextName.get(f.ownerBoundedContextId) ?? f.ownerBoundedContextId })
        : i18n('views.integrations.flowTooltip', { name: f.name }),
    });
    byPhase.forEach((column, phase) => {
      const colX = pos.x - FLOW_W / 2 + FLOW_PAD + STEP_W / 2 + (phase * (FLOW_W - 2 * FLOW_PAD - STEP_W)) / 2;
      column.forEach((s, row) => {
        const style = STEP_STYLE[phase as 0 | 1 | 2];
        nodes.push({
          id: s.id,
          label: s.name ?? s.id,
          x: colX,
          y: pos.y - h / 2 + FLOW_HEADER + STEP_H / 2 + row * (STEP_H + STEP_GAP),
          w: STEP_W,
          h: STEP_H,
          kind: 'etl-step',
          symbol: style.symbol,
          fill: style.fill,
          stroke: style.stroke,
          badge: s.type === 'SOURCE_PULL' ? 'PULL' : s.type === 'SOURCE_CONSUMER' ? 'CONSUME'
            : s.type === 'TRANSFORM' ? 'TRANSFORM'
            : s.type === 'WRITE_API' ? '→ API' : s.type === 'WRITE_DB' ? `→ ${i18n('views.integrations.dbBadge')}` : `→ ${i18n('views.integrations.eventBadge')}`,
          parentId: f.id,
          tooltip: `${s.name ?? s.id} (${s.type})${s.mappingId ? i18n('views.integrations.stepAppliesMapping') : ''}${i18n('views.integrations.stepRemove')}`,
        });
        // the pipeline inside: source → its transforms → its writes (visual order)
        if (phase > 0) {
          const prevColumn = byPhase[(phase - 1) as 0 | 1];
          const prev = prevColumn[Math.min(row, prevColumn.length - 1)];
          if (prev) {
            edges.push({
              id: `etlpipe:${f.id}:${prev.id}->${s.id}`,
              sourceId: prev.id,
              targetId: s.id,
              kind: 'etl-pipe',
              color: '#0f766e',
              arrow: true,
              tooltip: i18n('views.integrations.pipeEdge'),
            });
          }
        }
      });
    });
  }

  // ---- satellites: external systems with tables, APIs and events -----------
  const nodeIds = new Set(nodes.map((n) => n.id));
  const usedTables = new Set(flows.flatMap((f) => (f.steps ?? []).map((s) => s.externalTableId)).filter(Boolean));
  const usedApis = new Set(flows.flatMap((f) => (f.steps ?? []).map((s) => s.apiId)).filter(Boolean));
  const usedEvents = new Set(flows.flatMap((f) => (f.steps ?? []).map((s) => s.eventId)).filter(Boolean));

  let satY = 120;
  for (const x of model.externalSystems) {
    const tables = (x.tables ?? []).filter((t) => usedTables.has(t.id));
    if (!tables.length) continue;
    const h = FLOW_HEADER + FLOW_PAD + tables.length * (SAT_H + STEP_GAP);
    const pos = layout[x.id] ?? { x: -140, y: satY };
    satY = pos.y + h + 90;
    nodes.push({
      id: x.id,
      label: x.name,
      x: pos.x,
      y: pos.y,
      w: SAT_W + 30,
      h,
      kind: 'external-system',
      symbol: 'component',
      badge: 'EXTERNAL',
      container: true,
      fill: '#ffffff',
      stroke: '#64748b',
      dashed: true,
      tooltip: i18n('views.integrations.externalSystemTooltip', { name: x.name }),
    });
    nodeIds.add(x.id);
    tables.forEach((t, i) => {
      nodes.push({
        id: t.id,
        label: t.name,
        x: pos.x,
        y: pos.y - h / 2 + FLOW_HEADER + SAT_H / 2 + i * (SAT_H + STEP_GAP),
        w: SAT_W,
        h: SAT_H,
        kind: 'external-table',
        symbol: 'readmodel',
        fill: '#fefce8',
        stroke: '#a16207',
        parentId: x.id,
        tooltip: i18n('views.integrations.tableTooltip', { name: t.name, system: x.name }),
      });
      nodeIds.add(t.id);
    });
  }
  let apiY = 120;
  for (const a of model.apis ?? []) {
    if (!usedApis.has(a.id)) continue;
    const pos = layout[a.id] ?? { x: 1000, y: apiY };
    apiY = pos.y + SAT_H + 70;
    nodes.push({
      id: a.id, label: a.name, x: pos.x, y: pos.y, w: SAT_W, h: SAT_H,
      kind: 'api', symbol: 'interface', badge: 'API',
      fill: '#eef2ff', stroke: '#4f46e5',
      tooltip: i18n('views.integrations.apiTooltip', { name: a.name }),
    });
    nodeIds.add(a.id);
  }
  let evY = 400;
  for (const evId of usedEvents) {
    const id = evId as string;
    const pos = layout[id] ?? { x: 1000, y: evY };
    evY = pos.y + SAT_H + 70;
    nodes.push({
      id, label: eventName.get(id) ?? id, x: pos.x, y: pos.y, w: SAT_W, h: SAT_H,
      kind: 'domain-event', symbol: 'event', badge: i18n('views.integrations.eventBadge'),
      fill: '#fff7ed', stroke: '#f59e0b',
      tooltip: i18n('views.integrations.eventTooltip'),
    });
    nodeIds.add(id);
  }

  // ---- the wiring: satellite ↔ STEP, same ids as the context map ------------
  for (const f of flows) {
    for (const s of f.steps ?? []) {
      const ref = s.externalTableId ?? s.apiId ?? s.eventId;
      if (!ref || !nodeIds.has(ref) || !nodeIds.has(s.id)) continue;
      const source = s.type.startsWith('SOURCE');
      edges.push({
        id: `etl:${f.id}:${s.id}`,
        sourceId: source ? ref : s.id,
        targetId: source ? s.id : ref,
        kind: source ? 'etl-source' : 'etl-write',
        color: '#0f766e',
        label: s.type === 'SOURCE_PULL' ? 'pull' : s.type === 'SOURCE_CONSUMER' ? 'consume'
          : s.type === 'WRITE_API' ? 'api' : s.type === 'WRITE_DB' ? i18n('views.integrations.dbEdge') : i18n('views.integrations.eventEdge'),
        dashed: true,
        arrow: true,
        tooltip: source ? i18n('views.integrations.readsHere', { name: f.name }) : i18n('views.integrations.writesHere', { name: f.name }),
      });
    }
  }

  return { nodes, edges };
}
