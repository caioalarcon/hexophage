// Print the lowest-cost starters for increasing connected stable populations.
import { DIR } from '../../src/world/geometry.js';
import { catalogRules } from '../../src/simulation/catalog-rules.js';
import { advancePattern, patternOffset, patternSite } from '../../src/patterns/planar-simulation.js';

const rule = catalogRules['hex-b2s245'];
const neighbours = DIR.map(dir => patternSite(...dir));
const candidates = new Map();
function record(sites) {
  const ids = [...new Set(sites)].sort((a,b) => a-b);
  if (ids.length >= 3 && ids.length <= 21) candidates.set(ids.join(','), ids);
}

function rotationOrbits(radius, turns) {
  const seen = new Set(), orbits = [];
  for (let i=-radius; i<=radius; i++) for (let j=-radius; j<=radius; j++) {
    if (Math.abs(i+j)>radius || (!i && !j) || seen.has(patternSite(i,j))) continue;
    let q=i, r=j;
    const orbit=[];
    do {
      orbit.push(patternSite(q,r));
      for (let t=0; t<turns; t++) [q,r]=[-r,q+r];
    } while (q!==i || r!==j);
    orbit.forEach(id => seen.add(id));
    orbits.push(orbit);
  }
  return orbits;
}

for (const [radius, turns] of [[3,2], [3,3], [5,1]]) {
  const orbits = rotationOrbits(radius, turns);
  function combine(index, depth, points) {
    if (depth) {
      record(points);
      record([0, ...points]);
    }
    if (depth === 3) return;
    for (let i=index; i<orbits.length; i++) combine(i+1,depth+1,[...points,...orbits[i]]);
  }
  combine(0,0,[]);
}
for (let side=2; side<=7; side++) {
  const triangle=[];
  for (let q=0; q<side; q++) for (let r=0; r<side-q; r++) triangle.push(patternSite(q,r));
  record(triangle);
}

function connected(state) {
  const remaining = new Set(state.keys()), first = remaining.values().next().value, stack = [first];
  remaining.delete(first);
  while (stack.length) {
    const site = stack.pop();
    for (const offset of neighbours) if (remaining.delete(site+offset)) stack.push(site+offset);
  }
  return !remaining.size;
}

const best = new Map();
for (const ids of candidates.values()) {
  let state = new Map(ids.map(id=>[id,1])), births=0;
  for (let generation=0; generation<=32 && state.size && state.size<=160; generation++) {
    const step = advancePattern(state,1,rule);
    if (!step.births && state.size===step.next.size) {
      if (state.size>=2*ids.length && connected(state)) {
        const row = {cells:ids.length, settled:state.size, generation, births, axial:ids.map(patternOffset)};
        const key = row.cells+'-'+row.settled, prev=best.get(key);
        if (!prev || row.births<prev.births || (row.births===prev.births && row.generation<prev.generation)) best.set(key,row);
      }
      break;
    }
    state=step.next;
    births+=step.births;
  }
}
let maxSettled=0;
for (const row of [...best.values()].sort((a,b)=>a.cells-b.cells || b.settled-a.settled)) {
  if (row.settled<=maxSettled) continue;
  console.log(JSON.stringify(row));
  maxSettled=row.settled;
}
