// Exercise the default production policies in the same spherical engine as the browser.
const assert = require('node:assert/strict');

(async () => {
  const { createHeadlessMatch } = await import('../src/match/headless.js');
  const { buildSphere } = await import('../src/world/sphere.js');
  const { world, game, nextTick } = createHeadlessMatch(buildSphere(64));
  const bots = game.players.slice(1);
  const orders = bots.map(() => []);
  for (let t = 1; t <= 560; t++) {
    const previous = bots.map(p => p.stampedEnergy);
    nextTick();
    bots.forEach((p, index) => {
      const cost = p.stampedEnergy - previous[index];
      if (cost) orders[index].push({ t, cost });
    });
  }
  const price = game.economy.stampCost;
  orders.forEach((history, index) => {
    const bot = bots[index];
    assert.deepEqual(history[0], { t: 1, cost: 3 * price });
    assert(history[1].t > 100, 'save the Flipper surplus for a productive core');
    assert([5, 6, 12].includes(history[1].cost / price), 'buy a bridge farm');
    assert(history.some(o => o.cost === 36 * price), bot.name + ' bought a grower');
    assert(bot.eroded === 0 && bot.reserve >= 0, 'budget for maturation');
    assert(world.ownerCells[bot.id].length > 36 && bot.lastFlow > 1, 'field produces');
  });
  const raider = bots.length - 1;
  const firstGrower = orders[raider].find(o => o.cost === 36 * price).t;
  assert(orders[raider].some(o => o.t > firstGrower && o.cost === 6 * price), 'fund a raid');
  console.log('PASS: all five bots funded a Flipper, bridge and grower; first growers at ' +
    orders.map(h => h.find(o => o.cost === 36 * price).t).join(', '));
})().catch(error => { console.error(error); process.exitCode = 1; });
