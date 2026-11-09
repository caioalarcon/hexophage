// Paired spherical trials. Let a defender develop 32 generations, then buy
// a legal opposing stamp beside one of its two flanks. Without-stamp control
// shares geography, founding cost, maturity, erosion, attribution and tariffs.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildSphere } from '../../src/world/sphere.js';
import { createHeadlessMatch } from '../../src/match/headless.js';
import { STABILITY_ECONOMY as economy } from '../../src/match/constructive-economy.js';
import { gameEconomyTick } from '../../src/match/biomass.js';
import { advanceGeneration } from '../../src/simulation/generation.js';
import { decodeRLE } from '../../src/patterns/rle.js';
import { seedPatternAges, advancePattern, patternOffset } from '../../src/patterns/planar-simulation.js';
import { ruleProfiles, resolveRuleProfile } from '../../src/match/rule-profiles.js';

const graph=buildSphere(48), warm=32, horizon=128;
const results=[], requests=process.argv.slice(2);
const csv=readFileSync(new URL('./isolated.csv',import.meta.url),'utf8').trim().split('\n');
const cols=csv.shift().split(',');
const data=csv.map(line=>Object.fromEntries(line.split(',').map((v,i)=>[cols[i],v])));
function center(points) {
  const q=Math.round(points.reduce((s,p)=>s+p[0],0)/points.length);
  const r=Math.round(points.reduce((s,p)=>s+p[1],0)/points.length);
  return {q,r,points:points.map(([x,y])=>[x-q,y-r])};
}
function runTicks(m,n) {
  for(let i=0;i<n;i++) {
    advanceGeneration(m.world);
    gameEconomyTick(m.world,m.game,m.removeLive,()=>{});
  }
}
function quote(m,owner) {
  const p=m.game.players[owner-1];
  return {live:m.world.ownerCells[owner].length, reserve:p.reserve};
}
for(const rule of Object.keys(ruleProfiles).filter(s=>s!=='custom' && (!requests.length || requests.includes(s)))) {
  const {gameplay,physics}=resolveRuleProfile(rule);
  const patterns=gameplay.atlas??gameplay.patterns;
  const lookup=new Map(patterns.map(p=>[p.id,p]));
  const rank=data.filter(r=>r.rule===rule && r.complete==='true' && +r.live && +r.cells<=55 && lookup.has(r.id))
    .sort((a,b)=>+b.lateFlow - +a.lateFlow || +a.cells- +b.cells);
  if (!rank.length) continue;
  const affordable=patterns.filter(p=>p.cells<=82);
  const types = g=>affordable.filter(p=>g.test(p.group));
  const ships=types(/nave|ship/).sort((a,b)=>a.cells-b.cells);
  const special=types(/gerador|crescedor|puffer|canhão|gun|rake/).sort((a,b)=>a.cells-b.cells);
  const oscillators=types(/oscilador/).filter(p=>p.period>2).sort((a,b)=>b.period-a.period);
  // Include the best operating seed, and a mechanically distinct target.
  const targets=[...new Set([lookup.get(rank[0].id),special[0]??oscillators.find(p=>p.cells<=55)??ships[0],
    rule==='hex-b2s245' && lookup.get('scan-cf5664')])].filter(Boolean);
  const attackers=[...new Set([ships[0],ships.find(p=>p.period!==ships[0].period),special[0],oscillators[0],lookup.get(rank[0].id),
    rule==='hex-b2s245' && lookup.get('scan-b1cf68')])].filter(Boolean);
  for(const target of targets) {
    const def=center(decodeRLE(target.rle));
    let ages=seedPatternAges(target);
    for(let i=0;i<warm;i++) ages=advancePattern(ages,economy.stableAfter,physics).next;
    if (!ages.size) continue;
    const field=[...ages.keys()].map(patternOffset).map(([q,r])=>[q-def.q,r-def.r]);
    function setup() {
      const m=createHeadlessMatch(graph,{ growth:'classic', conflict: 'legacy',rule,economy});
      const ids=m.patchForStamp(graph.farthest,0,def.points);
      if(!ids || !m.commitStamp(1,ids,false)) throw Error('Invalid defender '+target.id);
      runTicks(m,warm);
      return m;
    }
    const control=setup();
    runTicks(control,horizon);
    const ref=quote(control,1);
    for(const attack of attackers) {
      let facing=center(decodeRLE(attack.rle)).points;
      for(let rot=0;rot<6;rot++) {
        for(const side of [-1,1]) {
          const extreme=Math.max(...field.map(p=>p[0]*side));
          const edge=field.filter(p=>p[0]*side===extreme).map(p=>p[1]).sort((a,b)=>a-b);
          const qr=edge[Math.floor(edge.length/2)];
          const near=Math.min(...facing.map(p=>p[0]*side));
          for(const lateral of [-2,0,2]) {
            const m=setup();
            const points=facing.map(([x,y])=>[x+side*(extreme+2-near),y+qr+lateral]);
            const ids=m.patchForStamp(graph.farthest,0,points);
            const placed=!!ids && m.commitStamp(2,ids,false);
            const row=[rule,target.id,attack.id,side,rot,lateral,Number(placed),ref.live];
            if(placed) {
              runTicks(m,horizon);
              const d=quote(m,1),a=quote(m,2);
              row.push(d.live,a.live,(d.reserve-ref.reserve).toFixed(2),(a.reserve-m.game.init).toFixed(2));
            } else row.push('','','','');
            results.push(row);
          }
        }
        facing=facing.map(([q,r])=>[-r,q+r]);
      }
    }
  }
  console.error(rule,results.filter(r=>r[0]===rule).length);
}
const header='rule,defender,attacker,flank,rotation,lateral,legal,controlDefenderLive,defenderLive,attackerLive,defenderCashDelta,attackerCashDelta';
writeFileSync(new URL('./contacts'+(requests.length?'-'+requests.join('-'):'')+'.csv',import.meta.url),header+'\n'+results.map(r=>r.join(',')).join('\n')+'\n');
