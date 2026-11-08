import assert from 'node:assert/strict';
import test from 'node:test';
import {simulate} from '../economy/simulator.js';
const p2={id:'p2',cells:3,net:1,core:1,meanLive:3,netSlope:0,coreSlope:0,liveSlope:0};
const profiles=new Map([['p2',p2]]), rule={price:10}, policy={start:['p2'],repeat:['p2']};
test('a returning player can use several funded orders in one visit',()=>{
  const ts=[];
  const r=simulate(profiles,rule,policy,{horizon:100,reviewEvery:100,onOrder:t=>ts.push(t)});
  assert.deepEqual(ts,[0,100,100,100]); assert.equal(r.checkpoints.at(-1).bank,10);
});
test('total loss before the next purchase removes all income and preserves remaining cash',()=>{
  const r=simulate(profiles,rule,policy,{horizon:500,wipeAt:12});
  const last=r.checkpoints.at(-1);assert.equal(last.field,0);assert.equal(last.bank,12);assert.equal(last.orders,1);assert.equal(last.energyFlow,0);
});
