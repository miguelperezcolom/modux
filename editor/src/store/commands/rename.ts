/**
 * Renaming, for every kind of thing that has a name.
 *
 * On the Java side this is one 160-line switch over 29 element types, and almost every arm says
 * the same thing twice: find it, copy it with a new name. Here it is a table — which is the whole
 * argument of `spec.ts` at its clearest, since renaming is where the per-type code was most
 * nearly identical. Ported from `EditorApiController.renameElement`.
 */

import { nested, type Element, type ModelStore } from '../store.js';
import { CommandError, type Handler } from '../spec.js';

/** A type whose element carries the name directly. `field` is what actually holds it. */
interface TopLevel {
  type: string;
  field?: string;
}

/** A type whose elements live nested in a list inside some owner. */
interface Nested {
  owners: string[];
  list: string;
  field?: string;
}

const TOP_LEVEL: Record<string, TopLevel> = {
  'boundedContext': { type: 'boundedContexts' },
  'system': { type: 'systems' },
  'cdc': { type: 'cdcs' },
  // a note IS its text: it has nothing else to be called
  'note': { type: 'notes', field: 'text' },
  'url': { type: 'urls' },
  'area': { type: 'areas' },
  'ui': { type: 'uis' },
  'page': { type: 'pages' },
  'ui-app': { type: 'uiAdapters' },
  'aggregate': { type: 'aggregates' },
  'entity': { type: 'entities' },
  'value-object': { type: 'valueObjects' },
  'ai-agent': { type: 'aiAgents' },
  'rag': { type: 'rags' },
  'mcp-gateway': { type: 'mcpGateways' },
  'api': { type: 'apis' },
  'proxy-api': { type: 'proxyApis' },
  'actor': { type: 'roles' },
  'external-system': { type: 'externalSystems' },
  'application-event': { type: 'applicationEvents' },
  'integration-event': { type: 'integrationEvents' },
  'domain-service': { type: 'domainServices' },
  'query-service': { type: 'queryServices' },
  'read-model': { type: 'readModels' },
  'domain-event': { type: 'domainEvents' },
  'use-case': { type: 'useCases' },
  'workflow': { type: 'workflows' },
  'etl-flow': { type: 'etlFlows' },
  'identity-provider': { type: 'identityProviders' },
  'service': { type: 'services' },
  'module': { type: 'modules' },
  'projection': { type: 'projections' },
  'saga': { type: 'sagas' },
  'model': { type: 'models' },
  'enum': { type: 'enums' },
  'gateway': { type: 'gateways' },
  'subscription': { type: 'subscriptions' },
  'notification': { type: 'notifications' },
  'process': { type: 'processes' },
};

/**
 * Elements born alongside another and named after it: a context's main module, an aggregate's
 * state model. A rename carries over to them while they still have the old name — once someone
 * named one on purpose, it is left alone. Without this the generated code keeps the placeholder
 * («Contexto», «Agregado») the palette minted them with.
 */
const COMPANIONS: Record<string, (store: ModelStore, el: Element) => { type: string; id: string }[]> = {
  boundedContexts: (store, el) => store.all('modules')
    .filter((m) => m.boundedContextId === el.id && m.main === true).map((m) => ({ type: 'modules', id: m.id })),
  aggregates: (_store, el) => (typeof el.modelId === 'string' && el.modelId ? [{ type: 'models', id: el.modelId }] : []),
};

const NESTED: Record<string, Nested> = {
  'operation': { owners: ['aggregates'], list: 'operations' },
  'api-operation': { owners: ['apis'], list: 'operations' },
  'external-table': { owners: ['externalSystems'], list: 'tables' },
  'mcp-server': { owners: ['externalSystems'], list: 'mcpServers' },
  'external-use-case': { owners: ['externalSystems'], list: 'useCases' },
  'process-step': { owners: ['processes'], list: 'steps' },
  'workflow-step': { owners: ['workflows'], list: 'steps' },
};

export const RENAME_COMMANDS: Record<string, Handler> = {
  /**
   * The `type` says which kind of thing is being renamed — the canvas knows it, and without it
   * the id alone could match elements of different types.
   */
  'rename-element': (store, command) => {
    const kind = String(command.type ?? '');
    if (!kind) throw new CommandError('rename-element: falta el tipo de elemento');
    const id = String(command.id);

    // A not-yet-adopted (loose) element lives in the looseElements bucket, whatever its kind — rename
    // it there so a read model / table / integration event dropped free-standing can be named.
    if (store.has('looseElements', id)) {
      store.patch('looseElements', id, { name: command.name });
      return;
    }

    const top = TOP_LEVEL[kind];
    if (top) {
      // a rename of something that is not there is a no-op, not a failure: the canvas may be
      // one step behind the model
      const before = store.get(top.type, id);
      if (before) {
        store.patch(top.type, id, { [top.field ?? 'name']: command.name });
        for (const c of COMPANIONS[top.type]?.(store, before) ?? []) {
          if (store.get(c.type, c.id)?.name === before.name) store.patch(c.type, c.id, { name: command.name });
        }
      }
      return;
    }

    const nestedSpec = NESTED[kind];
    if (!nestedSpec) {
      throw new CommandError(`rename-element no soportado para: ${kind}`);
    }
    renameNested(store, nestedSpec, id, command.name);
  },
};

/**
 * Set (or clear) an element's free-text description. Same type vocabulary as rename-element;
 * a nested kind (an operation…) is described inside its owner.
 */
export const DESCRIBE_COMMANDS: Record<string, Handler> = {
  'set-element-description': (store, command) => {
    const kind = String(command.type ?? '');
    const id = String(command.id);
    const text = typeof command.description === 'string' && command.description.trim() ? command.description : null;
    if (store.has('looseElements', id)) { store.patch('looseElements', id, { description: text }); return; }
    const top = TOP_LEVEL[kind];
    if (top) { if (store.has(top.type, id)) store.patch(top.type, id, { description: text }); return; }
    const spec = NESTED[kind];
    if (!spec) throw new CommandError(`set-element-description no soportado para: ${kind}`);
    const found = store.findOwner(spec.owners, spec.list, id);
    if (!found) return;
    store.patch(found.type, found.element.id, {
      [spec.list]: (nested(found.element[spec.list]) as Element[]).map((item) =>
        (item.id === id ? { ...item, description: text } : item)),
    });
  },
};

function renameNested(store: ModelStore, spec: Nested, id: string, name: unknown): void {
  const found = store.findOwner(spec.owners, spec.list, id);
  if (!found) return;
  const items = nested(found.element[spec.list]) as Element[];
  store.patch(found.type, found.element.id, {
    [spec.list]: items.map((item) =>
      (item.id === id ? { ...item, [spec.field ?? 'name']: name } : item)),
  });
}

/** The element kinds `rename-element` understands — for the editor and for tests. */
export const RENAMEABLE: string[] = [...Object.keys(TOP_LEVEL), ...Object.keys(NESTED)];
