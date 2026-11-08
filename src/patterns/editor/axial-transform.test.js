import test from 'node:test';
import assert from 'node:assert/strict';
import { transformOffsets } from './axial-transform.js';

test('horizontal reflection preserves the axial row and clockwise rotation turns by one hex direction', () => {
  const shape = [
    [2, 1],
    [-1, 2],
  ];
  assert.deepEqual(transformOffsets(shape, 'cw'), [
    [-1, 3],
    [-2, 1],
  ]);
  assert.deepEqual(transformOffsets(shape, 'ccw'), [
    [3, -2],
    [1, 1],
  ]);
  assert.deepEqual(transformOffsets(shape, 'flip'), [
    [-3, 1],
    [-1, 2],
  ]);
  assert.deepEqual(shape, [
    [2, 1],
    [-1, 2],
  ]);
});

test('six turns, two reflections or a turn followed by its inverse restore the offsets', () => {
  const original = [
    [2, 1],
    [-1, 2],
  ];
  let rotated = original;
  for (let i = 0; i < 6; i++) rotated = transformOffsets(rotated, 'cw');
  assert.deepEqual(rotated, original);
  assert.deepEqual(transformOffsets(transformOffsets(original, 'cw'), 'ccw'), original);
  assert.deepEqual(transformOffsets(transformOffsets(original, 'flip'), 'flip'), original);
});
