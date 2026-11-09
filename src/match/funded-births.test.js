import test from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessMatch} from './headless.js';
import {buildSphere} from '../world/sphere.js';
import {STABILITY_ECONOMY as original} from './constructive-economy.js';
const graph=buildSphere(16), quiet=new Map([2,3,4,5,6].map(i=>[i,()=>{}]));
function scenario(cash, fundBirths, stableEnergy=0) {
  const m=createHeadlessMatch(graph,{rule:'custom',notation:'B1/S0123456',growth:'classic',
    economy:{...original, fundBirths, birthCost:2, stableAfter:1, stableEnergy, productionScale:0},strategies:quiet});
  const p=m.game.players[0];m.addLive(graph.farthest,1);m.world.cellAges[graph.farthest]=1;
  p.reserve=cash;m.nextTick();return m;
}
test('a poor colony pays for viable births without liquidating an unrelated incumbent',()=>{
  const m=scenario(5,true),p=m.game.players[0];
  assert.equal(m.world.cells[graph.farthest],1);
  assert.deepEqual([p.lastBirths,p.lastUnfundedBirths,p.unfundedBirths,p.eroded,p.reserve,p.lastDeaths],[2,4,4,0,1,0]);
  assert.deepEqual([m.world.ownerCells[1].length,m.game.humanHistory.births,m.game.humanHistory.deaths],[3,2,0]);
  assert.deepEqual(m.world.owners,scenario(5,true).world.owners);
});
test('existing mature income can fund births this tick; no self-financing by proposed children',()=>{
  const m=scenario(0,true,4),p=m.game.players[0];
  assert.deepEqual([p.lastBirths,p.lastUnfundedBirths,p.lastIncome,p.lastUpkeep,p.reserve],[2,4,12,4,8]);
});
test('fully funded native development and the original bankruptcy policy remain reproducible',()=>{
  assert.deepEqual(scenario(12,true).world.cells,scenario(12,false).world.cells);
  const p=scenario(5,false).game.players[0];assert.equal(p.lastBirths,6);assert.equal(p.eroded,1);
});
