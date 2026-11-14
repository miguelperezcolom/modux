/**
 * UI apps and their menus.
 *
 * A menu is a forest (`forest.ts`), and an entry either OPENS one thing or GROUPS others —
 * never both. That exclusivity is the rule most of this file is about: pointing an entry
 * somewhere clears every other target it had, gaining a submenu drops the target it carried, and
 * an entry that already has children refuses to be pointed anywhere.
 *
 * Ported from `UiEditorCommands`.
 */

import { nested, type Element, type ModelStore } from '../store.js';
import {
  find, ids, insert, insertUnder, remove, replace, slug, uniqueId, type Matcher, type Node,
} from '../forest.js';
import { CommandError, type Handler } from '../spec.js';
import { blank, mustGet } from './models.js';
import { t, type MessageKey } from '../../i18n/index.js';

/** Everything a menu entry can point at. Setting one clears the rest. */
const TARGETS = [
  'pageId', 'uiAdapterId', 'useCaseId', 'aggregateId', 'queryServiceId', 'queryOperationId',
];

export const APP_COMMANDS: Record<string, Handler> = {
  'create-ui-app': (store, command) => {
    const id = String(command.id);
    if (store.has('uiAdapters', id)) return;
    store.put('uiAdapters', {
      id,
      name: command.name,
      title: command.name,
      appType: blank(command.type) ? 'APP' : command.type,
      menuItems: [],
    });
    if (blank(command.boundedContextId)) return;
    // born inside a context: it owns the app from the start
    mustGet(store, 'boundedContexts', command.boundedContextId, 'store.kind.boundedContext');
    store.addToList('boundedContexts', String(command.boundedContextId), 'uiAdapterIds', id);
  },

  /**
   * The app goes, and everything pointing at it lets go. Menu entries in OTHER apps lose their
   * target but keep their place: the entry was somebody's deliberate structure, and only what it
   * opened stopped existing.
   */
  'delete-ui-app': (store, command) => {
    const id = String(command.id);
    store.removeFromAllLists('roles', 'uiAdapterIds', id);
    store.removeFromAllLists('boundedContexts', 'uiAdapterIds', id);
    for (const other of store.all('uiAdapters')) {
      if (other.id === id) continue;
      const patch: Record<string, unknown> = {};
      const items = menuOf(other);
      if (find(items, (n) => n.uiAdapterId === id)) {
        patch.menuItems = mapMenu(items, (n) =>
          (n.uiAdapterId === id ? { ...n, uiAdapterId: null } : n));
      }
      if (other.homeAppId === id) patch.homeAppId = null;
      if (Object.keys(patch).length) store.patch('uiAdapters', other.id, patch);
    }
    for (const page of store.all('pages')) {
      const patch: Record<string, unknown> = {};
      if (page.crudDetailAppId === id) patch.crudDetailAppId = null;
      if (page.crudCreateAppId === id) patch.crudCreateAppId = null;
      if (Object.keys(patch).length) store.patch('pages', page.id, patch);
    }
    store.remove('uiAdapters', id);
  },

  'set-app-model': (store, command) => {
    const app = mustGet(store, 'uiAdapters', command.appId, 'store.kind.uiApp');
    if (!blank(command.modelId)) mustGet(store, 'models', command.modelId, 'store.kind.model');
    store.patch('uiAdapters', app.id, {
      modelId: blank(command.modelId) ? null : command.modelId,
    });
  },

  'set-app-header-page': (store, command) => {
    const app = mustGet(store, 'uiAdapters', command.appId, 'store.kind.uiApp');
    const pageId = blank(command.pageId) ? null : String(command.pageId);
    if (pageId) mustGet(store, 'pages', pageId, 'store.kind.page');
    store.patch('uiAdapters', app.id, { headerPageId: pageId });
  },

  /** What the app opens first — a page, or another app. Only a plain APP has a home. */
  'set-app-home-page': (store, command) => {
    const app = mustGet(store, 'uiAdapters', command.appId, 'store.kind.uiApp');
    if (app.appType !== 'APP') {
      throw new CommandError(t('store.app.homeOnlyNormalApps'));
    }
    const pageId = blank(command.pageId) ? null : String(command.pageId);
    const toAppId = blank(command.toAppId) ? null : String(command.toAppId);
    if (pageId) mustGet(store, 'pages', pageId, 'store.kind.page');
    if (toAppId) {
      if (toAppId === app.id) throw new CommandError(t('store.app.homeIsSelf'));
      mustGet(store, 'uiAdapters', toAppId, 'store.kind.uiApp');
    }
    store.patch('uiAdapters', app.id, {
      homePageId: toAppId ? null : pageId,
      homeAppId: toAppId,
    });
  },

  'set-app-view-page': viewOrEdit('viewPageId'),
  'set-app-edit-page': viewOrEdit('editPageId'),

  // ---- menu entries --------------------------------------------------------

  'add-menu-item': (store, command) => {
    const app = mustGet(store, 'uiAdapters', command.appId, 'store.kind.uiApp');
    const items = menuOf(app);
    const entry: Node = {
      id: blank(command.itemId)
        ? uniqueId(`mi-${slug(command.label, 'entrada')}`, ids(items))
        : String(command.itemId),
      label: command.label,
      pageId: command.pageId ?? null,
    };
    const parent = matcherFor(command.parentId, command.parentLabel);
    if (!parent) {
      store.patch('uiAdapters', app.id, { menuItems: insert(items, entry) });
      return;
    }
    // gaining a submenu makes the parent a pure grouper: what it opened stops applying
    const placed = insertUnder(items, parent, entry);
    if (!placed) {
      throw new CommandError(
        t('store.unknown.menuItem', { id: command.parentId ?? command.parentLabel }));
    }
    store.patch('uiAdapters', app.id, {
      menuItems: replace(placed, parent, cleared)!,
    });
  },

  'remove-menu-item': (store, command) => {
    const app = store.get('uiAdapters', String(command.appId));
    if (!app) return;
    const matcher = matcherFor(command.itemId, command.label);
    if (!matcher) return;
    const pruned = remove(menuOf(app), matcher);
    if (pruned) store.patch('uiAdapters', app.id, { menuItems: pruned });
  },

  'set-menu-page': menuTarget('pageId', 'pageId', 'pages', 'store.kind.page'),
  'set-menu-app': menuTarget('uiAdapterId', 'toAppId', 'uiAdapters', 'store.kind.uiApp'),
  'set-menu-use-case': menuTarget('useCaseId', 'useCaseId', 'useCases', 'store.kind.useCase'),
  'set-menu-aggregate': menuTarget('aggregateId', 'aggregateId', 'aggregates', 'store.kind.aggregate'),

  /** A query OPERATION, so both halves travel together — the service alone opens nothing. */
  'set-menu-query-operation': (store, command) => {
    const app = mustGet(store, 'uiAdapters', command.appId, 'store.kind.uiApp');
    if (command.queryOperationId) {
      const service = mustGet(store, 'queryServices', command.queryServiceId, 'store.kind.queryService');
      const known = nested(service.operations).some((op) => op.id === command.queryOperationId);
      if (!known) {
        throw new CommandError(t('store.unknown.queryOperation', { operation: command.queryOperationId, service: command.queryServiceId }));
      }
    }
    retarget(store, app, command, {
      queryServiceId: command.queryOperationId ? command.queryServiceId : null,
      queryOperationId: command.queryOperationId ?? null,
    });
  },

  /**
   * Moves an entry — subtree included — anywhere in the forest: to another app, under a parent
   * (which nests it), to the root (which promotes it), and into a slot.
   */
  'move-menu-item': (store, command) => {
    const source = mustGet(store, 'uiAdapters', command.appId, 'store.kind.uiApp');
    const target = mustGet(store, 'uiAdapters', command.toAppId, 'store.kind.uiApp');
    const matcher = matcherFor(command.itemId, command.label);
    if (!matcher) throw new CommandError(t('store.menu.moveMissingItem'));
    const entry = find(menuOf(source), matcher);
    if (!entry) {
      throw new CommandError(t('store.unknown.menuItem', { id: command.itemId ?? command.label }));
    }
    const parentId = blank(command.parentId) ? null : String(command.parentId);
    if (parentId && find([entry], (n) => n.id === parentId)) {
      throw new CommandError(t('store.menu.moveIntoItself'));
    }
    const pruned = remove(menuOf(source), matcher) ?? menuOf(source);
    store.patch('uiAdapters', source.id, { menuItems: pruned });

    // re-read: source and target may be the same app, which the prune just rewrote
    const into = store.get('uiAdapters', target.id)!;
    const items = menuOf(into);
    const before = blank(command.beforeItemId)
      ? undefined : (n: Node) => n.id === command.beforeItemId;
    const placed = parentId
      ? insertUnder(items, (n) => n.id === parentId, entry, before)
      : insert(items, entry, before);
    if (!placed) throw new CommandError(t('store.unknown.menuItem', { id: parentId }));
    store.patch('uiAdapters', into.id, { menuItems: placed });
  },

  // ---- who opens the app ---------------------------------------------------

  'add-actor-app': (store, command) => {
    const actor = mustGet(store, 'roles', command.actorId, 'store.kind.actor');
    mustGet(store, 'uiAdapters', command.appId, 'store.kind.uiApp');
    store.addToList('roles', actor.id, 'uiAdapterIds', String(command.appId));
  },

  'remove-actor-app': (store, command) => {
    store.removeFromList('roles', String(command.actorId), 'uiAdapterIds', String(command.appId));
  },
};

