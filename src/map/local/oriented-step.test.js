import test from 'node:test';
import assert from 'node:assert/strict';
import { reverseSlot, stepPose } from './oriented-step.js';

// Two adjacent hexagons with edge 1 at A facing edge 5 at B.
function pair() {
  const adj = new Uint32Array(12).fill(2);
  adj[1] = 1;
  adj[6 + 5] = 0;
  return { adj, deg: new Uint8Array([6, 6]) };
}

test('oriented transport returns to the original pose on either side of the surface', () => {
  const graph = pair();
  for (const side of [-1, 1]) {
    const next = stepPose(graph, 0, 1, 0, side);
    assert.equal(next.id, 1);
    assert.deepEqual(stepPose(graph, next.id, next.ori, 3, side), { id: 0, ori: 1 });
  }
});

test('cached and uncached reverse-edge lookups agree and a pentagon blocks a step', () => {
  const graph = pair();
  assert.equal(reverseSlot(graph, 0, 1), 5);
  graph.backSlot = new Uint8Array(12);
  graph.backSlot[1] = 5;
  assert.equal(reverseSlot(graph, 0, 1), 5);
  graph.deg[1] = 5;
  assert.equal(stepPose(graph, 0, 1, 0, 1), null);
});
