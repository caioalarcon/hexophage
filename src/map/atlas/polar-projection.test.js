import test from 'node:test';
import assert from 'node:assert/strict';
import { atlasCapInverse, atlasCapLon, trimCap } from './polar-projection.js';

test('an atlas longitude round-trips through each sector at both poles and all blends', () => {
  for (const latitude of [0, 1, 1.3, 1.55, -1.3, -1.55]) {
    for (const longitude of [-2.9, -2.1, -1.4, -0.4, 0.4, 1.4, 2.1, 2.9]) {
      for (const blend of [0, 0.25, 1]) {
        const mapped = atlasCapLon(longitude, latitude, blend);
        const inverse = atlasCapInverse(mapped, latitude, blend, false);
        assert.ok(Math.abs(inverse - longitude) < 1e-10);
      }
    }
  }
});

test('polar gaps reject clicks and a clamped drag lands on the sector meridian', () => {
  assert.equal(atlasCapInverse(0.01, Math.PI / 2, 1, false), null);
  assert.equal(atlasCapInverse(0.01, Math.PI / 2, 1, true), Math.PI / 4);
});

test('clipping a polygon against a polar seam preserves both intersection points', () => {
  const square = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  assert.deepEqual(trimCap(square, 0, 0, 1), [
    [0, -1],
    [1, -1],
    [1, 1],
    [0, 1],
  ]);
  assert.deepEqual(trimCap(square, 0, 2, 1), []);
  assert.deepEqual(trimCap([], 0, 0, 1), []);
});
