import test from 'node:test';
import assert from 'node:assert/strict';
import { editorGridLayout, editorCellAt } from './screen-grid.js';

test('every drawn cell center is picked on square, landscape and portrait editors', () => {
  const rect = { left: 115, top: 20 };
  for (const [width, height, size] of [
    [200, 200, 11],
    [400, 150, 25],
    [180, 270, 7],
  ]) {
    const layout = editorGridLayout(width, height, size);
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) {
        const x = rect.left + layout.ox + layout.dx * (c + 0.5 * (r & 1));
        const y = rect.top + layout.oy + layout.dy * r;
        const hit = editorCellAt(layout, rect, size, x, y);
        // Cube rounding at the coordinate origin can produce signed zero.
        assert.equal(hit.c + ',' + hit.r, c + ',' + r);
      }
  }
});

test('unmeasured or off-grid input is ignored and tiny viewports retain a positive radius', () => {
  const rect = { left: 0, top: 0 },
    layout = editorGridLayout(4, 5, 101);
  assert.equal(layout.r, 1);
  assert.equal(editorCellAt(null, rect, 101, 2, 2), null);
  assert.equal(editorCellAt(layout, rect, 101, -900, -900), null);
});
