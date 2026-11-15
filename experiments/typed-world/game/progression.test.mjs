import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSphere} from '../../../src/world/sphere.js';
import {createTypedWorld} from '../engine.mjs';
import {footprint} from '../catalog.mjs';
import {graphBall} from '../spatial.mjs';
import {attachProgression,defaultProgressionPlan,normalizeProgressionPlan,progressionSpatialTypes} from './progression.mjs';

const graph=buildSphere(16);
const key='hex-b2s245/scan-cf5664';
function siteFor(match,owner,card,metadata,near){
  for(const site of near??Array.from({length:graph.n},(_,i)=>i)){
    const ids=footprint(graph,key,site);
    if(ids&&(!match||match.canStamp(owner,card.rule,card.resolver,ids,card.ballot,card.sense,metadata)))return ids;
  }
  return null;
}
function fixture(options={}){
  const plan=normalizeProgressionPlan(options.plan??defaultProgressionPlan());
  const match=createTypedWorld(graph,{wallets:[640,640],spatial:{enabled:true,types:progressionSpatialTypes(plan)}});
  const progression=attachProgression(match,{plan,harvestAfter:3,...options});
  const ids=siteFor(null);
  assert(progression.bootstrap(1,plan.base,ids));
  return {match,progression,plan,ids,base:plan.nodes.find(n=>n.id===plan.base)};
}

test('plans accept user geometry and names; dependencies must lead to the chosen root',()=>{
  const document=defaultProgressionPlan();
  document.base='custom-root';document.nodes[0].id='custom-root';
  document.nodes[0].name='Minha nave lógica';document.nodes[0].cardKey=null;
  for(const node of document.nodes)if(node.parent==='base')node.parent='custom-root';
  const plan=normalizeProgressionPlan(document);
  assert.equal(plan.base,'custom-root');assert.equal(plan.nodes[0].name,'Minha nave lógica');
  assert.deepEqual(plan.nodes[0].offsets,document.nodes[0].offsets);
  const bad=structuredClone(document);bad.nodes[1].parent='scout';
  assert.throws(()=>normalizeProgressionPlan(bad),/ciclo/);
  bad.nodes[1].parent='unknown';assert.throws(()=>normalizeProgressionPlan(bad),/pai/);
  bad.nodes[1].parent=null;assert.throws(()=>normalizeProgressionPlan(bad),/pai/);
});

test('allocation changes composition while size and functional traits fix a positive minimum price',()=>{
  const document=defaultProgressionPlan(),original=normalizeProgressionPlan(document).nodes[0];
  document.nodes[0].weights=[100,0,0,0];
  const concentrated=normalizeProgressionPlan(document).nodes[0];
  assert.equal(original.cost.reduce((a,b)=>a+b,0),concentrated.cost.reduce((a,b)=>a+b,0));
  assert(concentrated.cost.every(n=>n>0));assert(concentrated.cost[0]>original.cost[0]);
  document.nodes[0].weights=[0,0,0,0];assert.throws(()=>normalizeProgressionPlan(document),/100/);
  document.nodes[0].weights=[40,20,20,20];document.nodes[0].capacity=512;document.nodes[0].vision=12;
  const expensive=normalizeProgressionPlan(document).nodes[0];
  assert(expensive.cost[1]>original.cost[1]);assert(expensive.cost[2]>original.cost[2]);
  const traits=progressionSpatialTypes(document)[expensive.rule+'/'+expensive.resolver+'/'+expensive.id];
  assert.equal(traits.visionRadius,12);assert.equal(traits.cellCapacity,512);
});

test('a fixed engineering budget gives intermediate fabricators a mechanical purpose',()=>{
  const document=defaultProgressionPlan(),plan=normalizeProgressionPlan(document);
  assert(plan.designPoints<=64);assert(plan.nodes.every(n=>n.childPoints<=28));
  const star=structuredClone(document);for(const node of star.nodes)if(node.id!==star.base)node.parent=star.base;
  assert.throws(()=>normalizeProgressionPlan(star),/limite local/);
  const free=structuredClone(document);for(const node of free.nodes){node.vision=16;node.reach=24;node.capacity=512;}
  assert.throws(()=>normalizeProgressionPlan(free),/orçamento/);
});

test('opening is one scenario grant; all later stamps require a live local parent and pay materials atomically',()=>{
  const {match,progression,plan,ids}=fixture(),relay=plan.nodes.find(n=>n.id==='relay');
  assert.equal(progression.bootstrap(1,'base',ids),false);
  const metadata={contract:'relay'},target=siteFor(match,1,relay,metadata,graphBall(graph,ids,6));
  assert(target,'initial illumination has room for a paid child');
  const before=progression.inventory(1),energy=match.players[1].reserve;
  assert(progression.getQuote(1,'relay',target).ok);
  assert.equal(match.canStamp(1,relay.rule,relay.resolver,target,relay.ballot,relay.sense),false);
  assert.equal(match.stamp(1,relay.rule,'phase',target,relay.ballot,relay.sense,metadata),false);
  assert.deepEqual(progression.inventory(1),before);assert.equal(match.players[1].reserve,energy);
  assert(match.stamp(1,relay.rule,relay.resolver,target,relay.ballot,relay.sense,metadata));
  assert.deepEqual(progression.inventory(1),before.map((n,k)=>n-relay.cost[k]));
  assert(target.every(site=>match.cells.get(site).contract==='relay'));
  const paid=progression.inventory(1);
  assert.equal(match.stamp(1,relay.rule,relay.resolver,target,relay.ballot,relay.sense,metadata),false);
  assert.deepEqual(progression.inventory(1),paid);
});

