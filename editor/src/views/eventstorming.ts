import type { ModuxModel } from '../model.js';
import type { Scene, SceneNode, SceneEdge, DiagramLayout } from '../scene.js';
import { t } from '../i18n/index.js';

/**
 * EventStorming view: the causal chain derived from the model, in classic
 * sticky-note notation — actor → command (use case, blue) → aggregate (yellow)
 * → domain event (orange) → policy (subscription/flow/process/workflow, lilac)
 * → next command… with read models (green) and external systems (pink).
 * Nothing here is drawn by hand: every node and edge is a projection of what
 * the model already declares.
 */

const STICKY = {
  actor: { fill: '#fef9c3', stroke: '#ca8a04', w: 110, h: 40 },
  command: { fill: '#bfdbfe', stroke: '#1d4ed8', w: 150, h: 56 },
  aggregate: { fill: '#fef08a', stroke: '#a16207', w: 160, h: 48 },
  event: { fill: '#fdba74', stroke: '#c2410c', w: 150, h: 56 },
  policy: { fill: '#e9d5ff', stroke: '#7e22ce', w: 170, h: 56 },
  readModel: { fill: '#bbf7d0', stroke: '#15803d', w: 150, h: 48 },
  external: { fill: '#fbcfe8', stroke: '#be185d', w: 150, h: 48 },
  boundedContext: { fill: '#e0e7ff', stroke: '#64748b', w: 150, h: 44 },
} as const;

interface Builder {
  nodes: Map<string, SceneNode>;
  edges: SceneEdge[];
}

function addNode(b: Builder, node: SceneNode): void {
  if (!b.nodes.has(node.id)) b.nodes.set(node.id, node);
}

function addEdge(b: Builder, edge: SceneEdge): void {
  if (!b.edges.some((e) => e.id === edge.id)) b.edges.push(edge);
}

const norm = (name: string) => name.trim().toLowerCase();

