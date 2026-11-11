import type { Scene, ViewLayout } from './scene.js';

/**
 * The nodes an automatic layout arranges: the top-level boxes. Nested children are
 * placed from their container, and areas are frames their author drew.
 */
export function layoutableNodes(scene: Scene) {
  return scene.nodes.filter((n) => !n.parentId && n.kind !== 'area');
}

/**
 * Whether a view opens on a blank sheet that ELK should arrange: nobody ever placed any
 * of its boxes (a model written from a spec, or by hand, carries no geometry). As soon
 * as one box has a stored position the view belongs to its author and is left alone —
 * a new element then lands where its view puts it, not by moving everything else.
 */
export function needsInitialLayout(scene: Scene, layout: ViewLayout): boolean {
  const nodes = layoutableNodes(scene);
  if (nodes.length < 2) return false;
  return !nodes.some((n) => n.id in layout.nodes);
}
