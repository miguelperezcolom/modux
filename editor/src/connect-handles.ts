/**
 * Which selected nodes offer the blue connect handles (drag one onto another element to relate
 * them). A nested chip and a free box answer differently, so there are two lists.
 */
const CHILD = new Set([
  'menu-item', 'menu-group', 'wizard-step-row', 'etl-flow', 'scheduled-trigger', 'aggregate',
  'domain-service', 'use-case', 'domain-event', 'application-event', 'integration-event',
  'external-use-case', 'external-system', 'system', 'boundedContext', 'external-table',
  'api-operation', 'api-op-occurrence', 'api', 'api-impl', 'proxy-api', 'notification',
]);

const FREE = new Set([
  'note', 'model', 'identity-provider', 'etl-flow', 'boundedContext', 'system', 'cdc', 'ui',
  'ui-app', 'external-system', 'actor', 'ai-agent', 'rag', 'mcp-gateway', 'api', 'proxy-api',
  'workflow', 'workflow-step', 'page', 'menu-item', 'aggregate', 'domain-service', 'use-case',
  'domain-event', 'application-event', 'integration-event', 'read-model', 'query-service',
  'scheduled-trigger', 'external-use-case', 'external-table', 'api-operation', 'api-op-occurrence',
  'api-impl', 'service', 'notification',
]);

export function hasConnectHandles(kind: string, isChild: boolean): boolean {
  return (isChild ? CHILD : FREE).has(kind);
}
