import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessMatch } from '../../match/headless.js';
import { compileHexRule } from '../../simulation/rules.js';
import { plantFounder } from '../../match/founding.js';
import { buildSphere } from '../../world/sphere.js';
import { brainNamespace, createBrainArchive } from './memory.js';
import { explorationGameplay } from '../../match/gameplay.js';
import { evaluateTrial } from './strategy.js';
import { placement, recognizes, stampCatalog, witness } from './proposals.js';

test('cold openings use bounded probes and are invariant to hand/catalog ordering', () => {
  const graph = buildSphere(28);
  function play(reverse) {
    const m = createHeadlessMatch(graph, { botMode: 'learn', brain: { seed: 4751 } });
    const data = m.game.gameplay;
    if (reverse) m.game.gameplay = { ...data, patterns: [...data.patterns].reverse(),
      kit: Object.fromEntries(Object.entries(data.kit).reverse()) };
    for (let i = 0; i < 4096; i++) m.nextTick();
    const metrics = m.game.brainMetrics;
    assert(m.game.players.slice(1).every(p => p.stamps > 0));
    assert(metrics.visits <= 8192 + 4096 * 96 * m.game.brainRate);
    assert(metrics.completed > metrics.pilots);
    assert(metrics.observed > 0);
    return metrics.byBot;
  }
  assert.deepEqual(play(false), play(true));
});

test('every learner can compare a compact opening before a persistent B0 background occupies the planet', () => {
  const m = createHeadlessMatch(buildSphere(24), { botMode: 'learn', rule: 'custom', notation: 'B0/S0123456',
    brain: { seed: 4751 } });
  m.nextTick();
  assert(m.world.ownerCells[7].length > 0);
  assert(m.game.players.slice(1).every(p => p.stamps === 1));
  assert(m.game.brainMetrics.visits <= 5 * 2 * 2 * 91);
});

test('site-independent front signatures can relocate a rotated economic context and reject an intervening cell', () => {
  const m = createHeadlessMatch(buildSphere(40), {conflict:'legacy'});
  const pattern = stampCatalog([{id:'pair', rle:'2o!'}])[0];
  const [first, second] = m.game.players.map(p => p.seed);
  const from = placement(m.world, {target:first, direction:0}, pattern, 0, 3);
  const to = placement(m.world, {target:second, direction:2}, pattern, 0, 3);
  m.addLive(first, 2); m.addLive(second, 2);
  const seen = witness(m.world, from, 5, 256, 32);
  assert(recognizes(m.world, to, seen));
  m.addLive(to.center, 3);
  assert.equal(recognizes(m.world, to, seen), false);
  m.world.physics = compileHexRule((alive, mask) => alive || (mask & 1));
  const anchored = witness(m.world, from, 5, 256, 64);
  assert(recognizes(m.world, from, anchored));
  assert.equal(recognizes(m.world, to, anchored), false);
});

test('a learner actually commits an economically effective rival intervention in the live simulation', () => {
  const graph = buildSphere(32);
  let purchased = 0, stale = 0;
  for (const seed of [1, 2, 3, 4]) {
    const m = createHeadlessMatch(graph, { rule: 'custom', notation:'B2/S035', botMode:'learn',
      brain: { seed, budget:4000, spacing:4, horizon:64 },
      economy: { policy:'stability', stableAfter:2, stableEnergy:8, stampCost:.05, initialCells:1000, birthCost:0 },
      interval:2 });
    for (const p of m.game.players) assert(m.commitStamp(p.id, [p.seed], false));
    for (let g = 0; g < 1500 && !m.game.ended; g++) m.nextTick();
    purchased += m.game.brainMetrics.tactical;
    stale += m.game.brainMetrics.invalidated;
  }
  assert(purchased > 0);
  assert(stale > 0, 'stale comparisons cannot unconditionally authorize a purchase');
});

test('missed interventions and effects cropped at the boundary cannot authorize projected attacks', () => {
  const agent = { payback:240000, rivalWeight:1 };
  const base = { boundary:false, ownUnfunded:false, turns:64,
    ownFlow:10, rivalFlow:0, ownCash:-100, rivalCash:0, rivalDeferredMid:0, rivalDeferredFlow:0, rivalDeferredTrend:0 };
  assert.equal(evaluateTrial(base, agent, 'rival').acceptable, false);
  assert.equal(evaluateTrial({...base, boundary:true, rivalFlow:-1, rivalDeferredMid:-1,
    rivalDeferredFlow:-2, rivalDeferredTrend:-.1}, agent, 'rival').acceptable, false);
});

test('the initial survey funds an operating farm without waiting for a failed pilot to mature', () => {
  const m = createHeadlessMatch(buildSphere(96), { botMode: 'learn', brain: { seed: 4751 } });
  assert(plantFounder(m.world, m.game, m.game.players[0], m.commitStamp));
  while (m.world.gen < 4000) m.nextTick();
  const { studies, investments, visits } = m.game.brainMetrics;
  assert(studies > 0 && investments >= 5);
  assert(m.game.players.slice(1).some(p => p.flowAverage > 0));
  assert(visits <= 8192 + m.world.gen * 96 * m.game.brainRate);
});

test('losses from a measured mature crop veto an optimistic seed forecast under current prices', () => {
  const archive = createBrainArchive();
  const m = createHeadlessMatch(buildSphere(24), { botMode:'learn', rule:'custom', notation:'B/S0',
    brain:{ archive }, economy:{ stableAfter:2, stableEnergy:8, stampCost:10, birthCost:1 } });
  const single = m.game.gameplay.patterns.find(p => p.rle === 'o!');
  m.game.gameplay = explorationGameplay([single]);
  const taught = archive.open(brainNamespace(m.world, m.game));
  taught.observe(2, 'yield/mature', single.id, 1);
  taught.observe(2, 'yield/births', single.id, 10);
  taught.finish();
  for (let g = 0; g < 1000; g++) m.nextTick();
  assert(m.game.brainMetrics.completed > 0);
  assert(m.game.players.slice(1).every(p => p.stamps === 0));
});

test('a stranded learner can draw a single cell and only buys it when the rule makes that viable', () => {
  for (const [notation, purchases] of [['B/S0', 1], ['B/S', 0]]) {
    const m = createHeadlessMatch(buildSphere(24), {rule:'custom', notation, botMode:'learn',
      brain:{ seed:4751 }, economy:{stableAfter:2, stableEnergy:5, productionScale:0, stampCost:10, initialCells:1.5}});
    m.game.gameplay = explorationGameplay([m.game.gameplay.patterns.find(p => p.id === 'pair')]);
    for (let g = 0; g < 500; g++) m.nextTick();
    for (const bot of m.game.players.slice(1))
      assert.equal(m.game.brainMetrics.byBot[bot.id].patterns['manual/single'] ?? 0, purchases);
  }
});
