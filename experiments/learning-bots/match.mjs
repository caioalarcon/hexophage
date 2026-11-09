// Play the real six-player match, then replay the exact same purchases without
// planning. Both timed runs include generation, economy, agents' turns and observation.
import assert from 'node:assert/strict';
import { createBrainArchive } from '../../src/bots/brain/memory.js';
import { createHeadlessMatch } from '../../src/match/headless.js';
import { plantFounder } from '../../src/match/founding.js';
import { buildSphere } from '../../src/world/sphere.js';

const [rule = 'bays', steps = '360000', freq = '320', rounds = '2', comparison = 'replay'] = process.argv.slice(2);
const graph = buildSphere(Number(freq)), archive = createBrainArchive(), seed = 4751;

function play(tape) {
  const strategies = new Map();
  const learning = !tape;
  const match = createHeadlessMatch(graph, { growth:'classic', conflict: 'legacy',
    rule, botMode: learning ? 'learn' : 'profile', strategies, brain: { archive, seed },
  });
  const { world, game } = match;
  const bots = game.players.slice(1);
  const opening = plantFounder(world, game, game.players[0], match.commitStamp);
  assert(opening);
  const orders = tape ?? bots.map(() => []);
  const position = bots.map(() => 0);
  if (!learning) bots.forEach((p, i) => strategies.set(p.id, () => {
    const order = orders[i][position[i]];
    if (order?.gen === world.gen) {
      assert(match.commitStamp(p.id, order.cells, false));
      position[i]++;
    }
  }));
  const stampCounts = bots.map(p => p.stamps), expenses = bots.map(p => p.stampedEnergy);
  let maxPopulation = 0;
  const start = performance.now();
  while (world.gen < Number(steps) && !game.ended) {
    match.nextTick();
    maxPopulation = Math.max(maxPopulation, world.activeCount);
    if (world.gen % 30000 === 0) console.error(rule, learning ? 'learn' : 'replay',
      'G' + world.gen, world.activeCount + ' live', Math.round((performance.now() - start) / 1000) + 's');
    for (const [i, p] of bots.entries()) {
      if (stampCounts[i] === p.stamps) continue;
      const count = (p.stampedEnergy - expenses[i]) / game.economy.stampCost;
      if (learning) orders[i].push({ gen: world.gen, cells: world.ownerCells[p.id].slice(-count) });
      stampCounts[i] = p.stamps;
      expenses[i] = p.stampedEnergy;
    }
  }
  const elapsedMs = performance.now() - start;
  const result = game.players.map(p => ({ cash: Math.round(p.reserve), cells: world.ownerCells[p.id].length,
    purchases: p.stamps, flowAverage: p.flowAverage, totalFlow: Math.round(p.received - p.paid), out: p.out }));
  const memory = game.brainMemory?.stats();
  game.brainMemory?.finish();
  if (!learning) assert.deepEqual(position, orders.map(row => row.length));
  return { graphCells: graph.n, generations: world.gen, elapsedMs, maxPopulation, result,
    ended: game.ended, winner: game.winner, memory, brain: game.brainMetrics, orders };
}

for (let round = 0; round < Number(rounds); round++) {
  const { orders, ...learn } = play();
  if (comparison === 'single') {
    console.log(JSON.stringify({ round: round + 1, rule, F: graph.f, ...learn, seed }));
    continue;
  }
  const replay = play(orders);
  assert.deepEqual(learn.result, replay.result);
  assert.deepEqual([learn.generations, learn.maxPopulation], [replay.generations, replay.maxPopulation]);
  const extraMsPerGeneration = (learn.elapsedMs - replay.elapsedMs) / learn.generations;
  console.log(JSON.stringify({ round: round + 1, rule, F: graph.f, ...learn,
    replayMs: replay.elapsedMs, extraMsPerGeneration, seed }));
}
