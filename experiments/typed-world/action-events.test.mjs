import test from 'node:test';
import assert from 'node:assert/strict';
import {createTypedWorld} from './engine.mjs';
import {buildSphere} from '../../src/world/sphere.js';

test('committed actions notify only their instance with immutable ordered records',()=>{
  const graph=buildSphere(16),match=createTypedWorld(graph),events=[];
  const stop=match.subscribeActions(e=>events.push(e));
  const site=graph.farthest;
  assert(match.stamp(1,'callahan','contact',[site]));
  assert.equal(events.length,1);assert.equal(events[0].kind,'stamp');assert.equal(events[0].revision,1);
  assert.equal(events[0].owner,1);assert.equal(events[0].gen,0);assert.deepEqual(events[0].ids,[site]);
  assert(Object.isFrozen(events[0])&&Object.isFrozen(events[0].ids));
  assert.equal(match.stamp(1,'callahan','contact',[site]),false);assert.equal(events.length,1);
  const fork=match.fork();assert(fork.erase(1,site,0));assert.equal(events.length,1);
  assert(match.erase(1,site,0));assert.equal(events[1].kind,'erase');assert.equal(events[1].revision,2);
  match.setToolSettings({maxEraseRadius:3});assert.equal(events[2].kind,'settings');
  match.setToolSettings({maxEraseRadius:3});assert.equal(events.length,3);
  stop();match.setToolSettings({maxEraseRadius:4});assert.equal(events.length,3);
});
