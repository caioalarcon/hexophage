import test from 'node:test';
import assert from 'node:assert/strict';
import { nearestGlobeVertex } from './nearest-vertex.js';

test('picking walks several graph edges to the nearest vertex and keeps a tied seed', () => {
  const coords = new Float32Array([1, 0, 0, 0, 1, 0, -1, 0, 0, 0, -1, 0]);
  const adj = new Uint32Array(4 * 6);
  for (let i = 0; i < 4; i++) adj.set([(i + 1) % 4, (i + 3) % 4], i * 6);
  const graph = { coords, adj, deg: new Uint8Array([2, 2, 2, 2]) };
  assert.equal(nearestGlobeVertex(graph, [-1, 0, 0], 0), 2);
  assert.equal(nearestGlobeVertex(graph, [1, 1, 0], 0), 0);
});
