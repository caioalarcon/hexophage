// Isolated CA projections for the deck and editor. Settlement events use the
// same signs as the typed engine. Opponents and liquidation are absent here.
import {cards,rules} from '../catalog.mjs';
import {defaultEconomy} from '../engine.mjs';
import {physicalYields} from '../../../src/patterns/physical-yields.js';
import {advancePattern,patternSite} from '../../../src/patterns/planar-simulation.js';
import {netChange} from './net-change.mjs';

const sourceMeta=new Map();
for(const [key,p] of Object.entries(rules))for(const card of p.gameplay.atlas??p.gameplay.patterns)
  sourceMeta.set(key+'/'+card.id,card);
export const atlasCards=[...cards].map(([key,c])=>{
  const meta=sourceMeta.get(key);
  return {key,id:c.id,source:c.source,rule:c.source,name:c.name,offsets:c.offsets,group:meta.group??'padrão',
    period:meta.period??0,resolver:'contact',ballot:'support',sense:'native'};
});
const byKey=new Map(atlasCards.map(c=>[c.key,c]));
const econ=overrides=>({...defaultEconomy,birthEnergy:0,deathEnergy:0,...overrides});
const effective=(n,scale)=>scale?n/(1+n/scale):n;
const stableWorth=(n,e,rest)=>e.stableEnergy*(effective(rest+n,e.productionScale)-effective(rest,e.productionScale));
export const stampCost=(card,e)=>card.offsets.length*((e.stampCost??defaultEconomy.stampCost)+(card.resolver==='guard'?(e.guardStampExtra??0):0));
function measured(card){
  const native=byKey.get(card.nativeKey??card.key);
  if(native && native.rule===card.rule && (!card.custom || card.nativeKey)){
    const [_,births,bands]=physicalYields[native.rule][native.id];
    return {births,deaths:births-(netChange[native.key]??0)/128,bands,window:128,horizon:1024};
  }
  return card.sample;
}
function bandMean(bands,age,window){
  let total=0;
  for(let k=0;k<bands.length;k+=3)
    total+=Math.max(0,bands[k+1]-Math.max(bands[k],age)+1)*bands[k+2];
  return total/window;
}
function estimate(card,e,reserve,rest){
  const sample=measured(card),cost=stampCost(card,e);
  if(!sample)return {card,cost,feasible:reserve>=cost,flow:null,score:-Infinity};
  const mature=bandMean(sample.bands,e.stableAfter,sample.window),{births,deaths}=sample;
  const flow=stableWorth(mature,e,rest)+births*(e.birthEnergy-e.birthCost)+deaths*e.deathEnergy;
  return {card,cost,births,deaths,mature,flow,feasible:reserve+1e-9>=cost,
    score:flow-cost/256,payback:flow>0?cost/flow:null,horizon:sample.horizon};
}
export function rankCards(list,economy,{reserve=Infinity,mature=0}={}){
  const e=econ(economy);
  return list.map(card=>estimate(card,e,reserve,mature)).sort((a,b)=>
    Number(b.feasible)-Number(a.feasible) || b.score-a.score || a.card.key.localeCompare(b.card.key,'en'));
}
export function automaticDeck(ranked,count=54){
  const chosen=new Set();
  for(const r of Object.keys(rules)){
    const family=ranked.filter(x=>x.card.rule===r),ship=family.find(x=>x.card.group==='nave');
    if(ship)chosen.add(ship.card.key);
    let n=ship?1:0;
    for(const x of family)if(n<4&&!chosen.has(x.card.key)){chosen.add(x.card.key);n++;}
  }
  for(const x of ranked)if(chosen.size<count)chosen.add(x.card.key);
  return ranked.filter(x=>chosen.has(x.card.key)).map(x=>x.card);
}
export function seedFrame(card){
  return new Map(card.offsets.map(([q,r])=>[patternSite(q,r),1]));
}
export function advanceFrame(frame,card,economy,rest=0){
  const e=econ(economy);
  let mature=0;for(const age of frame.values())if(age>=e.stableAfter)mature++;
  const {next,births}=advancePattern(frame,e.stableAfter,rules[card.rule].physics);
  const deaths=frame.size+births-next.size,flow=stableWorth(mature,e,rest)+births*(e.birthEnergy-e.birthCost)+deaths*e.deathEnergy;
  return {next,births,deaths,mature,flow};
}
// Editor-created seeds have no long-window atlas benchmark. Measure their own
// initial 96 generations and store the actual age distribution for repricing.
export function measurePattern(card,economy,horizon=96){
  let frame=seedFrame(card),births=0,deaths=0,totalFlow=0,used=0;
  const counts=new Map();
  for(;used<horizon && frame.size<=12000;used++){
    for(const age of frame.values())counts.set(age,(counts.get(age)??0)+1);
    const step=advanceFrame(frame,card,economy);frame=step.next;
    births+=step.births;deaths+=step.deaths;totalFlow+=step.flow;
  }
  const bands=[...counts].sort((a,b)=>a[0]-b[0]).flatMap(([age,count])=>[age,age,count]);
  return {births:births/Math.max(1,used),deaths:deaths/Math.max(1,used),bands,window:used,horizon:used,
    finalCells:frame.size,net:totalFlow,limited:used<horizon};
}
