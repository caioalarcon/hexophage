// Enumerate connected seeds (free polyhexes) and keep distinct connected
// periodic outcomes. Canonicalization covers phase, translation and D6.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIR } from '../../src/world/geometry.js';
import { advancePattern, patternOffset, patternSite, seedPatternAges } from '../../src/patterns/planar-simulation.js';
import { BAYS } from '../../src/simulation/rules.js';
import { catalogRules } from '../../src/simulation/catalog-rules.js';
import { patterns } from '../../src/patterns/catalog.js';

function frame(points) {
  const r = Math.min(...points.map(p => p[1]));
  const x = Math.min(...points.map(([q,r]) => q+r));
  const rows = [];
  for (const [q,y] of points) (rows[y-r] ??= []).push(q+y-x);
  const run = (n, token) => n ? (n > 1 ? n : '') + token : '';
  const rle = Array.from({length:rows.length}, (_,i) => {
    const row = (rows[i] ?? []).sort((a,b) => a-b);
    let tokens = '', cursor = 0;
    for (let j = 0; j < row.length;) {
      const start = row[j++];
      tokens += run(start-cursor, 'b');
      cursor = start+1;
      while (j < row.length && row[j] === cursor) { cursor++; j++; }
      tokens += run(cursor-start, 'o');
    }
    return tokens;
  }).join('$') + '!';
  return { rle, q:x-r, r };
}
function canonical(points) {
  let best;
  for (let i=0; i<6; i++) {
    for (const shape of [points, points.map(([q,r]) => [r,q])]) {
      const rle = frame(shape).rle;
      if (!best || rle < best) best = rle;
    }
    points = points.map(([q,r]) => [-r,q+r]);
  }
  return best;
}
function connected(points) {
  const rest = new Set(points.map(([q,r])=>patternSite(q,r)));
  const stack = [rest.values().next().value];
  rest.delete(stack[0]);
  while (stack.length) {
    const site = stack.pop();
    for (const [q,r] of DIR) {
      const next = site+patternSite(q,r);
      if (rest.delete(next)) stack.push(next);
    }
  }
  return !rest.size;
}
function seeds(maxSize) {
  let layer = [[[0,0]]];
  const all = [...layer];
  for (let size=2; size<=maxSize; size++) {
    const next = new Map();
    for (const shape of layer) {
      const candidates = new Set();
      for (const [q,r] of shape) for (const [dq,dr] of DIR) candidates.add(patternSite(q+dq,r+dr));
      for (const [q,r] of shape) candidates.delete(patternSite(q,r));
      for (const pos of candidates) {
        const grown = [...shape,patternOffset(pos)];
        next.set(canonical(grown), grown);
      }
    }
    layer = [...next.values()];
    all.push(...layer);
  }
  return all;
}
function advance(ages, physics) { return advancePattern(ages, 256, physics); }
function points(ages) { return [...ages.keys()].map(patternOffset); }
function findCycle(seed, physics) {
  let ages = new Map(seed.map(([q,r]) => [patternSite(q,r),1]));
  const seen = new Map(), phases = [];
  for (let gen=0; gen<=80 && ages.size && ages.size<=90; gen++) {
    const shape = points(ages), phase = frame(shape);
    const earlier = seen.get(phase.rle);
    if (earlier !== undefined) {
      const cycle = phases.slice(earlier);
      if (!cycle.some(connected)) return;
      // Use a connected, minimum-population phase as the actual stamp.
      const representatives = cycle.filter(connected).sort((a,b) => a.length-b.length);
      const size = representatives[0].length;
      const rle = representatives.filter(s=>s.length===size).map(canonical).sort()[0];
      return {rle, period:cycle.length, cells:size, moving:phase.q!==frame(cycle[0]).q || phase.r!==frame(cycle[0]).r};
    }
    seen.set(phase.rle,gen);
    phases.push(shape);
    ages = advance(ages,physics).next;
  }
}
function annotate(row,physics) {
  let ages = seedPatternAges(row), birthsCycle=0;
  const fixed = new Set(ages.keys());
  for (let n=0;n<row.period;n++) {
    const turn = advance(ages,physics);
    ages=turn.next; birthsCycle+=turn.births;
    for (const site of fixed) if (!ages.has(site)) fixed.delete(site);
  }
  return {birthsCycle,deathsCycle:birthsCycle,stableCore:row.moving?0:fixed.size};
}

const candidates = seeds(7);
const data = {};
// Published cycles have priority over a rediscovery, regardless of orientation.
const {referenceCatalog} = await import('../../src/patterns/survey-catalog.js');
for (const [id,physics] of Object.entries({bays:BAYS,...catalogRules})) {
  const known = new Set();
  for (const p of [...(id==='bays'?patterns.bays:[]),...(referenceCatalog[id]??[])]) {
    let ages = seedPatternAges(p);
    for (let t=0;t<Math.max(1,p.period||1) && ages.size;t++) {
      known.add(canonical(points(ages)));
      ages=advance(ages,physics).next;
    }
  }
  const rows = new Map();
  for (const seed of candidates) {
    const cycle = findCycle(seed,physics);
    if (!cycle || known.has(cycle.rle) || rows.has(cycle.rle)) continue;
    const {rle,period,cells,moving} = cycle;
    const key=createHash('sha256').update(rle).digest('hex').slice(0,8);
    const group=moving?'nave':period===1?'estável':'oscilador';
    rows.set(rle,{id:'poly-'+key,name:(moving?'Nave':period===1?'Estável':'Oscilador')+' P'+period+' · '+cells+'c · '+key.slice(0,4),
      group,period,cells,...annotate(cycle,physics),rle,origin:'Hexophage · censo de poli-hexágonos ≤7'});
  }
  data[id]=[...rows.values()].sort((a,b)=>a.cells-b.cells||a.period-b.period||a.id.localeCompare(b.id));
  console.log(id,candidates.length,data[id].length);
}
const file=resolve(dirname(fileURLToPath(import.meta.url)),'../../src/patterns/polyhex-catalog.js');
writeFileSync(file,'// Generated by experiments/rule-survey/census.mjs\nexport const polyhexCatalog = ' +
  JSON.stringify(data,null,1)+';\n');
