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
  const reordered = pair('custom','B2/S35','activity');
  reordered[1].gameplay = { ...reordered[1].gameplay, patterns: [...reordered[1].gameplay.patterns].reverse() };
  assert.equal(brainNamespace(...a), brainNamespace(...reordered));
  const c = pair('custom','B2/S35','activity');
  c[1].gameplay = { ...c[1].gameplay, patterns: [{id:'single',rle:'2o!'}] };
  assert.notEqual(brainNamespace(...a), brainNamespace(...c));
});

test('ranked recall reads the original v1 browser record and combines only this bot’s observations', () => {
  const storage = fakeStorage();
  const encode = (context, action, count, mean) => [JSON.stringify([context, action]), count, mean];
  storage.value = JSON.stringify([['world', { stamps: [
    encode('empty', 'rare', 4, 0.9),
    encode('empty', 'less-sure', 1, 1),
    encode('field/empty', 'rare', 2, -0.2),
  ], situations: [encode('rival/00003', 'p@4/2', 2, 0.5)] }]]);
  const m = createBrainArchive(storage).open('world');
  assert.deepEqual(m.ranked(2, 'empty'), [
    { action:'rare', count:4, mean:.9 }, { action:'less-sure', count:1, mean:1 },
  ]);
  m.observe(2, 'empty', 'rare', -.1);
  m.observe(2, 'yield/empty', 'now-profitable', .8);
  assert.deepEqual(m.ranked(2, 'empty', 1), [{ action:'rare', count:5, mean:.7 }]);
  assert.equal(m.ranked(3, 'empty', 1)[0].count, 4);
  assert.equal(m.ranked(2, 'field/empty')[0].mean, -.2);
  assert.deepEqual(m.ranked(2, 'rival/00003')[0], { action:'p@4/2', count:2, mean:.5 });
  m.checkpoint();
  assert.deepEqual(m.ranked(3, 'yield/empty'), []);
  m.select('other');
  assert.deepEqual(m.ranked(2, 'empty'), []);
  m.select('world');
  m.finish();
  const next = createBrainArchive(storage).open('world');
  assert.equal(next.ranked(5, 'yield/empty')[0].action, 'now-profitable');
  assert.equal(next.ranked(5, 'empty')[0].count, 5);

  // In v1 even a productive investment looked negative before its purchase
  // price was repaid. Its stronger evidence should improve its rank.
  for (let i = 0; i < 9; i++) next.observe(2, 'field/own', 'productive', -.4885);
  for (let i = 0; i < 15; i++) {
    next.observe(2, 'field/own', 'costly'+i, -.52);
    next.observe(2, 'field/own', 'costly'+i, -.52);
  }
  assert.equal(next.ranked(2, 'field/own')[0].action, 'productive');
});

test('ranked recall stays bounded and preserves negative evidence', () => {
  const m = createBrainArchive().open('world');
  for (let i = 0; i < 200; i++) m.observe(2, 'empty', 'seed'+i, -i);
  assert.equal(m.ranked(2, 'empty', 1000).length, 16);
  assert.deepEqual(m.ranked(2, 'empty', 0), []);
  assert.deepEqual(m.ranked(2, 'empty', 2).map(r => r.action), ['seed0','seed1']);
});
