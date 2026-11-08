import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSphere} from '../../src/world/sphere.js';
import {replay} from './contacts.mjs';

test('an isolated moving P4 replaces its cells without deaths credited to an opponent',()=>{
  const m=replay(buildSphere(64),{target:null,horizon:48},true);
  assert.deepEqual(m.live,[6,0,0]); assert.equal(m.deaths[0],240);
  assert.deepEqual(m.direct,[0,0]); assert.deepEqual(m.adjacent,[0,0]);
});

test('the targeted stalk loses its growing tip while neither side directly kills a defender cell',()=>{
  const spec={target:'stalk',q:-11,r:22,orientation:5,horizon:96};
  const g=buildSphere(64),hit=replay(g,spec), miss=replay(g,{...spec,q:-17,r:-12,orientation:0});
  assert.deepEqual(hit.direct,[1,0]); assert.deepEqual(hit.directStamped,[0,0]);
  assert.equal(hit.live[0],0); assert.ok(hit.controlShotLive>0);
  assert.ok(hit.live[1]<hit.controlLive); assert.equal(miss.altered,null);assert.deepEqual(miss.direct,[0,0]);
  const self=replay(g,{...spec,shotOwner:2});
  assert.deepEqual(self.direct,[0,0]); assert.deepEqual(self.live,hit.live);
});
