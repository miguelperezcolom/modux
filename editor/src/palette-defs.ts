/** The palette: what NEW elements exist, labelled and grouped for humans. */
import { t, type MessageKey } from './i18n/index.js';

/**
 * Section ids, in display order. They are lookup keys (an item's `group`), not display text:
 * render them through `paletteGroupLabel`.
 */
export const PALETTE_GROUPS = [
  'Estratégico', 'Dominio', 'Distribución', 'APIs', 'Sistema externo', 'IA',
  'Orquestación', 'UI', 'Modelos', 'Layouts', 'Componentes', 'Display',
  ];

const GROUP_KEYS: Record<string, MessageKey> = {
  'Estratégico': 'palette.group.strategic',
  'Dominio': 'palette.group.domain',
  'Distribución': 'palette.group.distribution',
  'APIs': 'palette.group.apis',
  'Sistema externo': 'palette.group.externalSystem',
  'IA': 'palette.group.ai',
  'Orquestación': 'palette.group.orchestration',
  'UI': 'palette.group.ui',
  'Modelos': 'palette.group.models',
  'Layouts': 'palette.group.layouts',
  'Componentes': 'palette.group.components',
  'Display': 'palette.group.display',
};

export interface PaletteItem {
  type: string;
  child?: boolean;
  symbol: string;
  color: string;
  /** Section id (one of PALETTE_GROUPS) the item renders under in the «New» tab. */
  group: string;
}

/** The translated header of a palette section. */
export function paletteGroupLabel(group: string): string {
  const key = GROUP_KEYS[group];
  return key ? t(key) : group;
}

/** The message key of an item's label: `palette.item.` + its type in camelCase. */
function itemKey(type: string): MessageKey {
  const [head, ...rest] = type.split(/[-:]/);
  return `palette.item.${head}${rest.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')}` as MessageKey;
}

/**
 * The translated label of a palette item, prefix included (e.g. «Layout · Vertical»). It is also
 * the default name of an element created from the item, in the UI language.
 */
export function paletteLabel(item: PaletteItem): string {
  return t(itemKey(item.type));
}

/** The label as the palette shows it: without the «Layout · » / «Component · » prefix. */
export function paletteShortLabel(item: PaletteItem): string {
  return paletteLabel(item).replace(/^(Layout|Componente|Component) · /, '');
}

