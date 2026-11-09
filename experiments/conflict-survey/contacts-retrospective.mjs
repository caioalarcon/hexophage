// Replay the exact PR #9 placements and assert the original two-player
// stocks and cash deltas before reporting the omitted third population.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSphere } from '../../src/world/sphere.js';
import { createHeadlessMatch } from '../../src/match/headless.js';
import { resolveRuleProfile } from '../../src/match/rule-profiles.js';
import { STABILITY_ECONOMY as economy } from '../../src/match/constructive-economy.js';
import { advanceGeneration } from '../../src/simulation/generation.js';
import { gameEconomyTick } from '../../src/match/biomass.js';
import { seedPatternAges, advancePattern, patternOffset } from '../../src/patterns/planar-simulation.js';
import { decodeRLE } from '../../src/patterns/rle.js';

const graph=buildSphere(48),warm=32,horizon=128;
const lines=readFileSync(new URL('../rule-survey/contacts.csv',import.meta.url),'utf8').trim().split('\n');
const cols=lines.shift().split(',');
const groups=new Map();
function center(points) {
  const q=Math.round(points.reduce((s,p)=>s+p[0],0)/points.length),r=Math.round(points.reduce((s,p)=>s+p[1],0)/points.length);
  return {q,r,points:points.map(([x,y])=>[x-q,y-r])};
}
function tick(m) {
  advanceGeneration(m.world);
  gameEconomyTick(m.world,m.game,m.removeLive,()=>{});
}
function prepare(rule,points) {
  const m=createHeadlessMatch(graph,{rule,economy,conflict:'legacy'});
  assert(m.commitStamp(1,m.patchForStamp(graph.farthest,0,points),false));
  for(let n=0;n<warm;n++)tick(m);
  return m;
}
for(const line of lines) {
  const row=Object.fromEntries(line.split(',').map((v,i)=>[cols[i],v]));
  const {rule,attacker,defender}=row;
  const key=rule+'/'+defender, pair=rule+'/'+attacker+'/'+defender;
  if(!groups.has(key)) {
    const {physics,gameplay}=resolveRuleProfile(rule);
    const pats=new Map((gameplay.atlas??gameplay.patterns).map(p=>[p.id,p]));
    const def=pats.get(defender), local=center(decodeRLE(def.rle));
    let field=seedPatternAges(def);
    for(let t=0;t<warm;t++)field=advancePattern(field,economy.stableAfter,physics).next;
    const coords=[...field.keys()].map(patternOffset).map(([q,r])=>[q-local.q,r-local.r]);
    const control=prepare(rule,local.points);
    for(let t=0;t<horizon;t++)tick(control);
    groups.set(key,{pats,local,coords,cash:control.game.players[0].reserve,controlLive:control.world.ownerCells[1].length,pairs:new Map()});
  }
  const {pats,local,coords,cash,controlLive,pairs}=groups.get(key);
  assert.equal(controlLive,+row.controlDefenderLive);
  const m=prepare(rule,local.points), side=Number(row.flank);
  let points=center(decodeRLE(pats.get(attacker).rle)).points;
  for(let r=0;r<Number(row.rotation);r++)points=points.map(([q,t])=>[-t,q+t]);
  const edge=Math.max(...coords.map(p=>p[0]*side));
  const rs=coords.filter(p=>p[0]*side===edge).map(p=>p[1]).sort((a,b)=>a-b);
  const near=Math.min(...points.map(p=>p[0]*side));
  points=points.map(([q,r])=>[q+side*(edge+2-near),r+rs[Math.floor(rs.length/2)]+Number(row.lateral)]);
  const ids=m.patchForStamp(graph.farthest,0,points);
  const allowed=!!ids && m.commitStamp(2,ids,false);
  assert.equal(+allowed,+row.legal);
  if(!allowed)continue;
  let peak=0;
  for(let n=0;n<horizon;n++) {tick(m);peak=Math.max(peak,m.world.ownerCells[7].length);}
  const [d,a]=m.game.players, [dc,ac]=[m.world.ownerCells[1].length,m.world.ownerCells[2].length];
  assert.equal(dc,+row.defenderLive);assert.equal(ac,+row.attackerLive);
  assert.equal((d.reserve-cash).toFixed(2),row.defenderCashDelta);
  assert.equal((a.reserve-m.game.init).toFixed(2),row.attackerCashDelta);
  if(!pairs.has(pair)) pairs.set(pair,{rule,defender,attacker,legal:0,grayEver:0,peak256:0,defenderErased:0,erasedWith256GrayAtEnd:0,totalGrayAtEnd:0,largestGrayAtEnd:0});
  const r=pairs.get(pair),gray=m.world.ownerCells[7].length;
  r.legal++;r.grayEver+=Number(peak>0);r.peak256+=Number(peak>=256);
  r.defenderErased+=Number(dc===0&&controlLive>0);
  r.erasedWith256GrayAtEnd+=Number(dc===0&&controlLive>0&&gray>=256);
  r.totalGrayAtEnd+=gray;r.largestGrayAtEnd=Math.max(r.largestGrayAtEnd,gray);
}
const rows=[...groups.values()].flatMap(g=>[...g.pairs.values()]);
console.log(Object.keys(rows[0]).join(','));
for(const row of rows)console.log(Object.values(row).join(','));
