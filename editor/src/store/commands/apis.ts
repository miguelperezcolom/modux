/**
 * Published APIs, their operations, and the proxies that front them.
 *
 * An API is what the system offers the outside; a proxy is somebody else's API seen from here.
 * Both can be depended on, which is why deleting either has to check who is depending — an
 * external system left pointing at an API that no longer exists is a model that validates and
 * generates nothing. Ported from `EditorApiController`.
 */

import { asList, nested, type Element, type ModelStore } from '../store.js';
import { add, CommandError, type Handler } from '../spec.js';
import { t } from '../../i18n/index.js';

/** Every consumer relationship an API can be on the receiving end of. */
const API_CONSUMERS: { type: string; list: string }[] = [
  { type: 'externalSystems', list: 'dependsOnApiIds' },
  { type: 'mcpGateways', list: 'apiIds' },
];

/** Lists that name an API OPERATION rather than the API itself. */
const OPERATION_CONSUMERS: { type: string; list: string }[] = [
  { type: 'mcpGateways', list: 'apiOperationIds' },
  { type: 'aiAgents', list: 'allowedApiOperationIds' },
];

export const API_COMMANDS: Record<string, Handler> = {
  'add-api': add({ type: 'apis', init: () => ({ operations: [] }) }),

  'remove-api': (store, command) => {
    const id = String(command.id);
    const api = store.get('apis', id);
    if (!api) return;
    const dependant = store.all('externalSystems')
      .find((x) => asList(x.dependsOnApiIds).includes(id));
    if (dependant) {
      throw new CommandError(t('store.api.removeHasDependants', { id }));
    }
    const proxy = store.all('proxyApis').find((p) => p.targetApiId === id);
    if (proxy) {
      throw new CommandError(t('store.api.removeHasProxies', { id }));
    }
    // gateways and agents let go of the API and of every operation leaving with it
    const leaving = new Set(nested(api.operations).map((o) => o.id));
    for (const consumer of API_CONSUMERS) {
      store.removeFromAllLists(consumer.type, consumer.list, id);
    }
    detachOperations(store, leaving);
    store.remove('apis', id);
  },

  'add-api-operation': (store, command) => {
    const api = requireApi(store, command.apiId);
    const id = String(command.id);
    const operations = nested(api.operations);
    if (operations.some((o) => o.id === id)) return;
    store.patch('apis', api.id, {
      operations: [...operations, {
        id,
        name: command.name,
        httpMethod: command.httpMethod ?? null,
        path: command.path ?? null,
        boundedContextId: command.boundedContextId ?? null,
        targetUseCaseId: command.targetUseCaseId ?? null,
      }],
    });
  },

  'remove-api-operation': (store, command) => {
    const api = requireApi(store, command.apiId);
    const id = String(command.id);
    detachOperations(store, new Set([id]));
    store.patch('apis', api.id, {
      operations: nested(api.operations).filter((o) => o.id !== id),
    });
  },

  /** What an operation actually runs: a use case, in a bounded context. Both must exist. */
  'set-api-operation-target': (store, command) => {
    const api = requireApi(store, command.apiId);
    const useCaseId = command.targetUseCaseId as string | undefined;
    if (useCaseId && !store.has('useCases', useCaseId)) {
      throw new CommandError(t('store.unknown.useCase', { id: useCaseId }));
    }
    const contextId = command.boundedContextId as string | undefined;
    if (contextId && !store.has('boundedContexts', contextId)) {
      throw new CommandError(t('store.unknown.boundedContext', { id: contextId }));
    }
    const id = String(command.id);
    store.patch('apis', api.id, {
      operations: nested(api.operations).map((o) =>
        o.id === id ? { ...o, boundedContextId: contextId ?? null, targetUseCaseId: useCaseId ?? null } : o),
    });
  },

  /**
   * Who publishes this API. Blank means us — the API is the system's own — and any other value
   * names an external system, which is how a third party's API gets onto the context map.
   */
  'set-api-publisher': (store, command) => {
    const target = command.targetId as string | undefined;
    const publisher = target && target.trim() ? target : null;
    if (publisher && !store.has('externalSystems', publisher)) {
      throw new CommandError(t('store.unknown.externalSystem', { id: publisher }));
    }
    const id = String(command.id);
    for (const type of ['apis', 'proxyApis']) {
      if (store.has(type, id)) {
        store.patch(type, id, { publishedByExternalSystemId: publisher });
        return;
      }
    }
    throw new CommandError(t('store.unknown.api', { id: id }));
  },

  'add-proxy-api': (store, command) => {
    const id = String(command.id);
    if (store.has('proxyApis', id)) return;
    const targetApiId = optional(command.targetId);
    if (targetApiId && !store.has('apis', targetApiId)) {
      throw new CommandError(t('store.unknown.api', { id: targetApiId }));
    }
    const host = optional(command.boundedContextId);
    if (host && !store.has('externalSystems', host)) {
      throw new CommandError(t('store.unknown.externalSystem', { id: host }));
    }
    store.put('proxyApis', {
      id,
      name: command.name,
      targetApiId,
      publishedByExternalSystemId: host,
    });
    if (targetApiId) repointApiDependencies(store, targetApiId, id, host);
  },

  /**
   * A proxy with consumers cannot just go: they would be left pointing at nothing. When it fronts
   * an API they are handed back to it, which is the state they were in before the proxy existed.
   */
  'remove-proxy-api': (store, command) => {
    const id = String(command.id);
    const proxy = store.get('proxyApis', id);
    if (!proxy) return;
    const dependedOn = store.all('externalSystems')
      .some((x) => asList(x.dependsOnApiIds).includes(id));
    if (dependedOn && !proxy.targetApiId) {
      throw new CommandError(t('store.api.removeProxyHasDependants', { id }));
    }
    if (dependedOn) repointApiDependencies(store, id, String(proxy.targetApiId), null);
    store.remove('proxyApis', id);
  },

  'set-proxy-target': (store, command) => {
    const id = String(command.id);
    const proxy = store.get('proxyApis', id);
    if (!proxy) throw new CommandError(t('store.unknown.proxy', { id: id }));
    const target = optional(command.targetId);
    if (!target) {
      store.patch('proxyApis', id, { targetApiId: null });
      return;
    }
    if (!store.has('apis', target)) throw new CommandError(t('store.unknown.api', { id: target }));
    store.patch('proxyApis', id, { targetApiId: target });
    repointApiDependencies(store, target, id, proxy.publishedByExternalSystemId as string | null);
  },
};