/** VIEW_EDITOR: the read-only view and the edit view. Only that app type has them. */
function viewOrEdit(field: string): Handler {
  return (store, command) => {
    const app = mustGet(store, 'uiAdapters', command.appId, 'store.kind.uiApp');
    if (app.appType !== 'VIEW_EDITOR') {
      throw new CommandError(t('store.app.viewEditOnlyViewEditor'));
    }
    const pageId = blank(command.pageId) ? null : String(command.pageId);
    if (pageId) mustGet(store, 'pages', pageId, 'store.kind.page');
    store.patch('uiAdapters', app.id, { [field]: pageId });
  };
}

/** Point an entry at one kind of thing, clearing whatever else it pointed at. */
function menuTarget(field: string, from: string, type: string, label: MessageKey): Handler {
  return (store, command) => {
    const app = mustGet(store, 'uiAdapters', command.appId, 'store.kind.uiApp');
    const value = (command as Record<string, unknown>)[from];
    if (value) mustGet(store, type, value, label);
    retarget(store, app, command, { [field]: value ?? null });
  };
}

/**
 * Write the entry's target. An entry with a submenu is a pure grouper — pointing it somewhere
 * would give the user two contradictory things to expect from one click, so it is refused.
 */
function retarget(
  store: ModelStore, app: Element, command: Record<string, any>, target: Record<string, unknown>,
): void {
  const matcher = matcherFor(command.itemId, command.label);
  if (!matcher) throw new CommandError(t('store.menu.missingItem'));
  const updated = replace(menuOf(app), matcher, (item) => {
    const next = { ...cleared(item), ...target };
    const links = TARGETS.some((f) => next[f] != null);
    if (links && childrenOf(item).length) {
      throw new CommandError(t('store.menu.hasSubmenu', { label: String(item.label) }));
    }
    return next;
  });
  if (!updated) {
    throw new CommandError(t('store.unknown.menuItem', { id: command.itemId ?? command.label }));
  }
  store.patch('uiAdapters', app.id, { menuItems: updated });
}

/** The entry with every target cleared — the starting point of any retarget. */
const cleared = (item: Node): Node => {
  const next = { ...item };
  for (const field of TARGETS) next[field] = null;
  return next;
};

/**
 * How an entry is named. The stable id when there is one; the label otherwise, for entries
 * written by hand in YAML before ids existed.
 */
function matcherFor(itemId: unknown, label: unknown): Matcher | undefined {
  if (!blank(itemId)) return (node) => node.id === itemId;
  if (!blank(label)) return (node) => node.label === label;
  return undefined;
}

/** Rewrite every entry at every depth. */
function mapMenu(items: Node[], edit: (node: Node) => Node): Node[] {
  return items.map((item) => {
    const rewritten = edit(item);
    const children = childrenOf(item);
    return children.length ? { ...rewritten, children: mapMenu(children, edit) } : rewritten;
  });
}

const menuOf = (app: Element) => nested(app.menuItems) as Node[];
const childrenOf = (node: Node) => (Array.isArray(node.children) ? (node.children as Node[]) : []);

/** Element shapes this block creates, for the schema-defaults check in tests. */
export const APP_TYPES: string[] = ['uiAdapters'];
