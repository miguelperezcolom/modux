/**
 * External systems: the partners, not the pipes.
 *
 * Modelling the partner rather than only the integration is what puts it on the context map as a
 * node, gives a NOTIFIES flow a real target, and places the anti-corruption layer on the right
 * side. Each carries its own surface — the operations it offers, the tables it owns, the MCP
 * servers it publishes — nested in its file, so a system is one file like everything else.
 *
 * Ported from `EditorApiController`, with one departure: external systems are a top-level type
 * since phase 0, so nothing here goes through the project element (§4.3).
 */

import { asList, nested, type Element, type ModelStore } from '../store.js';
import { blank } from './models.js';
import {
  referenceElement, referenceIdFor, type ProjectSnapshot,
} from '../project-snapshot.js';
import { CommandError, type Handler } from '../spec.js';
import { t } from '../../i18n/index.js';

/** The nested surfaces a system carries, and what refuses to let go of each. */
const INBOUND = 'INBOUND';

export const EXTERNAL_COMMANDS: Record<string, Handler> = {
  'add-external-system': (store, command) => {
    const id = String(command.id);
    if (store.has('externalSystems', id)) return;
    const parent = command.parentId as string | undefined;
    if (parent && !store.has('externalSystems', parent)) {
      throw new CommandError(t('store.external.parentNotFound', { id: parent }));
    }
    store.put('externalSystems', {
      id,
      name: command.name,
      parentExternalSystemId: parent ?? null,
    });
  },

  /**
   * A system does not leave while anything still leans on it. What it PUBLISHED, though, outlives
   * it: an API keeps standing as a contract, it just stops having a publisher.
   */
  'remove-external-system': (store, command) => {
    const id = String(command.id);
    const system = store.get('externalSystems', id);
    if (!system) return;

    if (store.all('externalSystems').some((x) => x.parentExternalSystemId === id)) {
      throw new CommandError(t('store.external.removeHasSubsystems', { id }));
    }
    if (store.all('flows').some((f) => f.targetBoundedContextId === id)) {
      throw new CommandError(t('store.external.removeIsFlowTarget', { id }));
    }
    if (store.all('roles').some((r) => asList(r.externalSystemIds).includes(id))) {
      throw new CommandError(t('store.external.removeHasDependantActors', { id }));
    }
    const leaning = store.all('externalSystems').some((x) =>
      asList(x.dependsOnExternalSystemIds).includes(id) || asList(x.cqrsExternalSystemIds).includes(id));
    if (leaning) {
      throw new CommandError(t('store.external.removeHasDependantSystems', { id }));
    }

    detachMcpServers(store, new Set(nested(system.mcpServers).map((s) => s.id)));
    store.removeFromAllLists('rags', 'sourceExternalSystemIds', id);
    // the contracts it published survive, unattributed
    for (const type of ['apis', 'proxyApis']) {
      for (const api of store.all(type).filter((a) => a.publishedByExternalSystemId === id)) {
        store.patch(type, api.id, { publishedByExternalSystemId: null });
      }
    }
    store.remove('externalSystems', id);
  },

  /**
   * Nest a system inside another. Containment replaces dependency: once one lives inside the
   * other, an edge between the pair says nothing that the nesting does not already say.
   */
  'set-external-system-parent': (store, command) => {
    const id = String(command.id);
    if (!store.has('externalSystems', id)) {
      throw new CommandError(t('store.external.notFound', { id }));
    }
    const parent = (command.parentId as string | undefined) ?? null;
    if (parent) {
      if (!store.has('externalSystems', parent)) {
        throw new CommandError(t('store.external.parentNotFound', { id: parent }));
      }
      for (let cursor: string | null = parent; cursor; ) {
        if (cursor === id) {
          throw new CommandError(t('store.external.circularNesting', { parent, id }));
        }
        cursor = (store.get('externalSystems', cursor)?.parentExternalSystemId as string) ?? null;
      }
    }
    store.patch('externalSystems', id, { parentExternalSystemId: parent });
    if (parent) {
      stripPairDependency(store, id, parent);
      stripPairDependency(store, parent, id);
    }
  },

  // ---- what a system offers ------------------------------------------------

  'add-external-use-case': addNestedSurface('useCases', (c) => ({ id: String(c.id), name: c.name })),

  'remove-external-use-case': (store, command) => {
    const id = String(command.id);
    const called = store.all('useCases').some((uc) =>
      nested(uc.steps).some((step) => step.externalUseCaseId === id));
    if (called) {
      throw new CommandError(t('store.external.removeUseCaseIsCalled', { id }));
    }
    removeNestedSurface(store, 'useCases', id);
  },

  'add-external-table': addNestedSurface('tables', (c) => ({ id: String(c.id), name: c.name })),

  'remove-external-table': (store, command) => {
    const id = String(command.id);
    const polled = store.all('projections').some((p) => p.externalTableId === id);
    if (polled) {
      throw new CommandError(t('store.external.removeTableIsProjected', { id }));
    }
    store.removeFromAllLists('rags', 'sourceExternalTableIds', id);
    removeNestedSurface(store, 'tables', id);
  },

  'add-mcp-server': addNestedSurface('mcpServers',
    (c) => ({ id: String(c.id), name: c.name, uri: c.uri ?? null })),

  'remove-mcp-server': (store, command) => {
    const id = String(command.id);
    detachMcpServers(store, new Set([id]));
    removeNestedSurface(store, 'mcpServers', id);
  },

  // ---- who calls whom ------------------------------------------------------

  /**
   * An external system calls one of OUR use cases. That is an inbound anti-corruption layer, held
   * by the bounded context that owns the use case — the translation belongs on our side of the
   * boundary, which is the whole point of an ACL.
   */
  'add-external-call': (store, command) => {
    const external = requireSystem(store, command.sourceId);
    const useCaseId = String(command.targetId);
    if (!store.has('useCases', useCaseId)) {
      throw new CommandError(t('store.unknown.useCase', { id: useCaseId }));
    }
    const context = store.findByListMember('boundedContexts', 'useCaseIds', useCaseId);
    if (!context) {
      throw new CommandError(
        t('store.external.useCaseWithoutContext', { id: useCaseId }));
    }
    const acls = nested(context.acls);
    const existing = acls.find((a) =>
      a.externalSystem === external.id && String(a.direction).toUpperCase() === INBOUND);
    if (existing) {
      const translated = asList(existing.translatedUseCaseIds);
      if (translated.includes(useCaseId)) return;
      store.patch('boundedContexts', context.id, {
        acls: acls.map((a) => (a === existing
          ? { ...a, translatedUseCaseIds: [...translated, useCaseId] } : a)),
      });
      return;
    }
    store.patch('boundedContexts', context.id, {
      acls: [...acls, {
        id: `acl-${external.id}-${context.id}`,
        name: `Acl${capitalize(String(external.name ?? external.id))}`,
        externalSystem: external.id,
        direction: INBOUND,
        translatedDomainEventIds: [],
        translatedUseCaseIds: [useCaseId],
      }],
    });
  },

  'remove-external-call': (store, command) => {
    const source = String(command.sourceId);
    const target = String(command.targetId);
    for (const context of store.all('boundedContexts')) {
      const acls = nested(context.acls);
      if (!acls.some((a) => a.externalSystem === source
        && String(a.direction).toUpperCase() === INBOUND
        && asList(a.translatedUseCaseIds).includes(target))) continue;
      const rewritten = acls
        .map((a) => (a.externalSystem === source && String(a.direction).toUpperCase() === INBOUND
          ? { ...a, translatedUseCaseIds: asList(a.translatedUseCaseIds).filter((id) => id !== target) }
          : a))
        // an ACL minted for this one call goes when it no longer translates anything
        .filter((a) => !(String(a.id).startsWith('acl-')
          && !asList(a.translatedUseCaseIds).length
          && !asList(a.translatedDomainEventIds).length));
      store.patch('boundedContexts', context.id, { acls: rewritten });
    }
  },

  /** One of OUR use cases calls an operation of theirs — a step in our pipeline. */
  'add-external-uc-call': (store, command) => {
    const source = store.get('useCases', String(command.sourceId));
    if (!source) throw new CommandError(t('store.unknown.useCase', { id: command.sourceId }));
    const targetId = String(command.targetId);
    const target = store.all('externalSystems')
      .flatMap((x) => nested(x.useCases))
      .find((u) => u.id === targetId);
    if (!target) throw new CommandError(t('store.unknown.externalUseCase', { id: targetId }));
    const steps = nested(source.steps);
    if (steps.some((step) => step.externalUseCaseId === targetId)) return;
    // like a call to one of ours: before the logic that reads its answer — mirrors EditorApiController
    const call = {
      id: `step-ext-${targetId}`,
      name: `call${capitalize(String(target.name ?? target.id))}`,
      type: 'CallExternalUseCase',
      externalUseCaseId: targetId,
    };
    const firstOf = (type: string) => steps.findIndex((step) => step.type === type);
    const at = [firstOf('Custom'), firstOf('PublishDomainEvent')].find((i) => i >= 0) ?? steps.length;
    store.patch('useCases', source.id, { steps: [...steps.slice(0, at), call, ...steps.slice(at)] });
  },

  'remove-external-uc-call': (store, command) => {
    const source = store.get('useCases', String(command.sourceId));
    if (!source) return;
    store.patch('useCases', source.id, {
      steps: nested(source.steps).filter((step) => step.externalUseCaseId !== command.targetId),
    });
  },

  /**
   * One external system depends on another — or on a published API, which is the finer-grained
   * target. Plain and CQRS are exclusive flavours of the same edge: re-drawing with the other
   * type retypes it rather than leaving both.
   */
  'add-external-dependency': (store, command) => {
    const sourceId = String(command.sourceId);
    const targetId = String(command.targetId);
    if (sourceId === targetId) {
      throw new CommandError(t('store.external.dependsOnSelf'));
    }
    const source = requireSystem(store, sourceId);
    const cqrs = command.type === 'CQRS';

    if (store.has('apis', targetId) || store.has('proxyApis', targetId)) {
      if (cqrs) throw new CommandError(t('store.external.cqrsBetweenExternals'));
      store.addToList('externalSystems', source.id, 'dependsOnApiIds', targetId);
      return;
    }
    if (!store.has('externalSystems', targetId)) {
      throw new CommandError(t('store.unknown.externalSystem', { id: targetId }));
    }
    const [into, outOf] = cqrs
      ? ['cqrsExternalSystemIds', 'dependsOnExternalSystemIds']
      : ['dependsOnExternalSystemIds', 'cqrsExternalSystemIds'];
    store.removeFromList('externalSystems', source.id, outOf, targetId);
    store.addToList('externalSystems', source.id, into, targetId);
  },

  /**
   * Reference ANOTHER modux project as an external system.
   *
   * The applier does no I/O — that is the property that lets it be tested without files — so the
   * SNAPSHOT arrives already read: the host resolves the coordinate (§4.7), reads the other
   * model, and hands it over. What lands here is the copy plus the coordinate, and the split
   * matters: the copy is what generation reads, so a build never needs the other repository
   * present; the coordinate is only for refreshing.
   */
  'add-project-reference': (store, command) => {
    const coordinate = command.referencedProject as Record<string, unknown> | undefined;
    if (!coordinate || (!coordinate.gitUrl && !coordinate.path)) {
      throw new CommandError(
        t('store.external.referenceNeedsCoordinate'));
    }
    const snapshot = command.snapshot as ProjectSnapshot | undefined;
    if (!snapshot) {
      throw new CommandError(t('store.external.referenceUnreadable'));
    }
    const id = blank(command.id) ? referenceIdFor(coordinate) : String(command.id);
    store.put('externalSystems', referenceElement(id, snapshot, coordinate));
  },

  'remove-external-dependency': (store, command) => {
    const sourceId = String(command.sourceId);
    const targetId = String(command.targetId);
    for (const list of ['dependsOnExternalSystemIds', 'dependsOnApiIds', 'cqrsExternalSystemIds']) {
      store.removeFromList('externalSystems', sourceId, list, targetId);
    }
  },
};

