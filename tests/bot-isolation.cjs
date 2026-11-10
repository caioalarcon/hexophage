// Exercise the actual opening and the purchases of developed rivals using the spherical engine.
const assert = require('node:assert/strict');

(async () => {
  const { createHeadlessMatch } = await import('../src/match/headless.js');
  const { plantFounder } = await import('../src/match/founding.js');
  const { buildSphere } = await import('../src/world/sphere.js');
  const graph = buildSphere(64);
  const { STABILITY_ECONOMY } = await import('../src/match/constructive-economy.js');
  const standard = createHeadlessMatch(graph, {economy:STABILITY_ECONOMY});
  assert(plantFounder(standard.world, standard.game, standard.game.players[0], standard.commitStamp));
  standard.nextTick();
  const price = standard.game.economy.stampCost;
  for (const p of standard.game.players.slice(1)) {
    assert.equal(p.stamps, 1);
    assert.equal(p.stampedEnergy, 36 * price);
    assert.equal(p.reserve, standard.game.init - 36 * price);
    assert.equal(standard.world.ownerCells[p.id].length, 36);
  }
  for (let i = 1; i < 1000; i++) standard.nextTick();
  for (const p of standard.game.players.slice(1)) {
    assert(p.stamps >= 1, 'the bot can invest once the mature trail can afford it');
    assert.equal(p.eroded, 0);
  }

  // Finance the seeds sooner than the normal savings horizon, keeping actual
  // map placement, operating costs, erosion and policy decisions intact.
  function fundedOrders(economy) {
    const funded = createHeadlessMatch(graph, {init: 150 * price, economy:{...STABILITY_ECONOMY, ...economy}});
    assert(plantFounder(funded.world, funded.game, funded.game.players[0], funded.commitStamp));
    const bots = funded.game.players.slice(1), orders = bots.map(() => []);
    for (let t = 1; t <= 1200; t++) {
      const before = bots.map(p => p.stampedEnergy);
      funded.nextTick();
      bots.forEach((p,i) => {
        const spent = p.stampedEnergy - before[i];
        if (spent) orders[i].push(spent/price);
      });
    }
    assert(orders.every(history => history[0] === 36));
    assert(bots.every(p => p.eroded === 0 && p.reserve >= 0));
    return orders;
  }
  const poor = fundedOrders();
  for (const history of poor.slice(3)) {
    assert(history.includes(6), 'a rich treasury with weak income funds sorties');
    assert(!history.includes(64) && !history.includes(52), 'avoid an unsupported battery');
  }
  const rich = fundedOrders({stableEnergy: .4});
  assert(rich[0].includes(36, 1), 'expand when another front can sustain itself');
  assert(rich[1].includes(6), 'targeted P4 raid');
  assert(rich[3].includes(64), 'supported P42 battery');
  assert(rich[4].includes(52), 'supported P20 battery');
  console.log('PASS: all five bots opened with funded growers; distinct plans financed P4 raids and P42/P20 batteries');
})().catch(error => { console.error(error); process.exitCode=1; });
