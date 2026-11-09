import test from 'node:test';
import assert from 'node:assert/strict';
import { BAYS, compileTotalistic } from '../simulation/rules.js';
import { allocateCells, createPopulation } from '../simulation/population.js';
import { createSimulationState } from '../simulation/state.js';
import { advanceGeneration } from '../simulation/generation.js';
import { buildSphere } from '../world/sphere.js';
import { patchForStamp } from './spherical-patch.js';
import { advancePattern, patternOffset, seedPatternAges } from './planar-simulation.js';
import { analyzePatternCycles, AnalysisLimit } from './cycle-economy.js';
import { DEFAULT_ECONOMY } from '../match/constructive-economy.js';

test('Bays and custom rules evolve the same stamp on the plane and a hexagonal region of the sphere', () => {
  const graph = buildSphere(32);
  for (const physics of [BAYS, compileTotalistic('B1/S0')]) {
    const world = { ...createSimulationState(), ...allocateCells(graph.n), graph, physics };
    const population = createPopulation(world, {});
    const project = ages => patchForStamp(world, graph.farthest, 0, [...ages.keys()].map(patternOffset));
    let ages = seedPatternAges({ rle: '2o$2bo!' });
    for (const id of project(ages)) population.addLive(id, 1);
    for (let g = 0; g < 5; g++) {
      const turn = advancePattern(ages, 1, physics);
      assert.equal(advanceGeneration(world), turn.births);
      ages = turn.next;
      assert.deepEqual(new Set(world.ownerCells[1]), new Set(ages.size ? project(ages) : []));
    }
  }
});

test('S0 retains isolated sites and B0 births into the empty hexagonal torus belong to nobody', async () => {
  const seed = { period: 1, rle: 'o!' };
  const survivor = advancePattern(seedPatternAges(seed), 2, compileTotalistic('B/S0'));
  assert.deepEqual([...survivor.next], [[0,2]]);
  assert.equal(survivor.mature, 1);
  const physics = compileTotalistic('B0/S0');
  const vacuum = advancePattern(new Map(), 1, physics);
  assert.equal(vacuum.next.size, 64 ** 2);
  assert.deepEqual([vacuum.births, vacuum.mature], [0,0]);
  assert([...vacuum.next.values()].every(age => age === -1));
  assert.equal(advancePattern(vacuum.next, 1, physics).next.size, 0);
  const report = await analyzePatternCycles(seed, { ...DEFAULT_ECONOMY, stableAfter: 2 }, { physics, cycles: 1 });
  assert.deepEqual([report.rows[0].births, report.rows[0].stableCellTurns, report.rows[0].live], [0,1,1]);
});

test('unbounded growth stops with an explicit generation instead of an unbounded ledger computation', async () => {
  await assert.rejects(analyzePatternCycles({ rle: '20001o!', period: 1 }, DEFAULT_ECONOMY,
    { physics: BAYS, cycles: 1 }), error => error instanceof AnalysisLimit && /geração 0/.test(error.message));
});
