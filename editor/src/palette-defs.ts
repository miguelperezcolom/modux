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
  /**
   * The element's base name in Spanish: it seeds the default NAME of a newly created element
   * (model content), so it is not translated. Display text comes from `paletteLabel`.
   */
  label: string;
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

/** The translated label of a palette item, prefix included (e.g. «Layout · Vertical»). */
export function paletteLabel(item: PaletteItem): string {
  return t(itemKey(item.type));
}

/** The label as the palette shows it: without the «Layout · » / «Component · » prefix. */
export function paletteShortLabel(item: PaletteItem): string {
  return paletteLabel(item).replace(/^(Layout|Componente|Component) · /, '');
}

export const PALETTE_NEW: PaletteItem[] = [
  { type: 'system', label: 'Sistema', symbol: 'component', color: '#475569', group: 'Estratégico' },
  { type: 'boundedContext', label: 'Contexto', symbol: 'component', color: '#94a3b8', group: 'Estratégico' },
  { type: 'actor', label: 'Actor', symbol: 'person', color: '#64748b', group: 'Estratégico' },
  { type: 'note', label: 'Nota', symbol: 'note', color: '#ca8a04', group: 'Estratégico' },
  { type: 'area', label: 'Área', symbol: 'area', color: '#64748b', group: 'Estratégico' },
  { type: 'project-reference', label: 'Otro proyecto modux', symbol: 'component', color: '#334155', group: 'Estratégico' },
  { type: 'external-system', label: 'Sistema externo', symbol: 'component', color: '#64748b', group: 'Estratégico' },
  { type: 'identity-provider', label: 'IdP (identidad)', symbol: 'key', color: '#ca8a04', group: 'Estratégico' },
  { type: 'ai-agent', label: 'Agente IA', symbol: 'robot', color: '#9333ea', group: 'IA' },
  { type: 'external-ai-agent', label: 'Agente IA externo', symbol: 'robot', color: '#9333ea', group: 'IA' },
  { type: 'mcp-gateway', label: 'Gateway MCP', symbol: 'plug', color: '#7c3aed', group: 'IA' },
  { type: 'rag', label: 'RAG', symbol: 'lens', color: '#0e7490', group: 'IA' },
  { type: 'api', label: 'API', child: true, symbol: 'interface', color: '#4f46e5', group: 'APIs' },
  { type: 'proxy-api', label: 'Proxy API', symbol: 'interface', color: '#0e7490', group: 'APIs' },
  { type: 'workflow', label: 'Workflow', symbol: 'process', color: '#6d28d9', group: 'Orquestación' },
  { type: 'workflow-step', label: 'Paso de workflow', child: true, symbol: 'gear', color: '#6d28d9', group: 'Orquestación' },
  { type: 'workflow-join', label: 'Join', child: true, symbol: 'flow', color: '#6d28d9', group: 'Orquestación' },
  { type: 'workflow-split', label: 'Split', child: true, symbol: 'flow', color: '#6d28d9', group: 'Orquestación' },
  { type: 'etl-flow', label: 'Flujo ETL (integrador)', child: true, symbol: 'gear', color: '#0f766e', group: 'Orquestación' },
  { type: 'etl-transform', label: 'Transformación ETL', child: true, symbol: 'gear', color: '#0f766e', group: 'Orquestación' },
  { type: 'aggregate', label: 'Agregado', child: true, symbol: 'aggregate', color: '#8b5cf6', group: 'Dominio' },
  { type: 'entity', label: 'Entidad', child: true, symbol: 'entity', color: '#14b8a6', group: 'Dominio' },
  { type: 'value-object', label: 'Value object', child: true, symbol: 'value-object', color: '#a855f7', group: 'Dominio' },
  { type: 'field', label: 'Campo', child: true, symbol: 'field', color: '#64748b', group: 'Dominio' },
  { type: 'operation', label: 'Operación', child: true, symbol: 'operation', color: '#7c3aed', group: 'Dominio' },
  { type: 'invariant', label: 'Invariante', child: true, symbol: 'shield', color: '#0f766e', group: 'Dominio' },
  { type: 'use-case', label: 'Caso de uso', child: true, symbol: 'usecase', color: '#06b6d4', group: 'Dominio' },
  { type: 'use-case-step', label: 'Paso de caso de uso', child: true, symbol: 'gear', color: '#06b6d4', group: 'Dominio' },
  { type: 'policy', label: 'Policy', child: true, symbol: 'usecase', color: '#a855f7', group: 'Dominio' },
  { type: 'domain-event', label: 'Evento de dominio', child: true, symbol: 'event', color: '#f59e0b', group: 'Dominio' },
  { type: 'application-event', label: 'Evento de aplicación', child: true, symbol: 'event', color: '#eab308', group: 'Dominio' },
  { type: 'integration-event', label: 'Evento de integración', child: true, symbol: 'event', color: '#e11d48', group: 'Dominio' },
  { type: 'read-model', label: 'Read model', child: true, symbol: 'readmodel', color: '#10b981', group: 'Dominio' },
  { type: 'domain-service', label: 'Servicio de dominio', child: true, symbol: 'gear', color: '#f43f5e', group: 'Dominio' },
  { type: 'query-service', label: 'Query service', child: true, symbol: 'lens', color: '#0284c7', group: 'Dominio' },
  { type: 'scheduled-trigger', label: 'Trigger programado', child: true, symbol: 'clock', color: '#d97706', group: 'Dominio' },
  { type: 'notification', label: 'Notificación', child: true, symbol: 'event', color: '#db2777', group: 'Dominio' },
  { type: 'document', label: 'Documento/Informe', child: true, symbol: 'readmodel', color: '#475569', group: 'Dominio' },
  { type: 'api-operation', label: 'Operación de API', child: true, symbol: 'usecase', color: '#4f46e5', group: 'APIs' },
  { type: 'external-use-case', label: 'Operación externa', child: true, symbol: 'usecase', color: '#64748b', group: 'Sistema externo' },
  { type: 'external-table', label: 'Tabla externa', child: true, symbol: 'readmodel', color: '#a16207', group: 'Sistema externo' },
  { type: 'cdc', label: 'CDC', symbol: 'flow', color: '#0891b2', group: 'Sistema externo' },
  { type: 'mcp-server', label: 'Servidor MCP', child: true, symbol: 'robot', color: '#9333ea', group: 'Sistema externo' },
  { type: 'service', label: 'Servicio (despliegue)', symbol: 'gear', color: '#334155', group: 'Distribución' },
  { type: 'module', label: 'Módulo', child: true, symbol: 'component', color: '#334155', group: 'Distribución' },
  { type: 'url', label: 'URL', symbol: 'interface', color: '#0e7490', group: 'Distribución' },
  { type: 'ui', label: 'UI', symbol: 'interface', color: '#0ea5e9', group: 'UI' },
  { type: 'ui-app', label: 'App', symbol: 'component', color: '#0ea5e9', group: 'UI' },
  { type: 'ui-app-orchestrator', label: 'Orquestador', symbol: 'process', color: '#0ea5e9', group: 'UI' },
  { type: 'ui-app-masterdetail', label: 'Maestro-detalle', symbol: 'component', color: '#0ea5e9', group: 'UI' },
  { type: 'ui-app-vieweditor', label: 'Vista-editor', symbol: 'process', color: '#c026d3', group: 'UI' },
  { type: 'page', label: 'Página', child: true, symbol: 'interface', color: '#0284c7', group: 'UI' },
  { type: 'mockup', label: 'Mockup', symbol: 'interface', color: '#0ea5e9', group: 'UI' },
  { type: 'menu-item', label: 'Opción de menú', child: true, symbol: 'process', color: '#0ea5e9', group: 'UI' },
  { type: 'button-group', label: 'Grupo de botones', symbol: 'usecase', color: '#0e7490', group: 'UI' },
  { type: 'ui-button', label: 'Botón', child: true, symbol: 'usecase', color: '#0e7490', group: 'UI' },
  { type: 'ui-page-crud', label: 'CRUD', child: true, symbol: 'lens', color: '#0284c7', group: 'UI' },
  { type: 'ui-page-wizard', label: 'Wizard', child: true, symbol: 'flow', color: '#0284c7', group: 'UI' },
  { type: 'ui-wizard-step', label: 'Paso de wizard', child: true, symbol: 'flow', color: '#7c3aed', group: 'UI' },
  { type: 'ui-model', label: 'Modelo', symbol: 'readmodel', color: '#8b5cf6', group: 'UI' },
  { type: 'model-field', label: 'Campo', child: true, symbol: 'gear', color: '#a78bfa', group: 'Modelos' },
  { type: 'transformation', label: 'Transformación', symbol: 'gear', color: '#ea580c', group: 'Modelos' },
  { type: 'custom-code', label: 'Custom code', symbol: 'gear', color: '#0f172a', group: 'Modelos' },
  // Design: the Mateu layout vocabulary…
  { type: 'cmp:verticalLayout', label: 'Layout · Vertical', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:horizontalLayout', label: 'Layout · Horizontal', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:formLayout', label: 'Layout · Form', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:splitLayout', label: 'Layout · Split', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:tabLayout', label: 'Layout · Tabs', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:tab', label: 'Layout · Pestaña', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:accordionLayout', label: 'Layout · Acordeón', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:card', label: 'Layout · Card', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:gridLayout', label: 'Layout · Grid', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:boardLayout', label: 'Layout · Board', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:dashboardLayout', label: 'Layout · Dashboard', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:masterDetailLayout', label: 'Layout · Master-detail', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:foldoutLayout', label: 'Layout · Foldout', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:carouselLayout', label: 'Layout · Carrusel', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:appLayout', label: 'Layout · App', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:section', label: 'Layout · Sección', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:zones', label: 'Layout · Fila de zonas', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:toolbar', label: 'Layout · Toolbar', symbol: 'usecase', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:pageHeader', label: 'Layout · Cabecera de página', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:hero', label: 'Layout · Hero', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:scoreboard', label: 'Layout · Scoreboard', symbol: 'event', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:wizard', label: 'Layout · Wizard', symbol: 'flow', color: '#0ea5e9', group: 'Layouts' },
  { type: 'cmp:app', label: 'Layout · Shell de app', symbol: 'component', color: '#0ea5e9', group: 'Layouts' },
  // …and the components that live inside those layouts.
  { type: 'cmp:form', label: 'Componente · Formulario', symbol: 'interface', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:listing', label: 'Componente · Listado', symbol: 'lens', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:crud', label: 'Componente · CRUD', symbol: 'lens', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:filterBar', label: 'Componente · Barra de filtros', symbol: 'lens', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:button', label: 'Componente · Botón', symbol: 'usecase', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:fab', label: 'Componente · Botón flotante', symbol: 'usecase', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:field', label: 'Componente · Campo', symbol: 'gear', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:menuBar', label: 'Componente · Menú', symbol: 'process', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:appContext', label: 'Componente · Selector de contexto', symbol: 'process', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:addOnPicker', label: 'Componente · Extras (add-ons)', symbol: 'usecase', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:paymentPicker', label: 'Componente · Pago', symbol: 'usecase', color: '#0284c7', group: 'Componentes' },
  { type: 'cmp:chat', label: 'Componente · Chat', symbol: 'person', color: '#0284c7', group: 'Componentes' },
  // The Mateu display vocabulary (design/figma/contract.json), read-only content.
  { type: 'cmp:text', label: 'Display · Texto', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:metricCard', label: 'Display · Métrica', symbol: 'event', color: '#0284c7', group: 'Display' },
  { type: 'cmp:kpi', label: 'Display · KPI', symbol: 'event', color: '#0284c7', group: 'Display' },
  { type: 'cmp:stat', label: 'Display · Estadística', symbol: 'event', color: '#0284c7', group: 'Display' },
  { type: 'cmp:notice', label: 'Display · Aviso', symbol: 'note', color: '#0284c7', group: 'Display' },
  { type: 'cmp:banner', label: 'Display · Banner', symbol: 'note', color: '#0284c7', group: 'Display' },
  { type: 'cmp:calloutCard', label: 'Display · Callout', symbol: 'note', color: '#0284c7', group: 'Display' },
  { type: 'cmp:bulletedList', label: 'Display · Lista', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:statusList', label: 'Display · Lista de estados', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:checklist', label: 'Display · Checklist', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:fileList', label: 'Display · Ficheros', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:separator', label: 'Display · Separador', symbol: 'flow', color: '#0284c7', group: 'Display' },
  { type: 'cmp:entityHeader', label: 'Display · Cabecera de entidad', symbol: 'person', color: '#0284c7', group: 'Display' },
  { type: 'cmp:emptyState', label: 'Display · Estado vacío', symbol: 'lens', color: '#0284c7', group: 'Display' },
  { type: 'cmp:skeleton', label: 'Display · Esqueleto', symbol: 'lens', color: '#0284c7', group: 'Display' },
  { type: 'cmp:progressBar', label: 'Display · Barra de progreso', symbol: 'flow', color: '#0284c7', group: 'Display' },
  { type: 'cmp:progressSteps', label: 'Display · Pasos de progreso', symbol: 'flow', color: '#0284c7', group: 'Display' },
  { type: 'cmp:taskProgress', label: 'Display · Progreso de tareas', symbol: 'flow', color: '#0284c7', group: 'Display' },
  { type: 'cmp:meter', label: 'Display · Medidor', symbol: 'gear', color: '#0284c7', group: 'Display' },
  { type: 'cmp:timeline', label: 'Display · Línea de tiempo', symbol: 'clock', color: '#0284c7', group: 'Display' },
  { type: 'cmp:calendar', label: 'Display · Calendario', symbol: 'clock', color: '#0284c7', group: 'Display' },
  { type: 'cmp:kanban', label: 'Display · Kanban', symbol: 'process', color: '#0284c7', group: 'Display' },
  { type: 'cmp:gantt', label: 'Display · Gantt', symbol: 'process', color: '#0284c7', group: 'Display' },
  { type: 'cmp:trendChart', label: 'Display · Gráfica de tendencia', symbol: 'event', color: '#0284c7', group: 'Display' },
  { type: 'cmp:heatmap', label: 'Display · Mapa de calor', symbol: 'event', color: '#0284c7', group: 'Display' },
  { type: 'cmp:funnel', label: 'Display · Embudo', symbol: 'event', color: '#0284c7', group: 'Display' },
  { type: 'cmp:orgChart', label: 'Display · Organigrama', symbol: 'person', color: '#0284c7', group: 'Display' },
  { type: 'cmp:featureGrid', label: 'Display · Grid de features', symbol: 'component', color: '#0284c7', group: 'Display' },
  { type: 'cmp:testimonials', label: 'Display · Testimonios', symbol: 'person', color: '#0284c7', group: 'Display' },
  { type: 'cmp:faq', label: 'Display · FAQ', symbol: 'note', color: '#0284c7', group: 'Display' },
  { type: 'cmp:commentThread', label: 'Display · Comentarios', symbol: 'person', color: '#0284c7', group: 'Display' },
  { type: 'cmp:comparisonCard', label: 'Display · Comparativa', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:planningBoard', label: 'Display · Planning (recursos × días)', symbol: 'process', color: '#0284c7', group: 'Display' },
  { type: 'cmp:offerCard', label: 'Display · Oferta', symbol: 'note', color: '#0284c7', group: 'Display' },
  { type: 'cmp:pricingTable', label: 'Display · Tabla de precios', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:processMonitor', label: 'Display · Monitor de procesos', symbol: 'gear', color: '#0284c7', group: 'Display' },
  { type: 'cmp:resourceGrid', label: 'Display · Grid de recursos', symbol: 'component', color: '#0284c7', group: 'Display' },
  { type: 'cmp:taskQueue', label: 'Display · Cola de tareas', symbol: 'process', color: '#0284c7', group: 'Display' },
  { type: 'cmp:ledger', label: 'Display · Desglose (ledger)', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:markdown', label: 'Display · Markdown', symbol: 'readmodel', color: '#0284c7', group: 'Display' },
  { type: 'cmp:breadcrumbs', label: 'Display · Migas de pan', symbol: 'flow', color: '#0284c7', group: 'Display' },
  ];