test('global sight and resource stock cannot replace the required parent at the proposed location',()=>{
  const {match,progression,plan,ids}=fixture({initialResources:[1000,1000,1000,1000]});
  const relay=plan.nodes.find(n=>n.id==='relay'),remote=siteFor(null,null,null,null,[...graphBall(graph,ids,15)].reverse());
  assert(remote);
  const before=progression.inventory(1);
  // The source proof fails before economic permission; an empty far region is
  // never a legal site merely because the owner's total inventory is large.
  const far=Array.from({length:graph.n},(_,i)=>i).filter(site=>!graphBall(graph,ids,12).has(site));
  const target=siteFor(null,null,null,null,far);
  const quote=progression.getQuote(1,'relay',target);
  assert.equal(quote.ok,false);assert.equal(quote.code,'range');
  assert.equal(match.stamp(1,relay.rule,relay.resolver,target,relay.ballot,relay.sense,{contract:'relay'}),false);
  assert.deepEqual(progression.inventory(1),before);
});

test('short material inventory rejects a legal energy purchase without changing cells or energy',()=>{
  const {match,progression,plan,ids}=fixture({initialResources:[0,0,0,0]}),base=plan.nodes[0];
  const target=siteFor(null,null,null,null,[...graphBall(graph,ids,6)].filter(s=>!match.cells.has(s)));
  const cells=new Map(match.cells),energy=match.players[1].reserve;
  const quote=progression.getQuote(1,'base',target);
  assert.equal(quote.code,'resources');
  assert.equal(match.stamp(1,base.rule,base.resolver,target,base.ballot,base.sense,{contract:'base'}),false);
  assert.deepEqual(match.cells,cells);assert.equal(match.players[1].reserve,energy);
});

test('finite extraction conserves every resource and does not pay immature or newborn cells',()=>{
  const {match,progression}=fixture({initialResources:[0,0,0,0],stock:1,harvestAfter:4,harvestRate:1,depositRate:2});
  const deposits=progression.terrainTotals();
  for(let i=0;i<3;i++)match.step();
  assert.deepEqual(progression.inventory(1),[0,0,0,0]);
  for(let i=0;i<80;i++)match.step();
  const remaining=progression.terrainTotals(),stats=progression.stats(1);
  assert(stats.harvested.every(n=>n>0),'opening provides access to all four materials');
  for(let k=0;k<4;k++){
    assert(Math.abs(deposits[k]-remaining[k]-stats.harvested[k])<1e-7);
    assert(Math.abs(stats.initial[k]+stats.harvested[k]-stats.spent[k]-stats.inventory[k])<1e-7);
  }
  const mature=progression.inventory(1);for(let i=0;i<100;i++)match.step();
  assert.deepEqual(progression.inventory(1),mature,'reachable finite patches are exhausted');
});

test('base identity is inherited without recognizing its silhouette, and extirpation ends its fabrication authority',()=>{
  const {match,progression,ids}=fixture();
  for(let g=0;g<8;g++)match.step();
  assert.equal(progression.objective(1).defeated,false);
  assert([...match.cells.values()].every(c=>c.contract==='base'));
  const before=progression.inventory(1);
  for(const [site,c] of [...match.cells])if(c.owner===1)match.erase(1,site,0);
  assert.equal(progression.objective(1).defeated,true);
  assert.deepEqual(progression.legalCards(1),[]);assert.deepEqual(progression.inventory(1),before);
});

test('private forecasts cannot mutate real materials and redact hidden terrain',()=>{
  const {match,progression,plan,ids}=fixture(),before=progression.inventory(1),terrain=progression.terrainTotals();
  const fork=match.forkObserved(1),relay=plan.nodes.find(n=>n.id==='relay');
  const target=siteFor(fork,1,relay,{contract:'relay'},graphBall(graph,ids,6));assert(target);
  assert(fork.stamp(1,relay.rule,relay.resolver,target,relay.ballot,relay.sense,{contract:'relay'}));
  for(let i=0;i<20;i++)fork.step();
  assert.deepEqual(progression.inventory(1),before);assert.deepEqual(progression.terrainTotals(),terrain);
  const hidden=Array.from({length:graph.n},(_,i)=>i).find(site=>!match.canSee(1,site));
  assert.equal(fork.progression.resourceAt(hidden),null);assert.deepEqual(fork.progression.inventory(2),[0,0,0,0]);
});
