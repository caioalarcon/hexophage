import assert from 'node:assert/strict';
import test from 'node:test';
import { forumCatalog } from '../../src/patterns/forum-catalog.js';
import { seedPatternAges, advancePattern, patternSite } from '../../src/patterns/planar-simulation.js';
import { catalogRules } from '../../src/simulation/catalog-rules.js';

const wallRule = catalogRules['hex-b2s34'];
const keySet = frame => new Set(frame.keys());

test('Hickerson and Büttner structures and drc oscillators reproduce their full cycle', () => {
  for (const p of forumCatalog['hex-b2s34'].filter(p => p.period)) {
    let frame = seedPatternAges(p);
    const start = keySet(frame);
    let births = 0;
    assert.equal(frame.size, p.cells);
    for (let t = 1; t <= p.period; t++) {
      const step = advancePattern(frame, 1, wallRule);
      births += step.births;
      frame = step.next;
      if (t < p.period) assert.notDeepEqual(keySet(frame), start, p.name);
    }
    assert.deepEqual(keySet(frame), start, p.name);
    assert.equal(births, p.birthsCycle);
    assert.equal(births, p.deathsCycle);
    assert.equal([...frame.values()].filter(age => age > p.period).length, p.stableCore);
  }
});

test('the B2/S34 wall restores the deleted middle, then clears the debris', () => {
  const wall = forumCatalog['hex-b2s34'].find(p => p.id === 'forum-muralha-de-hickerson');
  let control = seedPatternAges(wall), damaged = new Map(control);
  assert(damaged.delete(patternSite(10, 11)));
  for (let t = 1; t <= 44; t++) {
    control = advancePattern(control, 1, wallRule).next;
    damaged = advancePattern(damaged, 1, wallRule).next;
    if (t === 14) {
      assert([...control.keys()].every(site => damaged.has(site)));
      assert.equal(damaged.size - control.size, 22);
    }
  }
  assert.deepEqual(keySet(damaged), keySet(control));
});

test('each independent HighHexLife puffer reproduces its original trace', () => {
  const counts = {
    'forum-puffer-jmm-1': [46, 70, 113, 119], 'forum-puffer-jmm-2': [52, 70, 88, 124],
    'forum-puffer-jmm-3': [48, 102, 150, 246], 'forum-puffer-diagonal-duplo': [268, 312, 344, 408],
    'forum-puffer-diagonal-de-pares': [482, 491, 501, 523],
  };
  for (const p of forumCatalog.highhex) {
    let frame = seedPatternAges(p);
    const populations = [frame.size];
    for (let t = 1; t <= 384; t++) {
      frame = advancePattern(frame, 1, catalogRules.highhex).next;
      if ([96, 192, 384].includes(t)) populations.push(frame.size);
    }
    assert.deepEqual(populations, counts[p.id], p.name);
  }
});
