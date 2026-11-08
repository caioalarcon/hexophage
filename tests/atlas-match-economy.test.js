import assert from 'node:assert/strict';
import test from 'node:test';
import { createHeadlessMatch } from '../src/match/headless.js';
import { atlasPatterns } from '../src/patterns/atlas-data.js';
import { analyzePatternCycles } from '../src/patterns/cycle-economy.js';
import { decodeRLE } from '../src/patterns/rle.js';
import { buildSphere } from '../src/world/sphere.js';

test('atlas cycle ledgers match funded, isolated stamps in the actual game', async () => {
  const graph = buildSphere(128);
  const idleBots = new Map([2, 3, 4, 5, 6].map(id => [id, () => {}]));
  // All four structures start in a hexagonal region away from the pentagons.
  for (const [id, cycles] of [['p2', 16], ['glider', 6], ['stalk', 3], ['gun20', 12]]) {
    const pattern = atlasPatterns.find(p => p.id === id);
    const match = createHeadlessMatch(graph, { init: 1_000_000, strategies: idleBots });
    const player = match.game.players[0];
    const initialReserve = player.reserve;
    const cells = match.patchForStamp(graph.farthest, 0, decodeRLE(pattern.rle));
    assert(match.commitStamp(player.id, cells, false), id);

    const projection = await analyzePatternCycles(pattern, match.game.economy, { cycles });
    assert.equal(initialReserve - player.reserve, projection.initialCost, id);
    let payback = null;
    let extraReserve = 0;
    for (const row of projection.rows) {
      let income = 0, upkeep = 0, births = 0;
      for (let gen = row.from; gen <= row.to; gen++) {
        match.nextTick();
        income += player.lastIncome;
        upkeep += player.lastUpkeep;
        births += player.lastBirths;
        extraReserve = Math.max(extraReserve, initialReserve - projection.initialCost - player.reserve);
        if (payback === null && player.reserve >= initialReserve) payback = gen;
      }
      assert.deepEqual(
        [row.births, row.income, row.upkeep, row.net, row.cumulative, row.live],
        [births, income, upkeep, income - upkeep, player.reserve - initialReserve, match.world.activeCount],
        id + ' at generation ' + row.to,
      );
    }
    assert.equal(projection.workingCapital, extraReserve, id);
    assert.equal(projection.paybackGeneration, payback, id);
    assert.equal(player.eroded, 0, id);
  }
});
