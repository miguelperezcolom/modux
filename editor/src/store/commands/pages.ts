/**
 * Pages: their type and route, the content tree they are made of, their buttons, their wizard
 * steps and the per-field configuration of their form.
 *
 * The content is a forest (`forest.ts`), and every structural command here is one of its
 * operations plus one rule of its own. The rule worth knowing is the tab one: a tabLayout only
 * holds tabs and a tab only hangs from a tabLayout, checked on add AND on move, because a move
 * can break it just as easily as a badly-aimed drop.
 *
 * Ported from `UiEditorCommands`.
 */

import { asList, nested, type Element, type ModelStore } from '../store.js';
import { byId, find, insert, insertUnder, remove, replace, type Node } from '../forest.js';
import { CommandError, type Command, type Handler } from '../spec.js';
import { blank, mustGet } from './models.js';
import { t } from '../../i18n/index.js';

/** A tabLayout is born with two tabs, so it is usable the moment it is dropped. */
const TAB_LAYOUT = 'tabLayout';
const TAB = 'tab';

export const PAGE_COMMANDS: Record<string, Handler> = {
  'create-ui-page': (store, command) => {
    const id = String(command.id);
    if (store.has('pages', id)) return;
    store.put('pages', {
      id,
      name: command.name,
      route: `/${id}`,
      type: blank(command.pageType) ? 'PAGE' : command.pageType,
      content: [],
    });
    if (blank(command.appId)) return;
    // born reachable: the page hangs from the app's menu right away
    const app = mustGet(store, 'uiAdapters', command.appId, 'store.kind.uiApp');
    const label = blank(command.menuLabel) ? command.name : command.menuLabel;
    store.patch('uiAdapters', app.id, {
      menuItems: [...menuOf(app), { id: `mi-${id}`, label, pageId: id }],
    });
  },

  /**
   * The page goes, and everything that pointed AT it stops pointing. Wizard steps are the
   * exception: they survive unmapped, because a step is a stage of a flow and losing the page
   * that implemented it does not mean the stage stopped existing.
   */
  'delete-ui-page': (store, command) => {
    const id = String(command.id);
    for (const app of store.all('uiAdapters')) {
      const patch: Record<string, unknown> = {};
      const items = menuOf(app);
      const pruned = items.filter((i) => i.pageId !== id);
      if (pruned.length !== items.length) patch.menuItems = pruned;
      if (app.headerPageId === id) patch.headerPageId = null;
      if (app.homePageId === id) patch.homePageId = null;
      if (app.viewPageId === id) patch.viewPageId = null;
      if (app.editPageId === id) patch.editPageId = null;
      if (Object.keys(patch).length) store.patch('uiAdapters', app.id, patch);
    }
    for (const page of store.all('pages')) {
      if (page.id === id) continue;
      const patch: Record<string, unknown> = {};
      if (page.crudDetailPageId === id) patch.crudDetailPageId = null;
      if (page.crudCreatePageId === id) patch.crudCreatePageId = null;
      const steps = nested(page.wizardSteps);
      if (steps.some((s) => s.pageId === id)) {
        patch.wizardSteps = steps.map((s) => (s.pageId === id ? { ...s, pageId: null } : s));
      }
      if (Object.keys(patch).length) store.patch('pages', page.id, patch);
    }
    store.remove('pages', id);
  },

  'rename-ui-page': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    store.patch('pages', page.id, { name: command.name });
  },

  'set-page-type': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    store.patch('pages', page.id, { type: command.pageType });
  },

  'set-page-route': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    store.patch('pages', page.id, { route: command.path });
  },

  'set-page-model': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    if (command.modelId) mustGet(store, 'models', command.modelId, 'store.kind.model');
    store.patch('pages', page.id, { modelId: command.modelId ?? null });
  },

  'set-page-listing': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    if (command.queryServiceId) mustGet(store, 'queryServices', command.queryServiceId, 'store.kind.queryService');
    store.patch('pages', page.id, { listingQueryServiceId: command.queryServiceId ?? null });
  },

  /** CRUD: what opens a row, or the new-record form — a page OR an app, never both. */
  'set-crud-detail': crudTarget('crudDetailPageId', 'crudDetailAppId'),
  'set-crud-create': crudTarget('crudCreatePageId', 'crudCreateAppId'),

  // ---- the content tree ----------------------------------------------------

  'add-page-component': (store, command) => {
    const { type, el } = contentHost(store, command);
    const kind = String(command.componentKind);
    const node = newComponent(String(command.componentId), kind);
    const content = contentOf(el);

    if (blank(command.parentComponentId)) {
      requireTabRules(kind, undefined);
      store.patch(type, el.id, { content: insert(content, node) });
      return;
    }
    const parentId = String(command.parentComponentId);
    const parent = find(content, byId(parentId));
    if (!parent) throw new CommandError(t('store.unknown.component', { id: parentId }));
    requireTabRules(kind, String(parent.kind));
    store.patch(type, el.id, {
      content: insertUnder(content, byId(parentId), node)!,
    });
  },

  'remove-page-component': (store, command) => {
    const { type, el } = contentHost(store, command);
    const pruned = remove(contentOf(el), byId(String(command.componentId)));
    if (!pruned) throw new CommandError(t('store.unknown.component', { id: command.componentId }));
    store.patch(type, el.id, { content: pruned });
  },

  /**
   * Replaces the node's configuration wholesale — an absent value CLEARS, it does not preserve.
   * That is what makes the ficha's «save» mean what it shows, rather than accumulating settings
   * nobody can see any more.
   */
  'set-page-component': (store, command) => {
    const host = contentHost(store, command);
    for (const [field, type, label] of [
      ['useCaseId', 'useCases', 'store.kind.useCase'],
      ['modelId', 'models', 'store.kind.model'],
      ['mappingId', 'modelMappings', 'store.kind.mapping'],
      ['queryServiceId', 'queryServices', 'store.kind.queryService'],
      ['detailPageId', 'pages', 'store.kind.detailPage'],
    ] as const) {
      if (command[field]) mustGet(store, type, command[field], label);
    }
    const updated = replace(contentOf(host.el), byId(String(command.componentId)), (node) => ({
      ...node,
      title: command.title ?? null,
      text: command.text ?? null,
      label: command.label ?? null,
      useCaseId: command.useCaseId ?? null,
      mappingId: command.mappingId ?? null,
      modelId: command.modelId ?? null,
      queryServiceId: command.queryServiceId ?? null,
      queryOperationId: command.queryOperationId ?? null,
      fieldId: command.fieldId ?? null,
      stereotype: command.stereotype ?? null,
      colspan: command.colspan ?? null,
      detailPageId: command.detailPageId ?? null,
    }));
    if (!updated) throw new CommandError(t('store.unknown.component', { id: command.componentId }));
    store.patch(host.type, host.el.id, { content: updated });
  },

  'move-page-component': (store, command) => {
    const { type, el } = contentHost(store, command);
    const content = contentOf(el);
    const componentId = String(command.componentId);
    const node = find(content, byId(componentId));
    if (!node) throw new CommandError(t('store.unknown.component', { id: componentId }));

    const toParentId = blank(command.parentComponentId) ? null : String(command.parentComponentId);
    if (toParentId && find([node], byId(toParentId))) {
      throw new CommandError(
        t('store.page.componentIntoItself', { id: componentId }));
    }
    const pruned = remove(content, byId(componentId))!;
    const before = blank(command.beforeComponentId)
      ? undefined : byId(String(command.beforeComponentId));

    if (!toParentId) {
      requireTabRules(String(node.kind), undefined);
      store.patch(type, el.id, { content: insert(pruned, node, before) });
      return;
    }
    const parent = find(pruned, byId(toParentId));
    if (!parent) throw new CommandError(t('store.unknown.component', { id: toParentId }));
    requireTabRules(String(node.kind), String(parent.kind));
    store.patch(type, el.id, {
      content: insertUnder(pruned, byId(toParentId), node, before)!,
    });
  },

  // ---- buttons -------------------------------------------------------------

  /** A button fires a use case; its label defaults to the use case's own name. */
  'add-page-button': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    const useCase = mustGet(store, 'useCases', command.useCaseId, 'store.kind.useCase');
    const bar = String(command.type).toLowerCase() === 'bottom' ? 'bottomBar' : 'toolbar';
    store.patch('pages', page.id, {
      [bar]: [...nested(page[bar]), {
        id: `btn-${useCase.id}`,
        label: blank(command.label) ? useCase.name : command.label,
        useCaseId: useCase.id,
      }],
    });
  },

  /** Buttons are identified by what they fire, so the same use case leaves both bars. */
  'remove-page-button': (store, command) => {
    const page = store.get('pages', String(command.pageId));
    if (!page) return;
    store.patch('pages', page.id, {
      toolbar: nested(page.toolbar).filter((b) => b.useCaseId !== command.useCaseId),
      bottomBar: nested(page.bottomBar).filter((b) => b.useCaseId !== command.useCaseId),
    });
  },

  'set-page-button': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    if (command.mappingId) mustGet(store, 'modelMappings', command.mappingId, 'store.kind.mapping');
    const edit = (buttons: Element[]) => buttons.map((b) => (b.useCaseId === command.useCaseId
      ? {
        ...b,
        label: blank(command.label) ? b.label : command.label,
        mappingId: command.mappingId ?? null,
      }
      : b));
    store.patch('pages', page.id, {
      toolbar: edit(nested(page.toolbar) as Element[]),
      bottomBar: edit(nested(page.bottomBar) as Element[]),
    });
  },

  'add-page-bar-group': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    mustGet(store, 'buttonGroups', command.id, 'store.kind.buttonGroup');
    const bar = command.bar === 'toolbar' ? 'toolbarGroupIds' : 'bottomBarGroupIds';
    store.addToList('pages', page.id, bar, String(command.id));
  },

  'remove-page-bar-group': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    for (const bar of ['toolbarGroupIds', 'bottomBarGroupIds']) {
      store.removeFromList('pages', page.id, bar, String(command.id));
    }
  },

  // ---- the form's fields ---------------------------------------------------

  /**
   * A field's presentation on THIS page. The fields themselves come from the model; a config is
   * an override, so one is created on first touch and merged on later ones.
   */
  'set-page-field-config': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    const configs = nested(page.fieldConfigs);
    const fieldId = String(command.fieldId);
    const previous = configs.find((c) => c.fieldId === fieldId);
    const next = {
      fieldId,
      stereotype: command.stereotype ?? null,
      colspan: command.colspan ?? null,
      label: command.label ?? null,
      // style, cssClass and help have no command of their own: preserve what is there
      style: previous?.style ?? null,
      cssClass: previous?.cssClass ?? null,
      help: previous?.help ?? null,
    };
    store.patch('pages', page.id, {
      fieldConfigs: previous
        ? configs.map((c) => (c.fieldId === fieldId ? next : c))
        : [...configs, next],
    });
  },

  /**
   * The order of the form. The config list IS the order, so reordering rewrites it — and a field
   * with no config yet gets an empty one, because otherwise it could not hold a position.
   */
  'set-page-field-order': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    const byField = new Map(nested(page.fieldConfigs).map((c) => [String(c.fieldId), c]));
    store.patch('pages', page.id, {
      fieldConfigs: asList(command.fieldIds).map((id) => byField.get(id) ?? { fieldId: id }),
    });
  },

  // ---- wizard steps --------------------------------------------------------

  /** A step, mapped to the page implementing it or bare — a stage named before it is built. */
  'add-page-wizard-step': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    const steps = nested(page.wizardSteps);
    const targetId = blank(command.targetId) ? null : String(command.targetId);
    let mapped: Element | undefined;
    if (targetId) {
      mapped = mustGet(store, 'pages', targetId, 'store.kind.page');
      if (mapped.id === page.id) {
        throw new CommandError(t('store.page.wizardContainsSelf'));
      }
      if (steps.some((s) => s.pageId === targetId)) return;
    }
    const key = blank(command.itemId) ? `wzs-${steps.length + 1}` : String(command.itemId);
    if (steps.some((s) => s.key === key)) return;
    store.patch('pages', page.id, {
      wizardSteps: [...steps, {
        id: key,
        key,
        pageId: targetId,
        label: command.label ?? mapped?.name ?? t('store.default.stepN', { n: steps.length + 1 }),
      }],
    });
  },

  'set-wizard-step-page': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    const targetId = blank(command.targetId) ? null : String(command.targetId);
    if (targetId) {
      if (targetId === page.id) throw new CommandError(t('store.page.wizardContainsSelf'));
      mustGet(store, 'pages', targetId, 'store.kind.page');
    }
    const steps = nested(page.wizardSteps);
    if (!steps.some((s) => s.key === command.itemId)) {
      throw new CommandError(t('store.unknown.wizardStep', { id: command.itemId }));
    }
    store.patch('pages', page.id, {
      wizardSteps: steps.map((s) => (s.key === command.itemId ? { ...s, pageId: targetId } : s)),
    });
  },

  'remove-page-wizard-step': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    store.patch('pages', page.id, {
      wizardSteps: nested(page.wizardSteps).filter((s) => s.key !== command.targetId),
    });
  },

  'move-page-wizard-step': (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    const steps = nested(page.wizardSteps) as Node[];
    const moving = steps.find((s) => s.key === command.targetId);
    if (!moving) throw new CommandError(t('store.unknown.wizardStep', { id: command.targetId }));
    const rest = steps.filter((s) => s.key !== command.targetId);
    const before = blank(command.beforeItemId)
      ? undefined : (s: Node) => s.key === command.beforeItemId;
    store.patch('pages', page.id, { wizardSteps: insert(rest, moving, before) });
  },
};

