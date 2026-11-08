// Integration regression: real spherical graph, real engine, real bot planner.
// Run: node tests/bot-isolation.cjs (no dependencies).
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

// Import the same headless modules used by the client. The test exercises real
// six-player turns with taxes disabled to isolate self-interference.
(async () => {
  const { createHeadlessMatch } = await import('../src/match/headless.js');
  const { buildSphere } = await import('../src/world/sphere.js');
  const { world, game, nextTick } = createHeadlessMatch(buildSphere(64), {
    init: 100000,
    tax: 0,
    interval: 8,
  });
  const oracle = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'oracle-populations.json')));
  const planted = Array.from({ length: 5 }, () => []);
  const previous = Array(5).fill(0);
  for (let t = 1; t <= 600; t++) {
    nextTick();
    for (let b = 0; b < 5; b++) {
      const bot = game.players[b + 1];
      if (bot.stamps > previous[b]) {
        assert.equal(bot.stamps, previous[b] + 1);
        planted[b].push(world.gen);
        previous[b] = bot.stamps;
      }
      const period = oracle[bot.pattern];
      const expected = planted[b].reduce((sum, gen) => sum + period[(world.gen - gen) % period.length], 0);
      assert.equal(
        world.ownerCells[bot.id].length,
        expected,
        'Bot ' + bot.pattern + ' interferiu na própria população na geração ' + world.gen
      );
    }
  }
  console.log(
    'PASS: 5 osciladores, 600 gerações, esfera f64 (' +
      world.graph.n +
      ' células), carimbos: ' +
      previous.join(', ') +
      '. Sem autocolisões.'
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
