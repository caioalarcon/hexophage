import test from 'node:test';
import assert from 'node:assert/strict';
import { globeWireLines } from './edge-lines.js';

test('wire generation emits one segment per undirected edge and reuses the cache', () => {
  // Each face has three edges in this tetrahedral mesh.
  const graph = {
    n: 4,
    edges: 6,
    deg: new Uint8Array([3, 3, 3, 3]),
    adj: new Uint32Array(24),
    polygons: new Float32Array(72),
  };
  for (let id = 0; id < 4; id++) {
    graph.adj.set(
      [0, 1, 2, 3].filter((n) => n !== id),
      id * 6,
    );
    for (let k = 0; k < 3; k++) graph.polygons.set([id, k, 1], id * 18 + k * 3);
  }
  assert.equal(globeWireLines(null), null);
  const wire = globeWireLines(graph);
  assert.equal(wire.length, 6 * 6);
  assert.deepEqual(Array.from(wire.subarray(0, 6)), [0, 0, 1, 0, 1, 1]);
  assert.strictEqual(globeWireLines(graph), wire);
});
