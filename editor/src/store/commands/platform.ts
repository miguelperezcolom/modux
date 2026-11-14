/**
 * The platform furniture around the UI: identity providers, notifications, documents, ETL
 * pipelines, button groups and hand-written code.
 *
 * What these have in common is that they are wired FROM many places — an IdP from apps, contexts
 * and pipelines; custom code from mappings, transformations, use-case steps, pages and page
 * components. So the interesting half of each delete is the sweep that unwires it, and the rule
 * throughout is the same: the thing that delegated survives, it just stops delegating.
 *
 * Ported from `UiEditorCommands`.
 */

import { nested, type Element, type ModelStore } from '../store.js';
import { add, CommandError, type Handler } from '../spec.js';
import { blank, clearComponentField, mustGet } from './models.js';
import { t, type MessageKey } from '../../i18n/index.js';

/** Everything an identity provider can be wired to. */
const IDP_HOLDERS = ['uiAdapters', 'boundedContexts', 'etlFlows'];

/** Everything that can delegate to a piece of custom code, as a single field. */
const CODE_HOLDERS: [string, string][] = [
  ['modelMappings', 'customCodeId'],
  ['transformations', 'customCodeId'],
  ['pages', 'customCodeId'],
];

export const PLATFORM_COMMANDS: Record<string, Handler> = {
  // ---- identity ------------------------------------------------------------

  'add-identity-provider': add({
    type: 'identityProviders',
    init: (c) => ({ type: blank(c.type) ? 'CORPORATE' : c.type }),
  }),

  /** The IdP goes and every trust edge pointing at it is cleared. */
  'remove-identity-provider': (store, command) => {
    const id = String(command.id);
    for (const type of IDP_HOLDERS) {
      for (const holder of store.all(type)) {
        if (holder.identityProviderId === id) {
          store.patch(type, holder.id, { identityProviderId: null });
        }
      }
    }
    store.remove('identityProviders', id);
  },

  /** Federation: the external system publishing this IdP. Nothing means it is ours. */
  'set-idp-publisher': (store, command) => {
    const idp = mustGet(store, 'identityProviders', command.id, 'store.kind.idp');
    const publisher = blank(command.targetId) ? null : String(command.targetId);
    if (publisher) mustGet(store, 'externalSystems', publisher, 'store.kind.externalSystem');
    store.patch('identityProviders', idp.id, { publishedByExternalSystemId: publisher });
  },

  /** Wires an app, a bounded context or an ETL flow to its IdP; nothing unwires it. */
  'set-identity-provider': (store, command) => {
    const idpId = blank(command.targetId) ? null : String(command.targetId);
    if (idpId) mustGet(store, 'identityProviders', idpId, 'store.kind.idp');
    const id = String(command.id);
    for (const type of IDP_HOLDERS) {
      if (store.has(type, id)) {
        store.patch(type, id, { identityProviderId: idpId });
        return;
      }
    }
    throw new CommandError(
      t('store.platform.idpTarget', { id }));
  },

  // ---- notifications -------------------------------------------------------

  /** When this happens, tell these people through these channels. */
  'add-notification': add({
    type: 'notifications',
    parent: { type: 'boundedContexts', from: 'boundedContextId' },
    init: (c) => ({
      ownerBoundedContextId: c.boundedContextId,
      channels: [blank(c.type) ? 'EMAIL' : c.type],
      recipientRoleIds: [],
    }),
  }),

  'remove-notification': (store, command) => {
    store.remove('notifications', String(command.id));
  },

  /** What fires it — a domain event or an application event; nothing unpoints it. */
  'set-notification-event': (store, command) => {
    const notification = mustGet(store, 'notifications', command.id, 'store.kind.notification');
    const eventId = blank(command.targetId) ? null : String(command.targetId);
    if (eventId && !store.has('domainEvents', eventId) && !store.has('applicationEvents', eventId)) {
      throw new CommandError(t('store.unknown.event', { id: eventId }));
    }
    store.patch('notifications', notification.id, { eventId });
  },

  'add-notification-recipient': (store, command) => {
    const notification = mustGet(store, 'notifications', command.id, 'store.kind.notification');
    mustGet(store, 'roles', command.roleId, 'store.kind.actor');
    store.addToList('notifications', notification.id, 'recipientRoleIds', String(command.roleId));
  },

  'remove-notification-recipient': (store, command) => {
    store.removeFromList('notifications', String(command.id), 'recipientRoleIds',
      String(command.roleId));
  },

  // ---- documents -----------------------------------------------------------

  /** A generated document (a template filled from a model) or a report (a query's dataset). */
  'add-document': add({
    type: 'documents',
    parent: { type: 'boundedContexts', from: 'boundedContextId' },
    init: (c) => ({
      ownerBoundedContextId: c.boundedContextId,
      kind: blank(c.type) ? 'DOCUMENT' : c.type,
    }),
  }),

  'remove-document': (store, command) => {
    store.remove('documents', String(command.id));
  },

  'set-document-model': (store, command) => {
    const document = mustGet(store, 'documents', command.id, 'store.kind.document');
    const modelId = blank(command.modelId) ? null : String(command.modelId);
    if (modelId) mustGet(store, 'models', modelId, 'store.kind.model');
    store.patch('documents', document.id, { modelId });
  },

  'set-document-query': (store, command) => {
    const document = mustGet(store, 'documents', command.id, 'store.kind.document');
    store.patch('documents', document.id, {
      queryServiceId: blank(command.queryServiceId) ? null : command.queryServiceId,
      queryOperationId: blank(command.queryOperationId) ? null : command.queryOperationId,
    });
  },

  /** i18n: the locales the system speaks, and which one it falls back to. */
  'set-project-locales': (store, command) => {
    const project = store.all('projects')[0];
    if (!project) throw new CommandError(t('store.platform.noProject'));
    store.patch('projects', project.id, {
      locales: command.fieldIds ?? [],
      defaultLocale: command.label ?? null,
    });
  },

  // ---- ETL -----------------------------------------------------------------

  /** An ownerless pipeline floats on the integrations view until its owner is wired. */
  'add-etl-flow': add({
    type: 'etlFlows',
    parent: { type: 'boundedContexts', from: 'boundedContextId', required: false },
    init: (c) => ({ ownerBoundedContextId: c.boundedContextId ?? null, steps: [] }),
  }),

  'remove-etl-flow': (store, command) => {
    store.remove('etlFlows', String(command.id));
  },

  /** One step: a source to pull from, a transform, or a write. */
  'add-etl-step': (store, command) => {
    const flow = mustGet(store, 'etlFlows', command.etlFlowId, 'store.kind.etlFlow');
    if (blank(command.stepType)) throw new CommandError(t('store.platform.etlStepNeedsType'));
    const steps = nested(flow.steps);
    const id = String(command.id);
    if (steps.some((s) => s.id === id)) return;
    store.patch('etlFlows', flow.id, {
      steps: [...steps, {
        id,
        name: command.name ?? command.stepType,
        type: command.stepType,
        externalTableId: command.externalTableId ?? null,
        apiId: command.apiId ?? null,
        operationId: command.operationId ?? null,
        targetId: command.targetId ?? null,
        mappingId: command.mappingId ?? null,
      }],
    });
  },

  'remove-etl-step': (store, command) => {
    const flow = store.get('etlFlows', String(command.etlFlowId));
    if (!flow) return;
    store.patch('etlFlows', flow.id, {
      steps: nested(flow.steps).filter((s) => s.id !== command.id),
    });
  },

  // ---- button groups -------------------------------------------------------

  'add-button-group': add({
    type: 'buttonGroups',
    init: () => ({ buttons: [], groupIds: [] }),
  }),

  /** Pages unhook it and parent groups let go of it before it disappears. */
  'remove-button-group': (store, command) => {
    const id = String(command.id);
    for (const field of ['toolbarGroupIds', 'bottomBarGroupIds']) {
      store.removeFromAllLists('pages', field, id);
    }
    store.removeFromAllLists('buttonGroups', 'groupIds', id);
    store.remove('buttonGroups', id);
  },

  'add-group-button': (store, command) => {
    const group = mustGet(store, 'buttonGroups', command.id, 'store.kind.buttonGroup');
    const buttons = nested(group.buttons);
    if (buttons.some((b) => b.id === command.itemId)) return;
    store.patch('buttonGroups', group.id, {
      buttons: [...buttons, { id: command.itemId, label: command.label }],
    });
  },

  'remove-group-button': (store, command) => {
    const group = mustGet(store, 'buttonGroups', command.id, 'store.kind.buttonGroup');
    store.patch('buttonGroups', group.id, {
      buttons: nested(group.buttons).filter((b) => b.id !== command.itemId),
    });
  },

  /** What the button FIRES: a use case, or one API operation. Nothing clears it. */
  'set-group-button-target': (store, command) => {
    const group = mustGet(store, 'buttonGroups', command.id, 'store.kind.buttonGroup');
    store.patch('buttonGroups', group.id, {
      buttons: nested(group.buttons).map((b) => (b.id === command.itemId ? {
        ...b,
        label: blank(command.label) ? b.label : command.label,
        useCaseId: command.useCaseId ?? null,
        apiId: command.apiId ?? null,
        operationId: command.operationId ?? null,
        mappingId: command.mappingId ?? null,
      } : b)),
    });
  },

  'add-group-subgroup': (store, command) => {
    const group = mustGet(store, 'buttonGroups', command.id, 'store.kind.buttonGroup');
    mustGet(store, 'buttonGroups', command.targetId, 'store.kind.buttonGroup');
    if (group.id === command.targetId) return;
    store.addToList('buttonGroups', group.id, 'groupIds', String(command.targetId));
  },

  'remove-group-subgroup': (store, command) => {
    const group = mustGet(store, 'buttonGroups', command.id, 'store.kind.buttonGroup');
    store.removeFromList('buttonGroups', group.id, 'groupIds', String(command.targetId));
  },

  // ---- hand-written code ---------------------------------------------------

  'add-custom-code': add({ type: 'customCodes' }),

  /** Whoever delegated to this code lets go of it; none of them go with it. */
  'remove-custom-code': (store, command) => {
    const id = String(command.id);
    for (const [type, field] of CODE_HOLDERS) {
      for (const holder of store.all(type)) {
        if (holder[field] === id) store.patch(type, holder.id, { [field]: null });
      }
    }
    for (const useCase of store.all('useCases')) {
      const steps = nested(useCase.steps);
      if (!steps.some((s) => s.customCodeId === id)) continue;
      store.patch('useCases', useCase.id, {
        steps: steps.map((s) => (s.customCodeId === id ? { ...s, customCodeId: null } : s)),
      });
    }
    for (const page of store.all('pages')) {
      const content = clearComponentField(nested(page.content) as Element[], 'customCodeId', id);
      if (content) store.patch('pages', page.id, { content });
    }
    store.remove('customCodes', id);
  },

  'set-mapping-custom-code': delegateTo('modelMappings', 'store.kind.mapping'),
  'set-transformation-custom-code': delegateTo('transformations', 'store.kind.transformation'),
  'set-page-custom-code': delegateTo('pages', 'store.kind.page'),

  /** The step delegates to hand-written code — that is what makes it a Custom step. */
  'set-use-case-step-custom-code': (store, command) => {
    const useCase = mustGet(store, 'useCases', command.useCaseId, 'store.kind.useCase');
    const customCodeId = codeRef(store, command);
    store.patch('useCases', useCase.id, {
      steps: nested(useCase.steps).map((s) => (s.id === command.id ? { ...s, customCodeId } : s)),
    });
  },

  'set-page-component-custom-code': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    const customCodeId = codeRef(store, command);
    const componentId = String(command.componentId);
    const walk = (nodes: Element[]): Element[] => nodes.map((node) => ({
      ...node,
      ...(node.id === componentId ? { customCodeId } : {}),
      ...(Array.isArray(node.children)
        ? { children: walk(node.children as Element[]) } : {}),
    }));
    store.patch('pages', page.id, { content: walk(nested(page.content) as Element[]) });
  },

  /** The code TOUCHES an element — free-form intent, for the map to draw the reach. */
  'add-custom-code-use': (store, command) => {
    const code = mustGet(store, 'customCodes', command.id, 'store.kind.customCode');
    store.addToList('customCodes', code.id, 'usedElementIds', String(command.elementId));
  },

  'remove-custom-code-use': (store, command) => {
    const code = mustGet(store, 'customCodes', command.id, 'store.kind.customCode');
    store.removeFromList('customCodes', code.id, 'usedElementIds', String(command.elementId));
  },
};

/** Wire one element to a piece of custom code; nothing unwires it. */
function delegateTo(type: string, label: MessageKey): Handler {
  return (store, command) => {
    const element = mustGet(store, type, command.id, label);
    store.patch(type, element.id, { customCodeId: codeRef(store, command) });
  };
}

/** The code being pointed at, checked to exist. Nothing means «unwire». */
function codeRef(store: ModelStore, command: Record<string, any>): string | null {
  if (blank(command.targetId)) return null;
  mustGet(store, 'customCodes', command.targetId, 'store.kind.customCode');
  return String(command.targetId);
}

/** Element shapes this block creates, for the schema-defaults check in tests. */
export const PLATFORM_TYPES: string[] = [
  'identityProviders', 'notifications', 'documents', 'etlFlows', 'buttonGroups', 'customCodes',
];
