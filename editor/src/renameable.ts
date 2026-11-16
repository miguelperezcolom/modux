/**
 * The canvas kinds F2 (and the drawer's title) can rename: what both hosts' `rename-element` covers
 * (the server's switch, the IDE store's table). A kind left out opens the inline editor and drops
 * the new name on the floor.
 */
export const RENAMEABLE_KINDS = new Set([
  'note', 'area', 'ui', 'page', 'ui-app', 'url', 'boundedContext', 'system', 'cdc', 'aggregate', 'entity',
  'value-object', 'operation', 'process-step', 'workflow', 'workflow-step', 'domain-event',
  'read-model', 'domain-service', 'query-service', 'use-case', 'external-use-case',
  'external-table', 'mcp-server', 'mcp-gateway', 'application-event', 'integration-event', 'external-system',
  'actor', 'ai-agent', 'rag', 'api', 'proxy-api', 'api-operation', 'notification',
]);
