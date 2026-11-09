// Controlled offer set for a known Callahan encounter. The planner is given
// a location and six headings; it does not get the identity of a successful
// interception. Independently replay every action (and waiting) on the sphere.
import assert from 'node:assert/strict';
import { beginLocalTrial } from '../../src/bots/brain/local-world.js';
import { evaluateTrial } from '../../src/bots/brain/strategy.js';
import { createHeadlessMatch } from '../../src/match/headless.js';
import { atlasPatterns } from '../../src/patterns/atlas-data.js';
import { decodeRLE } from '../../src/patterns/rle.js';
import { buildSphere } from '../../src/world/sphere.js';

const graph = buildSphere(320), origin = graph.farthest;
const idle = new Map([2,3,4,5,6].map(id => [id, () => {}]));
const shape = id => decodeRLE(atlasPatterns.find(p => p.id === id).rle);
const checkpoints = [12,32,64,128,256,512,1024];
const longHorizon = Number(process.argv[2] ?? 360000);
if (!Number.isInteger(longHorizon) || longHorizon < checkpoints.at(-1)) throw Error('Choose at least 1024 generations');
const personality = { payback: 240000, rivalWeight: 1 };
for (const [name, economy] of [
  ['production', {}],
  ['early-maturity', { stableAfter: 2, stableEnergy: 1, stampCost: 10 }],
  ['mature-cost', { policy: 'activity', stableEnergy: 1, birthCost: 0, stampCost: 10 }],
]) {
  const newMatch = () => createHeadlessMatch(graph, { init: 820000, economy, strategies: idle, botMode: 'profile' });
  const baseline = newMatch();
  const at = (offsets,q,r) => baseline.patchForStamp(origin, 0, offsets.map(([a,b]) => [a+q,b+r]));
  const grower = at(shape('stalk'),0,0), [center] = at([[0,0]],-6,10);
  assert(baseline.commitStamp(2,grower,false));

  function follow(match, end = checkpoints.at(-1), visit) {
    const rows = {};
    for (let g = 1; g <= end; g++) {
      match.nextTick();
      visit?.(g, match.game.players[0].reserve, match.game.players[1].reserve);
      if (checkpoints.includes(g)) rows[g] = {
        cash: match.game.players.slice(0,2).map(p => p.reserve),
        cells: [1,2].map(id => match.world.ownerCells[id].length),
      };
    }
    return rows;
  }
  // Track the known intercept after the last mental horizon. This comparison
  // measures delayed payoff and is never available when scoring the candidates.
  const production = name === 'production';
  const holdCash = production ? new Float64Array(longHorizon + 1) : null;
  const longRun = production ? { rotation: 5, relativePayback: null, checkpoints: {} } : null;
  const wait = production ? follow(baseline, longHorizon, (g, _own, rival) => { holdCash[g] = rival; }) : follow(baseline);
  const rows = [];
  let pattern = shape('glider');
  for (let rotation = 0; rotation < 6; rotation++) {
    const m = newMatch(), glider = at(pattern,-11,22);
    pattern = pattern.map(([q,r]) => [-r,q+r]);
    assert(m.commitStamp(2,grower,false));
    const trials = checkpoints.map(horizon => {
      const job = beginLocalTrial(m.world,m.game,1,center,glider,{radius:20,horizon});
      assert(job, 'Legal candidate at rotation '+rotation);
      let result;
      while (!result) result = job.step(4);
      return result;
    });
    assert(m.commitStamp(1,glider,false));
    const actual = production && rotation === longRun.rotation
      ? follow(m,longHorizon,(g,own,rival) => {
        const ownDelta = own - 820000, rivalDelta = rival - holdCash[g];
        const relativeGain = ownDelta - rivalDelta;
        if (relativeGain > 0 && longRun.relativePayback === null) longRun.relativePayback = g;
        if ([1024,20000,100000,longHorizon].includes(g))
          longRun.checkpoints[g] = { ownDelta, rivalDelta, relativeGain };
      }) : follow(m);
    for (const local of trials) {
      const t = local.turns, field = actual[t], hold = wait[t];
      const realRivalCells = field.cells[1] - hold.cells[1], realRivalCash = field.cash[1] - hold.cash[1];
      if (rotation === 5 && t <= 64) {
        assert.equal(local.rivalCells, realRivalCells);
        assert(Math.abs(local.rivalCash - realRivalCash) < 1e-7);
      }
      rows.push({rotation, generation:t, boundary:local.boundary, localRivalCells:local.rivalCells,
        realRivalCells, localRivalCash:local.rivalCash, realRivalCash,
        realOwnCash:field.cash[0]-hold.cash[0], rivalDeferredFlow:local.rivalDeferredFlow,
        rivalDeferredMid:local.rivalDeferredMid, rivalDeferredTrend:local.rivalDeferredTrend, ...evaluateTrial(local,personality,'rival')});
    }
  }
  const decision = {};
  for (const g of checkpoints) {
    const ranked = rows.filter(r => r.generation === g && r.acceptable).sort((a,b) => b.value - a.value);
    decision[g] = ranked[0]?.rotation ?? 'wait';
  }
  console.log(JSON.stringify({ name, frequency:graph.f, radius:20, candidates:'6 rotations at one offered position + wait',
    decision, longRun, rows }));
}
