import test from 'node:test';
import assert from 'node:assert/strict';
import { combatDeaths } from './causality.mjs';
import { createSimulationState } from '../../src/simulation/state.js';
import { initRuleTables, parseRule } from '../../src/simulation/rules.js';
import { evaluateCell } from '../../src/simulation/cell-fate.js';

function ring(owners,{victim=1,custom}={}) {
  const world=createSimulationState(), degree=owners.length;
  initRuleTables(world);
  world.rule=custom?'bays':'callahan';
  if(custom) parseRule(world,custom);
  world.graph={adj:[1,2,3,4,5,6],deg:[degree]};
  world.nextOwners=Uint8Array.from([victim,...owners]);
  world.nextActive=[0];world.nextActiveCount=1;
  world.cells=new Uint8Array(degree+1);
  return world;
}
const one=(owners,opts)=>combatDeaths(ring(owners,opts))[0];
function fate(world,beforeOwners){
  const physical={...world,owners:beforeOwners,cells:Uint8Array.from(beforeOwners,owner=>Number(owner!==0))};
  return evaluateCell(physical)(0);
}
test('a local contact can be merely adjacent, an individual, joint or redundant killer',()=>{
  assert.deepEqual(one([1,2,0,0,0,0]).attackers,[]);
  const bystander=one([1,1,1,2,2,3]);
  assert.deepEqual(bystander.adjacent,[2,3]);
  assert.deepEqual(bystander.attackers,[2]);
  assert.deepEqual(bystander.coalitions,[[2]]);
  assert.deepEqual(one([1,1,1,2,3,0]).coalitions,[[2,3]]);
  assert.deepEqual(one([1,1,1,1,2,3]).coalitions,[[2],[3]]);
  assert.deepEqual(one([1,1,1,2,3,4]).coalitions,[[2,3],[2,4],[3,4]]);
});
test('neutral neighbors remain in the counterfactual, and neutral victims have no bounty',()=>{
  assert.deepEqual(one([1,1,1,7,7,2]).attackers,[]);
  assert.deepEqual(one([1,1,7,7,2,0]).attackers,[2]);
  assert.equal(one([1,1,1,1,2,3],{victim:7}),undefined);
  assert.equal(one([1,1,1,7,7,7]),undefined);
});
test('a surviving cell or a physical survivor removed by erosion earns no kill',()=>{
  const w=ring([1,1,1,1,2,0]);
  w.cells[0]=1; assert.deepEqual(combatDeaths(w),[]);
  assert.equal(one([1,1,1,2,0,0]),undefined);
});
test('custom rules use their own survival table; a pentagon has only five neighbor slots',()=>{
  assert.deepEqual(one([1,1,2,0,0],{custom:'B3/S2'}).attackers,[2]);
  assert.deepEqual(one([1,1,1,1,2]).attackers,[2]);
  assert.equal(one([1,1,1,2,0]),undefined);
});
test('exhaustive local Callahan attribution equals engine evaluation with and without the rival',()=>{
  for(const d of [5,6]) for(let value=0;value<3**d;value++){
    let encoding=value;
    const owners=Array.from({length:d},()=>{const next=encoding%3;encoding=Math.floor(encoding/3);return next;});
    const w=ring(owners);
    const before=w.nextOwners, without=before.map(x=>x===2?0:x);
    const physical=fate(w,before), baseline=fate(w,without);
    w.cells[0]=Number(physical!==0);
    const [event]=combatDeaths(w);
    const direct=Boolean(event?.attackers.length);
    assert.equal(direct,!physical && Boolean(baseline));
    if(direct) assert(owners.filter(Boolean).length>=5);
  }
});
