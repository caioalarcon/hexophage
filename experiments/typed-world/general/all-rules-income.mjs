// Recurrence certificate for nine native base cards run by one solvent wallet.
import {buildSphere} from '../../../src/world/sphere.js';
import {prepareNineFarms} from './scene.mjs';

const graph=buildSphere(32),period=252;
const fields=m=>JSON.stringify([...m.cells].sort((a,b)=>a[0]-b[0]).map(([id,c])=>[id,c.rule,c.owner,c.ballot,c.resolver,c.wave,Math.min(c.age,m.economy.stableAfter)]));
const rows=[];
for(const bank of [1600,16000])for(const extras of [0,1,2,4,8])for(const rot of [0,3]){
  const {match:m}=prepareNineFarms(graph,{bank,extras,rotation:rot}),p=m.players[1];
  let start,startCash,minG1=Infinity,peakBirthDebit=0,cycleGain,recurs,conflicts=0,denied=0,stillAll9=true;
  for(let g=0;g<=1024;g++){
    if(g===32){start=fields(m);startCash=p.reserve;}
    if(g===32+period){recurs=start===fields(m);cycleGain=p.reserve-startCash;denied=p.refused;}
    if(g===1024)break;
    const opening=p.reserve,prior=p.birthSpent;
    m.step({onContest(){conflicts++;}});
    if(g>=32 && g<32+period){
      minG1=Math.min(minG1,opening);peakBirthDebit=Math.max(peakBirthDebit,p.birthSpent-prior);
    }
    if(new Set([...m.cells.values()].map(c=>c.rule)).size<9)stillAll9=false;
  }
  const certificate=stillAll9 && recurs && denied===0 && conflicts===0 && cycleGain>=0 && minG1>=peakBirthDebit;
  rows.push({bank,extras,rot,period,repeatAtG284:+recurs,drift:+cycleGain.toFixed(4),minimumCashInCycle:+minG1.toFixed(4),
    largestSingleTickDebit:peakBirthDebit,refusedThrough284:denied,contests:conflicts,all9Through1024:+stillAll9,
    rulesG1024:new Set([...m.cells.values()].map(c=>c.rule)).size,finalCash:+p.reserve.toFixed(2),certificate:+certificate});
}
const keys=Object.keys(rows[0]);console.log(keys.join(','));for(const row of rows)console.log(keys.map(k=>row[k]).join(','));
