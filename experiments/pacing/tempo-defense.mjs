// Same B2/S35/Callahan engine, budget and legal stamps as incoming-glider-replay.
import assert from 'node:assert/strict';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {atlasPatterns} from '../../src/patterns/atlas-data.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {buildSphere} from '../../src/world/sphere.js';

const catalog = id => decodeRLE(atlasPatterns.find(p => p.id === id).rle);
const shift = (cells, dq, dr) => cells.map(([q,r]) => [q + dq, r + dr]);
const turn = cells => cells.map(([q,r]) => [-r,q+r]);
let reflected = catalog('p42').map(([q,r]) => [q,-q-r]);
for (let i = 0; i < 4; i++) reflected = turn(reflected);
const target = shift(reflected, -Math.min(...reflected.map(p => p[0])), -Math.min(...reflected.map(p => p[1])));
const projectile = shift(catalog('glider'),-12,-1);
const defender = catalog('p2');
const idle = new Map([2,3,4,5,6].map(id => [id, () => {}]));

// The reference contains every live cell of the isolated P42 at every phase.
// Compare an entire local mask, including dead neighbors, to exclude lookalikes.
function reference(graph, horizon) {
  const phases = run(graph,{attack:false,horizon}).phases.map(phase => new Set(phase));
  const mask = new Set(phases.flatMap(phase => [...phase]));
  for (const id of [...mask]) {
    for (let k=0; k<graph.deg[id]; k++) mask.add(graph.adj[id*6+k]);
  }
  return {mask:[...mask],phases};
}

function run(graph, {attack=true, block, time=0, horizon=256, expect} = {}) {
  const match = createHeadlessMatch(graph,{init:5000,strategies:idle});
  const ids = points => match.patchForStamp(graph.farthest,0,points);
  const stamp = (owner,points) => match.commitStamp(owner,ids(points),false);
  assert(stamp(2,target));
  if (attack) assert(stamp(1,projectile));
  let expenditure = 0, erosion = null, reproduced = true;
  const phases = [];
  for (let t = 0; t <= horizon; t++) {
    if (t) match.nextTick();
    const player = match.game.players[1];
    if (t === time && block) {
      const before = player.reserve;
      if (!stamp(2,block)) return {legal:false};
      expenditure = before - player.reserve;
    }
    if (erosion === null && player.lastEroded) erosion = t;
    if (horizon-t < 42) {
      if (expect) {
        const phase = expect.phases[t - (horizon - 41)];
        reproduced &&= expect.mask.every(id => match.world.owners[id] === (phase.has(id) ? 2 : 0));
      } else phases.push(Array.from(match.world.ownerCells[2]));
    }
  }
  return {legal:true, expenditure, erosion, reproduced, alive:match.world.ownerCells[2].length,
    reserve:match.game.players[1].reserve, phases: expect ? undefined : phases};
}

if (process.argv.includes('--search')) {
  const graph = buildSphere(32), horizon=84;
  const expect = reference(graph,horizon);
  let rotated = defender;
  for (let k = 0; k < 6; k++, rotated = turn(rotated)) {
    for (let q = -9; q <= 0; q++) for (let r = -1; r <= 4; r++) {
      const outcome=run(graph,{block:shift(rotated,q,r),expect,horizon});
      if (outcome.legal && outcome.reproduced && outcome.expenditure === 30) console.log('survived', k,q,r, outcome);
    }
  }
}
if (!process.argv.includes('--search')) {
  const graph = buildSphere(256), expect = reference(graph,256);
  const inLane = shift(defender,-6,0), offLane = shift(defender,-6,22);
  const cases = [
    {label:'target alone', attack:false},
    {label:'attacked without defense'},
    {label:'in lane at G0', block:inLane},
    {label:'off lane at G0', block:offLane},
    {label:'in lane at G6', block:inLane, time:6},
    {label:'in lane at G8', block:inLane, time:8},
    {label:'in lane at G20', block:inLane, time:20},
    {label:'in lane without attack', attack:false, block:inLane},
    {label:'off lane without attack', attack:false, block:offLane}
  ];
  const results = cases.map(({label,...options}) => ({label,...run(graph,{expect,...options})}));
  assert.deepEqual(results.map(r => r.legal),[true,true,true,true,true,false,true,true,true]);
  assert.deepEqual(results.map(r => r.reproduced),[true,false,true,false,true,undefined,false,true,true]);
  for (const i of [2,3,4,6,7,8]) assert.equal(results[i].expenditure,30);
  assert.equal(results[7].reserve,results[8].reserve);
  assert.equal(results[7].alive,results[8].alive);
  console.log(JSON.stringify(results,null,2));
}
