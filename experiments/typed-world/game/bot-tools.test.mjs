import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSphere} from '../../../src/world/sphere.js';
import {transformOffsets} from '../../../src/patterns/editor/axial-transform.js';
import {createTypedWorld} from '../engine.mjs';
import {blastScene} from '../blast-scene.mjs';
import {gameEconomies} from './match.mjs';
import {createGameBots} from './bots.mjs';
import {observedPatternKey,regionEconomy} from './bot-tools.mjs';
import {insolventScene,recoveryTrial} from './tool-recovery.mjs';

const graph=buildSphere(32);
function world(options={}){
  return createTypedWorld(options.graph??graph,{wallets:[640],seed:43,economy:gameEconomies.stability,
    arbitration:'ballot',eligibility:'contest',existence:'majority',passage:'literal',...options});
}

test('the regional economic cue separates young expenditure from productive mature material',()=>{
  const {match,scene}=insolventScene({graph});
  const farm=regionEconomy(match,1,scene.remote,12);
  assert.equal(farm.mature,66);assert(farm.income>31);assert(farm.drain<0);
  const young=[...match.cells].find(([,c])=>c.age<match.economy.stableAfter)[0];
  const cloud=regionEconomy(match,1,young,3);
  assert(cloud.young>0);assert(cloud.drain>0);
});

test('paired cleaning restores purchasing power from insolvency and preserves the farm across seeds and brush sizes',()=>{
  for(const seed of [1,43,211])for(const radius of [3,12]){
    const result=recoveryTrial({graph,seed,radius});
    assert(result.startingReserve<1);assert(result.controlReserve<1);
    assert(result.reserve>3000);assert.equal(result.mature,66);assert.equal(result.cells,66);
    assert.equal(result.births,0);assert(result.farmPreserved);
    assert(result.erasures>=2);assert(result.maximumWork<=4);
    for(const order of result.orders.filter(o=>o.tool==='eraser')){
      assert(order.radius<=radius);assert(order.removed>0);assert(order.revalidated);assert(order.expected>0);
    }
  }
});

test('an observed producer becomes private, paid stamps with its physical type and shared work budget',()=>{
  const scene=blastScene(graph),match=world({economy:{...gameEconomies.stability,guardStampExtra:3}});
  assert(match.stamp(1,'hex-b2s245','guard',scene.smallFarm,'age','native'));
  const orders=[],before=new Map(),bots=createGameBots(match,{owners:[1],cards:[],budget:4,
    beforeOrder:o=>{
      if(o.tool==='eraser')assert.fail('Healthy colony was erased.');
      before.set(o,match.players[1].reserve);
      assert(match.canStamp(o.owner,o.rule,o.resolver,o.ids,o.ballot,o.sense));
    },onOrder:o=>{
      assert.equal(before.get(o)-match.players[1].reserve,o.ids.length*match.stampPrice(o.resolver));orders.push(o);
    }});
  let work=0;
  for(let t=0;t<128;t++){
    match.step();bots.turn();bots.turn();
    assert(bots.stats[1].work-work<=4);work=bots.stats[1].work;
  }
  assert.equal(bots.stats[1].eraseOrders,0);assert.equal(bots.stats[1].captures,1);
  assert.equal(bots.stats[1].captureWork,32);assert.equal(bots.stats[1].captureTrials,1);
  assert(orders.length>0);assert.equal(bots.stats[1].capturedOrders,orders.length);
  for(const o of orders){
    assert(o.observed&&o.key.startsWith('observed/'));assert.equal(o.ids.length,12);
    assert.equal(o.resolver,'guard');assert.equal(o.ballot,'age');assert.equal(o.sense,'native');
  }
  assert(match.players[1].mature>12);
});

test('eyedropper respects the maximum complete pattern size without harming a healthy colony',()=>{
  const scene=blastScene(graph),match=world({toolSettings:{maxStampCells:8}});
  match.stamp(1,'hex-b2s245','contact',scene.smallFarm);
  const bots=createGameBots(match,{owners:[1],cards:[]});
  for(let t=0;t<128;t++){match.step();bots.turn();}
  assert(bots.stats[1].captureTrials>0);assert.equal(bots.stats[1].captures,0);
  assert.equal(bots.stats[1].eraseOrders,0);assert.equal(bots.stats[1].orders,0);
  assert.equal(match.players[1].mature,12);assert(match.players[1].reserve>1000);
});

function movingTrial({intervene=false}={}){
  const g=buildSphere(48),scene=blastScene(g),match=world({graph:g,toolSettings:{maxEraseRadius:3}});
  match.stamp(1,'hex-b2s245','contact',scene.smallFarm);while(match.gen<16)match.step();
  const origin=scene.launch(0);match.stamp(1,'hex-b2s245','contact',origin);
  match.players[1].reserve=0;
  const control=match.fork(),orders=[],bots=createGameBots(match,{owners:[1],cards:[],budget:1,
    beforeOrder:o=>{assert(o.ids.every(id=>match.cells.get(id)?.owner===o.owner));},
    onOrder:o=>orders.push(o)});
  let work=0;
  for(let t=0;t<40;t++){
    match.step();bots.turn();control.step();
    assert(bots.stats[1].work-work<=1);work=bots.stats[1].work;
    if(!intervene&&t<16){assert.deepEqual([...match.cells],[...control.cells]);assert.deepEqual(match.players,control.players);}
    if(intervene&&t===7)assert(match.stamp(1,'hex-b2s245','contact',scene.middleFarm));
  }
  return {match,orders,origin};
}

test('a delayed forecast follows the current moving region and produces deterministic real strokes',()=>{
  const a=movingTrial(),b=movingTrial();
  assert.deepEqual(a.orders,b.orders);assert.deepEqual(a.match.players,b.match.players);
  assert.equal(a.orders.length,1);const order=a.orders[0];
  assert.equal(order.gen,33);assert(order.forecastAt<order.gen);
  assert(order.ids.every(id=>!a.origin.includes(id)));
  assert.equal(a.match.players[1].mature,12);assert.equal(a.match.players[1].conventional,12);
  assert(a.match.players[1].reserve>300);
});

test('a real purchase invalidates unfinished field forecasts before any later erasure',()=>{
  const {orders}=movingTrial({intervene:true});
  assert(orders.length>0);assert(orders.every(o=>o.gen>=41&&o.forecastAt>=25));
});

test('observed shape deduplication ignores translation and orientation while preserving physical identity',()=>{
  const card={rule:'hex-b2s245',resolver:'contact',ballot:'support',sense:'native',offsets:[[0,0],[1,0],[1,1],[3,2]]};
  const rotated={...card,offsets:transformOffsets(card.offsets,'cw').map(([q,r])=>[q+17,r-9])};
  assert.equal(observedPatternKey(card),observedPatternKey(rotated));
  assert.equal(observedPatternKey(card),observedPatternKey({...card,offsets:transformOffsets(card.offsets,'flip')}));
  assert.notEqual(observedPatternKey(card),observedPatternKey({...card,resolver:'guard'}));
});
