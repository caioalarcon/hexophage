import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSphere } from '../world/sphere.js';
import { eastAt } from '../world/geometry.js';
import { patterns } from './catalog.js';
import { decodeRLE } from './rle.js';
import { patchForStamp } from './spherical-patch.js';

test('RLE maps columns and empty rows into signed axial offsets', () => {
  assert.deepEqual(decodeRLE('2bo$2o2$bo!'), [
    [2, 0],
    [-1, 1],
    [0, 1],
    [-2, 3],
  ]);
  assert.deepEqual(
    patterns.callahan.filter((p) => !p.group).map((p) => decodeRLE(p.rle).length),
    [64, 17, 25, 35, 21, 44],
  );
});

test('spherical stencils preserve east orientation, reject pentagons and avoid occupied neighbours', () => {
  const graph = buildSphere(20),
    world = { graph, cells: new Uint8Array(graph.n) },
    center = 2871;
  const orientation = eastAt(graph, center),
    offsets = [
      [0, 0],
      [1, 0],
      [0, 1],
      [-1, -1],
    ];
  assert.equal(orientation, 3);
  assert.deepEqual(patchForStamp(world, center, orientation, offsets), [2871, 2884, 2883, 2843]);
  assert.equal(patchForStamp(world, graph.pents[0], 0, [[0, 0]]), null);
  const onlyCenter = [[0, 0]];
  world.cells[2884] = 1;
  assert.equal(patchForStamp(world, center, orientation, onlyCenter, true), null);
  assert.deepEqual(patchForStamp(world, center, orientation, onlyCenter), [center]);
  world.cells.fill(0);
  assert.deepEqual(patchForStamp(world, center, orientation, onlyCenter, true), [center]);
});