/** Add an item to one of a system's nested surfaces. The system comes in `boundedContextId`. */
function addNestedSurface(
  list: string, build: (command: Record<string, any>) => Element,
): Handler {
  return (store, command) => {
    const system = requireSystem(store, command.boundedContextId);
    const items = nested(system[list]);
    const item = build(command);
    if (items.some((existing) => existing.id === item.id)) return;
    store.patch('externalSystems', system.id, { [list]: [...items, item] });
  };
}

/** Drop an item from that surface, wherever it turns out to live. */
function removeNestedSurface(store: ModelStore, list: string, id: string): void {
  for (const system of store.all('externalSystems')) {
    const items = nested(system[list]);
    if (!items.some((item) => item.id === id)) continue;
    store.patch('externalSystems', system.id, {
      [list]: items.filter((item) => item.id !== id),
    });
  }
}

/** Agents and gateways let go of MCP servers that are leaving. */
function detachMcpServers(store: ModelStore, leaving: Set<string>): void {
  if (!leaving.size) return;
  const holders: [string, string][] = [
    ['aiAgents', 'allowedMcpServerIds'],
    ['mcpGateways', 'mcpServerIds'],
  ];
  for (const [type, list] of holders) {
    for (const element of store.all(type)) {
      const ids = asList(element[list]);
      if (!ids.some((id) => leaving.has(id))) continue;
      store.patch(type, element.id, { [list]: ids.filter((id) => !leaving.has(id)) });
    }
  }
}

/** Once nested, the pair's dependency edges — both flavours — stop meaning anything. */
function stripPairDependency(store: ModelStore, id: string, other: string): void {
  for (const list of ['dependsOnExternalSystemIds', 'cqrsExternalSystemIds']) {
    store.removeFromList('externalSystems', id, list, other);
  }
}

function requireSystem(store: ModelStore, id: unknown): Element {
  const system = store.get('externalSystems', String(id));
  if (!system) throw new CommandError(t('store.unknown.externalSystem', { id: String(id) }));
  return system;
}

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

/** Element shapes this block creates, for the schema-defaults check in tests. */
export const EXTERNAL_TYPES: string[] = ['externalSystems'];
