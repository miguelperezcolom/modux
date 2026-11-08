/**
 * The catalog as a free-form view sees it: every element a view can show, flattened out of the
 * projection, with the node kind it is drawn as. Kept apart from the shell so it is testable
 * without a DOM.
 */
import type { BoundedContextRef, ModuxModel } from '../model.js';

/** A loose element's `elementType` → the node kind to draw it as. */
const LOOSE_KIND: Record<string, string> = {
  invariant: 'invariant', 'read-model': 'read-model', 'integration-event': 'integration-event',
};

/** Where each element kind lands in the projected model, so a member id resolves back to a node. */
export const RESOLVE_INDEX: { field: keyof ModuxModel; kind: string }[] = [
  { field: 'boundedContexts', kind: 'component' },
  { field: 'aggregates', kind: 'aggregate' },
  { field: 'entities', kind: 'entity' },
  { field: 'valueObjects', kind: 'value-object' },
  { field: 'actors', kind: 'person' },
  { field: 'looseUseCases', kind: 'usecase' },
  { field: 'workflows', kind: 'workflow' },
  { field: 'etlFlows', kind: 'etl-flow' },
  { field: 'apis', kind: 'api' },
  { field: 'proxyApis', kind: 'proxy-api' },
  { field: 'externalSystems', kind: 'external-system' },
  { field: 'identityProviders', kind: 'identity-provider' },
  { field: 'aiAgents', kind: 'ai-agent' },
  { field: 'mcpGateways', kind: 'mcp-gateway' },
  { field: 'rags', kind: 'rag' },
  { field: 'uiApps', kind: 'ui-app' },
  { field: 'pages', kind: 'page' },
  { field: 'services', kind: 'deployment' },
  { field: 'modules', kind: 'module' },
  { field: 'projections', kind: 'projector' },
  { field: 'sagas', kind: 'saga' },
  { field: 'systems', kind: 'system' },
  { field: 'models', kind: 'model' },
  { field: 'enums', kind: 'model' },
  { field: 'gateways', kind: 'gateway' },
  { field: 'subscriptions', kind: 'subscription' },
  { field: 'notifications', kind: 'notification' },
  { field: 'processes', kind: 'process' },
];

/** What a bounded context nests in the projection → the node kind to draw it as. */
const NESTED_INDEX: { field: keyof BoundedContextRef; kind: string }[] = [
  { field: 'useCases', kind: 'usecase' },
  { field: 'domainEvents', kind: 'event' },
  { field: 'applicationEvents', kind: 'event' },
  { field: 'integrationEvents', kind: 'integration-event' },
  { field: 'domainServices', kind: 'service' },
  { field: 'readModels', kind: 'read-model' },
  { field: 'queryServices', kind: 'query-service' },
  { field: 'scheduledTriggers', kind: 'scheduler' },
];
/** Store bucket of an element no context owns (`unownedElements`) → the node kind to draw it as. */
const UNOWNED_KIND: Record<string, string> = {
  domainEvents: 'event', applicationEvents: 'event', integrationEvents: 'integration-event',
  domainServices: 'service', readModels: 'read-model', queryServices: 'query-service',
  scheduledTriggers: 'scheduler',
};

/** One catalog element as a view sees it: what it is, what it is called, which context nests it. */
export interface CatalogEntry {
  id: string;
  kind: string;
  label: string;
  /** The bounded context that nests it, when it is context-scoped. */
  ownerId?: string;
  /** The `type` the rename-element command takes — from the list it came out of, not the kind. */
  renameType?: string;
  /** A free-standing element awaiting a parent (looseElements): it cannot be retyped or nested yet. */
  loose?: boolean;
  /** Store type, when the element can belong to a bounded context (set-element-context takes it). */
  contextType?: string;
}

/** Projection list → store type, for the elements a bounded context can own. */
const CONTEXT_TYPE_OF: Record<string, string> = {
  aggregates: 'aggregates', looseUseCases: 'useCases', useCases: 'useCases', projections: 'projections',
  domainEvents: 'domainEvents', applicationEvents: 'applicationEvents', integrationEvents: 'integrationEvents',
  domainServices: 'domainServices', readModels: 'readModels', queryServices: 'queryServices',
  scheduledTriggers: 'scheduledTriggers',
};