/** CRUD detail/create: a page or an app, and setting one clears the other. */
function crudTarget(pageField: string, appField: string): Handler {
  return (store, command) => {
    const page = mustGet(store, 'pages', command.pageId, 'store.kind.page');
    if (String(page.type ?? '').toUpperCase() !== 'CRUD') {
      throw new CommandError(t('store.page.detailOnlyCrud'));
    }
    const targetPage = blank(command.targetId) ? null : String(command.targetId);
    const targetApp = blank(command.toAppId) ? null : String(command.toAppId);
    if (targetPage) mustGet(store, 'pages', targetPage, 'store.kind.page');
    if (targetApp) mustGet(store, 'uiAdapters', targetApp, 'store.kind.uiApp');
    store.patch('pages', page.id, {
      [pageField]: targetApp ? null : targetPage,
      [appField]: targetApp,
    });
  };
}

/** A fresh node: id and kind, and — for a tabLayout — the two tabs it is born with. */
function newComponent(id: string, kind: string): Node {
  const children = kind === TAB_LAYOUT
    ? [
      { id: `${id}-tab-1`, kind: TAB, title: t('store.default.tabN', { n: 1 }), children: [] },
      { id: `${id}-tab-2`, kind: TAB, title: t('store.default.tabN', { n: 2 }), children: [] },
    ]
    : [];
  return { id, kind, children };
}

/** tab ↔ tabLayout go together: neither makes sense without the other. */
function requireTabRules(kind: string, parentKind: string | undefined): void {
  if (parentKind === TAB_LAYOUT && kind !== TAB) {
    throw new CommandError(t('store.page.tabLayoutOnlyTabs'));
  }
  if (kind === TAB && parentKind !== TAB_LAYOUT) {
    throw new CommandError(t('store.page.tabOnlyInTabLayout'));
  }
}

const contentOf = (host: Element) => nested(host.content) as Node[];
const menuOf = (app: Element) => nested(app.menuItems) as Node[];

/**
 * A component command targets a mockup (by `mockupId`) or a page (by `pageId`) — both hold a
 * `content` tree of the same shape, so the tree ops are shared.
 */
function contentHost(store: ModelStore, command: Command): { type: string; el: Element } {
  return !blank(command.mockupId)
    ? { type: 'mockups', el: mustGet(store, 'mockups', command.mockupId, 'store.kind.mockup') }
    : { type: 'pages', el: mustGet(store, 'pages', command.pageId, 'store.kind.page') };
}

/** Element shapes this block creates, for the schema-defaults check in tests. */
export const PAGE_TYPES: string[] = ['pages'];
