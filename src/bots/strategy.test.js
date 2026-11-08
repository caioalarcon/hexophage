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