/**
 * Move every consumer of `from` onto `to`.
 *
 * Putting a proxy in front of an API is not meant to disconnect anyone: the consumers keep
 * consuming, through the proxy. The system that PUBLISHES the proxy is left alone — it would
 * otherwise end up depending on its own API.
 */
function repointApiDependencies(
  store: ModelStore, from: string, to: string, publisher: string | null | undefined,
): void {
  for (const external of store.all('externalSystems')) {
    const ids = asList(external.dependsOnApiIds);
    if (!ids.includes(from)) continue;
    if (publisher && external.id === publisher) continue;
    // substituted in place: a dependency list is read as an ordering, not as a set
    const repointed = ids.map((id) => (id === from ? to : id));
    store.patch('externalSystems', external.id, {
      dependsOnApiIds: [...new Set(repointed)],
    });
  }
}

/** Gateways and agents let go of operations that are about to disappear. */
function detachOperations(store: ModelStore, leaving: Set<string>): void {
  if (!leaving.size) return;
  for (const consumer of OPERATION_CONSUMERS) {
    for (const element of store.all(consumer.type)) {
      const ids = asList(element[consumer.list]);
      if (!ids.some((id) => leaving.has(id))) continue;
      store.patch(consumer.type, element.id, {
        [consumer.list]: ids.filter((id) => !leaving.has(id)),
      });
    }
  }
}

function requireApi(store: ModelStore, id: unknown): Element {
  const api = store.get('apis', String(id));
  if (!api) throw new CommandError(t('store.unknown.api', { id: String(id) }));
  return api;
}

const optional = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value : null;

/** Element shapes this block creates, for the schema-defaults check in tests. */
export const API_TYPES: string[] = ['apis', 'proxyApis'];
