import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessMatch } from './headless.js';
import { buildSphere } from '../world/sphere.js';
import { eastAt } from '../world/geometry.js';
import { patterns } from '../patterns/catalog.js';
import { decodeRLE } from '../patterns/rle.js';
import { availableCells, initialEnergy, parameterValue } from './constructive-economy.js';

const fresh=()=>createHeadlessMatch(buildSphere(24),{interval:10});
function plantFlipper(match){
  const human=match.game.players[0],p=patterns.callahan.find(p=>p.id==='p2');
  const ids=match.patchForStamp(human.seed,eastAt(match.world.graph,human.seed),decodeRLE(p.rle),true);
  assert.equal(ids?.length,3,'flipper projects to sphere');
  assert(match.commitStamp(1,ids));
  return human;
}
test('starting reserve covers one flipper and its maturation',()=>{
  const m=fresh();
  assert.equal(m.game.init,120);
  assert.equal(m.game.players[0].reserve,120);
  assert.equal(initialEnergy(m.game.economy),120);
  assert.equal(availableCells(120,m.game.economy),4);
  assert.equal(availableCells(0,{stampCost:0}),Infinity);
  assert.deepEqual([-20,0,2.5,100,123].map(v => parameterValue(v,100)),[0,0,3,100,100]);
});
test('the central flipper cell matures while its neighbors oscillate',()=>{
  const m=fresh(),p=plantFlipper(m);
  assert.equal(p.reserve,30);
  for(let gen=1;gen<=16;gen++){
    m.nextTick();
    assert.equal(p.lastBirths,2);
    assert.equal(p.lastUpkeep,2);
    assert.equal(p.lastIncome,gen<15?0:3);
    assert.equal(p.reserve,gen<15?30-2*gen:2+(gen-14));
  }
  assert.equal(p.totalBirths,32);
  assert.equal(p.eroded,0);
  m.game.economy.stableEnergy=5;
  m.nextTick();
  assert.equal(p.lastIncome,5);
  assert.equal(p.reserve,7,'live slider changes next tick');
});
test('unaffordable births erode only their owner\'s cells',()=>{
  const m=fresh(),p=plantFlipper(m);
  m.nextTick();
  const rival=m.game.players[1],rivalBefore=m.world.ownerCells[rival.id].length;
  m.game.economy.birthCost=100;
  p.reserve=0;
  rival.reserve=100000;
  m.nextTick();
  assert(p.eroded>0);
  assert.equal(p.reserve,0);
  assert.equal(m.world.ownerCells[rival.id].length,rivalBefore);
  for(const id of m.world.ownerCells[p.id])assert.equal(m.world.owners[id],p.id);
});

test('raising the income threshold mid-match retains the true age of the flipper core',()=>{
  const m=createHeadlessMatch(buildSphere(24),{strategies:new Map([2,3,4,5,6].map(id=>[id,()=>{}]))});
  const p=plantFlipper(m);
  for(let gen=1;gen<=280;gen++)m.nextTick();
  assert.equal(p.stable,1);
  assert(m.world.cellAges instanceof Uint16Array);
  m.game.economy.stableAfter=300;
  for(let gen=281;gen<299;gen++) {
    m.nextTick();
    assert.equal(p.lastIncome,0);
  }
  m.nextTick();
  assert.equal(p.lastIncome,3,'stamped generation 0 already counts as age one');
  assert.equal(parameterValue(1234,5000),1234);
  assert.equal(parameterValue(6000,5000),5000);
});
