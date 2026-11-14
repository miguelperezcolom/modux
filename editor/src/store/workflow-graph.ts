/**
 * The workflow flow graph: which workflow a node belongs to, and whether a loop can be left.
 *
 * A cycle is not an error — a retry loop is a legitimate thing to model. What IS an error is a
 * cycle nothing can get out of, and the only thing that can get you out is a CONDITION: a branch
 * leaving the cycle guarded by the condition of an EXCLUSIVE split. So a pure step-dependency
 * cycle is always inescapable, because a dependency carries no condition.
 *
 * Ported from `WorkflowLoopValidator` and `WorkflowGatewayGraph`.
 */

import { asList, nested, type Element, type ModelStore } from './store.js';
import { t } from '../i18n/index.js';

/** An edge of the flow graph, and whether taking it depends on a condition. */
interface Edge {
  to: string;
  conditioned: boolean;
}

/**
 * Which workflow a node belongs to.
 *
 * A gateway has no workflow of its own — it belongs to whichever one flows INTO it. A workflow
 * reached as a TARGET is a hand-off and does not vote, otherwise every hand-off would drag its
 * destination's identity back up the graph.
 */
export function workflowOf(store: ModelStore, nodeId: string): string | undefined {
  const resolve = (id: string, visiting: Set<string>): string | undefined => {
    if (store.has('workflows', id)) return id;
    const owner = store.all('workflows')
      .find((wf) => nested(wf.steps).some((s) => s.id === id));
    if (owner) return owner.id;
    if (visiting.has(id)) return undefined;
    visiting.add(id);
    const gateway = store.get('workflowGateways', id);
    if (!gateway) return undefined;
    for (const source of asList(gateway.sourceIds)) {
      const found = resolve(source, visiting);
      if (found) return found;
    }
    for (const target of asList(gateway.targetIds)) {
      if (store.has('workflows', target)) continue; // a hand-off does not vote
      const found = resolve(target, visiting);
      if (found) return found;
    }
    return undefined;
  };
  return resolve(nodeId, new Set());
}

/** The gateways that flow within the given workflow. */
export function memberGateways(store: ModelStore, workflowId: string | undefined): Element[] {
  if (!workflowId) return [];
  return store.all('workflowGateways')
    .filter((g) => workflowOf(store, g.id) === workflowId);
}

/**
 * The first inescapable loop, described for the user, or undefined when every cycle has a way
 * out. `extraEdges` are treated as unconditioned — that is how a link is checked BEFORE it is
 * drawn, since every link adds exactly one such edge.
 */
export function findUnboundedLoop(
  steps: Element[], gateways: Element[], extraEdges: [string, string][] = [],
): string | undefined {
  const adjacency = new Map<string, Edge[]>();
  const labels = new Map<string, string>();
  const edge = (from: string, to: string, conditioned: boolean) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    if (!adjacency.has(to)) adjacency.set(to, []);
    adjacency.get(from)!.push({ to, conditioned });
  };
  const label = (id: string, name: unknown) => {
    if (!labels.has(id)) labels.set(id, typeof name === 'string' && name ? name : id);
  };

  for (const step of steps) {
    label(step.id, step.name);
    for (const dependency of asList(step.dependsOnStepIds)) edge(dependency, step.id, false);
  }
  for (const gateway of gateways) {
    label(gateway.id, gateway.name);
    // only an EXCLUSIVE split's branches can carry a condition
    const exclusive = gateway.type === 'SPLIT' && gateway.semantics === 'EXCLUSIVE';
    const conditioned = new Set(exclusive
      ? nested(gateway.branchConditions)
        .filter((c) => typeof c.expression === 'string' && c.expression.trim())
        .map((c) => String(c.targetId))
      : []);
    for (const source of asList(gateway.sourceIds)) edge(source, gateway.id, false);
    for (const target of asList(gateway.targetIds)) {
      edge(gateway.id, target, conditioned.has(target));
    }
  }
  for (const [from, to] of extraEdges) {
    label(from, from);
    label(to, to);
    edge(from, to, false);
  }

  for (const component of stronglyConnectedComponents(adjacency)) {
    if (!isCycle(component, adjacency)) continue;
    if (hasConditionedExit(component, adjacency)) continue;
    const names = [...component].map((id) => labels.get(id) ?? id).sort();
    return t('store.workflow.unboundedLoop', { cycle: names.join(' → ') });
  }
  return undefined;
}

/** One node is a cycle only if it links to itself; more than one always is. */
function isCycle(component: Set<string>, adjacency: Map<string, Edge[]>): boolean {
  if (component.size > 1) return true;
  const [only] = component;
  return (adjacency.get(only) ?? []).some((e) => e.to === only);
}

function hasConditionedExit(component: Set<string>, adjacency: Map<string, Edge[]>): boolean {
  for (const node of component) {
    for (const e of adjacency.get(node) ?? []) {
      if (e.conditioned && !component.has(e.to)) return true;
    }
  }
  return false;
}

/** Tarjan's strongly connected components, iterative so a deep graph cannot blow the stack. */
function stronglyConnectedComponents(adjacency: Map<string, Edge[]>): Set<string>[] {
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const result: Set<string>[] = [];
  let counter = 0;

  for (const start of adjacency.keys()) {
    if (index.has(start)) continue;
    const callStack = [start];
    const cursors = new Map<string, number>();
    while (callStack.length) {
      const node = callStack[callStack.length - 1];
      if (!index.has(node)) {
        index.set(node, counter);
        lowlink.set(node, counter);
        counter += 1;
        stack.push(node);
        onStack.add(node);
        cursors.set(node, 0);
      }
      const edges = adjacency.get(node) ?? [];
      const cursor = cursors.get(node)!;
      if (cursor < edges.length) {
        cursors.set(node, cursor + 1);
        const next = edges[cursor].to;
        if (!index.has(next)) callStack.push(next);
        else if (onStack.has(next)) lowlink.set(node, Math.min(lowlink.get(node)!, index.get(next)!));
        continue;
      }
      if (lowlink.get(node) === index.get(node)) {
        const component = new Set<string>();
        let popped: string;
        do {
          popped = stack.pop()!;
          onStack.delete(popped);
          component.add(popped);
        } while (popped !== node);
        result.push(component);
      }
      callStack.pop();
      const parent = callStack[callStack.length - 1];
      if (parent) lowlink.set(parent, Math.min(lowlink.get(parent)!, lowlink.get(node)!));
    }
  }
  return result;
}