/**
 * Projection list → rename-element type. Keyed by where the element was found because the node
 * kind is lossy: domain and application events are both drawn as `event`.
 */
const RENAME_TYPE_OF: Record<string, string> = {
  boundedContexts: 'boundedContext', aggregates: 'aggregate', entities: 'entity', valueObjects: 'value-object',
  actors: 'actor', looseUseCases: 'use-case', useCases: 'use-case', workflows: 'workflow', etlFlows: 'etl-flow',
  apis: 'api', proxyApis: 'proxy-api', externalSystems: 'external-system', identityProviders: 'identity-provider',
  aiAgents: 'ai-agent', mcpGateways: 'mcp-gateway', rags: 'rag', uiApps: 'ui-app', pages: 'page',
  services: 'service', modules: 'module', projections: 'projection', sagas: 'saga', systems: 'system',
  models: 'model', enums: 'enum', gateways: 'gateway', subscriptions: 'subscription',
  notifications: 'notification', processes: 'process',
  domainEvents: 'domain-event', applicationEvents: 'application-event', integrationEvents: 'integration-event',
  domainServices: 'domain-service', readModels: 'read-model', queryServices: 'query-service',
  scheduledTriggers: 'scheduled-trigger',
};

/**
 * Every element of the catalog a view can show, once per id. The projection is denormalized —
 * top-level lists, lists nested in each context, loose and unowned elements — so this flattens it
 * back. It is what members resolve against, and what the catalog tree lists: one source, so the
 * tree never offers an element the view could not draw.
 */
const catalogCache = new WeakMap<ModuxModel, CatalogEntry[]>();
export function catalogEntries(m: ModuxModel): CatalogEntry[] {
  const cached = catalogCache.get(m);
  if (cached) return cached;
  const byId = new Map<string, CatalogEntry>();
  const put = (e: CatalogEntry) => { if (e.id && !byId.has(e.id)) byId.set(e.id, e); };
  const useCaseKind = (u: { policy?: boolean }, fallback: string) => (u.policy ? 'policy' : fallback);
  for (const { field, kind } of RESOLVE_INDEX) {
    for (const el of (m[field] as { id: string; name?: string; policy?: boolean }[] | undefined) ?? [])
      put({ id: el.id, kind: field === 'looseUseCases' ? useCaseKind(el, kind) : kind, label: el.name || el.id, renameType: RENAME_TYPE_OF[field], contextType: CONTEXT_TYPE_OF[field] });
  }
  for (const a of m.aggregates ?? []) {
    const e = byId.get(a.id);
    if (e && a.boundedContextId) e.ownerId = a.boundedContextId;
  }
  for (const bc of m.boundedContexts ?? []) {
    for (const { field, kind } of NESTED_INDEX) {
      for (const el of (bc[field] as { id: string; name?: string; policy?: boolean }[] | undefined) ?? [])
        put({ id: el.id, kind: field === 'useCases' ? useCaseKind(el, kind) : kind, label: el.name || el.id, ownerId: bc.id, renameType: RENAME_TYPE_OF[field], contextType: CONTEXT_TYPE_OF[field] });
    }
  }
  for (const el of m.unownedElements ?? []) {
    const kind = UNOWNED_KIND[el.type];
    if (kind) put({ id: el.id, kind, label: el.name || el.id, renameType: RENAME_TYPE_OF[el.type], contextType: CONTEXT_TYPE_OF[el.type] });
  }
  for (const le of m.looseElements ?? []) put({ id: le.id, kind: LOOSE_KIND[le.elementType] ?? le.elementType, label: le.name || le.id, renameType: le.elementType, loose: true });
  const entries = [...byId.values()];
  catalogCache.set(m, entries);
  return entries;
}

/** The change-element-type key of an entry (its rename type, except a policy), if it can be retyped at all. */
export function retypeKey(e: CatalogEntry): string | undefined {
  if (e.loose) return undefined;
  return e.kind === 'policy' ? 'policy' : e.renameType;
}
