import { describe, expect, it } from 'vitest';
import { needsInitialLayout } from '../initial-layout.js';
import type { Scene } from '../scene.js';

const box = (id: string, extra: Record<string, unknown> = {}) =>
  ({ id, label: id, x: 0, y: 0, w: 100, h: 60, kind: 'step', ...extra }) as Scene['nodes'][number];

const scene: Scene = {
  nodes: [box('a'), box('b'), box('child', { parentId: 'a' }), box('frame', { kind: 'area' })],
  edges: [],
};

describe('needsInitialLayout', () => {
  it('arranges a sheet nobody placed', () => {
    expect(needsInitialLayout(scene, { nodes: {}, edges: {} })).toBe(true);
  });

  it('leaves alone a sheet with any placed top-level box', () => {
    expect(needsInitialLayout(scene, { nodes: { b: { x: 10, y: 10 } }, edges: {} })).toBe(false);
  });

  it('ignores positions of nested children and areas when deciding', () => {
    const layout = { nodes: { child: { x: 1, y: 1 }, frame: { x: 2, y: 2 } }, edges: {} };
    expect(needsInitialLayout(scene, layout)).toBe(true);
  });

  it('has nothing to arrange with fewer than two boxes', () => {
    expect(needsInitialLayout({ nodes: [box('a')], edges: [] }, { nodes: {}, edges: {} })).toBe(false);
  });
});
