// Five natural learners, one focal seat. Change only how that seat uses observations.
// Usage: node experiments/decision-feedback/ablation.mjs ashley15 4751 2 32768
import {cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {buildSphere} from '../../src/world/sphere.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {createThinkingStrategy} from '../../src/bots/brain/strategy.js';

import {poseTreatment} from './pose-treatment.mjs';

const [rule='ashley15', seedArg='4751', focalArg='2', limitArg='32768', treatment='silent']=process.argv.slice(2);
const seed=Number(seedArg), focal=Number(focalArg), limit=Number(limitArg);
if(!Number.isInteger(focal)||focal<2||focal>6)throw Error('Expected a bot seat from 2 to 6');
if(!['silent','pose'].includes(treatment))throw Error('Expected silent or pose');
const F=32, src=fileURLToPath(new URL('../../src',import.meta.url));
const temp=mkdtempSync(join(tmpdir(),'hex-field-ablation-'));

function one(createStrategy) {
  const orders=[], observations=[];
  const m=createHeadlessMatch(buildSphere(F),{rule,economy:{emptyFieldUpkeep:false},growth:'classic',conflict:'lineage',botMode:'learn',
    brain:{seed,createStrategy,onPlacement:o=>orders.push(o),onOutcome:r=>{
      if(r.owner===focal)observations.push(r.gen);
    }}});
  m.game.players[0].out=true;
  while(m.world.gen<limit && !m.game.ended)m.nextTick();
  const bots=m.game.players.slice(1), player=bots.find(p=>p.id===focal);
  const others=bots.filter(p=>p.id!==focal), own=orders.filter(o=>o.owner===focal);
  return {orders,own,observations,gen:m.world.gen,winner:m.game.winner,alive:+!player.out,
    attacks:own.filter(o=>o.rival).length,wallet:player.reserve,
    lead:player.reserve-Math.max(...others.map(p=>p.reserve)),cells:m.world.ownerCells[focal].length,
    observationVisits:m.game.brainMetrics.forecastVisits,totalVisits:m.game.brainMetrics.visits,
    repeatedPoseBids:m.game.brainMetrics.repeatedPoseBids??0};
}

const stamp=o=>o?[o.gen,o.owner,o.stamp,o.center,o.heading,o.rival??0,o.target].join('|'):'';
function sharedPrefix(a,b){
  let i=0;
  while(i<a.length && i<b.length && stamp(a[i])===stamp(b[i]) && a[i].ids.join(',')===b[i].ids.join(','))i++;
  return i;
}

try{
  cpSync(src,join(temp,'src'),{recursive:true});
  writeFileSync(join(temp,'package.json'),'{"type":"module"}');
  if(treatment==='pose')poseTreatment(temp,focal);
  else{
    const feedback=join(temp,'src/bots/brain/feedback.js');
    let code=readFileSync(feedback,'utf8');
    for(const [before,after] of [
      ["memory.observe(id,'field/'+w.kind", "if(id!=="+focal+")memory.observe(id,'field/'+w.kind"],
      ["copy[side+'Flow']+=value.applied;", "if(t.player.id!=="+focal+")copy[side+'Flow']+=value.applied;"],
    ]){
      if(code.split(before).length!==2)throw Error('Unexpected feedback source for this ablation');
      code=code.replace(before,after);
    }
    writeFileSync(feedback,code);
  }
  const control=(await import(pathToFileURL(join(temp,'src/bots/brain/strategy.js')))).createThinkingStrategy;
  const active=one(createThinkingStrategy), silent=one(control);
  const allPrefix=sharedPrefix(active.orders,silent.orders), ownPrefix=sharedPrefix(active.own,silent.own);
  const header=['rule','seed','focal','F','limit','arm','gen','winner','alive','ownOrders','ownAttacks',
    'wallet','leadOverRichestOther','cells','ownObservations','observationVisits','totalVisits',
    'matchedOrders','nextOrder','matchedFocalOrders','nextFocalOrder','focalObservationsBeforeFirstDifference','repeatedPoseBids'];
  console.log(header.join(','));
  for(const [arm,r] of [['active',active],[treatment,silent]]){
    const gen=Math.min(active.orders[allPrefix]?.gen??Infinity,silent.orders[allPrefix]?.gen??Infinity);
    console.log([rule,seed,focal,F,limit,arm,r.gen,r.winner,r.alive,r.own.length,r.attacks,
      r.wallet.toFixed(2),r.lead.toFixed(2),r.cells,r.observations.length,r.observationVisits,r.totalVisits,
      allPrefix,stamp(r.orders[allPrefix]),ownPrefix,stamp(r.own[ownPrefix]),r.observations.filter(g=>g<gen).length,r.repeatedPoseBids].join(','));
  }
}finally{rmSync(temp,{recursive:true,force:true});}
