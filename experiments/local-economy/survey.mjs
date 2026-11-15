// Run the production sparse CA, not an aggregate economic surrogate.
// Reproduce: node experiments/local-economy/survey.mjs [output.json]
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {buildSphere} from '../../src/world/sphere.js';
import {patchForStamp} from '../../src/patterns/spherical-patch.js';
import {createTypedWorld} from '../typed-world/engine.mjs';
import {cards} from '../typed-world/catalog.mjs';
import {blastScene} from '../typed-world/blast-scene.mjs';
import {atlasCards} from '../typed-world/game/atlas-model.mjs';
import {createGameMatch,gameEconomies} from '../typed-world/game/match.mjs';
import {createGameBots} from '../typed-world/game/bots.mjs';
import {graphBall} from '../typed-world/spatial.mjs';

const rounded=n=>Math.round(n*1e6)/1e6;
const common={arbitration:'ballot',eligibility:'contest',existence:'majority',passage:'literal'};
const family=['hex-b2s245/farm-4-12','hex-b2s245/farm-18-66','callahan/p2','callahan/glider',
  'callahan/gun20','callahan/bagley-stalk-p8','andreen/bagley-sym-glider','andreen/bagley-diagonal-puffer-p18','ashley/gun'];
function ledger(m){
  const p=m.players[1];
  return {gen:m.gen,field:p.conventional,reserve:rounded(p.reserve),income:rounded(p.income),births:p.births,birthSpent:rounded(p.birthSpent),
    energyLost:rounded(p.energyLost??0),overflow:rounded(p.energyOverflow??0),refused:p.refused,birthIncome:p.birthIncome,deathIncome:p.deathIncome,
    visible:m.spatial.enabled?m.visibility(1).visible.size:null,explored:m.spatial.enabled?m.visibility(1).explored.size:null};
}
export function patternTrial(graph,key,{mode='local',seed=1,ticks=128,perCell=160,traits={}}={}){
  const card=atlasCards.find(c=>c.key===key);assert(card,'Unknown pattern '+key);
  const ids=patchForStamp({graph},graph.farthest,seed%6,card.offsets);
  if(!ids)return {kind:'pattern',key,mode,seed,status:'does-not-fit'};
  const bank=card.offsets.length*perCell;
  const economy=mode==='native'?{...gameEconomies.stability,stampCost:0,birthCost:0,stableEnergy:0}:gameEconomies.stability;
  const m=createTypedWorld(graph,{...common,seed,wallets:[bank],economy,spatial:{enabled:mode==='local',...traits}});
  assert((mode==='local'?m.bootstrapStamp:m.stamp)(1,card.rule,card.resolver,ids,card.ballot,card.sense));
  const initial=ledger(m);let peak=m.cells.size,extinctAt=null;
  for(let t=0;t<ticks;t++){
    m.step();peak=Math.max(peak,m.cells.size);
    if(!m.cells.size){extinctAt=m.gen;break;}
  }
  const final=ledger(m);
  return {kind:'pattern',key,rule:card.rule,group:card.group,mode,seed,F:graph.f,ticks,perCell,bank,initial,peak,extinctAt,...final};
}
export function isolationTrial(graph,{mode='local',seed=1,scenario='clean',ticks=64,perCell=160}={}){
  const {anchor,remote}=blastScene(graph),base=cards.get('hex-b2s245/farm-4-12');
  const baseIds=patchForStamp({graph},anchor,seed%6,base.offsets),ids=[...baseIds];
  if(scenario!=='clean'){
    const offset=scenario==='adjacent'?3:0;
    const triangle=patchForStamp({graph},scenario==='adjacent'?anchor:remote,seed%6,[[offset,0],[offset+1,0],[offset+1,-1]]);
    assert(triangle);ids.push(...triangle);
  }
  const bank=ids.length*perCell;
  const m=createTypedWorld(graph,{...common,seed,wallets:[bank],economy:gameEconomies.stability,spatial:{enabled:mode==='local'}});
  assert((mode==='local'?m.bootstrapStamp:m.stamp)(1,'hex-b2s245','contact',ids));
  const region=graphBall(graph,[anchor],8);
  const farm=()=>{
    let cells=0,energy=0,stable=0;
    for(const site of region){const c=m.cells.get(site);if(c){cells++;energy+=c.energy??0;stable+=Number((c.stableAge??c.age)>=12);}}
    return {cells,energy:rounded(energy),stable};
  };
  const initial=ledger(m),initialFarm=farm(),checkpoints=[];let peak=m.cells.size;
  for(let t=0;t<ticks;t++){
    m.step();peak=Math.max(peak,m.cells.size);
    if(m.gen%16===0)checkpoints.push({...ledger(m),farm:farm()});
  }
  return {kind:'isolation',mode,scenario,seed,F:graph.f,ticks,perCell,bank,initial,initialFarm,peak,...ledger(m),farm:farm(),checkpoints};
}
export function botTrial(graph,{seed=1,ticks=256,players=3,budget=4,mode='local'}={}){
  const session=createGameMatch({graph,seed,players,spatial:{enabled:mode==='local'}}),m=session.match,orders=[];
  let illegal=0,maximumWork=0,work=0;
  const bots=createGameBots(m,{seed,budget,beforeOrder:o=>{
    if(m.spatial.enabled&&o.ids.some(id=>!m.canSee(o.owner,id)))illegal++;
  },onOrder:o=>orders.push(o)});
  const initialLight=m.spatial.enabled?m.players.slice(1).map((_,i)=>m.visibility(i+1).explored.size):null;
  while(m.gen<ticks&&session.outcome===null){
    session.step();if(session.outcome===null)bots.turn();
    const now=bots.stats.reduce((sum,s)=>sum+s.work,0);maximumWork=Math.max(maximumWork,now-work);work=now;
  }
  bots.destroy();assert.equal(illegal,0);assert(maximumWork<=budget);
  return {kind:'bots',mode,seed,F:graph.f,ticks,players,budget,gen:m.gen,winner:session.outcome,illegal,maximumWork,work,initialLight,
    finalLight:m.spatial.enabled?m.players.slice(1).map((_,i)=>m.visibility(i+1).explored.size):null,
    orders:orders.length,stampOrders:orders.filter(o=>o.tool==='stamp').length,erasures:orders.filter(o=>o.tool==='eraser').length,
    raids:orders.filter(o=>o.role==='raid').length,exploreOrders:orders.filter(o=>o.role==='explore').length,
    boughtRules:[...new Set(orders.map(o=>o.rule).filter(Boolean))],
    seats:m.players.slice(1).map((p,i)=>({owner:i+1,field:p.conventional,reserve:rounded(p.reserve),income:rounded(p.income),
      trials:bots.stats[i+1].trials,orders:bots.stats[i+1].orders,holds:bots.stats[i+1].holds,invalidated:bots.stats[i+1].invalidated}))};
}
export function runSurvey(){
  const graph=buildSphere(32),rows=[];
  for(const seed of [1,7,43])for(const mode of ['legacy','local'])for(const scenario of ['clean','remote','adjacent'])
    rows.push(isolationTrial(graph,{seed,mode,scenario}));
  for(const key of family)for(const mode of ['native','legacy','local'])rows.push(patternTrial(graph,key,{mode}));
  for(const seed of [7,41,109])for(const mode of ['legacy','local'])rows.push(botTrial(graph,{seed,mode}));
  for(const seed of [1,7,43]){
    const clean=rows.find(r=>r.kind==='isolation'&&r.mode==='local'&&r.scenario==='clean'&&r.seed===seed);
    const remote=rows.find(r=>r.kind==='isolation'&&r.mode==='local'&&r.scenario==='remote'&&r.seed===seed);
    assert.deepEqual(remote.farm,clean.farm,'A remote outbreak must leave the independent farm unchanged.');
  }
  return {schema:1,description:'Production CA, deterministic paired scenarios; scenario capital is 160 per seeded cell.',rows};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=runSurvey(),json=JSON.stringify(result,null,2)+'\n';
  if(process.argv[2])writeFileSync(process.argv[2],json);else process.stdout.write(json);
}
