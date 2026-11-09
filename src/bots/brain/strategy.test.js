import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessMatch } from '../../match/headless.js';
import { compileHexRule } from '../../simulation/rules.js';
import { plantFounder } from '../../match/founding.js';
import { buildSphere } from '../../world/sphere.js';
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
    assert(metrics.visits <= 8192 + 4096 * 96);
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

test('front signatures can relocate a rotated economic context and reject an intervening cell', () => {
  const m = createHeadlessMatch(buildSphere(40));
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
  const m = createHeadlessMatch(buildSphere(32), { rule: 'custom', notation:'B2/S035', botMode:'learn',
    brain: { seed:4751, budget:4000, spacing:4, horizon:64 },
    economy: { policy:'stability', stableAfter:2, stableEnergy:8, stampCost:.05, initialCells:1000, birthCost:0 },
    interval:2 });
  for (const p of m.game.players) assert(m.commitStamp(p.id, [p.seed], false));
  for (let g = 0; g < 500 && !m.game.ended && !m.game.brainMetrics?.tactical; g++) m.nextTick();
  assert(m.game.brainMetrics.tactical > 0);
  assert(m.game.brainMetrics.invalidated > 0, 'stale comparisons cannot unconditionally authorize a purchase');
});

test('missed interventions and effects cropped at the boundary cannot authorize projected attacks', () => {
  const agent = { payback:240000, rivalWeight:1 };
  const base = { boundary:false, ownUnfunded:false, turns:64,
    ownFlow:10, rivalFlow:0, ownCash:-100, rivalCash:0, rivalDeferredMid:0, rivalDeferredFlow:0, rivalDeferredTrend:0 };
  assert.equal(evaluateTrial(base, agent, 'rival').acceptable, false);
  assert.equal(evaluateTrial({...base, boundary:true, rivalFlow:-1, rivalDeferredMid:-1,
    rivalDeferredFlow:-2, rivalDeferredTrend:-.1}, agent, 'rival').acceptable, false);
});

test('real losses trigger a bounded search for productive alternatives after the late observation', () => {
  const m = createHeadlessMatch(buildSphere(40), { botMode: 'learn', brain: { seed: 4751 } });
  assert(plantFounder(m.world, m.game, m.game.players[0], m.commitStamp));
  while (m.world.gen < 4000) m.nextTick();
  assert.equal(m.game.brainMetrics.studies, 0, 'short-term costs alone cannot trigger rescue spending');
  while (m.world.gen < 16000) m.nextTick();
  const { studies, rescues, visits } = m.game.brainMetrics;
  assert(studies > rescues && rescues > 0);
  assert(visits <= 8192 + m.world.gen * 96);
  m.game.economy.stableEnergy *= 2;
  m.invalidateBrain();
  while (m.world.gen < 16500) m.nextTick();
  assert.equal(m.game.brainMetrics.studies, studies, 'new tariffs discard the old recovery mandate');
});
