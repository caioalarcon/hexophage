// Identical rule, world, tariffs and sequence of seeds across revisions.
// Run the fourth seed once more without the prior games to isolate transfer.
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHeadlessMatch } from '../../src/match/headless.js';
import { createBrainArchive } from '../../src/bots/brain/memory.js';
import { plantFounder } from '../../src/match/founding.js';
import { buildSphere } from '../../src/world/sphere.js';

const { values } = parseArgs({ options: {
  rule: { type:'string', default:'callahan' }, frequency: { type:'string', default:'320' },
  generations: { type:'string', default:'12000' }, inherit: { type:'string' }, export: { type:'string' },
  budget: { type: 'string' },
} });
const graph = buildSphere(Number(values.frequency)), horizon = Number(values.generations);
const store = (data = null) => ({ data, getItem() { return this.data; }, setItem(_, value) { this.data = value; } });
const scenarios = [4751, 8329, 1049, 6203];

function play(seed, storage, round) {
  const brain = { seed, archive: createBrainArchive(storage) };
  if (values.budget) brain.budget = Number(values.budget);
  const m = createHeadlessMatch(graph, { growth:'classic', conflict: 'legacy', rule:values.rule, botMode:'learn', brain });
  const { world, game } = m;
  const bots = game.players.slice(1), stats = bots.map(() => ({ first:null, second:null, profitable:null, streak:0 }));
  const samples = [], checkpoints = new Set([256,1000,4000,horizon]);
  assert(plantFounder(world, game, game.players[0], m.commitStamp));
  const start = performance.now();
  while (world.gen < horizon && !game.ended) {
    m.nextTick();
    for (let i = 0; i < bots.length; i++) {
      const p = bots[i], s = stats[i];
      if (p.stamps && s.first === null) s.first = world.gen;
      if (p.stamps >= 2 && s.second === null) s.second = world.gen;
      s.streak = !p.out && p.flowAverage > 0 ? s.streak + 1 : 0;
      if (s.streak >= 64 && s.profitable === null) s.profitable = world.gen - 63;
    }
    if (checkpoints.has(world.gen) || game.ended) {
      const metrics = game.brainMetrics;
      samples.push({ gen: world.gen, purchases:bots.reduce((n,p)=>n+p.stamps,0),
        positive:bots.filter(p=>!p.out && p.flowAverage>0).length,
        cash:Math.round(bots.reduce((n,p)=>n+p.reserve,0)),
        flow:+bots.reduce((n,p)=>n+p.flowAverage,0).toFixed(2),
        cells:bots.reduce((n,p)=>n+world.ownerCells[p.id].length,0),
        tactical:metrics?.tactical, trials:metrics?.completed, visits:metrics?.visits });
    }
  }
  const memory = game.brainMemory?.stats();
  game.brainMemory?.finish();
  console.log(JSON.stringify({ round, seed, rule:values.rule, F:graph.f, gens:world.gen,
    ms:Math.round(performance.now()-start), inherited:memory?.priorSamples,
    first:stats.map(s=>s.first), second:stats.map(s=>s.second), profitable:stats.map(s=>s.profitable),
    patterns:bots.map(p=>game.brainMetrics?.byBot[p.id].patterns), samples }));
}

const history = store(values.inherit ? readFileSync(values.inherit,'utf8') : null);
if (!values.inherit) {
  for (let i = 0; i < 3; i++) play(scenarios[i], history, i+1);
  if (values.export) writeFileSync(values.export, history.data);
}
play(scenarios[3],history,values.inherit ? 'migrated-fourth' : 4);
play(scenarios[3],store(),'cold-fourth');
