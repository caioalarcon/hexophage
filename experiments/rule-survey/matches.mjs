// Usage: node experiments/rule-survey/matches.mjs callahan [generations] [frequency]
// Emits one JSON object per match. Run a fresh process for each rule.
import assert from 'node:assert/strict';
import { createBrainArchive } from '../../src/bots/brain/memory.js';
import { stampCatalog } from '../../src/bots/brain/proposals.js';
import { STABILITY_ECONOMY } from '../../src/match/constructive-economy.js';
import { resolveRuleProfile } from '../../src/match/rule-profiles.js';
import { createHeadlessMatch } from '../../src/match/headless.js';
import { buildSphere } from '../../src/world/sphere.js';

const [rule, generations = '4096', frequency = '32', mode = 'open'] = process.argv.slice(2);
assert(rule && Number.isInteger(+generations) && +generations >= 1);
const graph = buildSphere(+frequency);
const history = createBrainArchive();
const round = n => +n.toFixed(3);

function play(seed, cohort, archive, candidate) {
  // Listen to the learner's existing observations. Do not feed additional signals back.
  const evidence = new Map();
  const observedArchive = {
    open(namespace) {
      const bank = archive.open(namespace);
      return { ...bank, observe(id, context, stamp, utility) {
        bank.observe(id, context, stamp, utility);
        if (!['empty', 'rival', 'own', 'field/empty', 'field/rival', 'field/own'].includes(context)) return;
        if (!evidence.has(stamp)) evidence.set(stamp, {});
        const row = evidence.get(stamp);
        if (!row[context]) row[context] = [0, 0];
        row[context][0]++;
        row[context][1] += utility;
      } };
    },
  };
  const match = createHeadlessMatch(graph, { growth:'classic', conflict: 'legacy', rule, botMode: 'learn', economy: STABILITY_ECONOMY,
    brain: { seed, archive: observedArchive } });
  const { world, game } = match;
  assert.deepEqual(game.economy, STABILITY_ECONOMY);
  if (candidate) {
    game.gameplay = { ...game.gameplay, patterns: [candidate], kit: { [candidate.id]: {} } };
  }
  // Five equal, paid production learners. Exclude the unplayed sixth seat from victory
  // and targeting so that all active players start identically with an empty field.
  game.players[0].out = true;
  const bots = game.players.slice(1);
  let peak = 0;
  while (world.gen < +generations && !game.ended) {
    match.nextTick();
    peak = Math.max(peak, world.activeCount);
  }
  const metrics = game.brainMetrics;
  const memory = game.brainMemory.stats();
  game.brainMemory.finish();
  const stamps = {};
  for (const {id} of game.gameplay.patterns) {
    const counts = bots.map(bot => metrics.byBot[bot.id].patterns[id] ?? 0);
    const purchases = counts.reduce((a,b) => a+b);
    if (!purchases && !evidence.has(id)) continue;
    const row = { purchases, buyers:counts.filter(Boolean).length };
    for (const [key,[count, sum]] of Object.entries(evidence.get(id) ?? {})) row[key] = [count, round(sum/count)];
    stamps[id] = row;
  }
  const fallback = bots.reduce((n,p) => n + (metrics.byBot[p.id].patterns['manual/single'] ?? 0), 0);
  assert.equal(Object.values(stamps).reduce((n,s)=>n+s.purchases,0) + fallback, metrics.actions);
  const catalog = stampCatalog(game.gameplay.patterns);
  return { rule, seed, cohort, F:graph.f, sites:graph.n, horizon:+generations, gen:world.gen,
    ended:game.ended, winner:game.winner, catalog:game.gameplay.patterns.length,
    thinkable:catalog.filter(s=>s.radius + 3 <= 20).length,
    namespace:memory.namespace, inheritedSamples:memory.priorSamples, studies:metrics.studies, trials:metrics.completed,
    purchases:metrics.actions, fallback, tactics:metrics.tactical, clipped:metrics.boundary,
    peak, players:bots.map(p => ({ id:p.id, stamps:p.stamps, spent:p.stampedEnergy, cash:round(p.reserve),
      income:round(p.received), paid:round(p.paid), tributeIn:round(p.tributeReceived),
      tributeOut:round(p.tributePaid), flow:round(p.flowAverage), cells:world.ownerCells[p.id].length,
      births:p.totalBirths, deaths:p.totalDeaths, eroded:p.eroded, out:p.out })), stamps };
}
if (mode === 'open') {
  for (const [i, seed] of [4751, 8329, 1049].entries())
    console.log(JSON.stringify(play(seed, i === 0 ? 'cold-1' : 'warm-' + (i + 1), history)));
  console.log(JSON.stringify(play(1049, 'cold-control', createBrainArchive())));
} else if (mode === 'single') {
  console.log(JSON.stringify(play(4751, 'cold-1', createBrainArchive())));
} else {
  assert.equal(mode, 'audition');
  // Exact same bounded production learner and starting reserve. Small single-card
  // decks test whether the candidate can establish itself when offered to everyone.
  const patterns = resolveRuleProfile(rule).gameplay.patterns;
  const catalog = stampCatalog(patterns);
  console.log('rule,stamp,F,generations,initialCells,thinkable,buyers,purchases,fallback,tactics,positiveFlowBots,sumFinalFlow,sumCashDelta,activeCells,eroded,tribute,trials');
  for (const {id, offsets, radius} of catalog) {
    const prefix = [rule, id, graph.f, +generations, offsets.length, radius + 3 <= 20];
    if (radius + 3 > 20) {
      console.log([...prefix, ...Array(11).fill('')].join(','));
      continue;
    }
    const p = patterns.find(p => p.id === id);
    // Keep the affordability gate: a valid large stamp may never be bought.
    const m = play(4751, 'audition', createBrainArchive(), p), bots = m.players;
    prefix[3] = m.gen;
    const sum = key => round(bots.reduce((n,p) => n + p[key], 0));
    console.log([...prefix, m.stamps[id]?.buyers ?? 0, m.stamps[id]?.purchases ?? 0, m.fallback,
      m.tactics, bots.filter(p=>p.flow > 0).length, sum('flow'),
      round(sum('cash') - bots.length * STABILITY_ECONOMY.initialCells * STABILITY_ECONOMY.stampCost),
      sum('cells'), sum('eroded'), sum('tributeIn'), m.trials].join(','));
  }
}
