import type { ModuxModel, UiMenuEntryRef, UiComponentNodeRef, FieldRef } from './model.js';
import type { ModuxCommand } from './commands.js';

/** The elements that own fields — aggregates and entities (Record VOs join later). */
function fieldOwners(host: { model: ModuxModel }): { id: string; fields?: FieldRef[] }[] {
  return [...(host.model.aggregates ?? []), ...(host.model.entities ?? [])];
}

/**
 * Undo lives OUTSIDE the component: the inverse of a command is a pure
 * function of (command, current model) — plus two page-composition helpers
 * the host provides.
 */
export interface UndoHost {
  readonly model: ModuxModel;
  menuEntryIn(appId: string, itemId: string): {
    entry: UiMenuEntryRef;
    parentId: string | null;
    beforeId: string | null;
  } | null;
  rebuildComponentOps(
    pageId: string,
    node: UiComponentNodeRef,
    parentComponentId: string | undefined,
    beforeComponentId: string | null,
    fresh?: boolean,
    used?: Set<string>,
  ): { ops: ModuxCommand[]; rootId: string };
}

export function inverseOf(host: UndoHost, c: ModuxCommand): ModuxCommand[] | null {
    switch (c.kind) {
      case 'invert-archimate-relation':
        // Its own inverse: swapping the ends back restores the direction.
        return [{ kind: 'invert-archimate-relation', id: c.id }];
      case 'set-archimate-relation-nature': {
        const rel = (host.model.archimateRelations ?? []).find((r) => r.id === c.id);
        return rel ? [{ kind: 'set-archimate-relation-nature', id: c.id, nature: rel.nature ?? null }] : null;
      }
      case 'add-relation':
        return [{ kind: 'remove-relation', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-relation': {
        // Removing = clearing the type annotation; undo re-annotates.
        const rel = host.model.relations.find(
          (r) => r.sourceId === c.sourceId && r.targetId === c.targetId,
        );
        return rel && rel.type
          ? [{ kind: 'set-relation-type', sourceId: c.sourceId, targetId: c.targetId, type: rel.type }]
          : null;
      }
      case 'set-relation-type': {
        const rel = host.model.relations.find(
          (r) => r.sourceId === c.sourceId && r.targetId === c.targetId,
        );
        // Annotating an unannotated pair undoes to removing the annotation.
        return rel && rel.type
          ? [{ kind: 'set-relation-type', sourceId: c.sourceId, targetId: c.targetId, type: rel.type }]
          : [{ kind: 'remove-relation', sourceId: c.sourceId, targetId: c.targetId }];
      }
      case 'create-ui-app':
        return [{ kind: 'delete-ui-app', id: c.id }];
      case 'add-module':
        return [{ kind: 'remove-module', id: c.id }];
      case 'add-transformation':
        return [{ kind: 'remove-transformation', id: c.id }];
      case 'add-custom-code':
        return [{ kind: 'remove-custom-code', id: c.id }];
      case 'add-button-group':
        return [{ kind: 'remove-button-group', id: c.id }];
      case 'add-workflow-gateway':
        return [{ kind: 'remove-workflow-gateway', id: c.id }];
      case 'add-model-field':
        return [{ kind: 'remove-model-field', modelId: c.modelId, fieldId: c.fieldId }];
      case 'create-ui-page':
        return [{ kind: 'delete-ui-page', id: c.id }];
      case 'set-app-header-page': {
        const app = (host.model.uiApps ?? []).find((x) => x.id === c.appId);
        return [{ kind: 'set-app-header-page', appId: c.appId, pageId: app?.headerPageId ?? null }];
      }
      case 'set-app-model': {
        const app = (host.model.uiApps ?? []).find((x) => x.id === c.appId);
        return [{ kind: 'set-app-model', appId: c.appId, modelId: app?.modelId ?? null }];
      }
      case 'add-model':
        return [{ kind: 'remove-model', id: c.id }];
      case 'add-mockup':
        return [{ kind: 'delete-mockup', id: c.id }];
      case 'delete-mockup': {
        const mk = (host.model.mockups ?? []).find((x) => x.id === c.id);
        return mk ? [{ kind: 'add-mockup', id: mk.id, name: mk.name, pageId: mk.pageId }] : null;
      }
      case 'set-mockup-page': {
        const mk = (host.model.mockups ?? []).find((x) => x.id === c.id);
        return mk ? [{ kind: 'set-mockup-page', id: c.id, pageId: mk.pageId ?? null }] : null;
      }
      case 'add-model-mapping':
        return [{ kind: 'remove-model-mapping', id: c.id }];
      case 'remove-model-mapping': {
        const mm = (host.model.modelMappings ?? []).find((x) => x.id === c.id);
        if (!mm?.sourceModelId || !mm.targetModelId) return null;
        return [{
          kind: 'add-model-mapping',
          id: mm.id,
          name: mm.name,
          sourceId: mm.sourceModelId,
          targetId: mm.targetModelId,
        }];
      }
      case 'remove-model': {
        const mo = (host.model.models ?? []).find((x) => x.id === c.id);
        if (!mo) return null;
        const ops: ModuxCommand[] = [{ kind: 'add-model', id: mo.id, name: mo.name }];
        // re-wire whoever used it as viewmodel (fields stay CRUD territory)
        for (const pg of host.model.pages ?? []) {
          if (pg.modelId === c.id) ops.push({ kind: 'set-page-model', pageId: pg.id, modelId: c.id });
          const walk = (items?: UiComponentNodeRef[]) => {
            for (const it of items ?? []) {
              if (it.modelId === c.id) {
                ops.push({ kind: 'set-page-component', pageId: pg.id, componentId: it.id, modelId: c.id });
              }
              walk(it.children);
            }
          };
          walk(pg.content);
        }
        for (const app of host.model.uiApps ?? []) {
          if (app.modelId === c.id) ops.push({ kind: 'set-app-model', appId: app.id, modelId: c.id });
        }
        return ops;
      }
      case 'set-crud-detail':
      case 'set-crud-create': {
        const pg = (host.model.pages ?? []).find((x) => x.id === c.pageId);
        const detail = c.kind === 'set-crud-detail';
        return [{
          kind: c.kind,
          pageId: c.pageId,
          targetId: (detail ? pg?.crudDetailPageId : pg?.crudCreatePageId) ?? null,
          toAppId: (detail ? pg?.crudDetailAppId : pg?.crudCreateAppId) ?? null,
        }];
      }
      case 'set-app-view-page': {
        const app = (host.model.uiApps ?? []).find((x) => x.id === c.appId);
        return [{ kind: 'set-app-view-page', appId: c.appId, pageId: app?.viewPageId ?? null }];
      }
      case 'set-app-edit-page': {
        const app = (host.model.uiApps ?? []).find((x) => x.id === c.appId);
        return [{ kind: 'set-app-edit-page', appId: c.appId, pageId: app?.editPageId ?? null }];
      }
      case 'set-app-home-page': {
        const app = (host.model.uiApps ?? []).find((x) => x.id === c.appId);
        return [{
          kind: 'set-app-home-page',
          appId: c.appId,
          pageId: app?.homePageId ?? null,
          toAppId: app?.homeAppId ?? null,
        }];
      }
      case 'add-page-wizard-step':
        return [{ kind: 'remove-page-wizard-step', pageId: c.pageId, targetId: c.itemId ?? c.targetId! }];
      case 'set-wizard-step-page': {
        const step = ((host.model.pages ?? []).find((pg) => pg.id === c.pageId)?.wizardSteps ?? [])
          .find((s) => (s.id ?? s.pageId) === c.itemId);
        if (!step) return null;
        return [{ kind: 'set-wizard-step-page', pageId: c.pageId, itemId: c.itemId, targetId: step.pageId ?? null }];
      }
      case 'move-page-wizard-step': {
        const steps = ((host.model.pages ?? []).find((pg) => pg.id === c.pageId)?.wizardSteps ?? [])
          .map((s) => s.id ?? s.pageId!);
        const at = steps.indexOf(c.targetId);
        if (at < 0) return null;
        return [{
          kind: 'move-page-wizard-step',
          pageId: c.pageId,
          targetId: c.targetId,
          beforeItemId: steps[at + 1] ?? null,
        }];
      }
      case 'remove-page-wizard-step': {
        const step = ((host.model.pages ?? []).find((pg) => pg.id === c.pageId)?.wizardSteps ?? [])
          .find((s) => (s.id ?? s.pageId) === c.targetId);
        if (!step) return null;
        return [{
          kind: 'add-page-wizard-step',
          pageId: c.pageId,
          targetId: step.pageId ?? null,
          label: step.label,
          itemId: step.id,
        }];
      }
      case 'delete-ui-app': {
        const app = (host.model.uiApps ?? []).find((x) => x.id === c.id);
        if (!app) return null;
        const ops: ModuxCommand[] = [{ kind: 'create-ui-app', id: app.id, name: app.name, type: app.type }];
        if (app.headerPageId) {
          ops.push({ kind: 'set-app-header-page', appId: app.id, pageId: app.headerPageId });
        }
        if (app.modelId) {
          ops.push({ kind: 'set-app-model', appId: app.id, modelId: app.modelId });
        }
        if (app.viewPageId) {
          ops.push({ kind: 'set-app-view-page', appId: app.id, pageId: app.viewPageId });
        }
        if (app.editPageId) {
          ops.push({ kind: 'set-app-edit-page', appId: app.id, pageId: app.editPageId });
        }
        if (app.homePageId || app.homeAppId) {
          ops.push({
            kind: 'set-app-home-page',
            appId: app.id,
            pageId: app.homePageId ?? null,
            toAppId: app.homeAppId ?? null,
          });
        }
        const rebuildMenu = (items: UiMenuEntryRef[] | undefined, parent?: UiMenuEntryRef) => {
          for (const it of items ?? []) {
            ops.push({
              kind: 'add-menu-item',
              appId: app.id,
              label: it.label,
              itemId: it.id,
              parentId: parent?.id,
              parentLabel: parent && !parent.id ? parent.label : undefined,
              pageId: it.pageId ?? null,
            });
            if (it.uiAdapterId) {
              ops.push({ kind: 'set-menu-app', appId: app.id, toAppId: it.uiAdapterId, itemId: it.id, label: it.label });
            }
            if (it.useCaseId) {
              ops.push({ kind: 'set-menu-use-case', appId: app.id, useCaseId: it.useCaseId, itemId: it.id, label: it.label });
            }
            if (it.aggregateId) {
              ops.push({ kind: 'set-menu-aggregate', appId: app.id, aggregateId: it.aggregateId, itemId: it.id, label: it.label });
            }
            if (it.queryOperationId) {
              ops.push({
                kind: 'set-menu-query-operation',
                appId: app.id,
                queryServiceId: it.queryServiceId ?? null,
                queryOperationId: it.queryOperationId,
                itemId: it.id,
                label: it.label,
              });
            }
            rebuildMenu(it.children, it);
          }
        };
        rebuildMenu(app.menuItems);
        for (const u of host.model.actorAppUses ?? []) {
          if (u.appId === c.id) ops.push({ kind: 'add-actor-app', actorId: u.actorId, appId: c.id });
        }
        // menu entries of OTHER apps that pointed here are cleared server-side and stay so
        return ops;
      }
      case 'delete-ui-page': {
        const pg = (host.model.pages ?? []).find((x) => x.id === c.id);
        if (!pg) return null;
        const ops: ModuxCommand[] = [
          { kind: 'create-ui-page', id: pg.id, name: pg.name, pageType: pg.type ?? 'FORM' },
        ];
        if (pg.route) ops.push({ kind: 'set-page-route', pageId: pg.id, path: pg.route });
        if (pg.modelId) ops.push({ kind: 'set-page-model', pageId: pg.id, modelId: pg.modelId });
        if (pg.listingQueryServiceId) {
          ops.push({ kind: 'set-page-listing', pageId: pg.id, queryServiceId: pg.listingQueryServiceId });
        }
        for (const b of pg.buttons ?? []) {
          if (!b.useCaseId) continue;
          ops.push({ kind: 'add-page-button', pageId: pg.id, useCaseId: b.useCaseId, label: b.label });
          if (b.mappingId) {
            ops.push({
              kind: 'set-page-button',
              pageId: pg.id,
              useCaseId: b.useCaseId,
              label: b.label ?? null,
              mappingId: b.mappingId,
            });
          }
        }
        for (const f of pg.viewmodelFields ?? []) {
          if (f.stereotype || f.colspan || f.label) {
            ops.push({
              kind: 'set-page-field-config',
              pageId: pg.id,
              fieldId: f.fieldId,
              stereotype: f.stereotype ?? null,
              colspan: f.colspan ?? null,
              label: f.label ?? null,
            });
          }
        }
        if ((pg.viewmodelFields ?? []).length) {
          ops.push({
            kind: 'set-page-field-order',
            pageId: pg.id,
            fieldIds: (pg.viewmodelFields ?? []).map((f) => f.fieldId),
          });
        }
        for (const root of pg.content ?? []) {
          ops.push(...host.rebuildComponentOps(pg.id, root, undefined, null).ops);
        }
        for (const s of pg.wizardSteps ?? []) {
          ops.push({
            kind: 'add-page-wizard-step',
            pageId: pg.id,
            targetId: s.pageId ?? null,
            label: s.label,
            itemId: s.id,
          });
        }
        if (pg.crudDetailPageId || pg.crudDetailAppId) {
          ops.push({ kind: 'set-crud-detail', pageId: pg.id, targetId: pg.crudDetailPageId ?? null, toAppId: pg.crudDetailAppId ?? null });
        }
        if (pg.crudCreatePageId || pg.crudCreateAppId) {
          ops.push({ kind: 'set-crud-create', pageId: pg.id, targetId: pg.crudCreatePageId ?? null, toAppId: pg.crudCreateAppId ?? null });
        }
        // Menu entries pointing at the page are pruned server-side and stay pruned.
        return ops;
      }
      case 'add-menu-item':
        return [{ kind: 'remove-menu-item', appId: c.appId, itemId: c.itemId, label: c.label }];
      case 'remove-menu-item':
      case 'set-menu-page':
      case 'set-menu-app':
      case 'set-menu-use-case':
      case 'set-menu-aggregate':
      case 'set-menu-query-operation': {
        const app = (host.model.uiApps ?? []).find((a) => a.id === c.appId);
        const find = (items: UiMenuEntryRef[] | undefined): UiMenuEntryRef | null => {
          for (const it of items ?? []) {
            if (c.itemId ? it.id === c.itemId : it.label === c.label) return it;
            const hit = find(it.children);
            if (hit) return hit;
          }
          return null;
        };
        const entry = c.itemId || c.label ? find(app?.menuItems) : null;
        if (!entry) return null;
        if (c.kind === 'remove-menu-item') {
          return [{
            kind: 'add-menu-item',
            appId: c.appId,
            label: entry.label,
            pageId: entry.pageId ?? null,
            itemId: entry.id,
          }];
        }
        if (c.kind === 'set-menu-app') {
          return [{
            kind: 'set-menu-app',
            appId: c.appId,
            toAppId: entry.uiAdapterId ?? null,
            itemId: c.itemId,
            label: c.label,
          }];
        }
        if (c.kind === 'set-menu-use-case') {
          return [{
            kind: 'set-menu-use-case',
            appId: c.appId,
            useCaseId: entry.useCaseId ?? null,
            itemId: c.itemId,
            label: c.label,
          }];
        }
        if (c.kind === 'set-menu-aggregate') {
          return [{
            kind: 'set-menu-aggregate',
            appId: c.appId,
            aggregateId: entry.aggregateId ?? null,
            itemId: c.itemId,
            label: c.label,
          }];
        }
        if (c.kind === 'set-menu-query-operation') {
          return [{
            kind: 'set-menu-query-operation',
            appId: c.appId,
            queryServiceId: entry.queryServiceId ?? null,
            queryOperationId: entry.queryOperationId ?? null,
            itemId: c.itemId,
            label: c.label,
          }];
        }
        return [{
          kind: 'set-menu-page',
          appId: c.appId,
          pageId: entry.pageId ?? null,
          itemId: c.itemId,
          label: c.label,
        }];
      }
      case 'add-page-button':
        return [{ kind: 'remove-page-button', pageId: c.pageId, useCaseId: c.useCaseId }];
      case 'remove-page-button': {
        const page = (host.model.pages ?? []).find((x) => x.id === c.pageId);
        const button = (page?.buttons ?? []).find((b) => b.useCaseId === c.useCaseId);
        return button
          ? [{ kind: 'add-page-button', pageId: c.pageId, useCaseId: c.useCaseId, label: button.label }]
          : null;
      }
      case 'rename-ui-page': {
        const page = (host.model.pages ?? []).find((x) => x.id === c.pageId);
        return page ? [{ kind: 'rename-ui-page', pageId: c.pageId, name: page.name }] : null;
      }
      case 'set-page-type': {
        const page = (host.model.pages ?? []).find((x) => x.id === c.pageId);
        return page ? [{ kind: 'set-page-type', pageId: c.pageId, pageType: page.type ?? 'FORM' }] : null;
      }
      case 'set-page-route': {
        const page = (host.model.pages ?? []).find((x) => x.id === c.pageId);
        return page?.route ? [{ kind: 'set-page-route', pageId: c.pageId, path: page.route }] : null;
      }
      case 'set-page-button': {
        const page = (host.model.pages ?? []).find((x) => x.id === c.pageId);
        const button = (page?.buttons ?? []).find((b) => b.useCaseId === c.useCaseId);
        return button
          ? [{
              kind: 'set-page-button',
              pageId: c.pageId,
              useCaseId: c.useCaseId,
              label: button.label ?? null,
              mappingId: button.mappingId ?? null,
            }]
          : null;
      }
      case 'add-page-component':
        return [{ kind: 'remove-page-component', pageId: c.pageId, componentId: c.componentId }];
      case 'set-page-component':
      case 'remove-page-component':
      case 'move-page-component': {
        const hostEl = c.mockupId
          ? (host.model.mockups ?? []).find((x) => x.id === c.mockupId)
          : (host.model.pages ?? []).find((x) => x.id === c.pageId);
        let node: UiComponentNodeRef | null = null;
        let parent: UiComponentNodeRef | null = null;
        let before: string | null = null;
        const walk = (items: UiComponentNodeRef[] | undefined, up: UiComponentNodeRef | null) => {
          const list = items ?? [];
          for (let i = 0; i < list.length; i++) {
            if (list[i].id === c.componentId) {
              node = list[i];
              parent = up;
              before = list[i + 1]?.id ?? null;
            }
            walk(list[i].children, list[i]);
          }
        };
        walk(hostEl?.content, null);
        if (!node) return null;
        const found: UiComponentNodeRef = node;
        if (c.kind === 'set-page-component') {
          return [{
            kind: 'set-page-component',
            pageId: c.pageId,
            mockupId: c.mockupId,
            componentId: c.componentId,
            title: found.title ?? null,
            text: found.text ?? null,
            label: found.label ?? null,
            useCaseId: found.useCaseId ?? null,
            mappingId: found.mappingId ?? null,
            modelId: found.modelId ?? null,
            queryServiceId: found.queryServiceId ?? null,
            queryOperationId: found.queryOperationId ?? null,
            fieldId: found.fieldId ?? null,
            stereotype: found.stereotype ?? null,
            colspan: found.colspan ?? null,
          }];
        }
        if (c.kind === 'move-page-component') {
          return [{
            kind: 'move-page-component',
            pageId: c.pageId,
            mockupId: c.mockupId,
            componentId: c.componentId,
            parentComponentId: parent === null ? null : (parent as UiComponentNodeRef).id,
            beforeComponentId: before,
          }];
        }
        // remove: recreate the WHOLE subtree where it was (page hosts only for now).
        if (!c.pageId) {
          return [{ kind: 'add-page-component', mockupId: c.mockupId, componentId: found.id,
            componentKind: found.kind, parentComponentId: parent === null ? undefined : (parent as UiComponentNodeRef).id }];
        }
        return host.rebuildComponentOps(
          c.pageId,
          found,
          parent === null ? undefined : (parent as UiComponentNodeRef).id,
          before,
        ).ops;
      }
      case 'set-page-listing': {
        const page = (host.model.pages ?? []).find((x) => x.id === c.pageId);
        return [{ kind: 'set-page-listing', pageId: c.pageId, queryServiceId: page?.listingQueryServiceId ?? null }];
      }
      case 'set-page-model': {
        const page = (host.model.pages ?? []).find((x) => x.id === c.pageId);
        return [{ kind: 'set-page-model', pageId: c.pageId, modelId: page?.modelId ?? null }];
      }
      case 'set-page-field-config': {
        const field = ((host.model.pages ?? []).find((x) => x.id === c.pageId)?.viewmodelFields ?? [])
          .find((f) => f.fieldId === c.fieldId);
        return [{
          kind: 'set-page-field-config',
          pageId: c.pageId,
          fieldId: c.fieldId,
          stereotype: field?.stereotype ?? null,
          colspan: field?.colspan ?? null,
          label: field?.label ?? null,
        }];
      }
      case 'set-page-field-order': {
        const current = ((host.model.pages ?? []).find((x) => x.id === c.pageId)?.viewmodelFields ?? [])
          .map((f) => f.fieldId);
        return current.length ? [{ kind: 'set-page-field-order', pageId: c.pageId, fieldIds: current }] : null;
      }
      case 'move-menu-item': {
        const home = c.itemId ? host.menuEntryIn(c.appId, c.itemId) : null;
        return [{
          kind: 'move-menu-item',
          appId: c.toAppId,
          toAppId: c.appId,
          itemId: c.itemId,
          label: c.label,
          parentId: home?.parentId ?? undefined,
          beforeItemId: home?.beforeId ?? undefined,
        }];
      }
      case 'add-actor-app':
        return [{ kind: 'remove-actor-app', actorId: c.actorId, appId: c.appId }];
      case 'remove-actor-app':
        return [{ kind: 'add-actor-app', actorId: c.actorId, appId: c.appId }];
      case 'add-boundedContext':
        return [{ kind: 'remove-boundedContext', id: c.id }];
      case 'remove-boundedContext': {
        const m = host.model.boundedContexts.find((x) => x.id === c.id);
        if (!m) return null;
        const rels = host.model.relations.filter(
          (r) => (r.sourceId === c.id || r.targetId === c.id) && r.type != null,
        );
        return [
          { kind: 'add-boundedContext', id: m.id, name: m.name, subdomainType: m.subdomainType ?? 'GENERIC' },
          // Re-annotate the derived pairs this boundedContext participated in.
          ...rels.map(
            (r): ModuxCommand => ({
              kind: 'set-relation-type',
              sourceId: r.sourceId,
              targetId: r.targetId,
              type: r.type as NonNullable<typeof r.type>,
            }),
          ),
        ];
      }
      case 'add-system':
        return [{ kind: 'remove-system', id: c.id }];
      case 'add-archimate-element':
        return [{ kind: 'remove-archimate-element', id: c.id }];
      case 'remove-archimate-element': {
        const e = (host.model.archimateElements ?? []).find((x) => x.id === c.id);
        return e ? [{ kind: 'add-archimate-element', id: e.id, name: e.name, concept: e.concept }] : null;
      }
      case 'add-archimate-relation':
        return [{ kind: 'remove-archimate-relation', id: c.id }];
      case 'remove-archimate-relation': {
        const r = (host.model.archimateRelations ?? []).find((x) => x.id === c.id);
        return r ? [{ kind: 'add-archimate-relation', id: r.id, sourceId: r.sourceId, targetId: r.targetId, type: r.type, ...(r.label ? { name: r.label } : {}) }] : null;
      }
      case 'remove-system': {
        const s = (host.model.systems ?? []).find((x) => x.id === c.id);
        return s ? [{ kind: 'add-system', id: s.id, name: s.name, ...(s.parentSystemId ? { parentSystemId: s.parentSystemId } : {}) }] : null;
      }
      case 'set-context-system': {
        const m = host.model.boundedContexts.find((x) => x.id === c.id);
        return m ? [{ kind: 'set-context-system', id: c.id, parentSystemId: m.parentSystemId ?? null }] : null;
      }
      case 'set-system-parent': {
        const s = (host.model.systems ?? []).find((x) => x.id === c.id);
        return s ? [{ kind: 'set-system-parent', id: c.id, parentSystemId: s.parentSystemId ?? null }] : null;
      }
      case 'add-cdc':
        return [{ kind: 'remove-cdc', id: c.id }];
      case 'remove-cdc': {
        const cdc = (host.model.cdcs ?? []).find((x) => x.id === c.id);
        return cdc ? [{ kind: 'add-cdc', id: cdc.id, name: cdc.name }] : null;
      }
      case 'add-aggregate':
        return [{ kind: 'remove-aggregate', id: c.id }];
      case 'remove-aggregate': {
        const a = (host.model.aggregates ?? []).find((x) => x.id === c.id);
        return a ? [{ kind: 'add-aggregate', id: a.id, name: a.name, boundedContextId: a.boundedContextId }] : null;
      }
      case 'add-entity':
        return [{ kind: 'remove-entity', id: c.id, aggregateId: c.aggregateId }];
      case 'remove-entity': {
        const e = (host.model.entities ?? []).find((x) => x.id === c.id);
        return e ? [{ kind: 'add-entity', id: e.id, name: e.name, aggregateId: e.aggregateId }] : null;
      }
      case 'add-value-object':
        return [{ kind: 'remove-value-object', id: c.id, aggregateId: c.aggregateId }];
      case 'remove-value-object': {
        const v = (host.model.valueObjects ?? []).find((x) => x.id === c.id);
        return v
          ? [{ kind: 'add-value-object', id: v.id, name: v.name, aggregateId: v.aggregateId, type: v.type }]
          : null;
      }
      case 'add-operation':
        return [{ kind: 'remove-operation', id: c.id, aggregateId: c.aggregateId }];
      case 'remove-operation': {
        const owner = (host.model.aggregates ?? []).find((a) => (a.operations ?? []).some((o) => o.id === c.id));
        const op = owner?.operations?.find((o) => o.id === c.id);
        return owner && op
          ? [{ kind: 'add-operation', id: op.id, name: op.name, aggregateId: owner.id }]
          : null;
      }
      case 'set-value-object-aggregate': {
        const v = (host.model.valueObjects ?? []).find((x) => x.id === c.id);
        return v ? [{ kind: 'set-value-object-aggregate', id: c.id, aggregateId: v.aggregateId }] : null;
      }
      case 'set-entity-aggregate': {
        const e = (host.model.entities ?? []).find((x) => x.id === c.id);
        return e ? [{ kind: 'set-entity-aggregate', id: c.id, aggregateId: e.aggregateId }] : null;
      }
      case 'set-aggregate-context': {
        const a = (host.model.aggregates ?? []).find((x) => x.id === c.id);
        // boundedContextId is '' when free-standing; omit it so the inverse detaches again.
        return a ? [{ kind: 'set-aggregate-context', id: c.id, boundedContextId: a.boundedContextId || undefined }] : null;
      }
      case 'remove-model-field': {
        const f = fieldOwners(host).flatMap((o) => o.fields ?? []).find((x) => x.id === c.fieldId);
        return f
          ? [{ kind: 'add-model-field', modelId: c.modelId, fieldId: c.fieldId, name: f.name }]
          : null;
      }
      case 'set-model-field': {
        const f = fieldOwners(host).flatMap((o) => o.fields ?? []).find((x) => x.id === c.fieldId);
        return f ? [{ kind: 'set-model-field', modelId: c.modelId, fieldId: c.fieldId, name: f.name }] : null;
      }
      case 'set-model-field-type': {
        const f = fieldOwners(host).flatMap((o) => o.fields ?? []).find((x) => x.id === c.fieldId);
        return f
          ? [{ kind: 'set-model-field-type', modelId: c.modelId, fieldId: c.fieldId, type: f.typeKind, targetId: f.typeRef }]
          : null;
      }
      case 'set-model-field-required': {
        const f = fieldOwners(host).flatMap((o) => o.fields ?? []).find((x) => x.id === c.fieldId);
        return f
          ? [{ kind: 'set-model-field-required', modelId: c.modelId, fieldId: c.fieldId, required: f.required }]
          : null;
      }
      case 'set-model-field-collection': {
        const f = fieldOwners(host).flatMap((o) => o.fields ?? []).find((x) => x.id === c.fieldId);
        return f
          ? [{ kind: 'set-model-field-collection', modelId: c.modelId, fieldId: c.fieldId, collection: !!f.collection }]
          : null;
      }
      case 'add-invariant':
        return [{ kind: 'remove-invariant', id: c.id }];
      case 'set-invariant-condition': {
        const inv = [...(host.model.aggregates ?? []), ...(host.model.valueObjects ?? []), ...(host.model.entities ?? [])]
          .flatMap((o) => o.invariants ?? [])
          .find((i) => i.id === c.id);
        return inv
          ? [{ kind: 'set-invariant-condition', id: c.id, expression: inv.expression ?? '', errorMessage: inv.errorMessage ?? '' }]
          : null;
      }
      case 'remove-invariant': {
        const owners: { id: string; invariants?: { id: string; name: string }[] }[] = [
          ...(host.model.aggregates ?? []),
          ...(host.model.valueObjects ?? []),
          ...(host.model.entities ?? []),
        ];
        const owner = owners.find((o) => (o.invariants ?? []).some((i) => i.id === c.id));
        const inv = owner?.invariants?.find((i) => i.id === c.id);
        return owner && inv
          ? [{ kind: 'add-invariant', ownerId: owner.id, id: inv.id, name: inv.name }]
          : null;
      }
      case 'add-domain-event':
        return [{ kind: 'remove-domain-event', id: c.id }];
      case 'add-query-service':
        return [{ kind: 'remove-query-service', id: c.id }];
      case 'remove-query-service': {
        for (const m of host.model.boundedContexts) {
          const qs = (m.queryServices ?? []).find((x) => x.id === c.id);
          if (qs) return [{ kind: 'add-query-service', id: qs.id, name: qs.name, boundedContextId: m.id }];
        }
        return null;
      }
      case 'add-query-call':
        return [{ kind: 'remove-query-call', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-query-call':
        return [{ kind: 'add-query-call', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-actor-use':
        return [{ kind: 'remove-actor-use', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-actor-use':
        return [{ kind: 'add-actor-use', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-actor-external':
        return [{ kind: 'remove-actor-external', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-actor-external':
        return [{ kind: 'add-actor-external', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-external-dependency': {
        // Re-drawing with the other type RETYPES the edge — the inverse restores it.
        const prev = (host.model.externalSystemDependencies ?? []).find(
          (d) => d.sourceId === c.sourceId && d.targetId === c.targetId,
        );
        return prev
          ? [{ kind: 'add-external-dependency', sourceId: c.sourceId, targetId: c.targetId, type: prev.type }]
          : [{ kind: 'remove-external-dependency', sourceId: c.sourceId, targetId: c.targetId }];
      }
      case 'remove-external-dependency': {
        const prev = (host.model.externalSystemDependencies ?? []).find(
          (d) => d.sourceId === c.sourceId && d.targetId === c.targetId,
        );
        return [{ kind: 'add-external-dependency', sourceId: c.sourceId, targetId: c.targetId, type: prev?.type }];
      }
      case 'add-proxy-api':
        return [{ kind: 'remove-proxy-api', id: c.id }];
      case 'remove-proxy-api': {
        const px = (host.model.proxyApis ?? []).find((x) => x.id === c.id);
        return px
          ? [{
              kind: 'add-proxy-api',
              id: px.id,
              name: px.name,
              targetId: px.targetApiId,
              boundedContextId: px.publishedByExternalSystemId,
            }]
          : null;
      }
      case 'set-proxy-target': {
        const px = (host.model.proxyApis ?? []).find((x) => x.id === c.id);
        return px ? [{ kind: 'set-proxy-target', id: c.id, targetId: px.targetApiId ?? '' }] : null;
      }
      case 'add-api-implementation':
        return [{ kind: 'remove-api-implementation', apiId: c.apiId, boundedContextId: c.boundedContextId }];
      case 'remove-api-implementation':
        return [{ kind: 'add-api-implementation', apiId: c.apiId, boundedContextId: c.boundedContextId }];
      case 'add-proxy-operation-route':
        return [{
          kind: 'remove-proxy-operation-route',
          proxyId: c.proxyId,
          operationId: c.operationId,
          targetSiteId: c.targetSiteId,
        }];
      case 'remove-proxy-operation-route':
        return [{
          kind: 'add-proxy-operation-route',
          proxyId: c.proxyId,
          operationId: c.operationId,
          targetSiteId: c.targetSiteId,
        }];
      case 'add-external-operation-use':
        return [{
          kind: 'remove-external-operation-use',
          sourceId: c.sourceId,
          operationId: c.operationId,
          targetSiteId: c.targetSiteId,
        }];
      case 'remove-external-operation-use':
        return [{
          kind: 'add-external-operation-use',
          sourceId: c.sourceId,
          operationId: c.operationId,
          targetSiteId: c.targetSiteId,
        }];
      case 'set-api-operation-implementation': {
        const prev = (host.model.apiOperationImplementations ?? []).find(
          (w) => w.apiId === c.apiId && w.operationId === c.operationId && w.boundedContextId === c.boundedContextId,
        );
        return prev
          ? [{
              kind: 'set-api-operation-implementation',
              apiId: c.apiId,
              operationId: c.operationId,
              boundedContextId: c.boundedContextId,
              targetUseCaseId: prev.useCaseId,
            }]
          : [{
              kind: 'remove-api-operation-implementation',
              apiId: c.apiId,
              operationId: c.operationId,
              boundedContextId: c.boundedContextId,
            }];
      }
      case 'remove-api-operation-implementation': {
        const prev = (host.model.apiOperationImplementations ?? []).find(
          (w) => w.apiId === c.apiId && w.operationId === c.operationId && w.boundedContextId === c.boundedContextId,
        );
        return prev
          ? [{
              kind: 'set-api-operation-implementation',
              apiId: c.apiId,
              operationId: c.operationId,
              boundedContextId: c.boundedContextId,
              targetUseCaseId: prev.useCaseId,
            }]
          : null;
      }
      case 'set-api-publisher': {
        const el =
          (host.model.apis ?? []).find((a) => a.id === c.id) ??
          (host.model.proxyApis ?? []).find((px) => px.id === c.id);
        return el
          ? [{ kind: 'set-api-publisher', id: c.id, targetId: el.publishedByExternalSystemId ?? '' }]
          : null;
      }
      case 'add-actor-crud':
        return [{ kind: 'remove-actor-crud', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-actor-crud':
        return [{ kind: 'add-actor-crud', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-ui-crud':
        return [{ kind: 'remove-ui-crud', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-ui-crud':
        return [{ kind: 'add-ui-crud', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-external-crud':
        return [{ kind: 'remove-external-crud', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-external-crud':
        return [{ kind: 'add-external-crud', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-context-crud':
        return [{ kind: 'remove-context-crud', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-context-crud':
        return [{ kind: 'add-context-crud', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-use-case':
        return [{ kind: 'remove-use-case', id: c.id }];
      case 'set-use-case-context': {
        const owner = host.model.boundedContexts.find((mo) => (mo.useCases ?? []).some((u) => u.id === c.id));
        return [{ kind: 'set-use-case-context', id: c.id, boundedContextId: owner?.id }];
      }
      case 'add-loose-element':
        return [{ kind: 'remove-loose-element', id: c.id }];
      case 'remove-loose-element': {
        const le = (host.model.looseElements ?? []).find((e) => e.id === c.id);
        return le
          ? [{ kind: 'add-loose-element', id: le.id, name: le.name, elementType: le.elementType as 'operation' | 'invariant' | 'field' | 'use-case-step' }]
          : null;
      }
      case 'adopt-loose-element': {
        // Before adoption the loose record still holds name + type; the owner is on the command.
        const le = (host.model.looseElements ?? []).find((e) => e.id === c.id);
        if (!le) return null;
        const t = le.elementType;
        const remove: ModuxCommand =
          t === 'operation' ? { kind: 'remove-operation', id: c.id, aggregateId: c.ownerId }
            : t === 'use-case-step' ? { kind: 'remove-use-case-step', id: c.id, useCaseId: c.ownerId }
            : t === 'field' ? { kind: 'remove-model-field', modelId: c.ownerId, fieldId: c.id }
            : { kind: 'remove-invariant', id: c.id };
        return [remove, { kind: 'add-loose-element', id: c.id, name: le.name, elementType: t as 'operation' | 'invariant' | 'field' | 'use-case-step' }];
      }
      case 'remove-use-case': {
        for (const m of host.model.boundedContexts) {
          const u = (m.useCases ?? []).find((x) => x.id === c.id);
          if (u) {
            return [
              { kind: 'add-use-case', id: u.id, name: u.name, boundedContextId: m.id, policy: u.policy },
            ];
          }
        }
        return null;
      }
      case 'add-external-use-case':
        return [{ kind: 'remove-external-use-case', id: c.id }];
      case 'remove-external-use-case': {
        for (const x of host.model.externalSystems) {
          const u = (x.useCases ?? []).find((e) => e.id === c.id);
          if (u) {
            return [{ kind: 'add-external-use-case', id: u.id, name: u.name, boundedContextId: x.id }];
          }
        }
        return null;
      }
      case 'add-external-call':
        return [{ kind: 'remove-external-call', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-external-call':
        return [{ kind: 'add-external-call', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-external-uc-call':
        return [{ kind: 'remove-external-uc-call', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-external-uc-call':
        return [{ kind: 'add-external-uc-call', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-use-case-call':
        return [{ kind: 'remove-use-case-call', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-use-case-call':
        return [{ kind: 'add-use-case-call', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-use-case-step':
        return [{ kind: 'remove-use-case-step', useCaseId: c.useCaseId, id: c.id }];
      case 'add-notification':
        return [{ kind: 'remove-notification', id: c.id }];
      case 'remove-notification': {
        const n = (host.model.notifications ?? []).find((x) => x.id === c.id);
        if (!n?.ownerBoundedContextId) return null;
        const ops: ModuxCommand[] = [
          { kind: 'add-notification', id: n.id, name: n.name, boundedContextId: n.ownerBoundedContextId, type: (n.channels ?? [])[0] },
        ];
        if (n.eventId) ops.push({ kind: 'set-notification-event', id: n.id, targetId: n.eventId });
        for (const r of n.recipientRoleIds ?? []) ops.push({ kind: 'add-notification-recipient', id: n.id, roleId: r });
        return ops;
      }
      case 'set-notification-event': {
        const n = (host.model.notifications ?? []).find((x) => x.id === c.id);
        return [{ kind: 'set-notification-event', id: c.id, targetId: n?.eventId ?? null }];
      }
      case 'add-notification-recipient':
        return [{ kind: 'remove-notification-recipient', id: c.id, roleId: c.roleId }];
      case 'remove-notification-recipient':
        return [{ kind: 'add-notification-recipient', id: c.id, roleId: c.roleId }];
      case 'add-document':
        return [{ kind: 'remove-document', id: c.id }];
      case 'remove-document': {
        const d = (host.model.documents ?? []).find((x) => x.id === c.id);
        if (!d?.ownerBoundedContextId) return null;
        const ops: ModuxCommand[] = [
          { kind: 'add-document', id: d.id, name: d.name, boundedContextId: d.ownerBoundedContextId, type: d.kind },
        ];
        if (d.modelId) ops.push({ kind: 'set-document-model', id: d.id, modelId: d.modelId });
        if (d.queryServiceId) {
          ops.push({ kind: 'set-document-query', id: d.id, queryServiceId: d.queryServiceId, queryOperationId: d.queryOperationId ?? null });
        }
        return ops;
      }
      case 'set-document-model': {
        const d = (host.model.documents ?? []).find((x) => x.id === c.id);
        return [{ kind: 'set-document-model', id: c.id, modelId: d?.modelId ?? null }];
      }
      case 'set-document-query': {
        const d = (host.model.documents ?? []).find((x) => x.id === c.id);
        return [{ kind: 'set-document-query', id: c.id, queryServiceId: d?.queryServiceId ?? null, queryOperationId: d?.queryOperationId ?? null }];
      }
      case 'add-identity-provider':
        return [{ kind: 'remove-identity-provider', id: c.id }];
      case 'remove-identity-provider': {
        const idp = (host.model.identityProviders ?? []).find((x) => x.id === c.id);
        if (!idp) return null;
        const ops: ModuxCommand[] = [
          { kind: 'add-identity-provider', id: idp.id, name: idp.name, type: idp.type },
        ];
        if (idp.publishedByExternalSystemId) {
          ops.push({ kind: 'set-idp-publisher', id: idp.id, targetId: idp.publishedByExternalSystemId });
        }
        for (const mo of host.model.boundedContexts) {
          if (mo.identityProviderId === c.id) ops.push({ kind: 'set-identity-provider', id: mo.id, targetId: c.id });
        }
        for (const app of host.model.uiApps ?? []) {
          if (app.identityProviderId === c.id) ops.push({ kind: 'set-identity-provider', id: app.id, targetId: c.id });
        }
        for (const f of host.model.etlFlows ?? []) {
          if (f.identityProviderId === c.id) ops.push({ kind: 'set-identity-provider', id: f.id, targetId: c.id });
        }
        return ops;
      }
      case 'set-idp-publisher': {
        const idp = (host.model.identityProviders ?? []).find((x) => x.id === c.id);
        return [{ kind: 'set-idp-publisher', id: c.id, targetId: idp?.publishedByExternalSystemId ?? null }];
      }
      case 'set-identity-provider': {
        const prev =
          host.model.boundedContexts.find((mo) => mo.id === c.id)?.identityProviderId ??
          (host.model.uiApps ?? []).find((a2) => a2.id === c.id)?.identityProviderId ??
          (host.model.etlFlows ?? []).find((f) => f.id === c.id)?.identityProviderId ??
          null;
        return [{ kind: 'set-identity-provider', id: c.id, targetId: prev }];
      }
      case 'add-etl-flow':
        return [{ kind: 'remove-etl-flow', id: c.id }];
      case 'remove-etl-flow': {
        const flow = (host.model.etlFlows ?? []).find((f) => f.id === c.id);
        if (!flow) return null;
        if (!flow.ownerBoundedContextId) return null; // legacy ownerless flows: not rebuildable
        return [
          { kind: 'add-etl-flow', id: flow.id, name: flow.name, boundedContextId: flow.ownerBoundedContextId },
          ...(flow.steps ?? []).map((s): ModuxCommand => ({
            kind: 'add-etl-step',
            etlFlowId: flow.id,
            id: s.id,
            name: s.name,
            stepType: s.type,
            externalTableId: s.externalTableId,
            apiId: s.apiId,
            operationId: s.operationId,
            targetId: s.eventId,
            mappingId: s.mappingId,
          })),
        ];
      }
      case 'add-etl-step':
        return [{ kind: 'remove-etl-step', etlFlowId: c.etlFlowId, id: c.id }];
      case 'remove-etl-step': {
        const s = ((host.model.etlFlows ?? []).find((f) => f.id === c.etlFlowId)?.steps ?? [])
          .find((x) => x.id === c.id);
        if (!s) return null;
        return [{
          kind: 'add-etl-step',
          etlFlowId: c.etlFlowId,
          id: s.id,
          name: s.name,
          stepType: s.type,
          externalTableId: s.externalTableId,
          apiId: s.apiId,
          operationId: s.operationId,
          targetId: s.eventId,
          mappingId: s.mappingId,
        }];
      }
      case 'add-scheduled-trigger':
        return [{ kind: 'remove-scheduled-trigger', id: c.id }];
      case 'remove-scheduled-trigger': {
        const owner = host.model.boundedContexts.find((mo) =>
          (mo.scheduledTriggers ?? []).some((t) => t.id === c.id),
        );
        const t = (owner?.scheduledTriggers ?? []).find((x) => x.id === c.id);
        if (!owner || !t) return null;
        return [{
          kind: 'add-scheduled-trigger',
          id: t.id,
          name: t.name,
          boundedContextId: owner.id,
          cronExpression: t.cronExpression,
          targetUseCaseId: t.useCaseId,
        }];
      }
      case 'set-scheduled-trigger-target': {
        const t = host.model.boundedContexts
          .flatMap((mo) => mo.scheduledTriggers ?? [])
          .find((x) => x.id === c.id);
        if (!t) return null;
        return [{ kind: 'set-scheduled-trigger-target', id: c.id, targetUseCaseId: t.useCaseId ?? null }];
      }
      case 'add-aggregate-call':
        return [{ kind: 'remove-aggregate-call', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-aggregate-call':
        return [{ kind: 'add-aggregate-call', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-emission':
        return [{ kind: 'remove-emission', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-emission':
        return [{ kind: 'add-emission', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-external-system':
        return [{ kind: 'remove-external-system', id: c.id }];
      case 'remove-external-system': {
        const x = host.model.externalSystems.find((e) => e.id === c.id);
        return x ? [{ kind: 'add-external-system', id: x.id, name: x.name }] : null;
      }
      case 'add-ai-agent':
        return [{ kind: 'remove-ai-agent', id: c.id }];
      case 'remove-ai-agent': {
        const a = (host.model.aiAgents ?? []).find((x) => x.id === c.id);
        if (!a) return null;
        // Removing an agent unlinks it everywhere; the inverse restores every link.
        return [
          { kind: 'add-ai-agent', id: a.id, name: a.name, external: a.external },
          ...(host.model.agentUses ?? [])
            .filter((u) => u.agentId === c.id)
            .map((u): ModuxCommand => ({ kind: 'add-agent-use', sourceId: c.id, targetId: u.useCaseId })),
          ...(host.model.agentExternalUses ?? [])
            .filter((u) => u.agentId === c.id)
            .map((u): ModuxCommand => ({
              kind: 'add-agent-external-use',
              sourceId: c.id,
              targetId: u.externalUseCaseId,
            })),
          ...(host.model.agentMcpUses ?? [])
            .filter((u) => u.agentId === c.id)
            .map((u): ModuxCommand => ({ kind: 'add-agent-mcp', sourceId: c.id, targetId: u.mcpServerId })),
          ...(host.model.agentGatewayUses ?? [])
            .filter((u) => u.agentId === c.id)
            .map((u): ModuxCommand => ({ kind: 'add-agent-gateway', sourceId: c.id, targetId: u.gatewayId })),
          ...(host.model.agentApiOpUses ?? [])
            .filter((u) => u.agentId === c.id)
            .map((u): ModuxCommand => ({
              kind: 'add-agent-api-operation',
              sourceId: c.id,
              targetId: u.apiOperationId,
            })),
          ...(host.model.agentQueryUses ?? [])
            .filter((u) => u.agentId === c.id)
            .map((u): ModuxCommand => ({ kind: 'add-agent-query', sourceId: c.id, targetId: u.queryServiceId })),
          ...(host.model.agentRags ?? [])
            .filter((u) => u.agentId === c.id)
            .map((u): ModuxCommand => ({ kind: 'add-agent-rag', sourceId: c.id, targetId: u.ragId })),
          ...(host.model.agentDelegations ?? [])
            .filter((u) => u.agentId === c.id || u.delegateAgentId === c.id)
            .map((u): ModuxCommand => ({
              kind: 'add-agent-delegate',
              sourceId: u.agentId,
              targetId: u.delegateAgentId,
            })),
          ...(host.model.actorAgentUses ?? [])
            .filter((u) => u.agentId === c.id)
            .map((u): ModuxCommand => ({ kind: 'add-actor-agent', sourceId: u.actorId, targetId: c.id })),
          ...(host.model.agentTriggers ?? [])
            .filter((u) => u.agentId === c.id)
            .map((u): ModuxCommand => ({ kind: 'add-agent-trigger', sourceId: u.eventId, targetId: c.id })),
        ];
      }
      case 'add-mcp-gateway':
        return [{ kind: 'remove-mcp-gateway', id: c.id }];
      case 'remove-mcp-gateway': {
        const g = (host.model.mcpGateways ?? []).find((x) => x.id === c.id);
        if (!g) return null;
        // The inverse restores the gateway, its exposures and its agent links.
        return [
          { kind: 'add-mcp-gateway', id: g.id, name: g.name },
          ...[
            ...(g.mcpServerIds ?? []),
            ...(g.apiIds ?? []),
            ...(g.apiOperationIds ?? []),
            ...(g.useCaseIds ?? []),
            ...(g.ragIds ?? []),
          ].map((t): ModuxCommand => ({ kind: 'add-gateway-exposure', sourceId: c.id, targetId: t })),
          ...(host.model.agentGatewayUses ?? [])
            .filter((u) => u.gatewayId === c.id)
            .map((u): ModuxCommand => ({ kind: 'add-agent-gateway', sourceId: u.agentId, targetId: c.id })),
        ];
      }
      case 'add-gateway-exposure':
        return [{ kind: 'remove-gateway-exposure', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-gateway-exposure':
        return [{ kind: 'add-gateway-exposure', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-agent-gateway':
        return [{ kind: 'remove-agent-gateway', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-agent-gateway':
        return [{ kind: 'add-agent-gateway', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-agent-api':
        return [{ kind: 'remove-agent-api', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-agent-api':
        return [{ kind: 'add-agent-api', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-agent-api-operation':
        return [{ kind: 'remove-agent-api-operation', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-agent-api-operation':
        return [{ kind: 'add-agent-api-operation', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-agent-query':
        return [{ kind: 'remove-agent-query', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-agent-query':
        return [{ kind: 'add-agent-query', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-agent-delegate':
        return [{ kind: 'remove-agent-delegate', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-agent-delegate':
        return [{ kind: 'add-agent-delegate', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-actor-agent':
        return [{ kind: 'remove-actor-agent', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-actor-agent':
        return [{ kind: 'add-actor-agent', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-agent-trigger':
        return [{ kind: 'remove-agent-trigger', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-agent-trigger':
        return [{ kind: 'add-agent-trigger', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-agent-use':
        return [{ kind: 'remove-agent-use', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-agent-use':
        return [{ kind: 'add-agent-use', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-agent-external-use':
        return [{ kind: 'remove-agent-external-use', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-agent-external-use':
        return [{ kind: 'add-agent-external-use', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-agent-mcp':
        return [{ kind: 'remove-agent-mcp', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-agent-mcp':
        return [{ kind: 'add-agent-mcp', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-mcp-server':
        return [{ kind: 'remove-mcp-server', id: c.id }];
      case 'remove-mcp-server': {
        for (const x of host.model.externalSystems) {
          const s = (x.mcpServers ?? []).find((e) => e.id === c.id);
          if (s) {
            // Removing the server also unlinks agents; the inverse restores the links.
            return [
              { kind: 'add-mcp-server', id: s.id, name: s.name, boundedContextId: x.id, uri: s.uri },
              ...(host.model.agentMcpUses ?? [])
                .filter((u) => u.mcpServerId === c.id)
                .map(
                  (u): ModuxCommand => ({
                    kind: 'add-agent-mcp',
                    sourceId: u.agentId,
                    targetId: c.id,
                  }),
                ),
            ];
          }
        }
        return null;
      }
      case 'add-rag':
        return [{ kind: 'remove-rag', id: c.id }];
      case 'remove-rag': {
        const r = (host.model.rags ?? []).find((x) => x.id === c.id);
        if (!r) return null;
        // Removing a rag also unlinks it everywhere; the inverse restores the links.
        return [
          { kind: 'add-rag', id: r.id, name: r.name },
          ...(host.model.agentRags ?? [])
            .filter((u) => u.ragId === c.id)
            .map(
              (u): ModuxCommand => ({
                kind: 'add-agent-rag',
                sourceId: u.agentId,
                targetId: c.id,
              }),
            ),
          ...(r.sourceReadModelIds ?? []).map(
            (rmId): ModuxCommand => ({ kind: 'add-rag-source', sourceId: c.id, targetId: rmId }),
          ),
        ];
      }
      case 'add-agent-rag':
        return [{ kind: 'remove-agent-rag', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-agent-rag':
        return [{ kind: 'add-agent-rag', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-rag-source':
        return [{ kind: 'remove-rag-source', sourceId: c.sourceId, targetId: c.targetId }];
      case 'remove-rag-source':
        return [{ kind: 'add-rag-source', sourceId: c.sourceId, targetId: c.targetId }];
      case 'add-actor':
        return [{ kind: 'remove-actor', id: c.id }];
      case 'remove-actor': {
        const a = (host.model.actors ?? []).find((x) => x.id === c.id);
        return a ? [{ kind: 'add-actor', id: a.id, name: a.name }] : null;
      }
      case 'add-note':
        return [{ kind: 'remove-note', id: c.id }];
      case 'remove-note': {
        const n = (host.model.notes ?? []).find((x) => x.id === c.id);
        if (!n) return null;
        // Undo restores the note AND its threads.
        return [
          { kind: 'add-note', id: n.id, name: n.text },
          ...[...(n.targetIds ?? []), ...(n.edgeRefs ?? [])].map(
            (t): ModuxCommand => ({ kind: 'note-attach', id: n.id, targetId: t }),
          ),
        ];
      }
      case 'note-attach':
        return [{ kind: 'note-detach', id: c.id, targetId: c.targetId }];
      case 'note-detach':
        return [{ kind: 'note-attach', id: c.id, targetId: c.targetId }];
      case 'add-area':
        return [{ kind: 'remove-area', id: c.id }];
      case 'add-url':
        return [{ kind: 'remove-url', id: c.id }];
      case 'remove-url': {
        const u = (host.model.urls ?? []).find((x) => x.id === c.id);
        if (!u) return null;
        return [
          { kind: 'add-url', id: u.id, name: u.name, uri: u.url },
          ...(host.model.services ?? [])
            .filter((sv) => (sv.urlIds ?? []).includes(c.id))
            .map((sv): ModuxCommand => ({ kind: 'add-service-url', serviceId: sv.id, id: c.id })),
        ];
      }
      case 'add-service-url':
        return [{ kind: 'remove-service-url', serviceId: c.serviceId, id: c.id }];
      case 'remove-service-url':
        return [{ kind: 'add-service-url', serviceId: c.serviceId, id: c.id }];
      case 'remove-area': {
        // Notes keep their (dangling) refs to the area, so restoring it revives the threads.
        const a = (host.model.areas ?? []).find((x) => x.id === c.id);
        return a ? [{ kind: 'add-area', id: a.id, name: a.name }] : null;
      }
      case 'add-application-event':
        return [{ kind: 'remove-application-event', id: c.id }];
      case 'remove-application-event': {
        for (const m of host.model.boundedContexts) {
          const ev = (m.applicationEvents ?? []).find((x) => x.id === c.id);
          if (ev) {
            return [{ kind: 'add-application-event', id: ev.id, name: ev.name, boundedContextId: m.id }];
          }
        }
        return null;
      }
      case 'add-integration-event':
        return [{ kind: 'remove-integration-event', id: c.id }];
      case 'remove-integration-event': {
        for (const m of host.model.boundedContexts) {
          const ev = (m.integrationEvents ?? []).find((x) => x.id === c.id);
          if (ev) {
            return [{ kind: 'add-integration-event', id: ev.id, name: ev.name, boundedContextId: m.id }];
          }
        }
        return null;
      }
      case 'add-domain-service':
        return [{ kind: 'remove-domain-service', id: c.id }];
      case 'remove-domain-service': {
        for (const m of host.model.boundedContexts) {
          const ds = (m.domainServices ?? []).find((x) => x.id === c.id);
          if (ds) return [{ kind: 'add-domain-service', id: ds.id, name: ds.name, boundedContextId: m.id }];
        }
        return null;
      }
      case 'add-read-model':
        return [{ kind: 'remove-read-model', id: c.id }];
      case 'add-projection':
        return [{ kind: 'remove-projection', id: c.id }];
      case 'remove-projection': {
        const p = (host.model.projections ?? []).find((x) => x.id === c.id);
        // Only source-declared projections are restorable from the canvas; the stub
        // read model survives the removal, so relinking by targetId suffices.
        return p && (p.sourceAggregateId || p.sourceExternalUseCaseId || p.sourceExternalTableId)
          ? [
              {
                kind: 'add-projection',
                id: p.id,
                name: p.name,
                aggregateId: p.sourceAggregateId,
                externalUseCaseId: p.sourceExternalUseCaseId,
                externalTableId: p.sourceExternalTableId,
                targetId: p.readModelId,
                boundedContextId: p.boundedContextId,
              },
            ]
          : null;
      }
      case 'add-external-table':
        return [{ kind: 'remove-external-table', id: c.id }];
      case 'remove-external-table': {
        for (const x of host.model.externalSystems) {
          const t = (x.tables ?? []).find((e) => e.id === c.id);
          if (t) return [{ kind: 'add-external-table', id: t.id, name: t.name, boundedContextId: x.id }];
        }
        return null;
      }
      case 'add-rag-content-source':
        return [{ kind: 'remove-rag-content-source', sourceId: c.sourceId, uri: c.uri }];
      case 'remove-rag-content-source': {
        const source = (host.model.rags ?? [])
          .find((r) => r.id === c.sourceId)
          ?.contentSources?.find((s) => s.uri === c.uri);
        return source
          ? [
              {
                kind: 'add-rag-content-source',
                sourceId: c.sourceId,
                type: source.type,
                uri: c.uri,
              },
            ]
          : null;
      }
      case 'add-view-member':
        return [{ kind: 'remove-view-member', id: c.id, targetId: c.targetId }];
      case 'remove-view-member':
        return [{ kind: 'add-view-member', id: c.id, targetId: c.targetId }];
      case 'add-api':
        return [{ kind: 'remove-api', id: c.id }];
      case 'remove-api': {
        const api = (host.model.apis ?? []).find((x) => x.id === c.id);
        return api
          ? [
              { kind: 'add-api', id: api.id, name: api.name },
              ...api.operations.map(
                (op): ModuxCommand => ({
                  kind: 'add-api-operation',
                  apiId: api.id,
                  id: op.id,
                  name: op.name,
                  httpMethod: op.httpMethod,
                  path: op.path,
                  boundedContextId: op.targetBoundedContextId,
                  targetUseCaseId: op.targetUseCaseId,
                }),
              ),
            ]
          : null;
      }
      case 'add-api-operation':
        return [{ kind: 'remove-api-operation', apiId: c.apiId, id: c.id }];
      case 'remove-api-operation': {
        const op = (host.model.apis ?? [])
          .find((x) => x.id === c.apiId)
          ?.operations.find((o) => o.id === c.id);
        return op
          ? [
              {
                kind: 'add-api-operation',
                apiId: c.apiId,
                id: op.id,
                name: op.name,
                httpMethod: op.httpMethod,
                path: op.path,
                boundedContextId: op.targetBoundedContextId,
                targetUseCaseId: op.targetUseCaseId,
              },
            ]
          : null;
      }
      case 'set-api-operation-target': {
        const op = (host.model.apis ?? [])
          .find((x) => x.id === c.apiId)
          ?.operations.find((o) => o.id === c.id);
        return op
          ? [
              {
                kind: 'set-api-operation-target',
                apiId: c.apiId,
                id: c.id,
                boundedContextId: op.targetBoundedContextId,
                targetUseCaseId: op.targetUseCaseId,
              },
            ]
          : null;
      }
      case 'remove-read-model': {
        for (const m of host.model.boundedContexts) {
          const rm = (m.readModels ?? []).find((x) => x.id === c.id);
          if (rm?.aggregateId) {
            return [{ kind: 'add-read-model', id: rm.id, name: rm.name, aggregateId: rm.aggregateId }];
          }
        }
        return null;
      }
      case 'remove-domain-event': {
        for (const m of host.model.boundedContexts) {
          const ev = (m.domainEvents ?? []).find((x) => x.id === c.id);
          if (ev) return [{ kind: 'add-domain-event', id: ev.id, name: ev.name, boundedContextId: m.id }];
        }
        return null;
      }
      case 'rename-element': {
        const list =
          c.type === 'boundedContext'
            ? host.model.boundedContexts
            : c.type === 'aggregate'
              ? host.model.aggregates ?? []
              : c.type === 'domain-event'
                ? host.model.boundedContexts.flatMap((m) => m.domainEvents ?? [])
                : c.type === 'read-model'
                  ? host.model.boundedContexts.flatMap((m) => m.readModels ?? [])
                  : c.type === 'domain-service'
                    ? host.model.boundedContexts.flatMap((m) => m.domainServices ?? [])
                    : c.type === 'query-service'
                      ? host.model.boundedContexts.flatMap((m) => m.queryServices ?? [])
                      : c.type === 'use-case'
                        ? host.model.boundedContexts.flatMap((m) => m.useCases ?? [])
                        : c.type === 'external-use-case'
                          ? host.model.externalSystems.flatMap((x) => x.useCases ?? [])
                          : c.type === 'mcp-server'
                            ? host.model.externalSystems.flatMap((x) => x.mcpServers ?? [])
                      : c.type === 'application-event'
                        ? host.model.boundedContexts.flatMap((m) => m.applicationEvents ?? [])
                        : c.type === 'external-system'
                          ? host.model.externalSystems
                          : c.type === 'actor'
                            ? host.model.actors ?? []
                            : c.type === 'ai-agent'
                              ? host.model.aiAgents ?? []
                              : c.type === 'mcp-gateway'
                                ? host.model.mcpGateways ?? []
                              : host.model.entities ?? [];
        const el = (list as { id: string; name: string }[]).find((x) => x.id === c.id);
        return el ? [{ kind: 'rename-element', type: c.type, id: c.id, name: el.name }] : null;
      }
      case 'add-flow':
        return [{ kind: 'remove-flow', id: c.id }];
      case 'remove-flow': {
        const f = host.model.flows.find((x) => x.id === c.id);
        return f
          ? [
              {
                kind: 'add-flow',
                id: f.id,
                name: f.name,
                archetype: f.archetype,
                triggerAggregateId: f.triggerAggregateId ?? '',
                triggerEvent: f.triggerEvent ?? '',
                targetId: f.targetId,
                readModelName: f.readModelName,
                targetUseCaseId: f.targetUseCaseId,
              },
            ]
          : null;
      }
      case 'add-view':
        return [{ kind: 'remove-view', id: c.id }];
      case 'remove-view': {
        const v = (host.model.views ?? []).find((x) => x.id === c.id);
        return v ? [{ kind: 'add-view', id: v.id, name: v.name, memberIds: v.memberIds }] : null;
      }
      case 'add-process':
        return [{ kind: 'remove-process', id: c.id }];
      case 'add-process-step':
        return [{ kind: 'remove-process-step', processId: c.processId, id: c.id }];
      case 'remove-process-step': {
        const process = (host.model.processes ?? []).find((p) => p.id === c.processId);
        const index = process?.steps.findIndex((s) => s.id === c.id) ?? -1;
        if (!process || index < 0) return null;
        const step = process.steps[index];
        return [
          {
            kind: 'add-process-step',
            processId: c.processId,
            id: step.id,
            name: step.name,
            stepType: step.type,
            roleId: step.roleId,
            deadline: step.deadline,
            useCaseId: step.useCaseId,
            compensationUseCaseId: step.compensationUseCaseId,
            afterStepId: index > 0 ? process.steps[index - 1].id : undefined,
          },
        ];
      }
      case 'move-process-step': {
        const process = (host.model.processes ?? []).find((p) => p.id === c.processId);
        const index = process?.steps.findIndex((s) => s.id === c.id) ?? -1;
        if (!process || index < 0) return null;
        return [
          {
            kind: 'move-process-step',
            processId: c.processId,
            id: c.id,
            afterStepId: index > 0 ? process.steps[index - 1].id : undefined,
          },
        ];
      }
      case 'update-process-step': {
        const process = (host.model.processes ?? []).find((p) => p.id === c.processId);
        const step = process?.steps.find((s) => s.id === c.id);
        if (!step) return null;
        return [
          {
            kind: 'update-process-step',
            processId: c.processId,
            id: c.id,
            roleId: step.roleId,
            deadline: step.deadline,
            compensationUseCaseId: step.compensationUseCaseId,
          },
        ];
      }
      case 'remove-process': {
        const p = (host.model.processes ?? []).find((x) => x.id === c.id);
        return p
          ? [
              {
                kind: 'add-process',
                id: p.id,
                name: p.name,
                boundedContextId: p.ownerBoundedContextId ?? '',
                triggerAggregateId: p.triggerAggregateId,
                triggerEvent: p.triggerEvent,
                steps: p.steps,
              },
            ]
          : null;
      }
      case 'add-workflow':
        return [{ kind: 'remove-workflow', id: c.id }];
      case 'remove-workflow': {
        const w = (host.model.workflows ?? []).find((x) => x.id === c.id);
        return w
          ? [
              {
                kind: 'add-workflow',
                id: w.id,
                name: w.name,
                triggerAggregateId: w.triggerAggregateId,
                triggerDomainServiceId: w.triggerDomainServiceId,
                triggerUseCaseId: w.triggerUseCaseId,
                triggerEvent: w.triggerEvent,
                completionEventName: w.onCompletionEventName,
                workflowSteps: w.steps,
              },
            ]
          : null;
      }
      case 'add-workflow-step':
        return [{ kind: 'remove-workflow-step', workflowId: c.workflowId, id: c.id }];
      case 'remove-workflow-step': {
        const workflow = (host.model.workflows ?? []).find((x) => x.id === c.workflowId);
        const index = workflow?.steps.findIndex((s) => s.id === c.id) ?? -1;
        if (!workflow || index < 0) return null;
        const step = workflow.steps[index];
        return [
          {
            kind: 'add-workflow-step',
            workflowId: c.workflowId,
            id: step.id,
            name: step.name,
            emittedEventName: step.emittedEventName,
            targetUseCaseId: step.targetUseCaseId,
            completionEventName: step.completionEventName,
            dependsOnStepIds: step.dependsOnStepIds,
            afterStepId: index > 0 ? workflow.steps[index - 1].id : undefined,
          },
          // Removing a step also strips it from its dependents; restore those edges.
          ...workflow.steps
            .filter((s) => s.id !== c.id && (s.dependsOnStepIds ?? []).includes(c.id))
            .map(
              (s): ModuxCommand => ({
                kind: 'add-workflow-dependency',
                workflowId: c.workflowId,
                id: s.id,
                dependsOnStepId: c.id,
              }),
            ),
        ];
      }
      case 'update-workflow-step': {
        const workflow = (host.model.workflows ?? []).find((x) => x.id === c.workflowId);
        const step = workflow?.steps.find((s) => s.id === c.id);
        if (!step) return null;
        return [
          {
            kind: 'update-workflow-step',
            workflowId: c.workflowId,
            id: c.id,
            emittedEventName: step.emittedEventName,
            targetUseCaseId: step.targetUseCaseId,
            completionEventName: step.completionEventName,
          },
        ];
      }
      case 'set-workflow-trigger': {
        const wf = (host.model.workflows ?? []).find((w) => w.id === c.id);
        return wf
          ? [{
              kind: 'set-workflow-trigger',
              id: c.id,
              triggerEvent: wf.triggerEvent ?? '',
              triggerAggregateId: wf.triggerAggregateId,
              triggerDomainServiceId: wf.triggerDomainServiceId,
              triggerUseCaseId: wf.triggerUseCaseId,
            }]
          : null;
      }
      case 'add-workflow-dependency':
        return [
          {
            kind: 'remove-workflow-dependency',
            workflowId: c.workflowId,
            id: c.id,
            dependsOnStepId: c.dependsOnStepId,
          },
        ];
      case 'remove-workflow-dependency':
        return [
          {
            kind: 'add-workflow-dependency',
            workflowId: c.workflowId,
            id: c.id,
            dependsOnStepId: c.dependsOnStepId,
          },
        ];
    }
    return null;
}
