/**
 * AI agents, the MCP gateways that curate what they can reach, and the knowledge bases they
 * ground themselves on.
 *
 * Almost everything here is «this agent may reach that», and what makes it interesting is that
 * the TARGET decides where the link is stored: a gateway exposing something, or a RAG indexing
 * something, sorts it by what it turns out to be. Getting that wrong is silent — the link is
 * saved in a slot nothing reads.
 *
 * Ported from `AgentEditorCommands`.
 */

import { asList, nested, type Element, type ModelStore } from '../store.js';
import { add, CommandError, type Handler } from '../spec.js';
import { mustGet } from './models.js';
import { t, type MessageKey } from '../../i18n/index.js';

/**
 * Where a gateway exposure lands, by what the target is. Order matters: an API operation lives
 * INSIDE an api, so it can only be recognised after the whole-API case has been ruled out.
 */
const EXPOSURE_SLOTS: Slot[] = [
  { list: 'mcpServerIds', matches: (s, id) => nestedHas(s, 'externalSystems', 'mcpServers', id) },
  { list: 'apiIds', matches: (s, id) => s.has('apis', id) },
  { list: 'apiOperationIds', matches: (s, id) => nestedHas(s, 'apis', 'operations', id) },
  { list: 'useCaseIds', matches: (s, id) => s.has('useCases', id) },
  { list: 'ragIds', matches: (s, id) => s.has('rags', id) },
];

/** Where a RAG source lands, by what the target is. */
const RAG_SOURCE_SLOTS: Slot[] = [
  { list: 'sourceReadModelIds', matches: (s, id) => s.has('readModels', id) },
  { list: 'sourceExternalTableIds', matches: (s, id) => nestedHas(s, 'externalSystems', 'tables', id) },
  { list: 'sourceApiIds', matches: (s, id) => s.has('apis', id) || s.has('proxyApis', id) },
  { list: 'sourceExternalSystemIds', matches: (s, id) => s.has('externalSystems', id) },
  { list: 'sourceBoundedContextIds', matches: (s, id) => s.has('boundedContexts', id) },
];

interface Slot {
  list: string;
  matches: (store: ModelStore, id: string) => boolean;
}

