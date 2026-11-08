import test from 'node:test';
import assert from 'node:assert/strict';
import { readStampOffsets, makeStampGrid } from './grid-coordinates.js';

test('grid to axial and back preserves every cell across odd/even center rows', () => {
  for (const size of [7, 11, 25, 41]) {
    const cells = Uint8Array.from({ length: size * size }, (_, i) => Number(i % 7 < 3));
    const offsets = readStampOffsets(cells, size);
    const result = makeStampGrid(size, offsets);
    assert.equal(result.clipped, 0);
    assert.deepEqual(result.cells, cells);
  }
});

test('reducing a stamp clips only offsets beyond the new grid and keeps row-major order', () => {
  const { cells, clipped } = makeStampGrid(7, [
    [0, 9],
    [1, 1],
    [0, 0],
    [-7, -7],
    [0, -2],
  ]);
  assert.equal(clipped, 2);
  assert.deepEqual(readStampOffsets(cells, 7), [
    [0, -2],
    [0, 0],
    [1, 1],
  ]);
  assert.equal(cells[3 * 7 + 3], 1);
});
