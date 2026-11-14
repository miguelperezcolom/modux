/**
 * Deriving the flow graph of an operation body from its modeled steps.
 *
 * Nothing here is stored. The model already says what an aggregate method / domain-service
 * operation does — an ordered pipeline of steps with structured control flow (see
 * `docs/design/operation-body.md`) — and a process-design canvas is that read as a tree of nodes.
 * So the derivation is a pure function of the steps, which is why it belongs on the client: the
 * future drag-and-drop «diseño de proceso» view renders this, and gestures edit the steps beneath
 * it.
 *
 * Control flow is structured nesting: an `If` yields `then`/`else` branches, a `ForEach` a `body`
 * branch — each a labelled list of child nodes, recursively. Ids are positional and stable, so the
 * same body always derives the same graph (no randomness — the editor forbids it).
 */

import { t } from './i18n/index.js';

/** One modeled step of an operation body (mirrors the backend `OperationStepEntity`). */
export interface OperationStep {
  id?: string;
  type?: string;
  name?: string;
  intent?: string;
  fieldName?: string;
  value?: string;
  condition?: string;
  collection?: string;
  itemVar?: string;
  then?: OperationStep[];
  else?: OperationStep[];
  body?: OperationStep[];
}

/** The visual family of a node — drives colour/icon in the process-design view. */
export type FlowCategory =
  | 'guard' | 'mutation' | 'control' | 'event' | 'call' | 'custom' | 'other';

/** A labelled branch of a control-flow node (an `If`'s then/else, a `ForEach`'s body). */
export interface FlowBranch {
  label: string;
  nodes: FlowNode[];
}

/** A node of the derived flow graph: one step, plus its control-flow branches. */
export interface FlowNode {
  id: string;
  type: string;
  category: FlowCategory;
  label: string;
  branches: FlowBranch[];
}

const CATEGORY: Record<string, FlowCategory> = {
  CheckPrecondition: 'guard',
  SetField: 'mutation',
  If: 'control',
  ForEach: 'control',
  PublishDomainEvent: 'event',
  PublishApplicationEvent: 'event',
  CallAggregateOperation: 'call',
  CallDomainService: 'call',
  CallUseCase: 'call',
  CallExternalUseCase: 'call',
  CallQueryService: 'call',
  CallGateway: 'call',
  ReadAggregate: 'call',
  SaveAggregate: 'call',
  ApplyModelMapping: 'other',
  Custom: 'custom',
};

function categoryOf(type: string | undefined): FlowCategory {
  return (type && CATEGORY[type]) || 'other';
}

function labelOf(step: OperationStep): string {
  const name = step.name ?? '';
  switch (step.type) {
    case 'CheckPrecondition':
      return `precondition: ${step.condition ?? name}`;
    case 'SetField':
      return `set ${step.fieldName ?? name}${step.value ? ` = ${step.value}` : ''}`;
    case 'If':
      return `if (${step.condition ?? t('views.placeholder.condition')})`;
    case 'ForEach':
      return `for (${step.itemVar ?? 'item'} : ${step.collection ?? t('views.placeholder.collection')})`;
    case 'PublishDomainEvent':
    case 'PublishApplicationEvent':
      return `emit ${name}`;
    case 'Custom':
      return `custom: ${step.intent ?? name}`;
    default:
      return step.type ? `${step.type} ${name}`.trim() : name;
  }
}

function branchesOf(step: OperationStep, path: string): FlowBranch[] {
  const branches: FlowBranch[] = [];
  if (step.type === 'If') {
    branches.push({ label: 'then', nodes: walk(step.then, `${path}/then`) });
    if (step.else && step.else.length) {
      branches.push({ label: 'else', nodes: walk(step.else, `${path}/else`) });
    }
  } else if (step.type === 'ForEach') {
    branches.push({ label: 'body', nodes: walk(step.body, `${path}/body`) });
  }
  return branches;
}

function walk(steps: OperationStep[] | undefined, path: string): FlowNode[] {
  if (!steps || !steps.length) return [];
  return steps.map((step, i) => {
    const id = step.id ?? `${path}/${i}`;
    return {
      id,
      type: step.type ?? 'Custom',
      category: categoryOf(step.type),
      label: labelOf(step),
      branches: branchesOf(step, id),
    };
  });
}

/** The flow graph of an operation body — a tree of nodes mirroring the modeled steps. */
export function deriveOperationFlow(steps: OperationStep[] | undefined): FlowNode[] {
  return walk(steps, 'op');
}

/** Total node count including nested branches — for layout/summary. */
export function flowNodeCount(nodes: FlowNode[]): number {
  return nodes.reduce((n, node) =>
    n + 1 + node.branches.reduce((b, br) => b + flowNodeCount(br.nodes), 0), 0);
}
