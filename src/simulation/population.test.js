import test from 'node:test';
import assert from 'node:assert/strict';
import { createPopulation, allocateCells, fitIndexBuffer } from './population.js';
import { createSimulationState } from './state.js';
import { advanceGeneration } from './generation.js';
import { compileTotalistic } from './rules.js';

test('swap removal preserves both active and per-owner reverse indexes', () => {
  const world = { ...createSimulationState(), ...allocateCells(20), graph: { n: 20 } };
  const log = [];
  const population = createPopulation(world, {
    populationChanged: () => log.push('changed'),
    populationCleared: () => log.push('clear'),
    pause: () => log.push('pause'),
  });
  for (const [id, owner] of [
    [7, 1],
    [4, 2],
    [1, 1],
    [9, 2],
  ])
    assert(population.addLive(id, owner));
  assert.equal(population.addLive(7, 3), false);
  assert(population.removeLive(7));
  assert.equal(population.removeLive(7), false);
  for (const id of [4, 1, 9]) {
    assert.equal(world.active[world.positionsActive[id] - 1], id);
    assert.equal(world.ownerCells[world.owners[id]][world.ownerIndex[id] - 1], id);
  }
  world.nextActive[0] = 15;
  world.nextActiveCount = 1;
  world.nextOwners[15] = 3;
  world.next[15] = 1;
  population.clearCells();
  assert.deepEqual(log, [...Array(5).fill('changed'), 'pause', 'clear']);
  for (const list of [
    world.cells,
    world.owners,
    world.positionsActive,
    world.ownerIndex,
    world.next,
    world.nextOwners,
  ])
    assert.equal(list.some(Boolean), false);
  assert(world.ownerCells.every((list) => !list.length));
  assert.deepEqual(
    [world.gen, world.evaluated, world.nextActiveCount, world.activeCount],
    [0, 0, 0, 0],
  );
});

test('index buffer growth is bounded by the planet and retains initialized slots', () => {
  const initial = new Uint32Array([37, 98]);
  assert.equal(fitIndexBuffer(initial, 1, 3), initial);
  assert.deepEqual([...fitIndexBuffer(initial, 3, 3)], [37, 98, 0]);
});

test('B0 births examine empty space and then clear the previous dense generation', () => {
  const graph = { n: 7, deg: new Uint8Array(7).fill(6), adj: new Uint32Array(42) };
  for (let i = 0; i < 7; i++) for (let d = 0; d < 6; d++) graph.adj[6 * i + d] = (i + d + 1) % 7;
  const world = { ...createSimulationState(), ...allocateCells(7), graph };
  world.physics = compileTotalistic('B0/S');
  advanceGeneration(world);
  assert.equal(world.evaluated, 7);
  assert.deepEqual([...world.owners], Array(7).fill(7));
  advanceGeneration(world);
  assert.equal(world.activeCount, 0);
  world.physics = compileTotalistic('B2/S35');
  advanceGeneration(world);
  assert.equal(world.evaluated, 0);
  assert.deepEqual([...world.cells], Array(7).fill(0));
  assert.deepEqual([...world.owners], Array(7).fill(0));
});
