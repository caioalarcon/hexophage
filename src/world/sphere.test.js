import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSphere, sphereCorner, sphereStages } from './sphere.js';
import { sphereSpawns } from '../match/spawns.js';
import { allocateCells } from '../simulation/population.js';
import { reverseSlot, stepPose } from '../map/local/oriented-step.js';

test('every sphere has twelve pentagons and reciprocal, cyclic neighbour rings', () => {
  for (const f of [1, 2, 20]) {
    const g = buildSphere(f);
    assert.equal(g.n, 10 * f * f + 2);
    assert.equal(g.edges, 30 * f * f);
    assert.equal(new Set(g.pents).size, 12);
    const pents = new Set(g.pents);
    for (let v = 0; v < g.n; v++) {
      const degree = g.deg[v];
      assert.equal(degree, pents.has(v) ? 5 : 6);
      assert.equal(g.distance[v] === 0, pents.has(v));
      const ring = g.adj.subarray(6 * v, 6 * v + degree);
      assert.equal(new Set(ring).size, degree);
      if (degree === 5) assert.equal(g.adj[6 * v + 5], 0xffffffff);
      for (let k = 0; k < degree; k++) {
        const to = ring[k],
          back = reverseSlot(g, v, k);
        assert.equal(g.adj[6 * to + back], v);
        assert(g.adj.subarray(6 * to, 6 * to + g.deg[to]).includes(ring[(k + 1) % degree]));
        assert(Math.abs(g.distance[to] - g.distance[v]) <= 1);
        if (degree === 6 && g.deg[to] === 6) {
          for (const side of [-1, 1]) {
            const pose = stepPose(g, v, k, 0, side);
            assert.deepEqual(stepPose(g, pose.id, pose.ori, 3, side), { id: v, ori: k });
          }
        }
      }
    }
  }
});

test('cached and uncached corners normalize the centroid of the adjacent triangle', () => {
  for (const f of [8, 97]) {
    const g = buildSphere(f);
    assert.equal(Boolean(g.polygons), f <= 96);
    assert.equal(Boolean(g.backSlot), f <= 96);
    for (const v of [g.farthest, g.pents[0], g.pents[7], Math.floor(g.n / 2)]) {
      const degree = g.deg[v];
      for (let slot = 0; slot < degree; slot++) {
        const a = g.adj[6 * v + slot],
          b = g.adj[6 * v + ((slot + 1) % degree)];
        assert.equal(g.adj[6 * a + reverseSlot(g, v, slot)], v);
        const xyz = [0, 1, 2].map(
          (d) => g.coords[3 * v + d] + g.coords[3 * a + d] + g.coords[3 * b + d],
        );
        const len = Math.hypot(...xyz),
          out = new Float64Array([11, 0, 0, 0, 37]);
        assert.equal(sphereCorner(g, v, slot, out, 1), out);
        assert.equal(out[0], 11);
        assert.equal(out[4], 37);
        assert(Math.abs(Math.hypot(...out.subarray(1, 4)) - 1) < 1e-7);
        for (let d = 0; d < 3; d++) assert(Math.abs(out[d + 1] - xyz[d] / len) < 1e-7);
      }
    }
  }
});

test('incremental construction and synchronous progress produce identical graphs', () => {
  const events = [],
    sync = buildSphere(20, (v) => events.push(v));
  const iter = sphereStages(20),
    incremental = [];
  let entry = iter.next();
  while (!entry.done) {
    incremental.push(entry.value);
    entry = iter.next();
  }
  assert.deepEqual(incremental, events);
  assert(events.length >= 20);
  assert.deepEqual(
    events,
    [...events].sort((a, b) => a - b),
  );
  assert.deepEqual(entry.value, sync);
});

test('invalid sizes fail before world allocation', () => {
  for (const f of [0, -1, 1.5, 4097, NaN, Infinity, '20']) {
    assert.throws(() => buildSphere(f), /Frequência de esfera inválida/);
    assert.throws(() => sphereStages(f).next(), /Frequência de esfera inválida/);
  }
});

test('planet worker returns the same prepared graph, spawn sectors and transferable buffers', async (t) => {
  const events = [];
  // Emulate the Worker message boundary, including the transfer of ArrayBuffer ownership.
  const scope = {
    postMessage(value, transfer = []) {
      events.push(structuredClone(value, { transfer }));
    },
  };
  globalThis.self = scope;
  t.after(() => {
    delete globalThis.self;
  });
  await import('./planet.worker.js');
  const expected = buildSphere(20),
    expectedBuffers = allocateCells(expected.n);
  expected.spawnIds = sphereSpawns(expected);
  scope.onmessage({ data: 20 });
  const result = events.pop();
  assert.deepEqual(events.slice(-2), [{ p: 96 }, { p: 99 }]);
  assert.deepEqual(result.g, expected);
  assert.deepEqual(result.buffers, expectedBuffers);
  scope.onmessage({ data: 0 });
  assert.deepEqual(events.pop(), { error: 'Frequência de esfera inválida.' });
});
