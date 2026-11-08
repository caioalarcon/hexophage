import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawGPULayer } from './layer.js';

test('a globe layer binds xyz positions and styles the requested range of primitives', () => {
  const calls = [];
  const gl = { ARRAY_BUFFER: 5, FLOAT: 6 };
  for (const name of ['bindBuffer', 'enableVertexAttribArray', 'vertexAttribPointer', 'uniform4fv', 'uniform1f', 'drawArrays']) {
    gl[name] = (...args) => calls.push([name, ...args]);
  }
  const gpu = { gl, attr: 2, uni: { color: 'color', pointSize: 'size', circles: 'circles' } };
  const color = [1, 0.5, 0.25, 1];
  drawGPULayer(gpu, 'positions', 'POINTS', 3, color, 11, true, 7);
  assert.deepEqual(calls, [
    ['bindBuffer', 5, 'positions'], ['enableVertexAttribArray', 2],
    ['vertexAttribPointer', 2, 3, 6, false, 0, 0], ['uniform4fv', 'color', color],
    ['uniform1f', 'size', 11], ['uniform1f', 'circles', 1], ['drawArrays', 'POINTS', 7, 3],
  ]);
  calls.length = 0;
  drawGPULayer(gpu, 'positions', 'LINES', 0, color, 1, false);
  assert.deepEqual(calls, []);
});