export const PALETTE_NEW: PaletteItem[] = [
  { type: 'system', symbol: 'component', color: '#475569', group: 'Estratégico' },
  { type: 'boundedContext', symbol: 'component', color: '#94a3b8', group: 'Estratégico' },
  { type: 'actor', symbol: 'person', color: '#64748b', group: 'Estratégico' },
  { type: 'note', symbol: 'note', color: '#ca8a04', group: 'Estratégico' },
  { type: 'area', symbol: 'area', color: '#64748b', group: 'Estratégico' },
  { type: 'project-reference', symbol: 'component', color: '#334155', group: 'Estratégico' },
  { type: 'external-system', symbol: 'component', color: '#64748b', group: 'Estratégico' },
  { type: 'identity-provider', symbol: 'key', color: '#ca8a04', group: 'Estratégico' },
  { type: 'ai-agent', symbol: 'robot', color: '#9333ea', group: 'IA' },
  { type: 'external-ai-agent', symbol: 'robot', color: '#9333ea', group: 'IA' },
  { type: 'mcp-gateway', symbol: 'plug', color: '#7c3aed', group: 'IA' },
  { type: 'rag', symbol: 'lens', color: '#0e7490', group: 'IA' },
  { type: 'api', child: true, symbol: 'interface', color: '#4f46e5', group: 'APIs' },
  { type: 'proxy-api', symbol: 'interface', color: '#0e7490', group: 'APIs' },
  { type: 'workflow', symbol: 'process', color: '#6d28d9', group: 'Orquestación' },
  { type: 'workflow-step', child: true, symbol: 'gear', color: '#6d28d9', group: 'Orquestación' },
  { type: 'workflow-join', child: true, symbol: 'flow', color: '#6d28d9', group: 'Orquestación' },
  { type: 'workflow-split', child: true, symbol: 'flow', color: '#6d28d9', group: 'Orquestación' },
  { type: 'etl-flow', child: true, symbol: 'gear', color: '#0f766e', group: 'Orquestación' },
  { type: 'etl-transform', child: true, symbol: 'gear', color: '#0f766e', group: 'Orquestación' },
  { type: 'aggregate', child: true, symbol: 'aggregate', color: '#8b5cf6', group: 'Dominio' },
  { type: 'entity', child: true, symbol: 'entity', color: '#14b8a6', group: 'Dominio' },
  { type: 'value-object', child: true, symbol: 'value-object', color: '#a855f7', group: 'Dominio' },
  { type: 'field', child: true, symbol: 'field', color: '#64748b', group: 'Dominio' },
  { type: 'operation', child: true, symbol: 'operation', color: '#7c3aed', group: 'Dominio' },
  { type: 'invariant', child: true, symbol: 'shield', color: '#0f766e', group: 'Dominio' },
  { type: 'use-case', child: true, symbol: 'usecase', color: '#06b6d4', group: 'Dominio' },
  { type: 'use-case-step', child: true, symbol: 'gear', color: '#06b6d4', group: 'Dominio' },
  { type: 'policy', child: true, symbol: 'usecase', color: '#a855f7', group: 'Dominio' },
  { type: 'domain-event', child: true, symbol: 'event', color: '#f59e0b', group: 'Dominio' },
  { type: 'application-event', child: true, symbol: 'event', color: '#eab308', group: 'Dominio' },
  { type: 'integration-event', child: true, symbol: 'event', color: '#e11d48', group: 'Dominio' },
  { type: 'read-model', child: true, symbol: 'readmodel', color: '#10b981', group: 'Dominio' },
  { type: 'domain-service', child: true, symbol: 'gear', color: '#f43f5e', group: 'Dominio' },
  { type: 'query-service', child: true, symbol: 'lens', color: '#0284c7', group: 'Dominio' },
  { type: 'scheduled-trigger', child: true, symbol: 'clock', color: '#d97706', group: 'Dominio' },
  { type: 'notification', child: true, symbol: 'event', color: '#db2777', group: 'Dominio' },
  { type: 'document', child: true, symbol: 'readmodel', color: '#475569', group: 'Dominio' },
  { type: 'api-operation', child: true, symbol: 'usecase', color: '#4f46e5', group: 'APIs' },
  { type: 'external-use-case', child: true, symbol: 'usecase', color: '#64748b', group: 'Sistema externo' },
  { type: 'external-table', child: true, symbol: 'readmodel', color: '#a16207', group: 'Sistema externo' },
  { type: 'cdc', symbol: 'flow', color: '#0891b2', group: 'Sistema externo' },
  { type: 'mcp-server', child: true, symbol: 'robot', color: '#9333ea', group: 'Sistema externo' },
  { type: 'service', symbol: 'gear', color: '#334155', group: 'Distribución' },
  { type: 'module', child: true, symbol: 'component', color: '#334155', group: 'Distribución' },
  { type: 'url', symbol: 'interface', color: '#0e7490', group: 'Distribución' },
  { type: 'ui', symbol: 'interface', color: '#0ea5e9', group: 'UI' },
  { type: 'ui-app', symbol: 'component', color: '#0ea5e9', group: 'UI' },
  { type: 'ui-app-orchestrator', symbol: 'process', color: '#0ea5e9', group: 'UI' },
  { type: 'ui-app-masterdetail', symbol: 'component', color: '#0ea5e9', group: 'UI' },
  { type: 'ui-app-vieweditor', symbol: 'process', color: '#c026d3', group: 'UI' },
  { type: 'page', child: true, symbol: 'interface', color: '#0284c7', group: 'UI' },
  { type: 'mockup', symbol: 'interface', color: '#0ea5e9', group: 'UI' },
  { type: 'menu-item', child: true, symbol: 'process', color: '#0ea5e9', group: 'UI' },
  { type: 'button-group', symbol: 'usecase', color: '#0e7490', group: 'UI' },
  { type: 'ui-button', child: true, symbol: 'usecase', color: '#0e7490', group: 'UI' },
  { type: 'ui-page-crud', child: true, symbol: 'lens', color: '#0284c7', group: 'UI' },
  { type: 'ui-page-wizard', child: true, symbol: 'flow', color: '#0284c7', group: 'UI' },
  { type: 'ui-wizard-step', child: true, symbol: 'flow', color: '#7c3aed', group: 'UI' },
  { type: 'ui-model', symbol: 'readmodel', color: '#8b5cf6', group: 'UI' },
  { type: 'model-field', child: true, symbol: 'gear', color: '#a78bfa', group: 'Modelos' },
  { type: 'transformation', symbol: 'gear', color: '#ea580c', group: 'Modelos' },
  { type: 'custom-code', symbol: 'gear', color: '#0f172a', group: 'Modelos' },
  // Design: the Mateu layout vocabulary…
  { type: 'cmp:verticalLayout', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:horizontalLayout', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:formLayout', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:splitLayout', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:tabLayout', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:tab', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:accordionLayout', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:card', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:gridLayout', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:boardLayout', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:dashboardLayout', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:masterDetailLayout', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:foldoutLayout', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:carouselLayout', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:appLayout', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:section', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:zones', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:toolbar', symbol: 'usecase', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:pageHeader', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:hero', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:scoreboard', symbol: 'event', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:wizard', symbol: 'flow', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:app', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  // …and the components that live inside those layouts.
  { type: 'cmp:form', symbol: 'interface', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:listing', symbol: 'lens', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:crud', symbol: 'lens', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:filterBar', symbol: 'lens', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:button', symbol: 'usecase', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:fab', symbol: 'usecase', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:field', symbol: 'gear', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:menuBar', symbol: 'process', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:appContext', symbol: 'process', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:addOnPicker', symbol: 'usecase', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:paymentPicker', symbol: 'usecase', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:chat', symbol: 'person', color: '#0284c7', group: 'Componentes' },
  // The Mateu display vocabulary (design/figma/contract.json), read-only content.
  { type: 'cmp:text', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:metricCard', symbol: 'event', color: '#0284c7', group: 'Display' },
  { type: 'cmp:kpi', symbol: 'event', color: '#0284c7', group: 'Display' },
  { type: 'cmp:stat', symbol: 'event', color: '#0284c7', group: 'Display' },
  { type: 'cmp:notice', symbol: 'note', color: '#0284c7', group: 'Display' },
  { type: 'cmp:banner', symbol: 'note', color: '#0284c7', group: 'Display' },
  { type: 'cmp:calloutCard', symbol: 'note', color: '#0284c7', group: 'Display' },
  { type: 'cmp:bulletedList', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:statusList', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:checklist', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:fileList', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:separator', symbol: 'flow', color: '#0284c7', group: 'Display' },
  { type: 'cmp:entityHeader', symbol: 'person', color: '#0284c7', group: 'Display' },
  { type: 'cmp:emptyState', symbol: 'lens', color: '#0284c7', group: 'Display' },
  { type: 'cmp:skeleton', symbol: 'lens', color: '#0284c7', group: 'Display' },
  { type: 'cmp:progressBar', symbol: 'flow', color: '#0284c7', group: 'Display' },
  { type: 'cmp:progressSteps', symbol: 'flow', color: '#0284c7', group: 'Display' },
  { type: 'cmp:taskProgress', symbol: 'flow', color: '#0284c7', group: 'Display' },
  { type: 'cmp:meter', symbol: 'gear', color: '#0284c7', group: 'Display' },
  { type: 'cmp:timeline', symbol: 'clock', color: '#0284c7', group: 'Display' },
  { type: 'cmp:calendar', symbol: 'clock', color: '#0284c7', group: 'Display' },
  { type: 'cmp:kanban', symbol: 'process', color: '#0284c7', group: 'Display' },
  { type: 'cmp:gantt', symbol: 'process', color: '#0284c7', group: 'Display' },
  { type: 'cmp:trendChart', symbol: 'event', color: '#0284c7', group: 'Display' },
  { type: 'cmp:heatmap', symbol: 'event', color: '#0284c7', group: 'Display' },
  { type: 'cmp:funnel', symbol: 'event', color: '#0284c7', group: 'Display' },
  { type: 'cmp:orgChart', symbol: 'person', color: '#0284c7', group: 'Display' },
  { type: 'cmp:featureGrid', symbol: 'component', color: '#0284c7', group: 'Display' },
  { type: 'cmp:testimonials', symbol: 'person', color: '#0284c7', group: 'Display' },
  { type: 'cmp:faq', symbol: 'note', color: '#0284c7', group: 'Display' },
  { type: 'cmp:commentThread', symbol: 'person', color: '#0284c7', group: 'Display' },
  { type: 'cmp:comparisonCard', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:planningBoard', symbol: 'process', color: '#0284c7', group: 'Display' },
  { type: 'cmp:offerCard', symbol: 'note', color: '#0284c7', group: 'Display' },
  { type: 'cmp:pricingTable', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:processMonitor', symbol: 'gear', color: '#0284c7', group: 'Display' },
  { type: 'cmp:resourceGrid', symbol: 'component', color: '#0284c7', group: 'Display' },
  { type: 'cmp:taskQueue', symbol: 'process', color: '#0284c7', group: 'Display' },
  { type: 'cmp:ledger', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:markdown', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:breadcrumbs', symbol: 'flow', color: '#0284c7', group: 'Display' },
  ];
