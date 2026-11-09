// Paired transfer study. Both legal stamps have known outcomes on B2/S035:
// the singleton stays in place and the adjacent pair oscillates. Blind bots
// see their shapes and economic feedback; reversing the tariffs reverses the
// profitable opening. A fixed human opponent plants one singleton and waits.
import assert from 'node:assert/strict';
import { createBrainArchive } from '../../src/bots/brain/memory.js';
import { createHeadlessMatch } from '../../src/match/headless.js';
import { explorationGameplay } from '../../src/match/gameplay.js';
import { ruleProfiles } from '../../src/match/rule-profiles.js';
import { patterns } from '../../src/patterns/catalog.js';
import { compileTotalistic } from '../../src/simulation/rules.js';
import { buildSphere } from '../../src/world/sphere.js';

const graph = buildSphere(32), generations = 2048;
const rule = 'transfer-study';
ruleProfiles[rule] = { physics: compileTotalistic('B2/S035'),
  gameplay: explorationGameplay(patterns.custom.filter(p => p.id === 'single' || p.id === 'pair')) };
const storage = (data = null) => ({ data, getItem() { return this.data; }, setItem(_, value) { this.data = value; } });

function play(seed, policy, store) {
  const match = createHeadlessMatch(graph, { rule, botMode: 'learn',
    economy: { policy, stableAfter: 2, stableEnergy: 1, birthCost: 3, stampCost: 10,
      initialCells: 40, productionScale: 0, combatFee: 0 },
    brain: { archive: createBrainArchive(store), seed } });
  const { world, game } = match, bots = game.players.slice(1);
  const profitable = policy === 'activity' ? 'pair' : 'single';
  assert(match.commitStamp(1, [game.players[0].seed], false));
  const first = new Map();
  while (world.gen < generations && !game.ended) {
    match.nextTick();
    for (const p of bots) if (p.stamps && !first.has(p.id)) {
      const [id] = Object.keys(game.brainMetrics.byBot[p.id].patterns);
      first.set(p.id, { generation: world.gen, profitable: id === profitable, trials: game.brainMetrics.byBot[p.id].completed });
    }
  }
  const result = { seed, priorSamples: game.brainMemory?.stats().priorSamples ?? 0,
    opened: first.size, goodOpenings: [...first.values()].filter(v => v.profitable).length,
    openDelay: bots.reduce((n, p) => n + (first.get(p.id)?.generation ?? generations + 1), 0) / bots.length,
    openingTrials: bots.reduce((n, p) => n + (first.get(p.id)?.trials ?? game.brainMetrics.byBot[p.id].completed), 0) / bots.length,
    cashGain: bots.reduce((n, p) => n + p.reserve - game.init, 0),
    actions: game.brainMetrics.actions };
  game.brainMemory?.finish();
  return result;
}

for (const policy of ['stability', 'activity']) {
  const training = storage();
  for (const seed of [11, 23, 37]) play(seed, policy, training);
  const pairs = [41, 53, 67, 71, 83, 97, 101, 113].map(seed => ({
    cold: play(seed, policy, storage()), warm: play(seed, policy, storage(training.data)),
  }));
  const average = (side, key) => pairs.reduce((sum, pair) => sum + pair[side][key], 0) / pairs.length;
  console.log(JSON.stringify({ policy, F: graph.f, generations,
    meanCold: Object.fromEntries(['opened','goodOpenings','openDelay','openingTrials','cashGain'].map(k => [k, average('cold', k)])),
    meanWarm: Object.fromEntries(['opened','goodOpenings','openDelay','openingTrials','cashGain'].map(k => [k, average('warm', k)])),
    cashImproved: pairs.filter(p => p.warm.cashGain > p.cold.cashGain).length, pairs }));
}
