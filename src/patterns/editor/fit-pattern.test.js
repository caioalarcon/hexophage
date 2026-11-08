import test from 'node:test';
import assert from 'node:assert/strict';
import { fitStampPoints } from './fit-pattern.js';

test('fitting reserves one cell on either side and advances to the next supported size', () => {
  assert.deepEqual(
    fitStampPoints([
      [100, -50],
      [104, -50],
    ]),
    {
      n: 7,
      positions: [
        [1, 3],
        [5, 3],
      ],
    },
  );
  assert.deepEqual(
    fitStampPoints([
      [0, 0],
      [5, 0],
    ]),
    {
      n: 11,
      positions: [
        [3, 5],
        [8, 5],
      ],
    },
  );
});

test('fitting preserves the stagger of a pattern spanning successive rows', () => {
  const shape = [
    [2, 20],
    [3, 20],
    [2, 21],
    [2, 22],
  ];
  assert.deepEqual(fitStampPoints(shape), {
    n: 7,
    positions: [
      [3, 2],
      [4, 2],
      [3, 3],
      [4, 4],
    ],
  });
});

test('empty patterns reset to 11 and oversize patterns are rejected', () => {
  assert.deepEqual(fitStampPoints([]), { n: 11, positions: [] });
  assert.equal(
    fitStampPoints([
      [0, 0],
      [100, 0],
    ]),
    null,
  );
});
