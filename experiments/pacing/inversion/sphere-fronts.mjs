// Each trial has one funded owner. When a neighborhood is unchanged, its next
// transition is unchanged too. This sparse advance uses the game's sphere and rule tables.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { atlasPatterns } from '../../../src/patterns/atlas-data.js';
import { decodeRLE } from '../../../src/patterns/rle.js';
import { patchForStamp } from '../../../src/patterns/spherical-patch.js';
import { createSimulationState } from '../../../src/simulation/state.js';
import { initRuleTables } from '../../../src/simulation/rules.js';
import { createHeadlessMatch } from '../../../src/match/headless.js';
import { sphereSpawns } from '../../../src/match/spawns.js';
import { buildSphere } from '../../../src/world/sphere.js';

const graph = buildSphere(320);
const world = { graph, cells: new Uint8Array(graph.n) };
const { traces } = JSON.parse(readFileSync(new URL('physics-traces.json', import.meta.url)));
const rule = createSimulationState();
initRuleTables(rule);
const horizon = 12000;
const alive = new Uint8Array(graph.n);
const bornAt = new Int32Array(graph.n);
const seenAt = new Int32Array(graph.n);
const patterns = Object.fromEntries(['stalk','glider'].map(name =>
  [name, decodeRLE(atlasPatterns.find(p => p.id === name).rle)]));
