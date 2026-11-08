import test from 'node:test';
import assert from 'node:assert/strict';
import { aperture, axialFromPixels, chartWithinBudget, layoutFor } from './hex-layout.js';

test('all six neighbors of the screen origin are reciprocal and hit their own center', () => {
  const layout = layoutFor(175, 121, 1);
  const origin = layout.cells[layout.origin];
  assert.equal(origin.key, '0,0');
  const deltas = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ];
  for (const [direction, [q, r]] of deltas.entries()) {
    const neighbor = layout.adj[layout.origin * 6 + direction];
    assert.equal(layout.cells[neighbor].key, q + ',' + r);
    assert.equal(layout.adj[neighbor * 6 + ((direction + 3) % 6)], layout.origin);
    const hit = axialFromPixels(Math.sqrt(3) * 12 * (q + r / 2), 18 * r);
    assert.equal(hit.q + ',' + hit.r, q + ',' + r);
  }
});

test('empty space beyond the edge of the window is excluded from adjacency', () => {
  const layout = layoutFor(175, 121, 1);
  for (const row of layout.ranges) {
    assert.equal(layout.adj[row.start * 6 + 3], -1);
    assert.equal(layout.adj[(row.start + row.last - row.first) * 6], -1);
  }
  assert.deepEqual(aperture(175, 121), { cx: 87.5, cy: 60.5, x0: 0, y0: 0, x1: 175, y1: 121 });
});

test('fractional zoom reuses the layout for the same set of visible hexagons', () => {
  const layout = layoutFor(320, 240, 1);
  assert.strictEqual(layoutFor(320, 240, 1.00000001), layout);
  assert.notStrictEqual(layoutFor(320, 240, 2), layout);
});

test('local-chart admission avoids expansive charts before allocating the lattice', () => {
  const viewport = { width: 1024, height: 768 };
  assert.equal(chartWithinBudget(viewport, 0), false);
  assert.equal(chartWithinBudget(viewport, 0.125), false);
  assert.equal(chartWithinBudget(viewport, 2), true);
});
