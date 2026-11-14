import type { ModuxModel } from '../model.js';
import type { Scene, SceneNode, SceneEdge, DiagramLayout } from '../scene.js';
import { t } from '../i18n/index.js';

/**
 * Aggregates view: aggregates as nodes coloured by their boundedContext's subdomain,
 * entities-within-aggregates as smaller satellite nodes, containment dashed,
 * cross-aggregate references solid.
 */

const SUBDOMAIN_FILL: Record<string, string> = {
  CORE: '#fef3c7',
  SUPPORTING: '#e0e7ff',
  GENERIC: '#f1f5f9',
};

const AGG_W = 176;
const AGG_H = 60;
const ENT_W = 140;
const ENT_H = 40;
const VO_W = 140;
const VO_H = 40;

/** Column per boundedContext, aggregates stacked, entities and value objects hanging under their aggregate. */
function defaultPositions(model: ModuxModel): DiagramLayout {
  const layout: DiagramLayout = {};
  const aggregates = model.aggregates ?? [];
  const entities = model.entities ?? [];
  const valueObjects = model.valueObjects ?? [];
  model.boundedContexts.forEach((m, mi) => {
    const columnX = 220 + mi * 340;
    const own = aggregates.filter((a) => a.boundedContextId === m.id);
    own.forEach((a, ai) => {
      const ents = entities.filter((e) => e.aggregateId === a.id);
      const vos = valueObjects.filter((v) => v.aggregateId === a.id);
      const y = 140 + ai * (170 + (ents.length + vos.length) * 60);
      layout[a.id] = { x: columnX, y };
      ents.forEach((e, ei) => {
        layout[e.id] = { x: columnX + 60, y: y + 100 + ei * 60 };
      });
      vos.forEach((v, vi) => {
        layout[v.id] = { x: columnX + 60, y: y + 100 + (ents.length + vi) * 60 };
      });
    });
  });
  // Aggregates whose boundedContext is unknown still get a slot.
  aggregates
    .filter((a) => !model.boundedContexts.some((m) => m.id === a.boundedContextId))
    .forEach((a, i) => {
      layout[a.id] = { x: 220 + i * 340, y: 640 };
    });
  return layout;
}

