import assert from 'node:assert/strict';
import test from 'node:test';
import {createSimulationState} from '../../src/simulation/state.js';
import {initRuleTables} from '../../src/simulation/rules.js';
import {evaluateCell} from '../../src/simulation/cell-fate.js';
import {suppressedBirths} from './birth-denial.mjs';

function fixture(ring){
  const world=createSimulationState();
  initRuleTables(world); world.rule='callahan';
  const adj=new Uint32Array(7*6);
  for(let k=0;k<ring.length;k++)adj[k]=k+1;
  world.graph={adj,deg:[ring.length,...ring.map(()=>1)]};
  world.nextOwners=Uint8Array.from([0,...ring]);
  world.nextActive=ring.flatMap((o,k)=>o?[k+1]:[]);
  world.nextActiveCount=world.nextActive.length;
  // The neighbors are all pointing back to the center. Only check this site.
  world.owners=new Uint8Array(7);
  const physical=o=>evaluateCell({...world,owners:o,cells:Uint8Array.from(o,x=>Number(Boolean(x)))})(0);
  world.owners[0]=physical(world.nextOwners);
  return {world,physical};
}
test('three competing pairs can each forgo an owned birth in one position',()=>{
  const {world}=fixture([1,1,2,2,3,3]);
  assert.deepEqual(suppressedBirths(world),[
    {id:0,victim:1,attackers:[2,3]},
    {id:0,victim:2,attackers:[1,3]},
    {id:0,victim:3,attackers:[1,2]},
  ]);
});
test('a neutral parent or an occupied site cannot demand reimbursement',()=>{
  const {world}=fixture([1,1,7,2,0,0]);
  assert.deepEqual(suppressedBirths(world),[]);
  const w=fixture([1,1,2,0,0,0]).world;
  w.nextOwners[0]=3; assert.deepEqual(suppressedBirths(w),[]);
});
test('detector equals independent engine counterfactuals across every ring of four owner classes',()=>{
  for(const d of [5,6])for(let pattern=0;pattern<4**d;pattern++){
    let n=pattern;
    const ring=Array.from({length:d},()=>{const o=[0,1,2,7][n%4]; n=Math.floor(n/4);return o});
    const {world,physical}=fixture(ring);
    const actual=world.owners[0];
    const expected=[1,2].filter(victim=>!actual && physical(world.nextOwners.map(o=>o===victim||o===7?o:0))===victim);
    assert.deepEqual(suppressedBirths(world).map(x=>x.victim),expected);
  }
});
