/**
 * Migrations applied when a tree written by an older modux is read.
 *
 * The Java side does the same work in `CommonFileRepository.hoistLegacyProjectElements`,
 * and it has to exist on both sides for the same reason it had to exist at all: the
 * loaders ignore fields they do not know about, so simply dropping the legacy shape
 * would make a model open cleanly with its relations silently gone.
 *
 * Migrated elements are left marked as changed, so the new shape reaches disk with the
 * next flush — the same "persists on next save" contract as the Java migration. Nothing
 * is written just for opening a model.
 */

import { isPresent, nested, type Element, type ModelStore } from './store.js';

/** Project fields that became the `deployments` element. Order is the record's. */
const DEPLOYMENT_FIELDS = [
  'database', 'dbMigrationTool', 'terraformProvider', 'terraformProviderVersion',
  'terraformBackendType', 'iamProvider', 'messageBrokerType', 'tracingProvider',
  'metricsProvider', 'loggingProvider', 'llmProvider', 'cacheProvider',
  'fileStorageProvider', 'emailProvider', 'secretsProvider', 'cicdProvider',
  'dockerRegistry', 'environments', 'tenancyStrategy',
];

/** The id of a project's deployment element. Mirrors `DeploymentEntity.idFor`. */
export const deploymentIdFor = (projectId: string) => `deployment-${projectId}`;

/** What a migration moved, for the host to report. Empty when the tree was current. */
export interface Migration {
  relations: number;
  externalSystems: number;
  deployments: number;
}

export const migrated = (m: Migration) => m.relations + m.externalSystems + m.deployments > 0;

/**
 * Hoist strategic relations, external systems and deployment settings out of the
 * project element, where they used to live (see `docs/design/ide-plugin.md` §4.3).
 */
export function hoistLegacyProjectElements(store: ModelStore): Migration {
  const result: Migration = { relations: 0, externalSystems: 0, deployments: 0 };

  for (const project of store.all('projects')) {
    const relations = nested(project.contextMap);
    const externals = nested(project.externalSystems);
    if (relations.length || externals.length) {
      for (const relation of relations) store.put('contextMapRelations', relation as Element);
      for (const external of externals) store.put('externalSystems', external as Element);
      store.put('projects', without(project, ['contextMap', 'externalSystems']));
      result.relations += relations.length;
      result.externalSystems += externals.length;
    }
  }

  // re-read: the loop above replaced the project elements
  for (const project of store.all('projects')) {
    if (store.has('deployments', deploymentIdFor(project.id))) continue;
    if (!carriesDeployment(project)) continue;
    store.put('deployments', deploymentOf(project));
    store.put('projects', without(project, DEPLOYMENT_FIELDS));
    result.deployments += 1;
  }

  return result;
}

/** Whether a project still carries its deployment settings inline. */
function carriesDeployment(project: Element): boolean {
  return DEPLOYMENT_FIELDS.some((field) => isPresent(project[field]));
}

function deploymentOf(project: Element): Element {
  const deployment: Element = { id: deploymentIdFor(project.id) };
  for (const field of DEPLOYMENT_FIELDS) {
    if (isPresent(project[field])) deployment[field] = project[field];
  }
  return deployment;
}

function without(element: Element, fields: string[]): Element {
  const copy = { ...element };
  for (const field of fields) delete copy[field];
  return copy;
}

/**
 * The invariant every store satisfies: a bounded context always has a main module.
 * Contexts loaded without one — hand-written models, mostly — heal on read, exactly
 * as `CommonFileRepository.healMainModules` does.
 *
 * A context whose modules exist but none is flagged `main` is NOT healed: Java's
 * `ModuleTopology.mainModuleOf` falls back to the first module there, so adding one
 * would give the context a second module it never asked for.
 */
export function healMainModules(store: ModelStore): number {
  const modules = store.all('modules');
  let healed = 0;
  for (const context of store.all('boundedContexts')) {
    if (modules.some((m) => m.boundedContextId === context.id)) continue;
    store.put('modules', {
      id: mainModuleId(context.id),
      name: context.name ?? context.id,
      boundedContextId: context.id,
      main: true,
    });
    healed += 1;
  }
  return healed;
}

/** The id a bounded context's main module gets. Mirrors `ModuleTopology.mainModuleId`. */
export const mainModuleId = (boundedContextId: string) => `${boundedContextId}-main`;

/**
 * The step types EventConductor's engine understands.
 *
 * modux GENERATES EventConductor workflow definitions, so this is the vocabulary of the thing
 * being produced and modux follows it rather than keeping its own. The list is checked against
 * EventConductor's actual schema in `legacy.test.ts` — a copy nobody compares is how the two
 * drifted apart in the first place.
 */
export const EVENT_CONDUCTOR_STEP_TYPES = [
  'START', 'ACTION', 'JOIN', 'FORK', 'CHOICE', 'END', 'USER_TASK', 'PROCESS', 'TIMER',
  'WAIT_FOR_MESSAGE', 'SEND_MESSAGE', 'RULE', 'DYNAMIC', 'LOCK', 'UNLOCK', 'REPLY',
  'PUBLISH_EVENT', 'HTTP_CALL', 'LLM_CALL', 'CONTINUE_AS_NEW', 'AGENT',
];

/**
 * Say what kind of step it is in EventConductor's words.
 *
 * modux used to say TASK/SPLIT where the engine says ACTION/FORK, and the generator hid the gap
 * by emitting ACTION for everything — so a step with somebody assigned to it reached the engine
 * as automated work. A step with a role or a form IS a user task; that is what having somebody
 * assigned means. Mirrors `CommonFileRepository.adoptEventConductorStepTypes`.
 */
export function adoptEventConductorStepTypes(store: ModelStore): number {
  const known = new Set(EVENT_CONDUCTOR_STEP_TYPES);
  let adopted = 0;
  for (const workflow of store.all('workflows')) {
    const steps = nested(workflow.steps);
    if (!steps.length) continue;
    let touched = false;
    const rewritten = steps.map((step) => {
      const current = typeof step.type === 'string' ? step.type : '';
      if (current && known.has(current)) return step;
      touched = true;
      const type = current === 'SPLIT' ? 'FORK'
        : current === 'JOIN' ? 'JOIN'
          : (step.roleId || step.formPageId) ? 'USER_TASK' : 'ACTION';
      return { ...step, type };
    });
    if (!touched) continue;
    store.patch('workflows', workflow.id, { steps: rewritten });
    adopted += 1;
  }
  return adopted;
}

/** Every migration a freshly loaded tree needs, in order. */
export function migrate(store: ModelStore): Migration {
  const result = hoistLegacyProjectElements(store);
  adoptEventConductorStepTypes(store);
  healMainModules(store);
  return result;
}
