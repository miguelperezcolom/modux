/**
 * The UI as an architectural element: which contexts it belongs to, what it is made of, who it
 * serves.
 *
 * This is the strategic end of the UI, not its contents — a `uis` element is a node on the map,
 * and the pages and apps it points at are modelled in the UI block. Ported from
 * `EditorApiController`.
 */

import { type Element, type ModelStore } from '../store.js';
import { add, CommandError, type Handler, remove } from '../spec.js';
import { t } from '../../i18n/index.js';

/** What a UI can be assigned: an app or a page, each in its own list. */
const ASSIGNABLE: { type: string; list: string }[] = [
  { type: 'uiAdapters', list: 'appIds' },
  { type: 'pages', list: 'pageIds' },
];

export const UI_COMMANDS: Record<string, Handler> = {
  'add-ui': add({
    type: 'uis',
    parent: { type: 'boundedContexts', from: 'boundedContextId', required: false },
    init: (c) => ({ boundedContextId: c.boundedContextId ?? null }),
  }),

  'remove-ui': remove({ type: 'uis' }),

  'add-ui-assignment': (store, command) => {
    const ui = requireUi(store, command.id);
    const target = String(command.targetId);
    const kind = ASSIGNABLE.find((a) => store.has(a.type, target));
    if (!kind) throw new CommandError(t('store.ui.assignTarget', { target }));
    store.addToList('uis', ui.id, kind.list, target);
  },

  /** The target may be either kind, and the caller does not say which. */
  'remove-ui-assignment': (store, command) => {
    const ui = requireUi(store, command.id);
    for (const kind of ASSIGNABLE) {
      store.removeFromList('uis', ui.id, kind.list, String(command.targetId));
    }
  },

  'add-ui-serving': (store, command) => {
    const ui = requireUi(store, command.id);
    const actor = String(command.targetId);
    if (!store.has('roles', actor)) throw new CommandError(t('store.unknown.actor', { id: actor }));
    store.addToList('uis', ui.id, 'actorIds', actor);
  },

  'remove-ui-serving': (store, command) => {
    const ui = requireUi(store, command.id);
    store.removeFromList('uis', ui.id, 'actorIds', String(command.targetId));
  },

  'set-ui-context': (store, command) => {
    const ui = requireUi(store, command.id);
    const context = command.boundedContextId as string | undefined;
    if (context && !store.has('boundedContexts', context)) {
      throw new CommandError(t('store.unknown.context', { id: context }));
    }
    store.patch('uis', ui.id, { boundedContextId: context ?? null });
  },

  /**
   * A UI app shows an aggregate's CRUD: it gets a menu entry that opens it.
   *
   * The entry names the AGGREGATE, not a page. Turning that into an actual page — with its
   * components, its listing and its form — is the UI derivation (`DeriveMenuCrudUseCase`), which
   * belongs to the UI block and runs on generation. This command records the intent; see
   * `docs/design/ide-plugin.md` §8.
   */
  'add-ui-crud': (store, command) => {
    const app = requireApp(store, command.sourceId);
    const aggregate = store.get('aggregates', String(command.targetId));
    if (!aggregate) throw new CommandError(t('store.unknown.aggregate', { id: command.targetId }));
    if (opensCrud(menuOf(app), `pg-crud-${aggregate.id}`, aggregate.id)) return;
    store.patch('uiAdapters', app.id, {
      menuItems: [...menuOf(app), {
        id: `mi-crud-${aggregate.id}`,
        label: aggregate.name,
        aggregateId: aggregate.id,
      }],
    });
  },

  /** Drops every entry that opens this CRUD, at any depth. The page itself is left alone. */
  'remove-ui-crud': (store, command) => {
    const app = store.get('uiAdapters', String(command.sourceId));
    if (!app) return;
    const aggregateId = String(command.targetId);
    store.patch('uiAdapters', app.id, {
      menuItems: withoutCrudEntries(menuOf(app), `pg-crud-${aggregateId}`, aggregateId),
    });
  },

  // ---- mockups: the page's visual, a first-class node linked to its page ----
  'add-mockup': add({ type: 'mockups', init: (c) => ({ pageId: c.pageId ?? null }) }),
  'delete-mockup': remove({ type: 'mockups' }),
  /** Link (or unlink, with a null page) a mockup to the page it stands for. */
  'set-mockup-page': (store, command) => {
    const mockup = store.get('mockups', String(command.id));
    if (!mockup) throw new CommandError(t('store.unknown.mockup', { id: command.id }));
    store.patch('mockups', mockup.id, { pageId: command.pageId ? String(command.pageId) : null });
  },
};

/** A menu is a tree, so both questions about it are recursive. */
function opensCrud(items: Element[], pageId: string, aggregateId: string): boolean {
  return items.some((item) => item.pageId === pageId || item.aggregateId === aggregateId
    || opensCrud(childrenOf(item), pageId, aggregateId));
}

function withoutCrudEntries(items: Element[], pageId: string, aggregateId: string): Element[] {
  return items
    .filter((item) => item.pageId !== pageId && item.aggregateId !== aggregateId)
    .map((item) => (Array.isArray(item.children)
      ? { ...item, children: withoutCrudEntries(childrenOf(item), pageId, aggregateId) }
      : item));
}

const menuOf = (app: Element) =>
  (Array.isArray(app.menuItems) ? (app.menuItems as Element[]) : []);

const childrenOf = (item: Element) =>
  (Array.isArray(item.children) ? (item.children as Element[]) : []);

function requireUi(store: ModelStore, id: unknown): Element {
  const ui = store.get('uis', String(id));
  if (!ui) throw new CommandError(t('store.unknown.ui', { id: String(id) }));
  return ui;
}

function requireApp(store: ModelStore, id: unknown): Element {
  const app = store.get('uiAdapters', String(id));
  if (!app) throw new CommandError(t('store.unknown.uiApp', { id: String(id) }));
  return app;
}



/** Element shapes this block creates, for the schema-defaults check in tests. */
export const UI_TYPES: string[] = ['uis', 'mockups'];
