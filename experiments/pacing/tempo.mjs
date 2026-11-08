// node experiments/pacing/tempo.mjs [generations/second]
import assert from 'node:assert/strict';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {sphereSpawns} from '../../src/match/spawns.js';
import {atlasPatterns} from '../../src/patterns/atlas-data.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {buildSphere} from '../../src/world/sphere.js';

const rate = Number(process.argv[2] ?? 200);
assert(Number.isFinite(rate) && rate > 0);
const idle = new Map([2,3,4,5,6].map(id => [id, () => {}]));
const patchGraph = buildSphere(64);
const speeds = [];
for (const id of ['glider','p15','p48']) {
  const pattern = atlasPatterns.find(p => p.id === id);
  const seed = decodeRLE(pattern.rle);
  const match = createHeadlessMatch(patchGraph, {init:1e7, strategies:idle});
  const place = points => match.patchForStamp(patchGraph.farthest, 0, points);
  assert(match.commitStamp(1, place(seed), false));
  for (let t = 0; t < pattern.period; t++) match.nextTick();

  // Read the same oriented chart that the initial stamp uses. Every live
  // vertex must match one translated input vertex after a whole period.
  const chart = [];
  for (let q = -12; q <= 12; q++) for (let r = -12; r <= 12; r++) chart.push([q,r]);
  const vertices = place(chart);
  const final = chart.filter((p, i) => match.world.owners[vertices[i]] === 1);
  const coord = a => new Set(a.map(p => p.join(',')));
  const lo = (a, axis) => Math.min(...a.map(p => p[axis]));
  const dq = lo(final,0)-lo(seed,0), dr = lo(final,1)-lo(seed,1);
  assert.equal(final.length, match.world.ownerCells[1].length);
  assert.deepEqual(coord(final), coord(seed.map(([q,r]) => [q+dq,r+dr])));
  const edges = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq+dr));
  speeds.push({id,period:pattern.period,dq,dr,edges,
    edgesPerSecond:rate*edges/pattern.period});
}

const g = buildSphere(320), starts = sphereSpawns(g);
const d = new Uint16Array(g.n), queue = new Uint32Array(g.n), pairs = [];
for (let i = 0; i < starts.length - 1; i++) {
  d.fill(65535);
  queue[0] = starts[i]; d[starts[i]] = 0;
  let tail = 1;
  for (let head = 0; head < tail; head++) {
    const v = queue[head];
    for (let k = 0; k < g.deg[v]; k++) {
      const u = g.adj[6*v+k];
      if (d[u] !== 65535) continue;
      d[u] = d[v] + 1;
      queue[tail++] = u;
    }
  }
  for (let j = i+1; j < starts.length; j++) pairs.push(d[starts[j]]);
}
pairs.sort((a,b) => a-b);
const median = pairs[(pairs.length - 1)/2];
const gliderSpeed = speeds.find(p => p.id === 'glider').edgesPerSecond;
console.log(JSON.stringify({rate,speeds,f320:{
  cells:g.n,pairDistancesEdges:pairs,
  averageEdges:pairs.reduce((a,b) => a+b)/pairs.length,medianEdges:median,
  straightUnobstructedEquivalentSeconds:median/gliderSpeed
}, warningDistances:speeds.map(({id,edges,period})=>({id,
  edgesFor5Seconds:Math.ceil(rate*edges*5/period),edgesFor15Seconds:Math.ceil(rate*edges*15/period)
}))}, null, 2));
