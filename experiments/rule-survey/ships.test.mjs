import assert from 'node:assert/strict';
import test from 'node:test';
import { shipCatalog } from '../../src/patterns/ship-catalog.js';
import { advancePattern, seedPatternAges, patternSite } from '../../src/patterns/planar-simulation.js';
import { catalogRules } from '../../src/simulation/catalog-rules.js';
import { BAYS } from '../../src/simulation/rules.js';

import { precursorCatalog } from '../../src/patterns/precursor-catalog.js';
import { DIR } from '../../src/world/geometry.js';

const rules = { bays: BAYS, ...catalogRules };
const sites = state => new Set(state.keys());
const shift = (state, dq, dr) => new Set([...state.keys()].map(id => id + patternSite(dq, dr)));

function advance(state, rule, n) {
  for (let t = 0; t < n; t++) state = advancePattern(state, 1, rule).next;
  return state;
}

for (const [id, entries] of Object.entries(shipCatalog)) {
  test('Replay ship and census stamps · ' + id, () => {
    for (const p of entries) {
      const initial = seedPatternAges(p);
      assert.equal(initial.size, p.cells, p.name);
      if (!p.period) continue;
      let state = initial, births = 0;
      for (let n = 1; n <= p.period; n++) {
        const step = advancePattern(state, 1, rules[id]);
        births += step.births;
        state = step.next;
        // A finite nonempty shape can return under at most one translation.
        if (n < p.period && state.size === p.cells) {
          const translation = Math.min(...state.keys()) - Math.min(...initial.keys());
          assert.ok([...initial.keys()].some(cell => !state.has(cell + translation)), p.name);
        }
      }
      assert.deepEqual(sites(state), shift(initial, ...p.delta), p.name);
      assert.equal(births, p.birthsCycle, p.name);
      assert.equal(births + initial.size - state.size, p.deathsCycle, p.name);
      const moving = p.delta.some(Boolean);
      assert.equal(moving ? 0 : [...state.values()].filter(age => age > p.period).length, p.stableCore, p.name);
    }
  });
}

test('Three Hawk streams grow by one ship per stream every nine ticks', () => {
  const p = shipCatalog.ashley.find(p => p.id === 'gun');
  const initial = advance(seedPatternAges(p), rules.ashley, 9);
  let state = initial;
  for (let n = 0; n < 6; n++) {
    const next = advance(state, rules.ashley, 9);
    assert.equal(next.size - state.size, 24);
    assert.ok([...state.keys()].every(key => next.has(key)));
    state = next;
  }
});

test('The P110 gun emits a translating Slider', () => {
  const p = shipCatalog.ashley.find(p => p.id === 'gun110');
  let state = advance(seedPatternAges(p), rules.ashley, 110);
  for (let n = 0; n < 3; n++) {
    const next = advance(state, rules.ashley, 110);
    assert.ok([...state.keys()].every(key => next.has(key)));
    const ship = new Map([...next].filter(([key]) => !state.has(key)));
    assert.equal(ship.size, 6);
    assert.deepEqual(sites(advance(ship, rules.ashley, 4)), shift(ship, 0, 2));
    state = next;
  }
});

test('The Ashley 2015 puffer deposits a P2 trail as its front advances', () => {
  const p = shipCatalog.ashley15.find(p => p.id === 'puff30');
  let state = advance(seedPatternAges(p), rules.ashley15, 60);
  let residue;
  for (let n = 0; n < 5; n++) {
    const next = advance(state, rules.ashley15, 30);
    const moved = shift(state, 20, -10);
    assert.ok([...moved].every(key => next.has(key)));
    const trail = new Map([...next].filter(([key]) => !moved.has(key)));
    assert.equal(trail.size, 4);
    assert.deepEqual(sites(advance(trail, rules.ashley15, 2)), sites(trail));
    if (residue) assert.deepEqual(sites(trail), residue);
    residue = sites(trail);
    state = next;
  }
});

test('B2/S245 farm precursors settle to the claimed connected fixed point', () => {
  const id = 'hex-b2s245';
  for (const p of precursorCatalog[id]) {
    let state = seedPatternAges(p), births = 0;
    assert.equal(state.size, p.cells, p.name);
    for (let i = 0; i < p.transient; i++) {
      const step = advancePattern(state, 1, rules[id]);
      assert.notDeepEqual(sites(step.next), sites(state), p.name);
      births += step.births;
      state = step.next;
    }
    assert.equal(births, p.startupBirths, p.name);
    assert.equal(state.size, p.settledCells, p.name);
    assert.deepEqual(sites(advance(state, rules[id], 1)), sites(state), p.name);
    const remaining = sites(state);
    const first = remaining.values().next().value, frontier = [first];
    remaining.delete(first);
    while (frontier.length) {
      const cell = frontier.pop();
      for (const dir of DIR) {
        const neighbour = cell + patternSite(...dir);
        if (remaining.delete(neighbour)) frontier.push(neighbour);
      }
    }
    assert.equal(remaining.size, 0, p.name);
  }
});
