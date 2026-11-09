// Paid P6 launch into grown farm. Cross the tariff and funding rule on the
// identical sphere/pose. Continue the physical and financial ledger to a fixed
// observation horizon after a player is eliminated, with two owners and no bots.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import {buildSphere} from '../../src/world/sphere.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {gameEconomyTick} from '../../src/match/biomass.js';
import {advanceGeneration} from '../../src/simulation/generation.js';
import {resolveRuleProfile} from '../../src/match/rule-profiles.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {STABILITY_ECONOMY} from '../../src/match/constructive-economy.js';

const rule='hex-b2s245',source=fileURLToPath(new URL('../conflict-survey/contacts.mjs',import.meta.url));
const result=['F,rotation,lane,tariff,fundBirths,generation,attacker,defender,neutral,peakLive,attackerCash,defenderCash,attackerOut,defenderOut,attackerRefused,defenderRefused'];
for(const F of [32,320]){
  const graph=buildSphere(F);
  for(const [rotation,lane] of (F===32?[[0,-2],[1,0],[2,2],[3,-2],[4,0],[5,2]]:[[0,-2]])){
    const fixture=JSON.parse(execFileSync(process.execPath,[source,'fixture',rule,'lineage',F,1024,'db-151','farm-4-12',rotation,lane,16].map(String),{encoding:'utf8'}));
    for(const [tariff,base] of [['original',STABILITY_ECONOMY],['selected',resolveRuleProfile(rule).economy]]){
      assert.equal(base.policy,'stability');
      for(const fundBirths of [false,true]){
        const m=createHeadlessMatch(graph,{rule,growth:'classic',conflict:'lineage',economy:{...base,fundBirths,emptyFieldUpkeep:false}});
        const {world,game}=m;
        const step=()=>{advanceGeneration(world);gameEconomyTick(world,game,m.removeLive,()=>{});};
        assert(m.commitStamp(2,fixture.defendIds,false));
        for(let g=0;g<fixture.warm;g++)step();
        assert(m.commitStamp(1,fixture.shots,false));
        let peak=world.activeCount;
        for(let g=1;g<=1024;g++){
          step();peak=Math.max(peak,world.activeCount);
          if(g===128||g===512||g===1024){
            const [a,b]=game.players;
            result.push([F,rotation,lane,tariff,Number(fundBirths),g,world.ownerCells[1].length,world.ownerCells[2].length,world.ownerCells[7].length,peak,
              a.reserve.toFixed(2),b.reserve.toFixed(2),Number(a.out),Number(b.out),a.unfundedBirths,b.unfundedBirths].join(','));
          }
        }
      }
    }
  }
}
writeFileSync(new URL('./birth-finance.csv',import.meta.url),result.join('\n')+'\n');


// Reuse the exact previously recorded longer shot and two-cell intercept.
// All participants can afford these stamps at the selected tariff.
const sample=JSON.parse(readFileSync(new URL('../conflict-survey/responses.json',import.meta.url)))
  .find(s=>s.rule===rule && s.policy==='lineage' && s.protected?.saved);
const graph=buildSphere(32), rows=['shot,reply,horizon,attacker,defender,intactTargetSites,attackerCash,defenderCash,attackerOut,defenderOut'];
for(const [shot,reply] of [[false,false],[true,false],[true,true],[false,true]]){
  const m=createHeadlessMatch(graph,{rule,growth:'classic',conflict:'lineage',economy:{emptyFieldUpkeep:false}}), {world,game}=m;
  const points=decodeRLE(game.gameplay.patterns.find(p=>p.id===sample.target).rle);
  const average=[0,1].map(k=>Math.round(points.reduce((sum,p)=>sum+p[k],0)/points.length));
  const ids=m.patchForStamp(graph.farthest,0,points.map(([q,r])=>[q-average[0],r-average[1]]));
  const tick=()=>{advanceGeneration(world);gameEconomyTick(world,game,m.removeLive,()=>{});};
  assert(m.commitStamp(2,ids,false));
  for(let g=0;g<16;g++)tick();
  const occupied=[...world.ownerCells[2]];
  if(shot)assert(m.commitStamp(1,sample.shot,false));
  for(let g=0;g<1024;g++){
    if(reply && g===sample.replyTick)assert(m.commitStamp(2,sample.reply.ids,false));
    tick();
  }
  rows.push([Number(shot),Number(reply),1024,world.ownerCells[1].length,world.ownerCells[2].length,
    occupied.filter(id=>world.owners[id]===2).length,...game.players.slice(0,2).map(p=>p.reserve.toFixed(2)),
    ...game.players.slice(0,2).map(p=>Number(p.out))].join(','));
}
writeFileSync(new URL('./defense.csv',import.meta.url),rows.join('\n')+'\n');