export const AGENT_COMMANDS: Record<string, Handler> = {
  'add-ai-agent': add({
    type: 'aiAgents',
    init: (c) => ({ external: c.external === true }),
  }),

  /** Whoever pointed at the agent lets go, and the MCP exposure only it justified goes with it. */
  'remove-ai-agent': (store, command) => {
    const id = String(command.id);
    const agent = store.get('aiAgents', id);
    if (!agent) return;
    const wasReaching = asList(agent.allowedUseCaseIds);
    store.removeFromAllLists('aiAgents', 'delegateAgentIds', id);
    store.removeFromAllLists('roles', 'aiAgentIds', id);
    store.remove('aiAgents', id);
    for (const useCaseId of wasReaching) clearMcpExposureIfUnused(store, useCaseId);
  },

  'add-mcp-gateway': add({ type: 'mcpGateways' }),

  'remove-mcp-gateway': (store, command) => {
    const id = String(command.id);
    store.removeFromAllLists('aiAgents', 'mcpGatewayIds', id);
    store.remove('mcpGateways', id);
  },

  /**
   * A gateway aggregates something into its curated tool surface. What that something IS decides
   * the slot, so this is a lookup rather than a parameter — the canvas draws one arrow and the
   * model works out what it meant.
   */
  'add-gateway-exposure': (store, command) => {
    const gateway = mustGet(store, 'mcpGateways', command.sourceId, 'store.kind.mcpGateway');
    const target = String(command.targetId);
    const slot = EXPOSURE_SLOTS.find((s) => s.matches(store, target));
    if (!slot) {
      throw new CommandError(t('store.agent.invalidExposureTarget', { target }));
    }
    store.addToList('mcpGateways', gateway.id, slot.list, target);
  },

  /** The target may be in any slot, and the caller does not say which. */
  'remove-gateway-exposure': (store, command) => {
    const gateway = store.get('mcpGateways', String(command.sourceId));
    if (!gateway) return;
    for (const slot of EXPOSURE_SLOTS) {
      store.removeFromList('mcpGateways', gateway.id, slot.list, String(command.targetId));
    }
  },

  // ---- what an agent may reach --------------------------------------------

  'add-agent-gateway': agentLink('mcpGatewayIds', 'mcpGateways', 'store.kind.mcpGateway'),
  'remove-agent-gateway': agentUnlink('mcpGatewayIds'),

  'add-agent-query': agentLink('allowedQueryServiceIds', 'queryServices', 'store.kind.queryService'),
  'remove-agent-query': agentUnlink('allowedQueryServiceIds'),

  'add-agent-rag': agentLink('ragIds', 'rags', 'store.kind.rag'),
  'remove-agent-rag': agentUnlink('ragIds'),

  /** The whole API as a tool: every operation of it, present and future. */
  'add-agent-api': (store, command) => {
    const agent = requireAgent(store, command.sourceId);
    const target = String(command.targetId);
    if (!store.has('apis', target) && !store.has('proxyApis', target)) {
      throw new CommandError(t('store.unknown.api', { id: target }));
    }
    store.addToList('aiAgents', agent.id, 'allowedApiIds', target);
  },

  'remove-agent-api': agentUnlink('allowedApiIds'),

  'add-agent-api-operation': (store, command) => {
    const agent = requireAgent(store, command.sourceId);
    const target = String(command.targetId);
    if (!nestedHas(store, 'apis', 'operations', target)) {
      throw new CommandError(t('store.unknown.apiOperation', { id: target }));
    }
    store.addToList('aiAgents', agent.id, 'allowedApiOperationIds', target);
  },

  'remove-agent-api-operation': agentUnlink('allowedApiOperationIds'),

  'add-agent-external-use': (store, command) => {
    const agent = requireAgent(store, command.sourceId);
    const target = String(command.targetId);
    if (!nestedHas(store, 'externalSystems', 'useCases', target)) {
      throw new CommandError(t('store.unknown.externalUseCase', { id: target }));
    }
    store.addToList('aiAgents', agent.id, 'allowedExternalUseCaseIds', target);
  },

  'remove-agent-external-use': agentUnlink('allowedExternalUseCaseIds'),

  'add-agent-mcp': (store, command) => {
    const agent = requireAgent(store, command.sourceId);
    const target = String(command.targetId);
    if (!nestedHas(store, 'externalSystems', 'mcpServers', target)) {
      throw new CommandError(t('store.unknown.mcpServer', { id: target }));
    }
    store.addToList('aiAgents', agent.id, 'allowedMcpServerIds', target);
  },

  'remove-agent-mcp': agentUnlink('allowedMcpServerIds'),

  /**
   * An agent reaching one of OUR use cases exposes it through MCP — the reach is what justifies
   * the exposure, so it is set here and withdrawn when the last agent stops reaching.
   */
  'add-agent-use': (store, command) => {
    const agent = requireAgent(store, command.sourceId);
    const useCase = mustGet(store, 'useCases', command.targetId, 'store.kind.useCase');
    store.addToList('aiAgents', agent.id, 'allowedUseCaseIds', useCase.id);
    if (useCase.exposedAsMcp !== true) {
      store.patch('useCases', useCase.id, { exposedAsMcp: true });
    }
  },

  'remove-agent-use': (store, command) => {
    const target = String(command.targetId);
    store.removeFromList('aiAgents', String(command.sourceId), 'allowedUseCaseIds', target);
    clearMcpExposureIfUnused(store, target);
  },

  /** Agent → agent. Self-delegation is refused; longer cycles are the linter's job. */
  'add-agent-delegate': (store, command) => {
    const agent = requireAgent(store, command.sourceId);
    const target = String(command.targetId);
    mustGet(store, 'aiAgents', target, 'store.kind.agent');
    if (agent.id === target) throw new CommandError(t('store.agent.delegateToSelf'));
    store.addToList('aiAgents', agent.id, 'delegateAgentIds', target);
  },

  'remove-agent-delegate': agentUnlink('delegateAgentIds'),

  /** Actor → agent: the person talks to it, and a chat/supervision UI derives from that. */
  'add-actor-agent': (store, command) => {
    const actor = mustGet(store, 'roles', command.sourceId, 'store.kind.actor');
    mustGet(store, 'aiAgents', command.targetId, 'store.kind.agent');
    store.addToList('roles', actor.id, 'aiAgentIds', String(command.targetId));
  },

  'remove-actor-agent': (store, command) => {
    store.removeFromList('roles', String(command.sourceId), 'aiAgentIds', String(command.targetId));
  },

  /** Event → agent: the event triggers a run. Drawn source-first, so the AGENT is the target. */
  'add-agent-trigger': (store, command) => {
    const agent = requireAgent(store, command.targetId);
    const event = String(command.sourceId);
    if (!store.has('domainEvents', event) && !store.has('applicationEvents', event)) {
      throw new CommandError(t('store.unknown.domainOrApplicationEvent', { id: event }));
    }
    store.addToList('aiAgents', agent.id, 'reactsToEventIds', event);
  },

  'remove-agent-trigger': (store, command) => {
    store.removeFromList('aiAgents', String(command.targetId), 'reactsToEventIds',
      String(command.sourceId));
  },

  // ---- knowledge bases -----------------------------------------------------

  'add-rag': add({ type: 'rags' }),

  /** The RAG goes, and the agents and gateways that exposed it let go. */
  'remove-rag': (store, command) => {
    const id = String(command.id);
    store.removeFromAllLists('aiAgents', 'ragIds', id);
    store.removeFromAllLists('mcpGateways', 'ragIds', id);
    store.remove('rags', id);
  },

  'add-rag-source': (store, command) => {
    const rag = mustGet(store, 'rags', command.sourceId, 'store.kind.rag');
    const target = String(command.targetId);
    const slot = RAG_SOURCE_SLOTS.find((s) => s.matches(store, target));
    if (!slot) {
      throw new CommandError(t('store.agent.invalidRagSource', { target }));
    }
    store.addToList('rags', rag.id, slot.list, target);
  },

  'remove-rag-source': (store, command) => {
    const rag = store.get('rags', String(command.sourceId));
    if (!rag) return;
    for (const slot of RAG_SOURCE_SLOTS) {
      store.removeFromList('rags', rag.id, slot.list, String(command.targetId));
    }
  },

  /** External content: a repo, a web site, an FTP server. Identified by its URI, not by an id. */
  'add-rag-content-source': (store, command) => {
    const rag = mustGet(store, 'rags', command.sourceId, 'store.kind.rag');
    const uri = typeof command.uri === 'string' ? command.uri.trim() : '';
    if (!uri) throw new CommandError(t('store.agent.sourceNeedsUri'));
    const sources = nested(rag.contentSources);
    if (sources.some((s) => s.uri === uri)) return;
    store.patch('rags', rag.id, {
      contentSources: [...sources, { id: uri, type: command.type ?? 'WEB', uri }],
    });
  },

  'remove-rag-content-source': (store, command) => {
    const rag = store.get('rags', String(command.sourceId));
    if (!rag) return;
    store.patch('rags', rag.id, {
      contentSources: nested(rag.contentSources).filter((s) => s.uri !== command.uri),
    });
  },

  // ---- where an API is implemented ----------------------------------------

  /** Another implementation site for the SAME API — not a copy of it. */
  'add-api-implementation': (store, command) => {
    const api = mustGet(store, 'apis', command.apiId, 'store.kind.api');
    mustGet(store, 'boundedContexts', command.boundedContextId, 'store.kind.boundedContext');
    store.addToList('apis', api.id, 'implementedByBoundedContextIds',
      String(command.boundedContextId));
  },

  'remove-api-implementation': (store, command) => {
    store.removeFromList('apis', String(command.apiId), 'implementedByBoundedContextIds',
      String(command.boundedContextId));
  },

  /** Route ONE proxy operation to one implementation site of the API it fronts. */
  'add-proxy-operation-route': (store, command) => {
    const proxy = mustGet(store, 'proxyApis', command.proxyId, 'store.kind.proxy');
    const routes = nested(proxy.operationRoutes);
    const already = routes.some((r) =>
      r.operationId === command.operationId && r.targetSiteId === command.targetSiteId);
    if (already) return;
    store.patch('proxyApis', proxy.id, {
      operationRoutes: [...routes, {
        id: `${command.operationId}@${command.targetSiteId}`,
        operationId: command.operationId,
        targetSiteId: command.targetSiteId,
      }],
    });
  },

  'remove-proxy-operation-route': (store, command) => {
    const proxy = store.get('proxyApis', String(command.proxyId));
    if (!proxy) return;
    store.patch('proxyApis', proxy.id, {
      operationRoutes: nested(proxy.operationRoutes).filter((r) =>
        !(r.operationId === command.operationId && r.targetSiteId === command.targetSiteId)),
    });
  },

  /** Per-site wiring: which use case implements an operation AT a given site. */
  'set-api-operation-implementation': (store, command) => {
    const api = mustGet(store, 'apis', command.apiId, 'store.kind.api');
    const kept = nested(api.operationImplementations).filter((w) =>
      !(w.operationId === command.operationId && w.boundedContextId === command.boundedContextId));
    store.patch('apis', api.id, {
      operationImplementations: [...kept, {
        id: `${command.operationId}@${command.boundedContextId}`,
        operationId: command.operationId,
        boundedContextId: command.boundedContextId,
        useCaseId: command.targetUseCaseId ?? null,
      }],
    });
  },

  'remove-api-operation-implementation': (store, command) => {
    const api = store.get('apis', String(command.apiId));
    if (!api) return;
    store.patch('apis', api.id, {
      operationImplementations: nested(api.operationImplementations).filter((w) =>
        !(w.operationId === command.operationId
          && w.boundedContextId === command.boundedContextId)),
    });
  },

  /** An external system calling one operation AT a site (a published API, a proxy or a site). */
  'add-external-operation-use': (store, command) => {
    const external = mustGet(store, 'externalSystems', command.sourceId, 'store.kind.externalSystem');
    const uses = nested(external.apiOperationUses);
    const already = uses.some((u) =>
      u.operationId === command.operationId && u.siteId === command.targetSiteId);
    if (already) return;
    store.patch('externalSystems', external.id, {
      apiOperationUses: [...uses, {
        id: `${command.operationId}@${command.targetSiteId}`,
        operationId: command.operationId,
        siteId: command.targetSiteId,
      }],
    });
  },

  'remove-external-operation-use': (store, command) => {
    const external = store.get('externalSystems', String(command.sourceId));
    if (!external) return;
    store.patch('externalSystems', external.id, {
      apiOperationUses: nested(external.apiOperationUses).filter((u) =>
        !(u.operationId === command.operationId && u.siteId === command.targetSiteId)),
    });
  },
};

