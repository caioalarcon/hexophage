import test from 'node:test';
import assert from 'node:assert/strict';
import { botSpiralPlan, nextBotAnchor } from './spiral.js';
import { createFootprintLookup } from './oscillator-footprint.js';
import { runBotTurns } from './turns.js';
import { patterns } from '../patterns/catalog.js';
import { buildSphere } from '../world/sphere.js';
import { createSimulationState } from '../simulation/state.js';
import { initRuleTables } from '../simulation/rules.js';
import { sphereSpawns } from '../match/spawns.js';

test('the six spawn sectors and spiral ties preserve the original f20 order', () => {
  const graph = buildSphere(20);
  const seeds = sphereSpawns(graph);
  assert.deepEqual(seeds, [118, 2871, 815, 2275, 2070, 3341]);
  const plan = botSpiralPlan(graph, seeds[1]);
  assert.deepEqual(
    Array.from({ length: 16 }, () => nextBotAnchor(graph, plan)),
    [
      2871, 2884, 2872, 2858, 2857, 2870, 2883, 2885, 2873, 2859, 2844, 2843, 2842, 2856, 2869,
      2882,
    ],
  );
});

test('guard footprints include the full cycle and neighbours of every default oscillator', () => {
  const world = createSimulationState();
  initRuleTables(world);
  const { botProtectedOffsets } = createFootprintLookup(world);
  const expected = { osc42: 94, osc66: 144, osc9: 120, osc14: 85, osc18: 125 };
  for (const [id, size] of Object.entries(expected)) {
    const pattern = patterns.callahan.find((p) => p.id === id);
    const offsets = botProtectedOffsets(pattern);
    assert.equal(new Set(offsets.map((o) => o.join(','))).size, size);
    assert.equal(botProtectedOffsets(pattern), offsets);
  }
  assert.throws(() => botProtectedOffsets({ id: 'osc3', rle: 'o!' }), /estacionário/);
});

test('each live bot uses its own strategy in player order on the configured turn', () => {
  const world = { gen: 3 },
    game = {
      interval: 4,
      ended: false,
      players: Array.from({ length: 6 }, (_, i) => ({ id: i + 1, out: i === 2 })),
    };
  const actions = [],
    standard = (p) => actions.push(p.id),
    custom = new Map([[5, (p) => actions.push(-p.id)]]);
  runBotTurns(world, game, standard, custom);
  assert.deepEqual(actions, []);
  world.gen = 4;
  runBotTurns(world, game, standard, custom);
  assert.deepEqual(actions, [2, 4, -5, 6]);
  game.ended = true;
  runBotTurns(world, game, standard, custom);
  assert.equal(actions.length, 4);
});

test('investment quotes reprice seed, warm-up and sustained flow after live slider changes', async () => {
  const { DEFAULT_ECONOMY } = await import('../match/constructive-economy.js');
  const { createInvestmentQuotes } = await import('./investments.js');
  const economy = { ...DEFAULT_ECONOMY, stableEnergy: 3, stableAfter: 16, stampCost: 30, productionScale: 0 };
  const quote = createInvestmentQuotes(economy);
  assert.deepEqual(quote('p2'), { id: 'p2', budget: 118, yield: 1 });
  assert.equal(quote('censo-oscillator-6-p2-1').budget, 222);
  economy.birthCost = 2;
  assert.equal(quote('p2').yield, -1);
  economy.stableAfter = 2;
  economy.birthCost = 1;
  assert.equal(quote('p2').budget, 90);
  economy.stableAfter = 1024;
  assert.deepEqual(quote('p2'), { id: 'p2', budget: 90 + 2 * 1022, yield: 1 });
  economy.productionScale = 1;
  assert(quote('p2').yield < 0);
});

test('a legal glider raid reaches a mature C6 and cuts its real income', async () => {
  const { createHeadlessMatch } = await import('../match/headless.js');
  const { decodeRLE } = await import('../patterns/rle.js');
  const { raidMatureCore } = await import('./raids.js');
  const graph = buildSphere(32);
  const idle = new Map([2,3,4,5,6].map(id => [id, () => {}]));
  const core = patterns.callahan.find(p => p.id === 'censo-oscillator-6-p2-1');
  const outcome = raiding => {
    const match = createHeadlessMatch(graph, { init: 1e6, economy: { stableAfter: 16 }, strategies: idle });
    const { game, world, commitStamp, nextTick, patchForStamp } = match;
    assert(commitStamp(2, patchForStamp(graph.farthest, 0, decodeRLE(core.rle)), false));
    for (let t = 0; t < 32; t++) nextTick();
    if (raiding) {
      assert(raidMatureCore(world, game, game.players[5], commitStamp));
      assert.equal(game.players[5].stampedEnergy, 6 * game.economy.stampCost);
    }
    for (let t = 0; t < 64; t++) nextTick();
    return game.players[1].stable;
  };
  assert.equal(outcome(false), 6);
  assert.equal(outcome(true), 0);
});

test('a saturated mature colony cannot finance another moving front by duplicating its field', async () => {
  const { growthMargin } = await import('./growth-strategy.js');
  const { DEFAULT_ECONOMY } = await import('../match/constructive-economy.js');
  assert(growthMargin(DEFAULT_ECONOMY, 120000, 1) < 0);
  assert(growthMargin({...DEFAULT_ECONOMY, productionScale: 0}, 120000, 1) > 0);
});
