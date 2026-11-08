import test from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessMatch} from './headless.js';
import {buildSphere} from '../world/sphere.js';
import {eastAt} from '../world/geometry.js';
import {patterns} from '../patterns/catalog.js';
import {decodeRLE} from '../patterns/rle.js';
import {plantFounder} from './founding.js';
import {availableCells, DEFAULT_ECONOMY, generationEnergy, initialEnergy, parameterValue} from './constructive-economy.js';

const idle=new Map([2,3,4,5,6].map(id=>[id,()=>{}]));
const fresh=()=>createHeadlessMatch(buildSphere(24),{strategies:idle});
function plantFlipper(m){
  const p=m.game.players[0], pattern=patterns.callahan.find(p=>p.id==='p2');
  const ids=m.patchForStamp(p.seed,eastAt(m.world.graph,p.seed),decodeRLE(pattern.rle),true);
  assert.equal(ids?.length,3);
  assert(m.commitStamp(1,ids));
  return p;
}
test('the opening can fund two growers or a grower plus a combat reserve',()=>{
  const m=fresh(), p=m.game.players[0];
  assert.equal(initialEnergy(m.game.economy),820000);
  assert.equal(availableCells(p.reserve,m.game.economy),82);
  assert(plantFounder(m.world,m.game,p,m.commitStamp));
  assert.equal(m.world.ownerCells[1].length,36);
  assert.equal(p.reserve,460000);
  assert(!plantFounder(m.world,m.game,p,m.commitStamp),'opening helper plants at most one automatically');
  const grower=patterns.callahan.find(x=>x.id==='stalk');
  let second=null;
  for(let id=0;id<m.world.graph.n&&!second;id++) {
    if(m.world.graph.deg[id]!==6||m.world.graph.distance[id]<20)continue;
    second=m.patchForStamp(id,0,decodeRLE(grower.rle),true);
  }
  assert(second?.length===36);
  assert(m.commitStamp(1,second),'the player can stamp another grower');
  assert.equal(p.reserve,100000);
  assert.equal(availableCells(0,{stampCost:0}),Infinity);
});
test('slider steps support fractional energy and independent maxima',()=>{
  assert.deepEqual([-20,0,2.5,100,123].map(v=>parameterValue(v,100)),[0,0,3,100,100]);
  assert.equal(parameterValue('0.027',2,.001),.027);
  assert.equal(parameterValue(1234,5000),1234);
});
test('colony production reaches half at scale, and a large colony has diminishing returns',()=>{
  const e=DEFAULT_ECONOMY, f=s=>generationEnergy(0,s,e).income;
  assert.equal(f(0),0); assert.equal(f(8000),80);
  assert(f(180000)<160);
  assert(f(240000)-f(120000)<14/3, 'a second equivalent mature trunk costs more to operate than its additional income');
  assert.equal(generationEnergy(5,0,e).upkeep,5);
});
test('the minimum flipper stays a net consumer after its core matures',()=>{
  const m=fresh(), p=plantFlipper(m);
  for(let gen=1;gen<=280;gen++){
    m.nextTick(); assert.equal(p.lastBirths,2); assert.equal(p.lastUpkeep,2);
    assert.equal(p.lastIncome,gen<255?0:generationEnergy(2,1,m.game.economy).income);
    assert(p.lastFlow<0);
  }
  assert.equal(p.totalBirths,560);assert.equal(p.eroded,0);
  assert(m.world.cellAges instanceof Uint16Array);
  m.game.economy.stableAfter=300;
  for(let gen=281;gen<299;gen++){m.nextTick();assert.equal(p.lastIncome,0);}
  m.game.economy.stableEnergy=.05;
  m.nextTick();
  assert.equal(p.lastIncome,generationEnergy(2,1,m.game.economy).income);
});
test('unaffordable births erode only their owner\'s cells',()=>{
  const m=fresh(),p=plantFlipper(m);
  m.nextTick(); const rival=m.game.players[1],rivalBefore=m.world.ownerCells[rival.id].length;
  m.game.economy.birthCost=100; p.reserve=0; rival.reserve=100000;
  m.nextTick();
  assert(p.eroded>0);assert.equal(p.reserve,0);
  assert.equal(m.world.ownerCells[rival.id].length,rivalBefore);
  for(const id of m.world.ownerCells[p.id])assert.equal(m.world.owners[id],p.id);
});
