import test from 'node:test';
import assert from 'node:assert/strict';
import { atlasPatterns } from './atlas-data.js';
import { DEFAULT_ECONOMY } from '../match/constructive-economy.js';
import { analyzePatternCycles, cycleWindow } from './cycle-economy.js';

const pattern = id => atlasPatterns.find(p => p.id === id);
const measure = (id, settings = {}, options = {}) =>
  analyzePatternCycles(pattern(id), { ...DEFAULT_ECONOMY, ...settings }, options);

test('the flipper earns two per P2 cycle; the stamp itself earns no birth credit', async () => {
  const a = await measure('p2');
  assert.equal(a.initialCost, 30);
  assert.equal(a.firstPositiveCycle, 1);
  assert.equal(a.paybackGeneration, 30);
  assert.equal(a.workingCapital, 0);
  assert.equal(a.firstErosionGeneration, null);
  assert.deepEqual(a.rows[0], {
    cycle: 1, from: 1, to: 2, births: 4, maintenanceCellTurns: 2,
    income: 4, upkeep: 2, fixedCore: 1, fixedUpkeep: 2, net: 2, cumulative: -28, live: 3,
  });
});

test('the moving glider repays between cycle boundaries, with no fixed core', async () => {
  const a = await measure('glider');
  assert.equal(a.paybackGeneration, 17);
  assert.equal(a.firstErosionGeneration, 0); // Cannot stamp with the starting allowance.
  assert.deepEqual(a.rows.slice(0, 5).map(r => r.cumulative), [-46, -32, -18, -4, 10]);
  for (const row of a.rows) {
    assert.equal(row.fixedCore, 0);
    assert.equal(row.maintenanceCellTurns, 6);
    assert.equal(row.net, 14);
  }
});

test('the age threshold applies every generation, including warm-up and age-zero settings', async () => {
  const warm = await measure('p2', { stableAfter: 3 }, { cycles: 2 });
  assert.deepEqual(warm.rows.map(r => [r.fixedCore, r.fixedUpkeep, r.net]), [[1, 1, 3], [1, 2, 2]]);
  const young = await measure('p2', { stableAfter: 0 }, { cycles: 2 });
  assert.deepEqual(young.rows.map(r => r.upkeep), [6, 6]);
  assert.equal(young.workingCapital, 4);
  assert.equal(young.firstErosionGeneration, 1);
  const bothZero = await measure('p2', { stampCost: 0, upkeep: 0, birthEnergy: 0 });
  assert.equal(bothZero.paybackGeneration, 0);
  assert.equal(bothZero.firstPositiveCycle, null);
  assert.equal(bothZero.profitableFromCycle, null);
  assert.equal(bothZero.firstErosionGeneration, null);
});

test('a P20 emission cycle counts its detached offspring and its funded startup deficit', async () => {
  const a = await measure('gun20');
  assert.equal(a.cycleLength, 20);
  assert.equal(a.kind, 'emission');
  assert.deepEqual(a.rows.slice(0, 6).map(r => r.net), [-302, -232, -162, -92, -22, 48]);
  assert.equal(a.profitableFromCycle, 6);
  assert.equal(a.initialCost, 520);
  assert.equal(a.workingCapital, 829);
  assert.equal(a.paybackGeneration, 219);
  assert(a.rows.every(r => r.fixedUpkeep === 540));
  const funded = await measure('gun20', { stampCost: 25, initialCells: 85 });
  assert.equal(funded.firstErosionGeneration, 94); // Still positive at both preceding cycle boundaries.
  assert.equal(funded.workingCapital, 829);
  assert.equal(funded.paybackGeneration, 251);
});

test('growth adds continuously living positions and increases the bill in comparable windows', async () => {
  const a = await measure('stalk', {}, { cycles: 3 });
  assert.equal(a.kind, 'window');
  assert.deepEqual(a.rows.map(r => [r.births, r.fixedCore, r.fixedUpkeep, r.upkeep]),
    [[121, 30, 600, 793], [117, 47, 940, 1092], [121, 60, 1200, 1393]]);
  assert.equal(a.firstPositiveCycle, null);
  assert.equal(a.paybackGeneration, null);
});

test('emission windows are distinct from closed oscillator periods; superseded work can abort', async () => {
  assert.deepEqual(cycleWindow(pattern('p2')), { kind: 'period', length: 2 });
  assert.deepEqual(cycleWindow(pattern('gun43')), { kind: 'emission', length: 86 });
  assert.deepEqual(cycleWindow(pattern('gun840')), { kind: 'emission', length: 840 });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(measure('gun840', {}, { signal: controller.signal }), { name: 'AbortError' });
});
