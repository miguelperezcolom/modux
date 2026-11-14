import type { ModuxModel, UiAppRef, UiMenuEntryRef } from '../model.js';
import type { Scene, SceneNode, SceneEdge, DiagramLayout } from '../scene.js';
import { CONTAINER_INSET } from '../scene.js';
import { t } from '../i18n/index.js';

/**
 * UI view: the model of the user interface, Mateu-shaped. Apps (UiAdapter) are
 * containers holding their menu TREE; pages float free, wired from the menu
 * entries that open them; and every page shows its MVVM wiring: the viewmodel
 * (a Model playing that role), the use cases its buttons invoke and the query
 * service feeding its listing. Actors point at the apps they use.
 */

const APP_W = 250;
const ENTRY_H = 30;
const ENTRY_GAP = 6;
const INDENT = 16;
const PAGE_W = 190;
const PAGE_H = 60;
const CHIP_W = 170;
const CHIP_H = 44;

/** Unambiguous node id: entries with a stable id use it; pre-id entries use their label path. */
export function menuNodeId(appId: string, entry: UiMenuEntryRef, path: string[]): string {
  return entry.id ? `menu:${appId}:id:${entry.id}` : `menu:${appId}:p:${path.join('>')}`;
}

/** The inverse: what a menu node id addresses (itemId when id-based, label when path-based). */
export function parseMenuNodeId(
  id: string,
): { appId: string; itemId?: string; label?: string } | null {
  const m = /^menu:([^:]+):(id|p):(.+)$/.exec(id);
  if (!m) return null;
  return m[2] === 'id'
    ? { appId: m[1], itemId: m[3] }
    : { appId: m[1], label: m[3].split('>').pop() };
}

/** Depth-first flatten of an app's menu tree, with the label path to each entry. */
export function flattenMenu(app: UiAppRef): { entry: UiMenuEntryRef; path: string[]; depth: number }[] {
  const out: { entry: UiMenuEntryRef; path: string[]; depth: number }[] = [];
  const walk = (items: UiMenuEntryRef[], prefix: string[], depth: number) => {
    for (const entry of items ?? []) {
      const path = [...prefix, entry.label];
      out.push({ entry, path, depth });
      walk(entry.children ?? [], path, depth + 1);
    }
  };
  walk(app.menuItems ?? [], [], 0);
  return out;
}

