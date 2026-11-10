import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSphere } from '../../world/sphere.js';
import { createHeadlessMatch } from '../../match/headless.js';
import { advanceGeneration } from '../../simulation/generation.js';
import { gameEconomyTick } from '../../match/biomass.js';
import { beginLocalTrial } from './local-world.js';
import { createBrainArchive } from './memory.js';
import { createForecastFeedback } from './feedback.js';

const graph=buildSphere(32), center=graph.farthest;
function fixture(memory=createBrainArchive().open('isolated')) {
  const m=createHeadlessMatch(graph,{rule:'bays',economy:{policy:'activity',stampCost:20,
    initialCells:1000,birthCost:1,stableEnergy:0}});
  const {world,game}=m, owner=game.players[1], shape=m.patchForStamp(center,0,[[0,0],[1,0]]);
  const pose={center,ids:shape}, spot={kind:'empty',target:center};
  const raw=beginLocalTrial(world,game,owner.id,center,shape,{radius:6,horizon:8,audit:true}).step(8);
  assert(raw.forecast);
  const t={player:owner,position:pose,spot,action:{stamp:{id:'pair'},key:'pair'},context:'empty',
    brain:{rivalWeight:1,payback:12000},rawResult:raw,result:raw};
  const events=[],metrics={};
  const feedback=createForecastFeedback(world,game,memory,metrics,e=>events.push(e));
  assert(m.commitStamp(owner.id,shape,false));feedback.watch(owner,t,pose);
  function tick(){
    advanceGeneration(world);gameEconomyTick(world,game,m.removeLive,()=>{});
    return feedback.observe(1024);
  }
  return {m,t,feedback,events,metrics,memory,tick};
}

test('an executed local forecast is measured at its exact phase with its own operating ledger and a private residual',()=>{
  const {m,events,tick,memory}=fixture();
  for(let i=1;i<=8;i++)assert(tick()<=13*13);
  assert.equal(events.length,1);
  const e=events[0];
  assert.deepEqual([e.launched,e.gen,e.own.tailSamples],[0,8,8]);
  assert.equal(e.own.actualOperating,e.own.predictedOperating);
  assert.equal(e.own.observedFlow,e.own.predictedFlow);
  assert.equal(e.own.actualOperating-e.cost,m.game.players[1].reserve-20000);
  assert.deepEqual(memory.lookup(2,'yield/error/empty/own','pair'),{count:1,mean:0});
  assert.equal(memory.lookup(3,'yield/error/empty/own','pair').count,0);
});

test('a subsequent intervention in reach censors the outcome; unrelated distant purchases do not get counted as local production',()=>{
  for(const near of [true,false]){
    const {m,feedback,tick,metrics,events}=fixture();
    const id=near?center:graph.coords.findIndex((_,index)=>index%3===0&&
      [0,1,2].reduce((sum,k)=>sum+(graph.coords[index+k]-graph.coords[3*center+k])**2,0)>2)/3;
    feedback.recordStamp([id]);
    if(!near)assert(m.commitStamp(5,[id],false));
    for(let i=0;i<8;i++)tick();
    assert.equal(events.length,near?0:1);
    assert.equal(metrics.forecastsCensored,near?1:0);
    if(!near)assert.equal(events[0].own.residual,0);
  }
});

test('a past paid order can change a future bid but cannot create an effect for an unrelated target or another living learner',()=>{
  const memory=createBrainArchive().open('repeated');
  for(let run=0;run<3;run++){
    const {m,t,feedback,tick,events}=fixture(memory);
    // Unexpected natural disturbance after launch; learn without using any
    // future purchase. Trust only a correction that helped on later orders.
    if(run===1)assert.equal(feedback.correct(t,t.result).ownFlow,t.result.ownFlow);
    for(const site of [...m.world.ownerCells[2]])m.removeLive(site);
    for(let i=0;i<8;i++)tick();
    assert.equal(events[0].own.actualOperating,0);
    assert(events[0].own.residual<0);
    if(run===2){
      const learned=feedback.correct(t,t.result);
      assert(learned.ownFlow<t.result.ownFlow);
      assert.equal(feedback.correct({...t,player:m.game.players[2]},t.result).ownFlow,t.result.ownFlow);
    }
  }
  assert.equal(memory.lookup(2,'yield/error/empty/rival','pair').count,0);
});

test('only the chosen rival contributes to tactical forecasts, even with other players in the same copied region',()=>{
  const {m}=fixture(), {world,game}=m;
  const pts=p=>m.patchForStamp(center,0,p);
  assert(m.commitStamp(3,pts([[2,2],[3,2]]),false));
  assert(m.commitStamp(4,pts([[-2,-2],[-1,-2]]),false));
  const ids=pts([[-3,0]]);
  const project=rival=>beginLocalTrial(world,game,2,center,ids,{radius:8,horizon:2,audit:true,rival}).step(2);
  const combined=project(undefined),a=project(3),b=project(4);
  for(const field of ['rivalCash','rivalCells','rivalFlow','rivalCore']){
    assert.equal(a[field]+b[field],combined[field],field);
  }
  assert(a.forecast.rival && b.forecast.rival);
});

test('an unfunded or missed deadline produces no correction',()=>{
  const {m,feedback,metrics,events}=fixture();
  m.world.gen=8;
  m.game.players[1].lastUnfundedBirths=1;
  feedback.observe(1024);
  assert.equal(metrics.forecastsCensored,1);
  assert.equal(events.length,0);
});
