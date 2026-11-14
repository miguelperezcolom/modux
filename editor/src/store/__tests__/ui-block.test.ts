/**
 * The UI block, ported from `UiEditorCommands`.
 *
 * Two shapes carry most of the difficulty and most of these tests: the forests (a menu, a page's
 * content) and the exclusivity rules over them — an entry opens one thing or groups others, a
 * CRUD detail is a page or an app, a field is one type. The rest is bookkeeping that `spec.ts`
 * already covers.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { setLanguage } from '../../i18n/index.js';
import { apply, CommandError, supports } from '../apply.js';
import { ModelStore, type Element } from '../store.js';

beforeAll(() => setLanguage('es'));

function model(extra: Record<string, Element[]> = {}): ModelStore {
  return ModelStore.from({
    boundedContexts: [{ id: 'bc-res', name: 'Reservas' }],
    uiAdapters: [{ id: 'app-1', name: 'Back office', appType: 'APP', menuItems: [] }],
    pages: [{ id: 'pg-1', name: 'Listado', type: 'PAGE', content: [] }],
    ...extra,
  });
}

const menu = (store: ModelStore, appId = 'app-1') =>
  (store.get('uiAdapters', appId)!.menuItems ?? []) as Element[];
const content = (store: ModelStore, pageId = 'pg-1') =>
  (store.get('pages', pageId)!.content ?? []) as Element[];

describe('apps', () => {
  it('is born inside its bounded context when one is named', () => {
    const store = model();

    apply(store, {
      kind: 'create-ui-app', id: 'app-2', name: 'Portal', boundedContextId: 'bc-res',
    } as never);

    expect(store.get('boundedContexts', 'bc-res')?.uiAdapterIds).toEqual(['app-2']);
  });

  it('refuses to be its own home', () => {
    const store = model();

    expect(() => apply(store,
      { kind: 'set-app-home-page', appId: 'app-1', toAppId: 'app-1' } as never))
      .toThrow(/su propia home/);
  });

  /** A home is a page OR another app; picking one has to clear the other. */
  it('clears the page home when the home becomes an app', () => {
    const store = model({
      uiAdapters: [
        { id: 'app-1', name: 'Back office', appType: 'APP', menuItems: [], homePageId: 'pg-1' },
        { id: 'app-2', name: 'Otra', appType: 'APP', menuItems: [] },
      ],
    });

    apply(store, { kind: 'set-app-home-page', appId: 'app-1', toAppId: 'app-2' } as never);

    expect(store.get('uiAdapters', 'app-1')?.homePageId).toBeUndefined();
    expect(store.get('uiAdapters', 'app-1')?.homeAppId).toBe('app-2');
  });

  it('only lets a view-editor have a view and an edit page', () => {
    const store = model();

    expect(() => apply(store,
      { kind: 'set-app-view-page', appId: 'app-1', pageId: 'pg-1' } as never))
      .toThrow(/vista-editor/);
  });

  /**
   * A menu entry in ANOTHER app that pointed at the deleted one loses its target but keeps its
   * place: the entry was somebody's structure, only what it opened stopped existing.
   */
  it('leaves orphaned menu entries in place when an app is deleted', () => {
    const store = model({
      uiAdapters: [
        { id: 'app-1', name: 'A', appType: 'APP', menuItems: [
          { id: 'mi-1', label: 'Ir a la otra', uiAdapterId: 'app-2' },
        ] },
        { id: 'app-2', name: 'B', appType: 'APP', menuItems: [] },
      ],
    });

    apply(store, { kind: 'delete-ui-app', id: 'app-2' } as never);

    expect(menu(store)).toEqual([{ id: 'mi-1', label: 'Ir a la otra' }]);
  });
});

