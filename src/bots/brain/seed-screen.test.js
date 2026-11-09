import assert from 'node:assert/strict';
import test from 'node:test';
import { createHeadlessMatch } from '../../match/headless.js';
import { buildSphere } from '../../world/sphere.js';
import { beginLocalTrial } from './local-world.js';
import { emptyHexPatch, placement, stampCatalog } from './proposals.js';
import { createSeedScreen, marginalSeedFlow, quoteEmptySeed } from './seed-screen.js';

test('a certified empty hex patch reprices the same complete trajectory as the spherical simulator', () => {
  const graph = buildSphere(64);
  for (const [rule, id] of [['callahan','stalk'], ['bays','glider']]) {
    const m = createHeadlessMatch(graph, {rule});
    const {world, game} = m, p = game.players[1];
    const stamp = stampCatalog(game.gameplay.patterns).find(s => s.id === id);
    const pose = placement(world, {target: graph.farthest, direction: 0}, stamp, 2, 0);
    p.stable = 103;
    p.lastBirths = 7;
    for (const threshold of [2, 256]) {
      const screen = createSeedScreen(world.physics);
      game.economy.stableAfter = threshold;
      while (!screen.run(stamp, threshold, 2400).done) {}
      const trace = screen.result(stamp);
      const radius = trace.reach + 2;
      assert(emptyHexPatch(world, pose, radius));
      const projected = quoteEmptySeed(trace, p, game.economy);
      const local = beginLocalTrial(world, game, p.id, pose.center, pose.ids, {radius, horizon:trace.turns}).step(trace.turns);
      assert(!local.boundary);
      for (const field of Object.keys(projected)) {
        if (typeof projected[field] === 'number')
          assert(Math.abs(projected[field] - local[field]) < 1e-6, field);
        else assert.equal(projected[field],local[field]);
      }
    }
    m.addLive(pose.ids[0], 7);
    assert(!emptyHexPatch(world, pose, 10));
  }
});

test('the same measured farm can earn at low saturation and drain a mature field', () => {
  const economy = {productionScale:10, stableEnergy:2, birthCost:1, policy:'stability'};
  assert(marginalSeedFlow(1, 5, {stable:0, lastBirths:0}, economy) > 0);
  assert(marginalSeedFlow(1, 5, {stable:200, lastBirths:0}, economy) < 0);
});