export function aggregatesScene(model: ModuxModel, layout: DiagramLayout): Scene {
  const defaults = defaultPositions(model);
  const pos = (id: string) => layout[id] ?? defaults[id] ?? { x: 200, y: 200 };
  const boundedContextById = new Map(model.boundedContexts.map((m) => [m.id, m]));

  const aggregateNodes: SceneNode[] = (model.aggregates ?? []).map((a) => {
    const boundedContext = boundedContextById.get(a.boundedContextId);
    const subdomain = boundedContext?.subdomainType ?? 'GENERIC';
    const p = pos(a.id);
    const entCount = (model.entities ?? []).filter((e) => e.aggregateId === a.id).length;
    const voCount = (model.valueObjects ?? []).filter((v) => v.aggregateId === a.id).length;
    const invCount = (a.invariants ?? []).length;
    const opCount = (a.operations ?? []).length;
    const chips =
      (entCount ? ` · 🗂${entCount}` : '') +
      (voCount ? ` · ◈${voCount}` : '') +
      (opCount ? ` · ⚙${opCount}` : '') +
      (invCount ? ` · ⚖${invCount}` : '');
    return {
      id: a.id,
      label: a.name,
      x: p.x,
      y: p.y,
      w: AGG_W,
      h: AGG_H,
      kind: 'aggregate',
      symbol: 'aggregate',
      fill: SUBDOMAIN_FILL[subdomain],
      stroke: '#64748b',
      badge: `${boundedContext ? `${boundedContext.name.toUpperCase()} · ` : ''}AGGREGATE${chips}`,
      tooltip:
        t('views.aggregates.aggregateTooltip', { name: a.name }) +
        (boundedContext ? t('views.aggregates.aggregateTooltipContext', { context: boundedContext.name, subdomain }) : '') +
        (voCount || entCount ? t('views.aggregates.aggregateTooltipContents', { entities: entCount, valueObjects: voCount }) : ''),
    };
  });

  // A value object / entity used as a field's TYPE shows via the field (its name is on the
  // field chip); only those NOT yet used by any field appear loose here.
  const referencedTypeIds = new Set<string>();
  [...(model.aggregates ?? []), ...(model.entities ?? [])].forEach((o) =>
    (o.fields ?? []).forEach((f) => {
      if (f.typeKind !== 'primitive' && f.typeRef) referencedTypeIds.add(f.typeRef);
    }),
  );

  const entityNodes: SceneNode[] = (model.entities ?? [])
    .filter((e) => !referencedTypeIds.has(e.id))
    .map((e) => {
    const p = pos(e.id);
    return {
      id: e.id,
      label: e.name,
      x: p.x,
      y: p.y,
      w: ENT_W,
      h: ENT_H,
      kind: 'entity',
      symbol: 'entity',
      fill: '#ffffff',
      stroke: '#94a3b8',
      badge: 'ENTITY',
      tooltip: t('views.aggregates.entityTooltip', { name: e.name }),
    };
  });

  const valueObjectNodes: SceneNode[] = (model.valueObjects ?? [])
    .filter((v) => !referencedTypeIds.has(v.id))
    .map((v) => {
    const p = pos(v.id);
    const summary =
      v.type === 'Enum'
        ? (v.enumValues ?? []).join(' · ')
        : v.type === 'Wrapper'
          ? (v.dataType ?? '')
          : (v.fields ?? []).map((f) => f.name).join(', ');
    return {
      id: v.id,
      label: v.name,
      x: p.x,
      y: p.y,
      w: VO_W,
      h: VO_H,
      kind: 'value-object',
      symbol: 'value-object',
      fill: '#faf5ff',
      stroke: '#a855f7',
      badge: `VALUE OBJECT${v.type ? ` · ${v.type.toUpperCase()}` : ''}`,
      tooltip: `Value object ${v.name}${summary ? ` — ${summary}` : ''}`,
    };
  });

  const valueObjectEdges: SceneEdge[] = (model.valueObjects ?? []).filter((v) => !referencedTypeIds.has(v.id)).map((v) => ({
    id: `contains-vo:${v.aggregateId}->${v.id}`,
    sourceId: v.aggregateId,
    targetId: v.id,
    kind: 'containment',
    color: '#a855f7',
    dashed: true,
    tooltip: t('views.aggregates.valueObjectInAggregate'),
  }));

  // The rules an owner protects, orbiting it — declared from the palette. Owners are
  // aggregates AND, now, value objects and entities (each can carry invariants).
  const aggIds = new Set((model.aggregates ?? []).map((a) => a.id));
  const invariantHosts: { id: string; ownerKind: string; invariants?: { id: string; name: string }[] }[] = [
    ...(model.aggregates ?? []).map((a) => ({ id: a.id, ownerKind: t('views.aggregates.ownerAggregate'), invariants: a.invariants })),
    ...(model.valueObjects ?? []).map((v) => ({ id: v.id, ownerKind: t('views.aggregates.ownerValueObject'), invariants: v.invariants })),
    ...(model.entities ?? []).map((e) => ({ id: e.id, ownerKind: t('views.aggregates.ownerEntity'), invariants: e.invariants })),
  ];
  const invariantNodes: SceneNode[] = invariantHosts.flatMap((owner) =>
    (owner.invariants ?? []).map((inv, i) => {
      const base = pos(owner.id);
      // Aggregates park their invariants to the left; VOs/entities (already indented
      // right of the aggregate) park theirs further right to avoid the column.
      const p = layout[inv.id] ??
        (aggIds.has(owner.id)
          ? { x: base.x - 150, y: base.y + 90 + i * 52 }
          : { x: base.x + 160, y: base.y + i * 46 });
      return {
        id: inv.id,
        label: inv.name,
        x: p.x,
        y: p.y,
        w: 150,
        h: 36,
        kind: 'invariant',
        symbol: 'shield',
        fill: '#f0fdfa',
        stroke: '#0f766e',
        badge: `⚖ ${t('views.aggregates.invariantBadge')}`,
        tooltip: t('views.aggregates.invariantTooltip', { name: inv.name, owner: owner.ownerKind }),
      } as SceneNode;
    }),
  );

  const invariantEdges: SceneEdge[] = invariantHosts.flatMap((owner) =>
    (owner.invariants ?? []).map((inv) => ({
      id: `protects:${owner.id}->${inv.id}`,
      sourceId: owner.id,
      targetId: inv.id,
      kind: 'invariant-containment',
      color: '#0f766e',
      dashed: true,
      tooltip: t('views.aggregates.protectsEdge'),
    })),
  );

  const containmentEdges: SceneEdge[] = (model.entities ?? []).filter((e) => !referencedTypeIds.has(e.id)).map((e) => ({
    id: `contains:${e.aggregateId}->${e.id}`,
    sourceId: e.aggregateId,
    targetId: e.id,
    kind: 'containment',
    color: '#94a3b8',
    dashed: true,
    tooltip: t('views.aggregates.entityInAggregate'),
  }));

  const referenceEdges: SceneEdge[] = (model.aggregateReferences ?? []).map((r, i) => ({
    id: `aggref:${i}:${r.sourceAggregateId}->${r.targetAggregateId}`,
    sourceId: r.sourceAggregateId,
    targetId: r.targetAggregateId,
    kind: 'aggregate-reference',
    label: r.label,
    color: '#475569',
    arrow: true,
    tooltip: r.label ? t('views.aggregates.referenceLabelled', { label: r.label }) : t('views.aggregates.reference'),
  }));

  // Fields (attributes) of aggregates and entities, orbiting their owner. Their type
  // (primitive name or the referenced VO/entity/aggregate name) shows on the chip.
  const nameById = new Map<string, string>();
  (model.valueObjects ?? []).forEach((v) => nameById.set(v.id, v.name));
  (model.entities ?? []).forEach((e) => nameById.set(e.id, e.name));
  (model.aggregates ?? []).forEach((a) => nameById.set(a.id, a.name));
  const fieldHosts = [
    ...(model.aggregates ?? []).map((a) => ({ id: a.id, fields: a.fields })),
    ...(model.entities ?? []).map((e) => ({ id: e.id, fields: e.fields })),
  ];
  const fieldNodes: SceneNode[] = fieldHosts.flatMap((owner) =>
    (owner.fields ?? []).map((f, i) => {
      const base = pos(owner.id);
      const p = layout[f.id] ?? { x: base.x + 175, y: base.y - 20 + i * 44 };
      const base2 =
        f.typeKind === 'primitive' ? f.typeRef || t('views.aggregates.defaultPrimitive') : nameById.get(f.typeRef) ?? t('views.placeholder.type');
      const typeLabel = f.collection ? `[${base2}]` : base2;
      return {
        id: f.id,
        label: `${f.name}${f.required ? ' ∗' : ''}`,
        x: p.x,
        y: p.y,
        w: 150,
        h: 34,
        kind: 'field',
        symbol: 'field',
        fill: '#f8fafc',
        stroke: '#64748b',
        badge: `${t('views.aggregates.fieldBadge')} · ${typeLabel}`,
        tooltip:
          t('views.aggregates.fieldTooltip', { name: f.name }) +
          (f.required ? t('views.aggregates.fieldRequired') : '') +
          (f.collection ? t('views.aggregates.fieldCollection') : '') +
          ` : ${typeLabel}`,
      } as SceneNode;
    }),
  );
  const fieldEdges: SceneEdge[] = fieldHosts.flatMap((owner) =>
    (owner.fields ?? []).map((f) => ({
      id: `contains-field:${owner.id}->${f.id}`,
      sourceId: owner.id,
      targetId: f.id,
      kind: 'containment',
      color: '#94a3b8',
      dashed: true,
      tooltip: t('views.aggregates.fieldEdge'),
    })),
  );

  // Operations of the aggregate — behaviours with an input and an output model.
  const modelName = (mid?: string) => (mid ? model.models?.find((m) => m.id === mid)?.name : undefined);
  const operationNodes: SceneNode[] = (model.aggregates ?? []).flatMap((a) =>
    (a.operations ?? []).map((o, i) => {
      const base = pos(a.id);
      const p = layout[o.id] ?? { x: base.x - 190, y: base.y - 20 + i * 44 };
      const inN = modelName(o.inputModelId) ?? '';
      const outN = modelName(o.outputModelId);
      return {
        id: o.id,
        label: o.name,
        x: p.x,
        y: p.y,
        w: 150,
        h: 34,
        kind: 'operation',
        symbol: 'operation',
        fill: '#f5f3ff',
        stroke: '#7c3aed',
        badge: `OP · ${inN}${outN ? ` → ${outN}` : ''}`,
        tooltip: `${t('views.aggregates.operationTooltip', { name: o.name })}(${inN})${outN ? ` : ${outN}` : ''}`,
      } as SceneNode;
    }),
  );
  const operationEdges: SceneEdge[] = (model.aggregates ?? []).flatMap((a) =>
    (a.operations ?? []).map((o) => ({
      id: `contains-op:${a.id}->${o.id}`,
      sourceId: a.id,
      targetId: o.id,
      kind: 'containment',
      color: '#a78bfa',
      dashed: true,
      tooltip: t('views.aggregates.operationEdge'),
    })),
  );

  return {
    nodes: [...aggregateNodes, ...entityNodes, ...valueObjectNodes, ...invariantNodes, ...fieldNodes, ...operationNodes],
    edges: [...containmentEdges, ...valueObjectEdges, ...referenceEdges, ...invariantEdges, ...fieldEdges, ...operationEdges],
  };
}
