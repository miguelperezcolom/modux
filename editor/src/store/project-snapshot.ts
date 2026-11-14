/**
 * What another modux project shows to the outside.
 *
 * Referencing a project COPIES this in — it does not link to it. That snapshot is a property and
 * not a shortcut: generation reads the copy, so building never needs the other repository to be
 * present, checked out or reachable (§4.7). The coordinate is only consulted when someone asks to
 * refresh, and losing sight of the source therefore breaks nothing.
 *
 * Pure over a store somebody else read, which is what keeps the applier free of I/O.
 */

import { type Element, type ModelStore } from './store.js';
import { t } from '../i18n/index.js';

export interface ProjectSnapshot {
  /** The project's own name, or the repository's when it does not give one. */
  name: string;
  /** Its public surface: the use cases it exposes. */
  useCases: { id: string; name: string }[];
}

/** The ways a use case can be exposed. Any of them makes it part of the public surface. */
const EXPOSED = ['exposedAsRest', 'exposedAsGrpc', 'exposedAsMcp', 'exposedAsAsync'];

/**
 * Read the summary out of another project's store.
 *
 * Only what is EXPOSED: the point of a reference is what the other system offers, and copying its
 * internals in would put another project's private decisions on this project's map.
 */
export function snapshotOf(store: ModelStore, fallbackName: string): ProjectSnapshot {
  const project = store.all('projects')[0];
  const name = typeof project?.name === 'string' && project.name ? project.name : fallbackName;
  return {
    name,
    useCases: store.all('useCases')
      .filter(isExposed)
      .map((uc) => ({ id: uc.id, name: typeof uc.name === 'string' ? uc.name : uc.id })),
  };
}

const isExposed = (useCase: Element) => EXPOSED.some((field) => useCase[field] === true);

/**
 * The external system a snapshot becomes.
 *
 * Its use cases are copied under ids of this project's own making — `{system}-{their id}` — so two
 * referenced projects that happen to share a use-case id do not collide, and so it stays obvious
 * that these are copies rather than the other project's elements.
 */
export function referenceElement(
  id: string, snapshot: ProjectSnapshot, coordinate: Record<string, unknown>,
): Element {
  return {
    id,
    name: snapshot.name,
    description: t('store.default.referencedProjectDescription'),
    decisionIds: [],
    useCases: snapshot.useCases.map((uc) => ({ id: `${id}-${uc.id}`, name: uc.name })),
    referencedProject: coordinate,
  };
}

/** A stable id from the coordinate: the repository's name, else the path's last segment. */
export function referenceIdFor(coordinate: { gitUrl?: string; path?: string }): string {
  const source = coordinate.gitUrl ?? coordinate.path ?? '';
  const parts = source.replace(/\.git\/*$/, '').split(/[/:]/).filter(Boolean);
  while (parts.length > 1 && ['modux', '.', '..', '~'].includes(parts.at(-1)!)) parts.pop();
  const name = (parts.at(-1) ?? '').replace(/[^A-Za-z0-9._-]/g, '-');
  return `proj-${name && name !== 'modux' ? name : 'referencia'}`;
}
