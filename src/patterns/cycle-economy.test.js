import test from 'node:test';
import assert from 'node:assert/strict';
import { atlasPatterns } from './atlas-data.js';
import { DEFAULT_ECONOMY } from '../match/constructive-economy.js';
import { analyzePatternCycles, cycleWindow } from './cycle-economy.js';

const pattern = id => atlasPatterns.find(p => p.id === id);
const measure = (id, settings = {}, options = {}) =>
  analyzePatternCycles(pattern(id), { ...DEFAULT_ECONOMY, ...settings }, options);

test('the flipper survives its warm-up, then slowly pays back its stamp', async () => {
  const a = await measure('p2');
  assert.equal(a.initialCost, 90);
  assert.equal(a.firstPositiveCycle, 8);
  assert.equal(a.paybackGeneration, 132);
  assert.equal(a.workingCapital, 28);
  assert.equal(a.firstErosionGeneration, null);
  assert.deepEqual(a.rows[0], {
    cycle: 1, from: 1, to: 2, births: 4, stableCellTurns: 0,
    income: 0, upkeep: 4, fixedCore: 1, fixedIncome: 0, net: -4, cumulative: -94, live: 3,
  });
  assert.deepEqual(a.rows.slice(7).map(r => r.net), Array(a.rows.length - 7).fill(2));
});

test('all three translating ships consume more energy than their surviving cells produce', async () => {
  for (const [id, netPerCycle] of [['glider', -20], ['p15', -48], ['p48', -208]]) {
    const a = await measure(id, {}, { cycles: 5 });
    assert.equal(a.paybackGeneration, null);
    assert.equal(a.firstErosionGeneration, 0); // Cannot stamp with the starting allowance.
    assert(a.rows.every(r => r.net < 0), id);
    assert.equal(a.rows.at(-1).net, netPerCycle);
    if (id === 'glider') assert(a.rows.every(r => r.income === 0));
  }
});

test('the age and energy sliders apply to the very next quote', async () => {
  const warm = await measure('p2', { stableAfter: 3 }, { cycles: 2 });
  assert.deepEqual(warm.rows.map(r => [r.fixedCore, r.fixedIncome, r.net]), [[1, 3, -1], [1, 6, 2]]);
  const young = await measure('p2', { stableAfter: 0 }, { cycles: 2 });
  assert.deepEqual(young.rows.map(r => r.income), [18, 18]);
  assert.equal(young.workingCapital, 0);
  assert.equal(young.firstErosionGeneration, null);
  const bothZero = await measure('p2', { stampCost: 0, birthCost: 0, stableEnergy: 0 });
  assert.equal(bothZero.paybackGeneration, 0);
  assert.equal(bothZero.firstPositiveCycle, null);
  assert.equal(bothZero.profitableFromCycle, null);
  assert.equal(bothZero.firstErosionGeneration, null);
});

test('emitting ships eventually costs the P20 gun more than its core produces', async () => {
  const a = await measure('gun20', {}, { cycles: 15 });
  assert.equal(a.cycleLength, 20);
  assert.equal(a.kind, 'emission');
  assert.deepEqual(a.rows.slice(11, 15).map(r => r.net), [113, 13, -87, -187]);
  assert.equal(a.profitableFromCycle, null);
  assert.equal(a.initialCost, 1560);
  assert.equal(a.paybackGeneration, 48);
  assert(a.rows.slice(1).every(r => r.fixedIncome === 1620));
});

test('the grower requires savings, then earns more as its stable core expands', async () => {
  const a = await measure('stalk', {}, { cycles: 3 });
  assert.equal(a.kind, 'window');
  assert.deepEqual(a.rows.map(r => [r.births, r.fixedCore, r.fixedIncome, r.net]),
    [[121, 30, 540, 488], [117, 47, 2574, 2478], [121, 60, 3441, 3389]]);
  assert.equal(a.initialCost, 1080);
  assert.equal(a.workingCapital, 86);
  assert.equal(a.firstErosionGeneration, 0);
  assert.equal(a.paybackGeneration, 26);
});

test('emission windows are distinct from closed oscillator periods; superseded work can abort', async () => {
  assert.deepEqual(cycleWindow(pattern('p2')), { kind: 'period', length: 2 });
  assert.deepEqual(cycleWindow(pattern('gun43')), { kind: 'emission', length: 86 });
  assert.deepEqual(cycleWindow(pattern('gun840')), { kind: 'emission', length: 840 });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(measure('gun840', {}, { signal: controller.signal }), { name: 'AbortError' });
});