export function eventstormingScene(
  model: ModuxModel,
  layout: DiagramLayout,
  expandedIds: ReadonlySet<string> = new Set(),
  expandAll = false,
): Scene {
  const b: Builder = { nodes: new Map(), edges: [] };

  const boundedContextName = new Map(model.boundedContexts.map((m) => [m.id, m.name]));
  const useCases = model.boundedContexts.flatMap((m) =>
    (m.useCases ?? []).map((u) => ({ ...u, boundedContextId: m.id })),
  );
  const ucIds = new Set(useCases.map((u) => u.id));
  const aggregates = model.aggregates ?? [];
  const domainServiceIds = new Set(
    model.boundedContexts.flatMap((m) => (m.domainServices ?? []).map((ds) => ds.id)),
  );
  const domainEvents = model.boundedContexts.flatMap((m) =>
    (m.domainEvents ?? []).map((ev) => ({ ...ev, boundedContextId: m.id, application: false })),
  );
  const applicationEvents = model.boundedContexts.flatMap((m) =>
    (m.applicationEvents ?? []).map((ev) => ({ ...ev, boundedContextId: m.id, application: true })),
  );
  const readModels = model.boundedContexts.flatMap((m) =>
    (m.readModels ?? []).map((rm) => ({ ...rm, boundedContextId: m.id })),
  );

  // ---- commands (every use case is a command; policies wear lilac) --------
  for (const uc of useCases) {
    addNode(b, {
      id: uc.id,
      label: uc.name,
      x: 0,
      y: 0,
      w: STICKY.command.w,
      h: STICKY.command.h,
      kind: 'use-case',
      symbol: uc.policy ? 'flow' : 'gear',
      fill: uc.policy ? STICKY.policy.fill : STICKY.command.fill,
      stroke: uc.policy ? STICKY.policy.stroke : STICKY.command.stroke,
      badge: uc.policy ? 'POLICY' : t('views.eventstorming.commandBadge'),
      tooltip: uc.policy
        ? t('views.eventstorming.policyTooltip', { name: uc.name, context: boundedContextName.get(uc.boundedContextId) ?? uc.boundedContextId })
        : t('views.eventstorming.useCaseTooltip', { name: uc.name, context: boundedContextName.get(uc.boundedContextId) ?? uc.boundedContextId }),
    });
  }

  // ---- the pipeline (Archi style): a command folds its steps away by default;
  // its chevron unfolds them as free stickies chained under it, owned by it.
  for (const uc of useCases) {
    const steps = uc.steps ?? [];
    if (!steps.length) continue;
    const cmd = b.nodes.get(uc.id);
    const expanded = expandAll || expandedIds.has(uc.id);
    if (cmd) {
      cmd.collapsible = true;
      cmd.collapsed = !expanded;
    }
    if (!expanded) continue;
    steps.forEach((st, i) => {
      addNode(b, {
        id: st.id,
        label: `${i + 1}. ${st.name || st.type || t('views.eventstorming.stepFallback')}`,
        x: 0,
        y: 0,
        w: STICKY.command.w,
        h: 30,
        kind: 'use-case-step',
        symbol: 'gear',
        fill: '#eff6ff',
        stroke: '#1d4ed8',
        dashed: !!st.customCodeId,
        ownerId: uc.id,
        tooltip:
          t('views.eventstorming.stepTooltip', { name: uc.name }) +
          (st.customCodeId ? t('views.eventstorming.stepDelegates') : '') +
          t('views.eventstorming.stepDragHint'),
      });
      addEdge(b, {
        id: `esstep:${i === 0 ? uc.id : steps[i - 1].id}->${st.id}`,
        sourceId: i === 0 ? uc.id : steps[i - 1].id,
        targetId: st.id,
        kind: 'es-step',
        color: '#94a3b8',
        dashed: true,
        arrow: true,
        tooltip: t('views.eventstorming.pipelineEdge', { name: uc.name }),
      });
    });
  }
  for (const cc of model.customCodes ?? []) {
    addNode(b, {
      id: cc.id,
      label: cc.name,
      x: 0,
      y: 0,
      w: 150,
      h: 44,
      kind: 'custom-code',
      symbol: 'gear',
      fill: '#f8fafc',
      stroke: '#0f172a',
      badge: 'CODE',
      dashed: true,
      tooltip: t('views.eventstorming.customCodeTooltip', { name: cc.name }),
    });
  }
  for (const uc of useCases) {
    for (const st of uc.steps ?? []) {
      if (!st.customCodeId) continue;
      // Folded command: the sticky stands for its hidden step (roll-up), one line per CODE.
      const rolled = !b.nodes.has(st.id);
      const sourceId = rolled ? uc.id : st.id;
      if (
        rolled &&
        b.edges.some((e) => e.kind === 'es-custom' && e.sourceId === sourceId && e.targetId === st.customCodeId)
      ) continue;
      addEdge(b, {
        id: `escc:${st.id}`,
        sourceId,
        targetId: st.customCodeId,
        kind: 'es-custom',
        color: '#0f172a',
        dashed: true,
        arrow: true,
        tooltip: rolled
          ? t('views.eventstorming.foldedStepDelegates', { name: uc.name })
          : t('views.eventstorming.stepDelegatesEdge'),
      });
    }
  }

  // ---- aggregates ----------------------------------------------------------
  for (const agg of aggregates) {
    addNode(b, {
      id: agg.id,
      label: agg.name,
      x: 0,
      y: 0,
      w: STICKY.aggregate.w,
      h: STICKY.aggregate.h,
      kind: 'aggregate',
      symbol: 'aggregate',
      fill: STICKY.aggregate.fill,
      stroke: STICKY.aggregate.stroke,
      badge: t('views.eventstorming.aggregateBadge'),
      tooltip: t('views.eventstorming.aggregateTooltip', { name: agg.name, context: boundedContextName.get(agg.boundedContextId) ?? agg.boundedContextId }),
    });
  }

  // ---- events (domain + application), addressable by id AND by name -------
  const eventNodeByName = new Map<string, string>();
  for (const ev of [...domainEvents, ...applicationEvents]) {
    addNode(b, {
      id: ev.id,
      label: ev.name,
      x: 0,
      y: 0,
      w: STICKY.event.w,
      h: STICKY.event.h,
      kind: ev.application ? 'application-event' : 'domain-event',
      symbol: 'event',
      fill: STICKY.event.fill,
      stroke: STICKY.event.stroke,
      badge: ev.application ? t('views.eventstorming.applicationEventBadge') : t('views.eventstorming.eventBadge'),
      tooltip: t('views.eventstorming.eventTooltip', { name: ev.name, context: boundedContextName.get(ev.boundedContextId) ?? ev.boundedContextId }),
    });
    eventNodeByName.set(norm(ev.name), ev.id);
  }
  /** Event referenced by name only (trigger of a flow/process/subscription). */
  const eventNodeFor = (name: string | undefined): string | null => {
    if (!name || !name.trim()) return null;
    const declared = eventNodeByName.get(norm(name));
    if (declared) return declared;
    const synthId = `evname:${norm(name)}`;
    addNode(b, {
      id: synthId,
      label: name,
      x: 0,
      y: 0,
      w: STICKY.event.w,
      h: STICKY.event.h,
      kind: 'event-name',
      symbol: 'event',
      fill: STICKY.event.fill,
      stroke: STICKY.event.stroke,
      dashed: true,
      badge: t('views.eventstorming.undeclaredEventBadge'),
      tooltip: t('views.eventstorming.undeclaredEventTooltip', { name }),
    });
    return synthId;
  };

  // ---- read models, resolvable by id or by name ----------------------------
  const readModelNodeFor = (idOrName: { id?: string; name?: string }): string | null => {
    const declared =
      readModels.find((rm) => rm.id === idOrName.id) ??
      readModels.find((rm) => idOrName.name && norm(rm.name) === norm(idOrName.name));
    const id = declared?.id ?? (idOrName.id || (idOrName.name ? `rm:${norm(idOrName.name)}` : null));
    if (!id) return null;
    addNode(b, {
      id,
      label: declared?.name ?? idOrName.name ?? id,
      x: 0,
      y: 0,
      w: STICKY.readModel.w,
      h: STICKY.readModel.h,
      kind: declared ? 'read-model' : 'derived-read-model',
      fill: STICKY.readModel.fill,
      stroke: STICKY.readModel.stroke,
      dashed: !declared,
      badge: 'READ MODEL',
    });
    return id;
  };

  // ---- actors → commands ---------------------------------------------------
  for (const use of model.actorUses ?? []) {
    if (!ucIds.has(use.targetId)) continue; // query-service uses belong to other views
    const actor = (model.actors ?? []).find((a) => a.id === use.actorId);
    if (!actor) continue;
    addNode(b, {
      id: actor.id,
      label: actor.name,
      x: 0,
      y: 0,
      w: STICKY.actor.w,
      h: STICKY.actor.h,
      kind: 'actor',
      symbol: 'person',
      fill: STICKY.actor.fill,
      stroke: STICKY.actor.stroke,
      badge: 'ACTOR',
    });
    addEdge(b, {
      id: `es-actor:${actor.id}->${use.targetId}`,
      sourceId: actor.id,
      targetId: use.targetId,
      kind: 'es-actor-command',
      color: '#94a3b8',
      arrow: true,
    });
  }

  // ---- AI agents: automated actors whose tools are commands, external ops and MCP servers
  for (const agent of model.aiAgents ?? []) {
    const uses = (model.agentUses ?? []).filter((u) => u.agentId === agent.id);
    const externalUses = (model.agentExternalUses ?? []).filter((u) => u.agentId === agent.id);
    const ragLinks = (model.agentRags ?? []).filter((u) => u.agentId === agent.id);
    const mcpUses = (model.agentMcpUses ?? []).filter((u) => u.agentId === agent.id);
    const otherTools =
      (model.agentGatewayUses ?? []).some((u) => u.agentId === agent.id) ||
      (model.agentApiOpUses ?? []).some((u) => u.agentId === agent.id) ||
      (model.agentQueryUses ?? []).some((u) => u.agentId === agent.id) ||
      (model.agentDelegations ?? []).some((u) => u.agentId === agent.id) ||
      (model.agentTriggers ?? []).some((u) => u.agentId === agent.id);
    if (!uses.length && !externalUses.length && !ragLinks.length && !mcpUses.length && !otherTools)
      continue; // toolless agents belong to the context map
    addNode(b, {
      id: agent.id,
      label: agent.name,
      x: 0,
      y: 0,
      w: STICKY.actor.w,
      h: STICKY.actor.h,
      kind: 'ai-agent',
      symbol: 'robot',
      fill: '#faf5ff',
      stroke: '#9333ea',
      badge: t('views.eventstorming.aiAgentBadge'),
      tooltip: t('views.eventstorming.aiAgentTooltip', { name: agent.name }),
    });
    for (const use of uses) {
      if (!ucIds.has(use.useCaseId)) continue;
      addEdge(b, {
        id: `es-agent:${agent.id}->${use.useCaseId}`,
        sourceId: agent.id,
        targetId: use.useCaseId,
        kind: 'es-agent-command',
        color: '#9333ea',
        dashed: true,
        arrow: true,
        tooltip: t('views.eventstorming.consumesViaMcp'),
      });
    }
    for (const use of externalUses) {
      const owner = model.externalSystems.find((x) =>
        (x.useCases ?? []).some((u) => u.id === use.externalUseCaseId),
      );
      if (!owner) continue;
      const opName = (owner.useCases ?? []).find((u) => u.id === use.externalUseCaseId)?.name;
      addNode(b, {
        id: owner.id,
        label: owner.name,
        x: 0,
        y: 0,
        w: STICKY.external.w,
        h: STICKY.external.h,
        kind: 'external-system',
        symbol: 'component',
        fill: STICKY.external.fill,
        stroke: STICKY.external.stroke,
        dashed: true,
        badge: t('views.eventstorming.externalBadge'),
      });
      addEdge(b, {
        id: `es-agentx:${agent.id}->${use.externalUseCaseId}`,
        sourceId: agent.id,
        targetId: owner.id,
        kind: 'es-agent-external',
        label: opName,
        color: '#9333ea',
        dashed: true,
        arrow: true,
        tooltip: opName ? t('views.eventstorming.callsExternal', { name: opName }) : undefined,
      });
    }
    for (const use of mcpUses) {
      const owner = model.externalSystems.find((x) =>
        (x.mcpServers ?? []).some((s) => s.id === use.mcpServerId),
      );
      if (!owner) continue;
      const serverName = (owner.mcpServers ?? []).find((s) => s.id === use.mcpServerId)?.name;
      addNode(b, {
        id: owner.id,
        label: owner.name,
        x: 0,
        y: 0,
        w: STICKY.external.w,
        h: STICKY.external.h,
        kind: 'external-system',
        symbol: 'component',
        fill: STICKY.external.fill,
        stroke: STICKY.external.stroke,
        dashed: true,
        badge: t('views.eventstorming.externalBadge'),
      });
      addEdge(b, {
        id: `es-agentmcp:${agent.id}->${use.mcpServerId}`,
        sourceId: agent.id,
        targetId: owner.id,
        kind: 'es-agent-mcp',
        label: serverName,
        color: '#9333ea',
        dashed: true,
        arrow: true,
        tooltip: serverName
          ? t('views.eventstorming.consumesMcpTools', { name: serverName })
          : undefined,
      });
    }
    // Knowledge: the RAGs the agent grounds on, with the read models they index.
    for (const link of ragLinks) {
      const rag = (model.rags ?? []).find((r) => r.id === link.ragId);
      if (!rag) continue;
      addNode(b, {
        id: rag.id,
        label: rag.name,
        x: 0,
        y: 0,
        w: STICKY.readModel.w,
        h: STICKY.readModel.h,
        kind: 'rag',
        fill: '#ecfeff',
        stroke: '#0e7490',
        badge: 'RAG',
        tooltip: t('views.eventstorming.ragTooltip', { name: rag.name }),
      });
      addEdge(b, {
        id: `es-agrag:${agent.id}->${rag.id}`,
        sourceId: agent.id,
        targetId: rag.id,
        kind: 'es-agent-rag',
        color: '#0e7490',
        dashed: true,
        arrow: true,
        tooltip: t('views.eventstorming.ragQuery'),
      });
      for (const rmId of rag.sourceReadModelIds ?? []) {
        const rm = readModelNodeFor({ id: rmId });
        if (!rm) continue;
        addEdge(b, {
          id: `es-ragsrc:${rag.id}->${rm}`,
          sourceId: rm,
          targetId: rag.id,
          kind: 'es-rag-source',
          color: '#0e7490',
          dashed: true,
          arrow: true,
          tooltip: t('views.eventstorming.feedsIndex'),
        });
      }
    }
  }

  // ---- external systems calling in / being called --------------------------
  const externalNode = (id: string): string | null => {
    const ext = model.externalSystems.find((x) => x.id === id);
    if (!ext) return null;
    addNode(b, {
      id: ext.id,
      label: ext.name,
      x: 0,
      y: 0,
      w: STICKY.external.w,
      h: STICKY.external.h,
      kind: 'external-system',
      symbol: 'component',
      fill: STICKY.external.fill,
      stroke: STICKY.external.stroke,
      dashed: true,
      badge: t('views.eventstorming.externalBadge'),
    });
    return ext.id;
  };
  for (const call of model.externalCalls ?? []) {
    const ext = externalNode(call.externalSystemId);
    if (!ext || !ucIds.has(call.useCaseId)) continue;
    addEdge(b, {
      id: `es-extin:${ext}->${call.useCaseId}`,
      sourceId: ext,
      targetId: call.useCaseId,
      kind: 'es-external-command',
      color: '#be185d',
      dashed: true,
      arrow: true,
    });
  }
  for (const call of model.externalUseCaseCalls ?? []) {
    if (!ucIds.has(call.sourceId)) continue;
    const owner = model.externalSystems.find((x) =>
      (x.useCases ?? []).some((u) => u.id === call.targetId),
    );
    const ext = owner ? externalNode(owner.id) : null;
    if (!ext) continue;
    const ucName = (owner?.useCases ?? []).find((u) => u.id === call.targetId)?.name;
    addEdge(b, {
      id: `es-extout:${call.sourceId}->${call.targetId}`,
      sourceId: call.sourceId,
      targetId: ext,
      kind: 'es-command-external',
      label: ucName,
      color: '#be185d',
      dashed: true,
      arrow: true,
      tooltip: ucName ? t('views.eventstorming.callsExternal', { name: ucName }) : undefined,
    });
  }

  // ---- command → aggregate (write steps) -----------------------------------
  for (const call of model.aggregateCalls ?? []) {
    if (!ucIds.has(call.sourceId) || !b.nodes.has(call.targetId)) continue;
    addEdge(b, {
      id: `es-write:${call.sourceId}->${call.targetId}`,
      sourceId: call.sourceId,
      targetId: call.targetId,
      kind: 'es-command-aggregate',
      color: '#64748b',
      arrow: true,
    });
  }

  // ---- emissions: aggregate/domain-service → event, command → event --------
  const emissionEdges = [
    ...(model.emissions ?? []),
    ...(model.useCaseEmissions ?? []),
  ];
  for (const em of emissionEdges) {
    if (!b.nodes.has(em.domainEventId)) continue;
    const known =
      b.nodes.has(em.sourceId) &&
      (ucIds.has(em.sourceId) ||
        aggregates.some((a) => a.id === em.sourceId) ||
        domainServiceIds.has(em.sourceId));
    if (!known) continue;
    addEdge(b, {
      id: `es-emit:${em.sourceId}->${em.domainEventId}`,
      sourceId: em.sourceId,
      targetId: em.domainEventId,
      kind: 'es-emission',
      color: '#c2410c',
      arrow: true,
      tooltip: t('views.eventstorming.emits'),
    });
  }

  // ---- policies ------------------------------------------------------------
  const policyNode = (
    id: string,
    label: string,
    kind: string,
    badge: string,
    tooltip?: string,
    stroke?: string,
  ): string => {
    addNode(b, {
      id,
      label,
      x: 0,
      y: 0,
      w: STICKY.policy.w,
      h: STICKY.policy.h,
      kind,
      symbol: 'flow',
      fill: STICKY.policy.fill,
      stroke: stroke ?? STICKY.policy.stroke,
      badge,
      tooltip,
    });
    return id;
  };
  const trigger = (eventName: string | undefined, policyId: string): void => {
    const ev = eventNodeFor(eventName);
    if (!ev) return;
    addEdge(b, {
      id: `es-trigger:${ev}->${policyId}`,
      sourceId: ev,
      targetId: policyId,
      kind: 'es-trigger',
      color: '#7e22ce',
      dashed: true,
      arrow: true,
    });
  };
  const invoke = (policyId: string, useCaseId: string | undefined): void => {
    if (!useCaseId || !ucIds.has(useCaseId)) return;
    addEdge(b, {
      id: `es-invoke:${policyId}->${useCaseId}`,
      sourceId: policyId,
      targetId: useCaseId,
      kind: 'es-invoke',
      color: '#1d4ed8',
      arrow: true,
    });
  };

  // Subscriptions: the purest event → reaction wiring.
  for (const sub of model.subscriptions ?? []) {
    const id = policyNode(
      sub.id,
      sub.name,
      'subscription',
      'POLICY · SUBSCRIPTION',
      sub.name +
        (sub.eventName ? t('views.eventstorming.reactsTo', { event: sub.eventName }) : '') +
        (sub.consumerGroup ? t('views.eventstorming.consumerGroup', { group: sub.consumerGroup }) : ''),
    );
    trigger(sub.eventName, id);
    for (const action of sub.actions ?? []) {
      if (action.type === 'CallUseCase') invoke(id, action.useCaseId);
      if (action.type === 'StartSaga' && action.sagaId) {
        const sagaId = `saga:${action.sagaId}`;
        policyNode(sagaId, action.sagaId, 'saga', 'SAGA');
        addEdge(b, {
          id: `es-saga:${id}->${sagaId}`,
          sourceId: id,
          targetId: sagaId,
          kind: 'es-invoke',
          color: '#7e22ce',
          arrow: true,
        });
      }
      if (action.type === 'UpdateProjection' && action.projectionId) {
        const projection = (model.projections ?? []).find((p) => p.id === action.projectionId);
        if (projection) {
          addEdge(b, {
            id: `es-feeds:${id}->${projection.id}`,
            sourceId: id,
            targetId: projection.id,
            kind: 'es-invoke',
            color: '#7e22ce',
            arrow: true,
          });
        }
      }
    }
  }

  // Projections: event(s) → projection → read model.
  for (const projection of model.projections ?? []) {
    const id = policyNode(
      projection.id,
      projection.name,
      'projection',
      t('views.eventstorming.projectionBadge'),
      projection.name +
        (projection.readModelName ? t('views.eventstorming.materializes', { readModel: projection.readModelName }) : ''),
    );
    for (const evId of projection.handledEventIds) {
      const ev = b.nodes.has(evId) ? evId : null;
      if (!ev) continue;
      addEdge(b, {
        id: `es-trigger:${ev}->${id}`,
        sourceId: ev,
        targetId: id,
        kind: 'es-trigger',
        color: '#7e22ce',
        dashed: true,
        arrow: true,
      });
    }
    // Aggregate-sourced projection: the aggregate's whole state feeds it.
    if (projection.sourceAggregateId && b.nodes.has(projection.sourceAggregateId)) {
      addEdge(b, {
        id: `es-state:${projection.id}`,
        sourceId: projection.sourceAggregateId,
        targetId: id,
        kind: 'es-projects-state',
        color: '#0d9488',
        dashed: true,
        arrow: true,
        tooltip: t('views.eventstorming.projectsState'),
      });
    }
    // Externally-sourced projection: classic polling from an operation or legacy table.
    const externalSourceId = projection.sourceExternalUseCaseId ?? projection.sourceExternalTableId;
    if (externalSourceId) {
      const owner = model.externalSystems.find(
        (x) =>
          (x.useCases ?? []).some((u) => u.id === externalSourceId) ||
          (x.tables ?? []).some((t) => t.id === externalSourceId),
      );
      const ext = owner ? externalNode(owner.id) : null;
      if (ext) {
        const sourceName =
          (owner!.useCases ?? []).find((u) => u.id === externalSourceId)?.name ??
          (owner!.tables ?? []).find((t) => t.id === externalSourceId)?.name;
        addEdge(b, {
          id: `es-poll:${projection.id}`,
          sourceId: ext,
          targetId: id,
          kind: 'es-projects-poll',
          label: sourceName,
          color: '#0d9488',
          dashed: true,
          arrow: true,
          tooltip: sourceName ? t('views.eventstorming.pollingOf', { name: sourceName }) : t('views.eventstorming.polling'),
        });
      }
    }
    const rm = readModelNodeFor({ id: projection.readModelId, name: projection.readModelName });
    if (rm) {
      addEdge(b, {
        id: `es-projects:${id}->${rm}`,
        sourceId: id,
        targetId: rm,
        kind: 'es-projects',
        color: '#15803d',
        arrow: true,
      });
    }
  }

  // Flows: the intent layer. MATERIALIZES draws straight to its read model;
  // the rest are policies between the event and their target.
  for (const flow of model.flows) {
    if (flow.archetype === 'MATERIALIZES') {
      const ev = eventNodeFor(flow.triggerEvent);
      const rm = readModelNodeFor({ name: flow.readModelName ?? `${flow.triggerEvent}View` });
      if (ev && rm) {
        addEdge(b, {
          id: `es-mat:${flow.id}`,
          sourceId: ev,
          targetId: rm,
          kind: 'es-materializes',
          label: flow.name,
          color: '#0d9488',
          dashed: true,
          arrow: true,
          tooltip: `Flow ${flow.name} [MATERIALIZES]`,
        });
      }
      continue;
    }
    const id = policyNode(
      `flow:${flow.id}`,
      flow.name,
      'flow',
      `POLICY · ${flow.archetype}`,
      `Flow ${flow.name} [${flow.archetype}]`,
    );
    trigger(flow.triggerEvent, id);
    invoke(id, flow.targetUseCaseId);
    if (!flow.targetUseCaseId) {
      // NOTIFIES / ORCHESTRATES without a use-case target: deliver to the
      // target context or external system.
      const external = externalNode(flow.targetId);
      const targetNodeId = external ?? `tgt:${flow.targetId}`;
      if (!external && boundedContextName.has(flow.targetId)) {
        addNode(b, {
          id: targetNodeId,
          label: boundedContextName.get(flow.targetId) ?? flow.targetId,
          x: 0,
          y: 0,
          w: STICKY.boundedContext.w,
          h: STICKY.boundedContext.h,
          kind: 'boundedContext',
          symbol: 'component',
          fill: STICKY.boundedContext.fill,
          stroke: STICKY.boundedContext.stroke,
          badge: t('views.eventstorming.contextBadge'),
        });
      }
      if (b.nodes.has(targetNodeId)) {
        addEdge(b, {
          id: `es-deliver:${flow.id}`,
          sourceId: id,
          targetId: targetNodeId,
          kind: 'es-deliver',
          color: '#ea580c',
          arrow: true,
        });
      }
    }
  }

  // Processes: trigger event → process → step commands → completion event.
  for (const process of model.processes ?? []) {
    const id = policyNode(
      process.id,
      process.name,
      'process',
      `${t('views.eventstorming.processBadge')}${process.sla ? ` · SLA ${process.sla}` : ''}`,
      process.name + (process.triggerEvent ? t('views.workflows.startsOn', { event: process.triggerEvent }) : ''),
    );
    trigger(process.triggerEvent, id);
    for (const step of process.steps) invoke(id, step.useCaseId);
    const done = eventNodeFor(process.onCompletionEventName);
    if (done) {
      addEdge(b, {
        id: `es-done:${process.id}`,
        sourceId: id,
        targetId: done,
        kind: 'es-completion',
        color: '#c2410c',
        arrow: true,
        tooltip: t('views.eventstorming.emitsOnCompletion'),
      });
    }
  }

  // Workflows: cross-context orchestrators — same shape as processes.
  for (const workflow of model.workflows ?? []) {
    const id = policyNode(
      workflow.id,
      workflow.name,
      'workflow',
      'WORKFLOW',
      workflow.name + (workflow.triggerEvent ? t('views.workflows.startsOn', { event: workflow.triggerEvent }) : ''),
    );
    trigger(workflow.triggerEvent, id);
    for (const step of workflow.steps ?? []) {
      invoke(id, step.targetUseCaseId);
      for (const emitted of [step.emittedEventName, step.completionEventName]) {
        const ev = eventNodeFor(emitted);
        if (!ev) continue;
        addEdge(b, {
          id: `es-wfemit:${workflow.id}:${ev}`,
          sourceId: id,
          targetId: ev,
          kind: 'es-completion',
          color: '#c2410c',
          arrow: true,
        });
      }
    }
    const done = eventNodeFor(workflow.onCompletionEventName);
    if (done) {
      addEdge(b, {
        id: `es-done:${workflow.id}`,
        sourceId: id,
        targetId: done,
        kind: 'es-completion',
        color: '#c2410c',
        arrow: true,
      });
    }
  }

  // ---- default geometry: causal layering (longest path from the sources) ---
  const nodes = [...b.nodes.values()];
  const incoming = new Map<string, string[]>();
  for (const e of b.edges) {
    if (!incoming.has(e.targetId)) incoming.set(e.targetId, []);
    incoming.get(e.targetId)!.push(e.sourceId);
  }
  const depthOf = new Map<string, number>();
  const visiting = new Set<string>();
  const depth = (id: string): number => {
    const memo = depthOf.get(id);
    if (memo !== undefined) return memo;
    if (visiting.has(id)) return 0; // cycle guard: break at the back-edge
    visiting.add(id);
    const preds = incoming.get(id) ?? [];
    const d = preds.length ? 1 + Math.max(...preds.map(depth)) : 0;
    visiting.delete(id);
    depthOf.set(id, d);
    return d;
  };
  const rows = new Map<number, number>();
  for (const node of nodes) {
    const persisted = layout[node.id];
    if (persisted) {
      node.x = persisted.x;
      node.y = persisted.y;
      continue;
    }
    const d = depth(node.id);
    const row = rows.get(d) ?? 0;
    rows.set(d, row + 1);
    node.x = 140 + d * 260;
    node.y = 110 + row * 110;
  }

  return { nodes, edges: b.edges };
}