/** Agent reaches target: check the target exists, then record it on the agent. */
function agentLink(list: string, type: string, label: MessageKey): Handler {
  return (store, command) => {
    const agent = requireAgent(store, command.sourceId);
    mustGet(store, type, command.targetId, label);
    store.addToList('aiAgents', agent.id, list, String(command.targetId));
  };
}

function agentUnlink(list: string): Handler {
  return (store, command) => {
    store.removeFromList('aiAgents', String(command.sourceId), list, String(command.targetId));
  };
}

/**
 * A use case is exposed through MCP because an agent reaches it. When the last one stops, the
 * exposure has nothing justifying it and is withdrawn — otherwise the generated surface would
 * keep growing and never shrink.
 */
function clearMcpExposureIfUnused(store: ModelStore, useCaseId: string): void {
  const stillUsed = store.all('aiAgents')
    .some((a) => asList(a.allowedUseCaseIds).includes(useCaseId));
  if (stillUsed) return;
  const useCase = store.get('useCases', useCaseId);
  if (useCase?.exposedAsMcp === true) {
    store.patch('useCases', useCaseId, { exposedAsMcp: false });
  }
}

/** Whether any element of `type` carries an item with this id in its `list`. */
const nestedHas = (store: ModelStore, type: string, list: string, id: string) =>
  store.all(type).some((e) => nested(e[list]).some((item) => item.id === id));

function requireAgent(store: ModelStore, id: unknown): Element {
  const agent = store.get('aiAgents', String(id));
  if (!agent) throw new CommandError(t('store.unknown.agent', { id: String(id) }));
  return agent;
}

/** Element shapes this block creates, for the schema-defaults check in tests. */
export const AGENT_TYPES: string[] = ['aiAgents', 'mcpGateways', 'rags'];
