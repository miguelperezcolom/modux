import { describe, expect, it } from 'vitest';
import { archiPath } from '../modux-canvas.js';

// The Archi-style connection path: small curve at bends, a hop where it crosses an earlier line.
describe('archiPath', () => {
  it('draws a straight line as a plain segment', () => {
    expect(archiPath([{ x: 0, y: 0 }, { x: 100, y: 0 }], [])).toBe('M 0 0 L 100 0');
  });

  it('curves each bend with a 4px fillet', () => {
    const d = archiPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], []);
    expect(d).toBe('M 0 0 L 96 0 Q 100 0 100 4 L 100 100');
  });

  it('hops over a line drawn before it', () => {
    const d = archiPath([{ x: 0, y: 50 }, { x: 100, y: 50 }], [[{ x: 50, y: 0 }, { x: 50, y: 100 }]]);
    expect(d).toBe('M 0 50 L 45 50 A 5 5 0 0 1 55 50 L 100 50');
  });
});
