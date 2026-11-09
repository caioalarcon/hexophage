import test from 'node:test';
import assert from 'node:assert/strict';
import { brainNamespace, createBrainArchive } from './memory.js';
import { createMatchState } from '../../match/state.js';

function fakeStorage() {
  return { value: null, writes: 0, getItem() { return this.value; },
    setItem(_, value) { this.writes++; this.value = value; } };
}

test('bots see private outcomes during a match, even across checkpoints and tariff switches', () => {
  const storage = fakeStorage();
  let dirty = 0;
  const brain = createBrainArchive(storage, () => dirty++).open('A');
  brain.observe(2, 'rival-front', 'seed/0', 6);
  brain.observe(2, 'rival-front', 'seed/0', 2);
  brain.observe(3, 'rival-front', 'seed/0', -2);
  assert.equal(dirty, 1);
  assert.equal(storage.writes, 0);
  brain.checkpoint();
  brain.checkpoint();
  assert.equal(storage.writes, 1);
  assert.deepEqual(brain.lookup(2, 'rival-front', 'seed/0'), { count: 2, mean: 4 });
  assert.deepEqual(brain.lookup(3, 'rival-front', 'seed/0'), { count: 1, mean: -2 });
  assert.equal(brain.lookup(4, 'rival-front', 'seed/0').count, 0);
  brain.select('B');
  assert.equal(brain.lookup(2, 'rival-front', 'seed/0').count, 0);
  brain.observe(2, 'rival-front', 'seed/0', -99);
  brain.select('A');
  brain.observe(2, 'rival-front', 'seed/0', 2);
  assert.equal(brain.lookup(4, 'rival-front', 'seed/0').count, 0);
  brain.finish();
  assert.equal(dirty, 2);
  assert.equal(storage.writes, 2);

  const next = createBrainArchive(storage).open('A');
  for (let id = 2; id <= 6; id++) assert.deepEqual(next.lookup(id, 'rival-front', 'seed/0'), { count: 4, mean: 2 });
  assert.equal(next.stats().priorSamples, 4);
  assert.equal(next.stats().privateSamples, 0);
  next.select('B');
  assert.deepEqual(next.lookup(3, 'rival-front', 'seed/0'), { count: 1, mean: -99 });
});

test('a reopened match recovers checkpointed observations before finish, merging each delta once', () => {
  const storage = fakeStorage();
  const earlier = createBrainArchive(storage).open('world');
  earlier.observe(2, 'near', 'action', 1);
  earlier.checkpoint();
  const later = createBrainArchive(storage).open('world');
  assert.deepEqual(later.lookup(5, 'near', 'action'), {count: 1, mean: 1});
  later.observe(4, 'near', 'action', 5);
  later.finish();
  earlier.observe(3, 'near', 'action', 3);
  earlier.finish();
  earlier.finish();
  assert.deepEqual(createBrainArchive(storage).open('world').lookup(5, 'near', 'action'), {count: 3, mean: 3});
});

test('retention is bounded, malformed saves and storage quota failures leave learning operational', () => {
  const storage = fakeStorage();
  storage.value = '{damaged';
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  const archive = createBrainArchive(storage);
  const session = archive.open('world');
  session.observe(2, 'empty', 'best-stamp', 1);
  session.observe(3, 'field/rival', 'losing-stamp', -1);
  for (let i = 0; i < 1000; i++) session.observe(2, 'rival/signature'+i, 's'+i, 1);
  session.observe(2, 'ctx', 'invalid', Infinity);
  session.finish();
  const reopened = archive.open('world');
  assert(session.stats().checkpoints >= 4);
  assert.equal(reopened.stats().inheritedEntries, 258);
  assert.equal(reopened.lookup(2,'empty','best-stamp').mean, 1);
  assert.equal(reopened.lookup(2,'field/rival','losing-stamp').mean, -1);
  assert.equal(reopened.lookup(2,'rival/signature999','s999').mean, 1);
  assert.equal(reopened.lookup(2,'rival/signature1','s1').count, 0);
  assert.equal(reopened.lookup(2,'ctx','invalid').count, 0);
});

test('canonical rules share learning only under matching economy, rates and stamp catalog', () => {
  function pair(rule, notation, policy) {
    const world = {};
    return [world, createMatchState(world, { rule, notation, economy: { policy } })];
  }
  const a = pair('custom','B22/S35','activity');
  const b = pair('custom','B2/S53','activity');
  assert.equal(brainNamespace(...a), brainNamespace(...b));
  assert.notEqual(brainNamespace(...a), brainNamespace(...pair('bays', undefined, 'activity')));
  assert.notEqual(brainNamespace(...a), brainNamespace(...pair('custom', 'B2/S35', 'stability')));
  b[1].economy.stableAfter = 1;
  assert.notEqual(brainNamespace(...a), brainNamespace(...b));
  const c = pair('custom','B2/S35','activity');
  c[1].gameplay = { ...c[1].gameplay, patterns: [{id:'single',rle:'2o!'}] };
  assert.notEqual(brainNamespace(...a), brainNamespace(...c));
});
