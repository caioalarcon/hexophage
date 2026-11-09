import test from 'node:test';
import assert from 'node:assert/strict';
import { bagleyCatalog } from '../../src/patterns/bagley-catalog.js';
import { advancePattern, seedPatternAges, patternSite } from '../../src/patterns/planar-simulation.js';
import { catalogRules } from '../../src/simulation/catalog-rules.js';
import { BAYS, CALLAHAN } from '../../src/simulation/rules.js';

for (const [ruleId, entries] of Object.entries(bagleyCatalog)) {
  const rule = { ...catalogRules, bays: BAYS, callahan: CALLAHAN }[ruleId];
  test('Bagley seed sizes, periods and measured flux · ' + ruleId, () => {
    assert.equal(new Set(entries.map(p => p.id)).size, entries.length);
    for (const p of entries) {
      let state = seedPatternAges(p);
      assert.equal(state.size, p.cells, p.name);
      const period = p.period || p.remnantPeriod;
      if (!period) continue;
      for (let t = 0; t < (p.transient || 0); t++) state = advancePattern(state, 1, rule).next;
      const shift = patternSite(...(p.delta || [0, 0]));
      const expected = new Set([...state.keys()].map(key => key + shift));
      let births = 0, deaths = 0;
      for (let t = 0; t < period; t++) {
        const step = advancePattern(state, 1, rule);
        births += step.births;
        deaths += state.size + step.births - step.next.size;
        state = step.next;
      }
      assert.deepEqual(new Set(state.keys()), expected, p.name);
      if (p.period) {
        assert.equal(births, p.birthsCycle, p.name);
        assert.equal(deaths, p.deathsCycle, p.name);
        assert.equal(shift ? 0 : [...state.values()].filter(age => age > period).length, p.stableCore, p.name);
      }
    }
  });
}