export function uiScene(
  model: ModuxModel,
  layout: DiagramLayout,
  expandedIds: ReadonlySet<string> = new Set(),
  expandAll = false,
): Scene {
  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];
  const apps = model.uiApps ?? [];
  const pages = model.pages ?? [];

  const useCaseName = (id: string) =>
    model.boundedContexts.flatMap((m) => m.useCases ?? []).find((u) => u.id === id)?.name ?? id;
  const queryName = (id: string) =>
    model.boundedContexts.flatMap((m) => m.queryServices ?? []).find((q) => q.id === id)?.name ?? id;

  const chipMeta = new Map<string, { label: string; kind: string; symbol: string; stroke: string }>();

  // ---- apps (Archi style): compact boxes; the chevron unfolds the menu tree
  // as free rows glued under the box, owned by it (slots keep the reorder drag).
  let appY = 160;
  for (const app of apps) {
    const entries = flattenMenu(app);
    const appExpanded = expandAll || expandedIds.has(app.id);
    const h = 90;
    const stackH = appExpanded ? entries.length * (ENTRY_H + ENTRY_GAP) : 0;
    const pos = layout[app.id] ?? { x: 190, y: appY + h / 2 };
    appY = pos.y + h / 2 + stackH + 70;
    const appType = app.type ?? 'APP';
    nodes.push({
      id: app.id,
      label: app.title || app.name,
      x: pos.x,
      y: pos.y,
      w: APP_W,
      h,
      kind: 'ui-app',
      symbol: appType === 'ORCHESTRATOR' || appType === 'VIEW_EDITOR' ? 'process' : 'component',
      fill: appType === 'ORCHESTRATOR' || appType === 'VIEW_EDITOR' ? '#fdf4ff' : '#f0f9ff',
      stroke: appType === 'ORCHESTRATOR' || appType === 'VIEW_EDITOR' ? '#c026d3' : '#0ea5e9',
      collapsible: entries.length > 0,
      collapsed: entries.length > 0 && !appExpanded,
      badge:
        appType === 'ORCHESTRATOR'
          ? t('views.ui.orchestratorBadge')
          : appType === 'MASTER_DETAIL'
            ? t('views.ui.masterDetailBadge')
            : appType === 'VIEW_EDITOR'
              ? t('views.ui.viewEditorBadge')
              : 'APP',
      // only a plain APP has a home; MD is header+tabs, the orchestrator only child pages
      extraHandles:
        appType === 'MASTER_DETAIL'
          ? [{ kind: 'header', title: t('views.ui.headerHandle'), color: '#0ea5e9' }]
          : appType === 'VIEW_EDITOR'
            ? [
                { kind: 'view', title: t('views.ui.viewHandle'), color: '#0891b2' },
                { kind: 'edit', title: t('views.ui.editHandle'), color: '#e11d48' },
              ]
            : appType === 'ORCHESTRATOR'
              ? undefined
              : [{ kind: 'home', title: t('views.ui.homeHandle'), color: '#16a34a' }],
      tooltip:
        appType === 'ORCHESTRATOR'
          ? t('views.ui.orchestratorTooltip', { name: app.name })
          : appType === 'MASTER_DETAIL'
            ? t('views.ui.masterDetailTooltip', { name: app.name })
            : t('views.ui.appTooltip', { name: app.name }),
    });
    if (app.modelId) {
      chipMeta.set(app.modelId, {
        label: (model.models ?? []).find((mo) => mo.id === app.modelId)?.name ?? app.modelId,
        kind: 'model',
        symbol: 'readmodel',
        stroke: '#8b5cf6',
      });
      edges.push({
        id: `appmodel:${app.id}->${app.modelId}`,
        sourceId: app.id,
        targetId: app.modelId,
        kind: 'app-model',
        label: t('views.ui.stateEdge'),
        color: '#8b5cf6',
        dashed: true,
        arrow: true,
        tooltip: t('views.ui.stateEdgeTooltip'),
      });
    }
    for (const [pid, kindName, label, color, tip] of [
      [app.viewPageId, 'app-view', t('views.ui.viewEdge'), '#0891b2', t('views.ui.viewEdgeTooltip')],
      [app.editPageId, 'app-edit', t('views.ui.editEdge'), '#e11d48', t('views.ui.editEdgeTooltip')],
    ] as const) {
      if (!pid) continue;
      edges.push({
        id: `${kindName === 'app-view' ? 'appview' : 'appedit'}:${app.id}->${pid}`,
        sourceId: app.id,
        targetId: pid,
        kind: kindName,
        color,
        label,
        arrow: true,
        tooltip: tip,
      });
    }
    const home = app.homePageId ?? app.homeAppId;
    if (home) {
      edges.push({
        id: `apphome:${app.id}->${home}`,
        sourceId: app.id,
        targetId: home,
        kind: 'app-home',
        color: '#16a34a',
        label: 'home',
        markerStart: 'ball',
        markerEnd: 'arrow',
        tooltip: app.homeAppId
          ? t('views.ui.homeAppTooltip')
          : t('views.ui.homePageTooltip'),
      });
    }
    if (appType === 'MASTER_DETAIL' && app.headerPageId) {
      edges.push({
        id: `appheader:${app.id}->${app.headerPageId}`,
        sourceId: app.id,
        targetId: app.headerPageId,
        kind: 'app-header',
        color: '#0ea5e9',
        label: t('views.ui.headerEdge'),
        arrow: true,
        tooltip: t('views.ui.headerEdgeTooltip'),
      });
    }
    let entryY = pos.y + h / 2 + CONTAINER_INSET + ENTRY_H / 2;
    for (const { entry, path, depth } of appExpanded ? entries : []) {
      const id = menuNodeId(app.id, entry, path);
      const indent = depth * INDENT;
      nodes.push({
        id,
        label: entry.label,
        x: pos.x + indent / 2,
        y: entryY,
        w: APP_W - CONTAINER_INSET * 2 - indent,
        h: ENTRY_H,
        // a parent entry is a pure grouper: it offers no handles and takes no target
        kind: entry.children?.length ? 'menu-group' : 'menu-item',
        symbol: 'process',
        fill: entry.children?.length ? '#f0f9ff' : '#ffffff',
        stroke: '#7dd3fc',
        ownerId: app.id,
        tooltip: entry.children?.length
          ? t('views.ui.menuGroupTooltip')
          : entry.pageId
            ? t('views.ui.menuOpensPage', { target: entry.pageId })
            : entry.uiAdapterId
              ? t('views.ui.menuOpensApp', { target: entry.uiAdapterId })
              : entry.useCaseId
                ? t('views.ui.menuLaunches', { target: entry.useCaseId })
                : entry.aggregateId
                  ? t('views.ui.menuCrud', { target: entry.aggregateId })
                  : entry.queryOperationId
                    ? t('views.ui.menuListing', { target: entry.queryOperationId })
                    : t('views.ui.menuNoTarget'),
      });
      entryY += ENTRY_H + ENTRY_GAP;
      if (entry.uiAdapterId && apps.some((a) => a.id === entry.uiAdapterId)) {
        edges.push({
          id: `menuapp:${id}->${entry.uiAdapterId}`,
          sourceId: id,
          targetId: entry.uiAdapterId,
          kind: 'menu-app',
          color: '#64748b',
          arrow: true,
        });
      }
      if (entry.useCaseId) {
        const known = model.boundedContexts.some((mod) => (mod.useCases ?? []).some((u) => u.id === entry.useCaseId));
        if (known) {
          chipMeta.set(entry.useCaseId, {
            label: useCaseName(entry.useCaseId),
            kind: 'use-case',
            symbol: 'usecase',
            stroke: '#06b6d4',
          });
          edges.push({
            id: `menuuc:${id}->${entry.useCaseId}`,
            sourceId: id,
            targetId: entry.useCaseId,
            kind: 'menu-use-case',
            color: '#06b6d4',
            dashed: true,
            arrow: true,
          });
        }
      }
      if (entry.aggregateId && (model.aggregates ?? []).some((a) => a.id === entry.aggregateId)) {
        const agg = (model.aggregates ?? []).find((a) => a.id === entry.aggregateId)!;
        chipMeta.set(agg.id, { label: agg.name, kind: 'aggregate', symbol: 'aggregate', stroke: '#8b5cf6' });
        edges.push({
          id: `menuagg:${id}->${agg.id}`,
          sourceId: id,
          targetId: agg.id,
          kind: 'menu-aggregate',
          label: 'CRUD',
          color: '#8b5cf6',
          dashed: true,
          arrow: true,
        });
      }
      if (entry.queryOperationId) {
        const qs = model.boundedContexts
          .flatMap((mod) => mod.queryServices ?? [])
          .find((x) => x.id === entry.queryServiceId);
        const op = (qs?.operations ?? []).find((o) => o.id === entry.queryOperationId);
        if (qs && op) {
          chipMeta.set(op.id, {
            label: `${op.name} (${qs.name})`,
            kind: 'query-operation',
            symbol: 'lens',
            stroke: '#0284c7',
          });
          edges.push({
            id: `menuqop:${id}->${op.id}`,
            sourceId: id,
            targetId: op.id,
            kind: 'menu-query-operation',
            label: t('views.ui.listingEdge'),
            color: '#0284c7',
            dashed: true,
            arrow: true,
          });
        }
      }
      if (entry.pageId && pages.some((p) => p.id === entry.pageId)) {
        edges.push({
          id: `menupage:${id}->${entry.pageId}`,
          sourceId: id,
          targetId: entry.pageId,
          kind: 'menu-page',
          color: '#64748b',
          markerStart: 'ball',
          markerEnd: 'arrow',
          tooltip: t('views.ui.menuPageEdge'),
        });
      }
    }
  }

  // ---- pages, each with its MVVM satellites -------------------------------
  let pageY = 160;
  const pageNameOf = (pid: string) => pages.find((x) => x.id === pid)?.name ?? pid;
  for (const page of pages) {
    const pos = layout[page.id] ?? { x: 640, y: pageY };
    const wizSteps = page.type === 'WIZARD' ? (page.wizardSteps ?? []) : [];
    // Archi style: the wizard folds its steps; expanded, they glue under the page.
    const pageExpanded = expandAll || expandedIds.has(page.id);
    const h = PAGE_H;
    const stackH = pageExpanded ? wizSteps.length * (ENTRY_H + ENTRY_GAP) : 0;
    pageY = pos.y + h + stackH + 90;
    nodes.push({
      id: page.id,
      label: page.name,
      x: pos.x,
      y: pos.y,
      w: PAGE_W,
      h,
      kind: 'page',
      symbol: 'interface',
      badge: page.customCodeId ? 'CODE' : page.type ?? 'PAGE',
      collapsible: wizSteps.length > 0,
      collapsed: wizSteps.length > 0 && !pageExpanded,
      extraHandles: [
        { kind: 'viewmodel', title: t('views.ui.viewmodelHandle'), color: '#8b5cf6' },
        ...(page.type === 'CRUD'
          ? [
              { kind: 'crud-detail', title: t('views.ui.crudDetailHandle'), color: '#ea580c' },
              { kind: 'crud-create', title: t('views.ui.crudCreateHandle'), color: '#0d9488' },
            ]
          : []),
      ],
      fill: '#ffffff',
      stroke: '#0284c7',
      tooltip: page.route ? `${page.type ?? 'PAGE'} · ${page.route}` : (page.type ?? 'PAGE'),
    });
    let stepY = pos.y + h / 2 + CONTAINER_INSET + ENTRY_H / 2;
    (pageExpanded ? wizSteps : []).forEach((step, i) => {
      const key = step.id ?? step.pageId ?? String(i);
      nodes.push({
        id: `wizrow:${page.id}:${key}`,
        label: `${i + 1}. ${step.label ?? (step.pageId ? pageNameOf(step.pageId) : t('views.ui.wizardStepFallback'))}${step.pageId ? '' : ' ⌁'}`,
        x: pos.x,
        y: stepY,
        w: PAGE_W - CONTAINER_INSET * 2,
        h: ENTRY_H,
        kind: 'wizard-step-row',
        symbol: 'flow',
        fill: step.pageId ? '#faf5ff' : '#ffffff',
        stroke: '#c4b5fd',
        ownerId: page.id,
        tooltip: step.pageId
          ? t('views.ui.wizardStepTooltip', { n: i + 1, page: pageNameOf(step.pageId) })
          : t('views.ui.wizardStepUnmapped', { n: i + 1 }),
      });
      stepY += ENTRY_H + ENTRY_GAP;
    });
    for (const [target, kindName, label, color] of [
      [page.crudDetailPageId ?? page.crudDetailAppId, 'crud-detail', t('views.ui.crudDetailEdge'), '#ea580c'],
      [page.crudCreatePageId ?? page.crudCreateAppId, 'crud-create', t('views.ui.crudCreateEdge'), '#0d9488'],
    ] as const) {
      if (!target) continue;
      edges.push({
        id: `${kindName === 'crud-detail' ? 'cruddetail' : 'crudnew'}:${page.id}->${target}`,
        sourceId: page.id,
        targetId: target,
        kind: kindName,
        color,
        label,
        dashed: true,
        arrow: true,
        tooltip: kindName === 'crud-detail' ? t('views.ui.crudDetailEdgeTooltip') : t('views.ui.crudCreateEdgeTooltip'),
      });
    }
    for (let i = 0; i < (page.wizardSteps ?? []).length; i++) {
      const step = (page.wizardSteps ?? [])[i];
      if (!step.pageId) continue;
      const key = step.id ?? step.pageId;
      // the line IS the mapping: it leaves the STEP row, not the wizard node
      edges.push({
        id: `wizstep:${page.id}:${key}`,
        sourceId: `wizrow:${page.id}:${key}`,
        targetId: step.pageId,
        kind: 'wizard-step',
        color: '#7c3aed',
        dashed: true,
        arrow: true,
        tooltip: t('views.ui.wizardStepEdge', { n: i + 1 }),
      });
    }
    if (page.modelId) {
      chipMeta.set(page.modelId, {
        label: page.modelName ?? page.modelId,
        kind: 'model',
        symbol: 'readmodel',
        stroke: '#8b5cf6',
      });
      edges.push({
        id: `pgmodel:${page.id}->${page.modelId}`,
        sourceId: page.id,
        targetId: page.modelId,
        kind: 'page-model',
        label: 'viewmodel',
        color: '#8b5cf6',
        dashed: true,
        arrow: true,
      });
    }
    for (const button of page.buttons ?? []) {
      if (!button.useCaseId) continue;
      chipMeta.set(button.useCaseId, {
        label: useCaseName(button.useCaseId),
        kind: 'use-case',
        symbol: 'usecase',
        stroke: '#06b6d4',
      });
      edges.push({
        id: `pgbtn:${page.id}->${button.useCaseId}`,
        sourceId: page.id,
        targetId: button.useCaseId,
        kind: 'page-button',
        label: button.label,
        color: '#06b6d4',
        dashed: true,
        arrow: true,
        tooltip: button.mappingId
          ? t('views.ui.buttonMapping', { label: button.label, mapping: button.mappingId })
          : t('views.ui.buttonNoMapping', { label: button.label }),
      });
    }
    if (page.listingQueryServiceId) {
      chipMeta.set(page.listingQueryServiceId, {
        label: queryName(page.listingQueryServiceId),
        kind: 'query-service',
        symbol: 'lens',
        stroke: '#0284c7',
      });
      edges.push({
        id: `pglist:${page.id}->${page.listingQueryServiceId}`,
        sourceId: page.id,
        targetId: page.listingQueryServiceId,
        kind: 'page-listing',
        label: t('views.ui.listingEdge'),
        color: '#0284c7',
        dashed: true,
        arrow: true,
      });
    }
  }

  // ---- button groups: reusable bars-to-be, hooked to pages by wiring ------
  const groups = model.buttonGroups ?? [];
  const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? id;
  let grpY = 520;
  for (const g of groups) {
    const buttons = g.buttons ?? [];
    const subs = g.groupIds ?? [];
    const rows = buttons.length + subs.length;
    const grpExpanded = expandAll || expandedIds.has(g.id);
    const pos = layout[g.id] ?? { x: 1000, y: grpY };
    const h = 70;
    const stackH = grpExpanded ? rows * (ENTRY_H + ENTRY_GAP) : 0;
    grpY = pos.y + h + stackH + 80;
    nodes.push({
      id: g.id,
      label: g.name,
      x: pos.x,
      y: pos.y,
      w: PAGE_W,
      h,
      kind: 'button-group',
      symbol: 'usecase',
      badge: t('views.ui.buttonGroupBadge'),
      collapsible: rows > 0,
      collapsed: rows > 0 && !grpExpanded,
      fill: '#ffffff',
      stroke: '#0e7490',
      extraHandles: [
        { kind: 'toolbar', title: t('views.ui.toolbarHandle'), color: '#0284c7' },
        { kind: 'bottom', title: t('views.ui.bottomBarHandle'), color: '#7c3aed' },
      ],
      tooltip: t('views.ui.buttonGroupTooltip', { name: g.name }),
    });
    let rowY = pos.y + h / 2 + CONTAINER_INSET + ENTRY_H / 2;
    for (const bt of grpExpanded ? buttons : []) {
      nodes.push({
        id: `gbtn:${g.id}:${bt.id}`,
        label: bt.label ?? bt.id,
        x: pos.x,
        y: rowY,
        w: PAGE_W - CONTAINER_INSET * 2,
        h: ENTRY_H,
        kind: 'group-button',
        symbol: 'usecase',
        fill: bt.useCaseId || bt.apiOperationId ? '#ecfeff' : '#ffffff',
        stroke: '#0e7490',
        dashed: !bt.useCaseId && !bt.apiOperationId,
        ownerId: g.id,
        tooltip: t('views.ui.groupButtonTooltip', { name: bt.label ?? bt.id }),
      });
      rowY += ENTRY_H + ENTRY_GAP;
    }
    for (const sub of grpExpanded ? subs : []) {
      nodes.push({
        id: `gsub:${g.id}:${sub}`,
        label: `▸ ${groupName(sub)}`,
        x: pos.x,
        y: rowY,
        w: PAGE_W - CONTAINER_INSET * 2,
        h: ENTRY_H,
        kind: 'group-subgroup',
        symbol: 'process',
        fill: '#f0fdfa',
        stroke: '#0e7490',
        ownerId: g.id,
        tooltip: t('views.ui.subgroupTooltip', { name: groupName(sub) }),
      });
      rowY += ENTRY_H + ENTRY_GAP;
    }
  }
  for (const g of groups) {
    for (const bt of g.buttons ?? []) {
      if (!bt.useCaseId) continue;
      const known = model.boundedContexts.some((mod) => (mod.useCases ?? []).some((u) => u.id === bt.useCaseId));
      if (!known) continue;
      chipMeta.set(bt.useCaseId, {
        label: useCaseName(bt.useCaseId),
        kind: 'use-case',
        symbol: 'usecase',
        stroke: '#06b6d4',
      });
      edges.push({
        id: `gbtnt:${g.id}:${bt.id}`,
        sourceId: `gbtn:${g.id}:${bt.id}`,
        targetId: bt.useCaseId,
        kind: 'gbtn-target',
        color: '#06b6d4',
        arrow: true,
        tooltip: t('views.ui.groupButtonEdge', { name: bt.label ?? bt.id }),
      });
    }
  }
  for (const page of pages) {
    const hooks: [string, string[]][] = [
      ['toolbar', page.toolbarGroupIds ?? []],
      ['botonera', page.bottomBarGroupIds ?? []],
    ];
    for (const [bar, ids] of hooks) {
      for (const gid of ids) {
        if (!groups.some((g) => g.id === gid)) continue;
        edges.push({
          id: `bargrp:${page.id}:${bar}:${gid}`,
          sourceId: gid,
          targetId: page.id,
          kind: 'bar-group',
          color: bar === 'toolbar' ? '#0284c7' : '#7c3aed',
          label: bar === 'toolbar' ? t('views.ui.toolbarEdge') : t('views.ui.bottomBarEdge'),
          dashed: true,
          arrow: true,
          tooltip: t(bar === 'toolbar' ? 'views.ui.toolbarGroupEdge' : 'views.ui.bottomBarGroupEdge', { page: page.name }),
        });
      }
    }
  }

  // referenced system pieces, drawn once as satellite chips
  let chipY = 160;
  for (const mo of model.models ?? []) {
    if (!chipMeta.has(mo.id)) {
      chipMeta.set(mo.id, { label: mo.name, kind: 'model', symbol: 'readmodel', stroke: '#8b5cf6' });
    }
  }
  for (const [id, meta] of chipMeta) {
    const pos = layout[id] ?? { x: 1050, y: chipY };
    chipY = pos.y + CHIP_H + 46;
    nodes.push({
      id,
      label: meta.label,
      x: pos.x,
      y: pos.y,
      w: CHIP_W,
      h: CHIP_H,
      kind: meta.kind,
      symbol: meta.symbol,
      fill: '#ffffff',
      stroke: meta.stroke,
    });
  }

  // ---- identity: the IdPs and who authenticates against them --------------
  let idpY = 120;
  for (const idp of model.identityProviders ?? []) {
    const pos = layout[idp.id] ?? { x: -320, y: idpY };
    idpY = pos.y + 70 + 40;
    nodes.push({
      id: idp.id,
      label: idp.name,
      x: pos.x,
      y: pos.y,
      w: 168,
      h: 52,
      kind: 'identity-provider',
      symbol: 'key',
      fill: idp.publishedByExternalSystemId ? '#ffffff' : '#fefce8',
      stroke: '#ca8a04',
      dashed: !!idp.publishedByExternalSystemId,
      badge: idp.type ?? 'IDP',
      tooltip: t('views.ui.idpTooltip', { name: idp.name }),
    });
  }
  for (const app of apps) {
    if (!app.identityProviderId) continue;
    if (!(model.identityProviders ?? []).some((x) => x.id === app.identityProviderId)) continue;
    edges.push({
      id: `idpauth:${app.id}`,
      sourceId: app.id,
      targetId: app.identityProviderId,
      kind: 'idp-auth',
      color: '#ca8a04',
      label: t('views.ui.authenticatesWith'),
      dashed: true,
      arrow: true,
      tooltip: t('views.ui.authEdgeTooltip'),
    });
  }

  // ---- actors → apps -------------------------------------------------------
  const uses = (model.actorAppUses ?? []).filter(
    (u) => apps.some((a) => a.id === u.appId) && (model.actors ?? []).some((a) => a.id === u.actorId),
  );
  const usedActorIds = [...new Set(uses.map((u) => u.actorId))];
  let actorY = 160;
  for (const actorId of usedActorIds) {
    const actor = (model.actors ?? []).find((a) => a.id === actorId)!;
    const pos = layout[actorId] ?? { x: -60, y: actorY };
    actorY = pos.y + CHIP_H + 46;
    nodes.push({
      id: actorId,
      label: actor.name,
      x: pos.x,
      y: pos.y,
      w: 150,
      h: CHIP_H,
      kind: 'actor',
      symbol: 'person',
      fill: '#ffffff',
      stroke: '#64748b',
    });
  }
  for (const use of uses) {
    edges.push({
      id: `actorapp:${use.actorId}->${use.appId}`,
      sourceId: use.actorId,
      targetId: use.appId,
      kind: 'actor-app',
      color: '#6366f1',
      arrow: true,
    });
  }

  // ---- custom code: hand-written pieces pages/components delegate to ------
  (model.customCodes ?? []).forEach((cc, i) => {
    const pos = layout[cc.id] ?? { x: 1200, y: 120 + i * 90 };
    nodes.push({
      id: cc.id,
      label: cc.name,
      x: pos.x,
      y: pos.y,
      w: 150,
      h: 44,
      kind: 'custom-code',
      symbol: 'gear',
      fill: '#f8fafc',
      stroke: '#0f172a',
      badge: 'CODE',
      dashed: true,
      tooltip: t('views.ui.customCodeTooltip', { name: cc.name }),
    });
  });
  const uiNodeIds = new Set(nodes.map((n) => n.id));
  for (const page of pages) {
    if (page.customCodeId && uiNodeIds.has(page.customCodeId)) {
      edges.push({
        id: `ccpage:${page.id}`,
        sourceId: page.customCodeId,
        targetId: page.id,
        kind: 'ui-custom-page',
        color: '#0f172a',
        dashed: true,
        arrow: true,
        tooltip: t('views.ui.customPageEdge', { name: page.name }),
      });
    }
  }
  for (const cc of model.customCodes ?? []) {
    for (const used of cc.usedElementIds ?? []) {
      if (!uiNodeIds.has(used)) continue;
      edges.push({
        id: `ccuse:${cc.id}->${used}`,
        sourceId: cc.id,
        targetId: used,
        kind: 'cc-uses',
        color: '#64748b',
        dashed: true,
        arrow: true,
        tooltip: t('views.ui.customCodeUses', { name: cc.name }),
      });
    }
  }

  // ── declared UIs: the interface the apps and pages REALIZE ────────────────
  (model.uis ?? []).forEach((u, i) => {
    const pos = layout[u.id] ?? { x: 120 + i * 220, y: 40 };
    nodes.push({
      id: u.id,
      label: u.name,
      x: pos.x,
      y: pos.y,
      w: 150,
      h: 44,
      kind: 'ui',
      symbol: 'interface',
      fill: '#f0f9ff',
      stroke: '#0ea5e9',
      badge: 'UI',
      tooltip: t('views.ui.uiTooltip', { name: u.name }),
    });
    for (const target of [...(u.appIds ?? []), ...(u.pageIds ?? [])]) {
      if (!nodes.some((n) => n.id === target)) continue;
      edges.push({
        id: `uiasg:${u.id}->${target}`,
        sourceId: target,
        targetId: u.id,
        kind: 'ui-assignment',
        color: '#0ea5e9',
        markerStart: 'ball',
        markerEnd: 'arrow',
        tooltip: t('views.ui.uiAssignmentEdge'),
      });
    }
    for (const actor of u.actorIds ?? []) {
      if (!nodes.some((n) => n.id === actor)) continue;
      edges.push({
        id: `uisrv:${u.id}->${actor}`,
        sourceId: u.id,
        targetId: actor,
        kind: 'ui-serving',
        color: '#0ea5e9',
        markerEnd: 'open-arrow',
        tooltip: t('views.ui.uiServingEdge'),
      });
    }
  });

  return { nodes, edges };
}