const idle = new Map([2,3,4,5,6].map(i => [i, () => {}]));
function mix(id) {
  let a = Math.imul(id ^ (id >>> 16), 0x45d9f3b);
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b);
  return a ^ (a >>> 16);
}
function sameField(history, previous, now) {
  // Hash is only an index. A recurrence requires exact even parity at every
  // modified coordinate, hence identical live sets at the two endpoints.
  const odd = new Set();
  for (let i = previous + 1; i <= now; i++) {
    for (const id of history[i]) {
      if (!odd.delete(id)) odd.add(id);
    }
  }
  return odd.size === 0;
}
function run(pattern, center, orientation, control = false) {
  alive.fill(0); bornAt.fill(-1); seenAt.fill(0);
  const initial = patchForStamp(world, center, orientation, patterns[pattern]);
  if (!initial || new Set(initial).size !== patterns[pattern].length) return null;
  const crossCheckTo = pattern === 'glider' ? 3200 : 2048;
  let controlMatch;
  if (control) {
    controlMatch = createHeadlessMatch(graph, { init: 1e9, strategies: idle, economy: {birthEnergy:0,upkeep:0} });
    assert.ok(controlMatch.commitStamp(1, initial, false));
  }
  let count = initial.length, hash = 0;
  for (const id of initial) { alive[id] = 1; hash ^= mix(id); bornAt[id] = 0; }
  const life = [count], births = [0], mature = [0];
  let affected = initial;
  const history = [[]], stamps = new Map([[count + ':' + hash, 0]]);
  const bornQueue = Array.from({length:64}, () => []);
  let recurrence = null, firstDeparture = null, stopAt = horizon;
  for (let g = 1; g <= Math.min(horizon, stopAt); g++) {
    const hits = [], fresh = [];
    function inspect(id) {
      if (seenAt[id] === g) return;
      seenAt[id] = g;
      const d = graph.deg[id];
      let mask = 0;
      for (let k = 0; k < d; k++) mask |= alive[graph.adj[id * 6 + k]] << k;
      const live = d === 6 ? (alive[id] ? rule.callSurv6 : rule.callBirth6)[mask] :
        (alive[id] ? rule.callSurv5 : rule.callBirth5)[mask];
      if (live !== alive[id]) hits.push(id);
    }
    for (const id of affected) {
      inspect(id);
      for (let k = 0; k < graph.deg[id]; k++) inspect(graph.adj[id*6+k]);
    }
    for (const id of hits) {
      hash ^= mix(id);
      alive[id] ^= 1;
      if (alive[id]) { count++; bornAt[id] = g; fresh.push(id); }
      else { count--; bornAt[id] = -1; }
    }
    const m = g < 64 ? 0 :
      bornQueue[(g-63)%64].reduce((n,id) => n + Number(bornAt[id] === g-63), 0);
    bornQueue[g%64] = fresh;
    affected = hits;
    history.push(hits);
    const trace = traces[pattern];
    const expected = pattern === 'stalk' ? trace[g <= 63 ? g-1 : 63+(g-64)%24] : trace[(g-1)%2];
    if (firstDeparture === null && (fresh.length !== expected[0] || m !== expected[1]-expected[2])) firstDeparture=g;
    life.push(count); births.push(fresh.length); mature.push(m);
    if (controlMatch && g <= crossCheckTo) {
      controlMatch.nextTick();
      const owned = controlMatch.world.ownerCells[1];
      assert.equal(owned.length, count);
      assert.ok(owned.every(id => alive[id]));
      assert.equal(controlMatch.game.players[0].lastBirths, fresh.length);
      if (g !== 63) assert.equal(owned.filter(id => controlMatch.world.cellAges[id] === 64).length, m);
    }
    if (!recurrence) {
      const signature = count + ':' + hash, previous = stamps.get(signature);
      if (previous !== undefined && sameField(history, previous, g)) {
        recurrence = { from: previous, verified: g, period: g-previous };
        stopAt = g + 64 + 240 + recurrence.period;
      } else stamps.set(signature, g);
    }
  }
  const last = life.length-1;
  const sum = arr => arr.reduce((a,b) => a+b,0);
  const per = (series,w) => sum(series.slice(-w))/w;
  let firstTwoLow = null, previousLow = false;
  for (let end = 240; end <= last; end+=120) {
    const low = sum(mature.slice(end-119,end+1))/120 < .375;
    if (low && previousLow && firstTwoLow === null) firstTwoLow = end-239;
    previousLow = low;
  }
  let lastCredit = null;
  for (let i=last;i>0;i--) if(mature[i]) {lastCredit=i;break;}
  // Exact max/crossing includes the startup deficit. At the verified periodic
  // tail these samples have no natural maturation and births remain positive.
  const fees = [360, 159700.22715098018, 259694.24187575738];
  const peakCash = {};
  for (const reward of [12, 32, 129, 384]) {
    let cash = 0, minimum = 0, maximum = 0, peakAt = 0;
    const crosses = fees.map(() => null);
    for (let g = 1; g <= last; g++) {
      cash += reward * mature[g] - births[g];
      if (cash > maximum) { maximum = cash; peakAt = g; }
      minimum = Math.min(minimum, cash);
      for (let f = 0; f < fees.length; f++) if (crosses[f] === null && cash >= fees[f]) crosses[f] = g;
    }
    peakCash[reward] = { maximum, peakAt, minimum, fees, crosses };
  }
  const cycleM = recurrence && per(mature,recurrence.period), cycleB = recurrence && per(births,recurrence.period);
  let insolvent129 = null;
  if (pattern === 'stalk' && recurrence && cycleM === 0 && cycleB > 0) {
    let reserve = 376;
    for (let g = 1; g <= last; g++) {
      reserve += 129*mature[g] - births[g];
      if (reserve < 0) { insolvent129 = g; break; }
    }
    if (insolvent129 === null) {
      const costs = births.slice(-recurrence.period);
      const cycles = Math.floor(reserve / sum(costs));
      reserve -= cycles*sum(costs);
      let g = last + cycles*recurrence.period;
      for (const b of costs) { g++; reserve-=b; if (reserve < 0) { insolvent129=g;break; } }
    }
  }
  return {pattern,center,orientation,centerPentagonDistance:graph.distance[center],firstDeparture,
    firstOfTwoLow120:firstTwoLow,recurrence,lastMeasured:last,initialCells:initial.length,maxLive:Math.max(...life),
    finalLive:count,lastCreditObserved:lastCredit,credits:sum(mature),totalBirths:sum(births),tail240M:per(mature,240),
    tail240B:per(births,240),cycleM,cycleB,peakCash,firstInsolvent129With376:insolvent129,creditsG6001To6200:sum(mature.slice(6001,6201)),
    controlVerified:control ? Math.min(last,crossCheckTo) : 0};
}

const spawns=sphereSpawns(graph);
let seed=18427;
function sample() {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%graph.n;}
const anchors=[spawns[0],spawns[2],spawns[4]];
for(let i=0;i<5;i++) anchors.push(sample());
const trials=[];
for(const pattern of ['stalk','glider']) for(const center of anchors) for(const orientation of [0,1,3,4]) {
  const trial=run(pattern,center,orientation,center===anchors[0] && orientation===0);
  trials.push(trial);
  if(pattern==='stalk'&&center===anchors[0]) console.log('first',orientation,trial.firstDeparture,trial.recurrence,trial.lastCreditObserved);
}
writeFileSync(new URL('sphere-fronts.json',import.meta.url), JSON.stringify({
  frequency:graph.f,cells:graph.n,horizon,initialSeed:18427,
  sampling:'One sphere, three actual spawn centres plus five fixed pseudorandom cells, four directions per centre. Positions/orientations are not independent maps.',
  anchors,orientations:[0,1,3,4],trials
})+'\n');
