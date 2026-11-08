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
test('games start with 3-cell flipper affordable, not previous tax transfer',()=>{
  const m=fresh();
  assert.equal(m.game.init,30);
  assert.equal(m.game.players[0].reserve,30);
  assert.equal(initialEnergy(m.game.economy),30);
  assert.equal(availableCells(30,m.game.economy),3);
  assert.equal(availableCells(0,{stampCost:0}),Infinity);
  assert.deepEqual([-20,0,2.5,100,123].map(parameterValue),[0,0,3,100,100]);
});
test('spherical P2 flipper has two natural births and one charged survivor per generation',()=>{
  const m=fresh(),p=plantFlipper(m);
  assert.equal(p.reserve,0);
  for(let i=1;i<=10;i++){
    m.nextTick();
    assert.equal(p.lastBirths,2,'real newborns');
    assert.equal(p.lastUpkeep,1,'permanent core upkeep');
    assert.equal(p.lastIncome,2);
    assert.equal(p.reserve,i,'net +1/g');
  }
  assert.equal(p.totalBirths,20);
  assert.equal(p.eroded,0);
  m.game.economy.birthEnergy=2;
  m.nextTick();
  assert.equal(p.lastIncome,4);
  assert.equal(p.reserve,13,'live slider changes next tick');
});
test('unaffordable maintenance randomly erodes own cells, not a rival',()=>{
  const m=fresh(),p=plantFlipper(m);
  m.nextTick();
  const rival=m.game.players[1],rivalBefore=m.world.ownerCells[rival.id].length;
  m.game.economy.upkeep=100;
  p.reserve=0;
  rival.reserve=100000;
  m.nextTick();
  assert(p.eroded>0);
  assert.equal(p.reserve,0);
  assert.equal(m.world.ownerCells[rival.id].length,rivalBefore);
  for(const id of m.world.ownerCells[p.id])assert.equal(m.world.owners[id],p.id);
});