describe('menus, where an entry opens one thing or groups others', () => {
  const withEntry = () => model({
    useCases: [{ id: 'uc-1', name: 'Reservar' }],
    uiAdapters: [{ id: 'app-1', name: 'A', appType: 'APP', menuItems: [
      { id: 'mi-1', label: 'Reservas', pageId: 'pg-1' },
    ] }],
  });

  it('mints a stable id from the label, and does not collide', () => {
    const store = model();

    apply(store, { kind: 'add-menu-item', appId: 'app-1', label: 'Mis Reservas' } as never);
    apply(store, { kind: 'add-menu-item', appId: 'app-1', label: 'Mis Reservas' } as never);

    expect(menu(store).map((i) => i.id)).toEqual(['mi-mis-reservas', 'mi-mis-reservas-2']);
  });

  it('clears every other target when pointed somewhere new', () => {
    const store = withEntry();

    apply(store, {
      kind: 'set-menu-use-case', appId: 'app-1', itemId: 'mi-1', useCaseId: 'uc-1',
    } as never);

    expect(menu(store)[0]).toEqual({ id: 'mi-1', label: 'Reservas', useCaseId: 'uc-1' });
  });

  /** Gaining a submenu makes the parent a pure grouper: what it opened stops applying. */
  it('drops the parent’s target when it gains a submenu', () => {
    const store = withEntry();

    apply(store, {
      kind: 'add-menu-item', appId: 'app-1', parentId: 'mi-1', label: 'Alta',
    } as never);

    expect(menu(store)[0].pageId).toBeUndefined();
    expect((menu(store)[0].children as Element[])[0].label).toBe('Alta');
  });

  it('refuses to point an entry that already has a submenu', () => {
    const store = withEntry();
    apply(store, { kind: 'add-menu-item', appId: 'app-1', parentId: 'mi-1', label: 'Alta' } as never);

    expect(() => apply(store,
      { kind: 'set-menu-page', appId: 'app-1', itemId: 'mi-1', pageId: 'pg-1' } as never))
      .toThrow(/tiene submenú/);
  });

  it('matches a pre-id entry by its label', () => {
    const store = model({
      uiAdapters: [{ id: 'app-1', name: 'A', appType: 'APP', menuItems: [{ label: 'Antigua' }] }],
    });

    apply(store, {
      kind: 'set-menu-page', appId: 'app-1', label: 'Antigua', pageId: 'pg-1',
    } as never);

    expect(menu(store)[0].pageId).toBe('pg-1');
  });

  it('refuses to move an entry into its own submenu', () => {
    const store = model({
      uiAdapters: [{ id: 'app-1', name: 'A', appType: 'APP', menuItems: [
        { id: 'mi-1', label: 'Padre', children: [{ id: 'mi-2', label: 'Hijo' }] },
      ] }],
    });

    expect(() => apply(store, {
      kind: 'move-menu-item', appId: 'app-1', toAppId: 'app-1', itemId: 'mi-1', parentId: 'mi-2',
    } as never)).toThrow(/dentro de sí misma/);
  });

  it('moves a subtree to another app, into a slot', () => {
    const store = model({
      uiAdapters: [
        { id: 'app-1', name: 'A', appType: 'APP', menuItems: [
          { id: 'mi-1', label: 'Padre', children: [{ id: 'mi-2', label: 'Hijo' }] },
        ] },
        { id: 'app-2', name: 'B', appType: 'APP', menuItems: [
          { id: 'mi-x', label: 'X' }, { id: 'mi-y', label: 'Y' },
        ] },
      ],
    });

    apply(store, {
      kind: 'move-menu-item', appId: 'app-1', toAppId: 'app-2', itemId: 'mi-1',
      beforeItemId: 'mi-y',
    } as never);

    // the emptied menu is not stored at all — the NON_EMPTY rule of §2.6
    expect(store.get('uiAdapters', 'app-1')?.menuItems).toBeUndefined();
    expect(menu(store, 'app-2').map((i) => i.id)).toEqual(['mi-x', 'mi-1', 'mi-y']);
    expect((menu(store, 'app-2')[1].children as Element[])[0].id).toBe('mi-2');
  });

  /** Same-app moves reorder — and must not lose the entry to the prune-then-insert. */
  it('reorders within the same app', () => {
    const store = model({
      uiAdapters: [{ id: 'app-1', name: 'A', appType: 'APP', menuItems: [
        { id: 'a' }, { id: 'b' }, { id: 'c' },
      ] }],
    });

    apply(store, {
      kind: 'move-menu-item', appId: 'app-1', toAppId: 'app-1', itemId: 'c', beforeItemId: 'a',
    } as never);

    expect(menu(store).map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('pages', () => {
  it('is born reachable when an app is named', () => {
    const store = model();

    apply(store, {
      kind: 'create-ui-page', id: 'pg-2', name: 'Alta', appId: 'app-1',
    } as never);

    expect(menu(store)).toEqual([{ id: 'mi-pg-2', label: 'Alta', pageId: 'pg-2' }]);
  });

  it('takes its menu entries with it, and unpoints whoever aimed at it', () => {
    const store = model({
      uiAdapters: [{ id: 'app-1', name: 'A', appType: 'APP', headerPageId: 'pg-1',
        menuItems: [{ id: 'mi-1', pageId: 'pg-1' }, { id: 'mi-2', pageId: 'pg-otra' }] }],
      pages: [
        { id: 'pg-1', name: 'Listado', type: 'PAGE' },
        { id: 'pg-crud', name: 'CRUD', type: 'CRUD', crudDetailPageId: 'pg-1' },
      ],
    });

    apply(store, { kind: 'delete-ui-page', id: 'pg-1' } as never);

    expect(menu(store).map((i) => i.id)).toEqual(['mi-2']);
    expect(store.get('uiAdapters', 'app-1')?.headerPageId).toBeUndefined();
    expect(store.get('pages', 'pg-crud')?.crudDetailPageId).toBeUndefined();
  });

  /** A wizard step is a STAGE: losing the page that implemented it does not delete the stage. */
  it('leaves a wizard step behind, unmapped, when its page goes', () => {
    const store = model({
      pages: [
        { id: 'pg-1', name: 'Paso', type: 'PAGE' },
        { id: 'pg-wz', name: 'Wizard', type: 'WIZARD',
          wizardSteps: [{ id: 'w1', key: 'w1', label: 'Datos', pageId: 'pg-1' }] },
      ],
    });

    apply(store, { kind: 'delete-ui-page', id: 'pg-1' } as never);

    expect(store.get('pages', 'pg-wz')?.wizardSteps)
      .toEqual([{ id: 'w1', key: 'w1', label: 'Datos' }]);
  });

  it('only lets a CRUD have a detail and a create form', () => {
    const store = model();

    expect(() => apply(store,
      { kind: 'set-crud-detail', pageId: 'pg-1', targetId: 'pg-1' } as never))
      .toThrow(/Solo un CRUD/);
  });

  it('makes the CRUD detail a page or an app, never both', () => {
    const store = model({
      pages: [{ id: 'pg-crud', name: 'CRUD', type: 'CRUD', crudDetailPageId: 'pg-1' },
        { id: 'pg-1', name: 'Detalle', type: 'PAGE' }],
    });

    apply(store, { kind: 'set-crud-detail', pageId: 'pg-crud', toAppId: 'app-1' } as never);

    expect(store.get('pages', 'pg-crud')?.crudDetailPageId).toBeUndefined();
    expect(store.get('pages', 'pg-crud')?.crudDetailAppId).toBe('app-1');
  });

  it('refuses a wizard that contains itself', () => {
    const store = model({ pages: [{ id: 'pg-wz', name: 'W', type: 'WIZARD' }] });

    expect(() => apply(store,
      { kind: 'add-page-wizard-step', pageId: 'pg-wz', targetId: 'pg-wz' } as never))
      .toThrow(/a sí mismo/);
  });

  it('orders the form by rewriting the config list, minting one where there was none', () => {
    const store = model({
      pages: [{ id: 'pg-1', name: 'F', type: 'PAGE',
        fieldConfigs: [{ fieldId: 'b', label: 'Bravo' }] }],
    });

    apply(store, { kind: 'set-page-field-order', pageId: 'pg-1', fieldIds: ['a', 'b'] } as never);

    expect(store.get('pages', 'pg-1')?.fieldConfigs)
      .toEqual([{ fieldId: 'a' }, { fieldId: 'b', label: 'Bravo' }]);
  });

  /** A config is an override: a second touch merges rather than replaces. */
  it('keeps the settings a field config command does not carry', () => {
    const store = model({
      pages: [{ id: 'pg-1', name: 'F', type: 'PAGE',
        fieldConfigs: [{ fieldId: 'a', help: 'una ayuda', label: 'Antes' }] }],
    });

    apply(store, {
      kind: 'set-page-field-config', pageId: 'pg-1', fieldId: 'a', label: 'Después',
    } as never);

    expect(store.get('pages', 'pg-1')?.fieldConfigs)
      .toEqual([{ fieldId: 'a', label: 'Después', help: 'una ayuda' }]);
  });
});

describe('the page content tree', () => {
  it('gives a tabLayout the two tabs it is born with', () => {
    const store = model();

    apply(store, {
      kind: 'add-page-component', pageId: 'pg-1', componentId: 'c1', componentKind: 'tabLayout',
    } as never);

    const children = content(store)[0].children as Element[];
    expect(children.map((c) => c.kind)).toEqual(['tab', 'tab']);
  });

  it('keeps tabs and tabLayouts together, on add and on move', () => {
    const store = model();
    apply(store, {
      kind: 'add-page-component', pageId: 'pg-1', componentId: 'c1', componentKind: 'tabLayout',
    } as never);

    expect(() => apply(store, {
      kind: 'add-page-component', pageId: 'pg-1', componentId: 'x', componentKind: 'tab',
    } as never)).toThrow(/solo puede colgar/);

    expect(() => apply(store, {
      kind: 'add-page-component', pageId: 'pg-1', componentId: 'x', componentKind: 'field',
      parentComponentId: 'c1',
    } as never)).toThrow(/solo admite pestañas/);

    expect(() => apply(store, {
      kind: 'move-page-component', pageId: 'pg-1', componentId: 'c1-tab-1',
    } as never)).toThrow(/solo puede colgar/);
  });

  it('refuses to move a component into its own subtree', () => {
    const store = model({
      pages: [{ id: 'pg-1', name: 'P', type: 'PAGE', content: [
        { id: 'c1', kind: 'section', children: [{ id: 'c2', kind: 'field' }] },
      ] }],
    });

    expect(() => apply(store, {
      kind: 'move-page-component', pageId: 'pg-1', componentId: 'c1', parentComponentId: 'c2',
    } as never)).toThrow(/dentro de sí mismo/);
  });

  /** An absent value CLEARS: the ficha's save means what it shows. */
  it('clears what the set command does not carry', () => {
    const store = model({
      pages: [{ id: 'pg-1', name: 'P', type: 'PAGE', content: [
        { id: 'c1', kind: 'field', label: 'Antes', stereotype: 'CHIP' },
      ] }],
    });

    apply(store, {
      kind: 'set-page-component', pageId: 'pg-1', componentId: 'c1', label: 'Después',
    } as never);

    expect(content(store)[0]).toEqual({ id: 'c1', kind: 'field', label: 'Después' });
  });
});

describe('models and their fields', () => {
  const withField = () => model({
    models: [{ id: 'm-1', name: 'Reserva', fields: [{ id: 'f-1', name: 'nombre' }] }],
  });

  it('keeps exactly one type reference on a field', () => {
    const store = withField();

    apply(store, {
      kind: 'set-model-field-type', modelId: 'm-1', fieldId: 'f-1', type: 'value-object',
      targetId: 'vo-1',
    } as never);
    apply(store, {
      kind: 'set-model-field-type', modelId: 'm-1', fieldId: 'f-1', type: 'enum', targetId: 'en-1',
    } as never);

    const field = (store.get('models', 'm-1')!.fields as Element[])[0];
    expect(field.valueObjectId).toBeUndefined();
    expect(field).toMatchObject({ isEnum: true, enumId: 'en-1' });
  });

  /** Mandatory is a validation, not a flag — that is what generation reads. */
  it('toggles required as a NotNull validation', () => {
    const store = withField();

    apply(store, {
      kind: 'set-model-field-required', modelId: 'm-1', fieldId: 'f-1', required: true,
    } as never);
    expect(((store.get('models', 'm-1')!.fields as Element[])[0].validations as Element[])[0].type)
      .toBe('NotNull');

    apply(store, {
      kind: 'set-model-field-required', modelId: 'm-1', fieldId: 'f-1', required: false,
    } as never);
    expect((store.get('models', 'm-1')!.fields as Element[])[0].validations).toBeUndefined();
  });

  it('does not add a second required validation', () => {
    const store = model({
      models: [{ id: 'm-1', name: 'R', fields: [
        { id: 'f-1', name: 'n', validations: [{ id: 'v', type: 'NotBlank' }] },
      ] }],
    });

    apply(store, {
      kind: 'set-model-field-required', modelId: 'm-1', fieldId: 'f-1', required: true,
    } as never);

    expect((store.get('models', 'm-1')!.fields as Element[])[0].validations).toHaveLength(1);
  });

  /** Renaming a field must not silently undo the type it was pointed at. */
  it('keeps the type reference when only the name changes', () => {
    const store = model({
      models: [{ id: 'm-1', name: 'R', fields: [
        { id: 'f-1', name: 'antes', valueObjectId: 'vo-1', collection: true },
      ] }],
    });

    apply(store, {
      kind: 'set-model-field', modelId: 'm-1', fieldId: 'f-1', name: 'después',
    } as never);

    expect((store.get('models', 'm-1')!.fields as Element[])[0])
      .toMatchObject({ name: 'después', valueObjectId: 'vo-1', collection: true });
  });

  it('drops the mapping rules that mapped a field that left', () => {
    const store = model({
      models: [{ id: 'm-1', name: 'A', fields: [{ id: 'f-1' }] }, { id: 'm-2', name: 'B' }],
      modelMappings: [{ id: 'mm-1', sourceModelId: 'm-1', targetModelId: 'm-2', rules: [
        { id: 'mr-1', sourceFieldId: 'f-1', targetFieldId: 'g-1' },
        { id: 'mr-2', sourceFieldId: 'f-2', targetFieldId: 'g-2' },
      ] }],
    });

    apply(store, { kind: 'remove-model-field', modelId: 'm-1', fieldId: 'f-1' } as never);

    expect((store.get('modelMappings', 'mm-1')!.rules as Element[]).map((r) => r.id))
      .toEqual(['mr-2']);
  });

  it('refuses to move a field onto an id the target already uses', () => {
    const store = model({
      models: [
        { id: 'm-1', name: 'A', fields: [{ id: 'f-1' }] },
        { id: 'm-2', name: 'B', fields: [{ id: 'f-1' }] },
      ],
    });

    expect(() => apply(store,
      { kind: 'move-model-field', modelId: 'm-1', targetId: 'm-2', fieldId: 'f-1' } as never))
      .toThrow(/ya tiene un campo/);
  });

  it('unlinks whoever used a deleted model as a viewmodel', () => {
    const store = model({
      models: [{ id: 'm-1', name: 'R' }],
      uiAdapters: [{ id: 'app-1', name: 'A', appType: 'APP', modelId: 'm-1', menuItems: [] }],
      pages: [{ id: 'pg-1', name: 'P', type: 'PAGE', modelId: 'm-1', content: [
        { id: 'c1', kind: 'field', modelId: 'm-1' },
      ] }],
    });

    apply(store, { kind: 'remove-model', id: 'm-1' } as never);

    expect(store.get('uiAdapters', 'app-1')?.modelId).toBeUndefined();
    expect(store.get('pages', 'pg-1')?.modelId).toBeUndefined();
    expect(content(store)[0].modelId).toBeUndefined();
  });
});

describe('the platform furniture', () => {
  it('clears every trust edge when an IdP goes', () => {
    const store = model({
      identityProviders: [{ id: 'idp-1', name: 'Corp', type: 'CORPORATE' }],
      uiAdapters: [{ id: 'app-1', name: 'A', appType: 'APP', identityProviderId: 'idp-1' }],
      boundedContexts: [{ id: 'bc-res', name: 'R', identityProviderId: 'idp-1' }],
      etlFlows: [{ id: 'etl-1', name: 'E', identityProviderId: 'idp-1' }],
    });

    apply(store, { kind: 'remove-identity-provider', id: 'idp-1' } as never);

    expect(store.get('uiAdapters', 'app-1')?.identityProviderId).toBeUndefined();
    expect(store.get('boundedContexts', 'bc-res')?.identityProviderId).toBeUndefined();
    expect(store.get('etlFlows', 'etl-1')?.identityProviderId).toBeUndefined();
  });

  it('wires an IdP to whichever of the three kinds the id turns out to be', () => {
    const store = model({ identityProviders: [{ id: 'idp-1', name: 'Corp' }] });

    apply(store, { kind: 'set-identity-provider', id: 'bc-res', targetId: 'idp-1' } as never);
    expect(store.get('boundedContexts', 'bc-res')?.identityProviderId).toBe('idp-1');

    expect(() => apply(store,
      { kind: 'set-identity-provider', id: 'pg-1', targetId: 'idp-1' } as never))
      .toThrow(/apps, bounded contexts o flujos ETL/);
  });

  /** Whoever delegated to a piece of code survives it; they just stop delegating. */
  it('unwires every delegation when custom code goes', () => {
    const store = model({
      customCodes: [{ id: 'cc-1', name: 'Calculo' }],
      modelMappings: [{ id: 'mm-1', customCodeId: 'cc-1' }],
      transformations: [{ id: 'tr-1', customCodeId: 'cc-1' }],
      useCases: [{ id: 'uc-1', steps: [{ id: 's1', customCodeId: 'cc-1' }] }],
      pages: [{ id: 'pg-1', name: 'P', type: 'PAGE', customCodeId: 'cc-1', content: [
        { id: 'c1', kind: 'field', customCodeId: 'cc-1' },
      ] }],
    });

    apply(store, { kind: 'remove-custom-code', id: 'cc-1' } as never);

    expect(store.get('modelMappings', 'mm-1')?.customCodeId).toBeUndefined();
    expect(store.get('transformations', 'tr-1')?.customCodeId).toBeUndefined();
    expect((store.get('useCases', 'uc-1')!.steps as Element[])[0].customCodeId).toBeUndefined();
    expect(store.get('pages', 'pg-1')?.customCodeId).toBeUndefined();
    expect(content(store)[0].customCodeId).toBeUndefined();
    expect(store.has('customCodes', 'cc-1')).toBe(false);
  });

  it('unhooks a button group from the pages and groups holding it', () => {
    const store = model({
      buttonGroups: [{ id: 'bg-1', name: 'G' }, { id: 'bg-2', name: 'H', groupIds: ['bg-1'] }],
      pages: [{ id: 'pg-1', name: 'P', type: 'PAGE', toolbarGroupIds: ['bg-1'] }],
    });

    apply(store, { kind: 'remove-button-group', id: 'bg-1' } as never);

    expect(store.get('pages', 'pg-1')?.toolbarGroupIds).toBeUndefined();
    expect(store.get('buttonGroups', 'bg-2')?.groupIds).toBeUndefined();
  });

  it('refuses a notification pointed at something that is not an event', () => {
    const store = model({
      notifications: [{ id: 'nt-1', name: 'Aviso', ownerBoundedContextId: 'bc-res' }],
    });

    expect(() => apply(store,
      { kind: 'set-notification-event', id: 'nt-1', targetId: 'pg-1' } as never))
      .toThrow(/Evento desconocido/);
  });
});

describe('the block as a whole', () => {
  it('covers every UI command the editor can emit', () => {
    const kinds = [
      'create-ui-app', 'delete-ui-app', 'set-app-model', 'set-app-home-page', 'set-app-header-page',
      'set-app-view-page', 'set-app-edit-page', 'add-menu-item', 'remove-menu-item',
      'move-menu-item', 'set-menu-page', 'set-menu-app', 'set-menu-use-case', 'set-menu-aggregate',
      'set-menu-query-operation', 'add-actor-app', 'remove-actor-app',
      'create-ui-page', 'delete-ui-page', 'rename-ui-page', 'set-page-type', 'set-page-route',
      'set-page-model', 'set-page-listing', 'set-crud-detail', 'set-crud-create',
      'add-page-component', 'remove-page-component', 'set-page-component', 'move-page-component',
      'add-page-button', 'remove-page-button', 'set-page-button', 'add-page-bar-group',
      'remove-page-bar-group', 'set-page-field-config', 'set-page-field-order',
      'add-page-wizard-step', 'remove-page-wizard-step', 'move-page-wizard-step',
      'set-wizard-step-page',
      'add-model', 'remove-model', 'add-model-field', 'remove-model-field', 'move-model-field',
      'set-model-field', 'set-model-field-type', 'set-model-field-required',
      'set-model-field-collection', 'add-model-mapping', 'remove-model-mapping',
      'add-model-mapping-rule', 'remove-model-mapping-rule',
      'add-transformation', 'remove-transformation', 'add-transformation-input',
      'remove-transformation-input', 'set-transformation-output', 'set-transformation-custom-code',
      'add-identity-provider', 'remove-identity-provider', 'set-identity-provider',
      'set-idp-publisher', 'add-notification', 'remove-notification', 'set-notification-event',
      'add-notification-recipient', 'remove-notification-recipient',
      'add-document', 'remove-document', 'set-document-model', 'set-document-query',
      'set-project-locales', 'add-etl-flow', 'remove-etl-flow', 'add-etl-step', 'remove-etl-step',
      'add-button-group', 'remove-button-group', 'add-group-button', 'remove-group-button',
      'set-group-button-target', 'add-group-subgroup', 'remove-group-subgroup',
      'add-custom-code', 'remove-custom-code', 'add-custom-code-use', 'remove-custom-code-use',
      'set-mapping-custom-code', 'set-page-custom-code', 'set-page-component-custom-code',
      'set-use-case-step-custom-code',
    ];

    expect(kinds.filter((kind) => !supports(kind))).toEqual([]);
  });

  it('reports an unknown reference rather than writing a dangling one', () => {
    const store = model();

    expect(() => apply(store,
      { kind: 'set-page-model', pageId: 'pg-1', modelId: 'no-existe' } as never))
      .toThrow(CommandError);
    expect(store.get('pages', 'pg-1')?.modelId).toBeUndefined();
  });
});
