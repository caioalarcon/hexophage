import test from 'node:test';
import assert from 'node:assert/strict';
import { ruleProfiles } from '../src/match/rule-profiles.js';
import { fitStampPoints } from '../src/patterns/editor/fit-pattern.js';
import { decodeRLE } from '../src/patterns/rle.js';
import { surveyScores } from '../src/patterns/survey-scores.js';

test('every registered atlas stamp fits the editor and has its own measured score', () => {
  for (const [rule, profile] of Object.entries(ruleProfiles)) {
    if (profile.compile) continue;
    const {gameplay} = profile;
    const atlas = gameplay.atlas ?? gameplay.patterns;
    const ids = atlas.map(p=>p.id);
    assert.equal(new Set(ids).size,ids.length,rule);
    assert.deepEqual(Object.keys(surveyScores[rule]).sort(),ids.sort(),rule);
    for (const p of atlas) {
      const points = decodeRLE(p.rle);
      assert.equal(points.length,p.cells,rule+'/'+p.id);
      assert.equal(fitStampPoints(points)?.positions.length,p.cells,rule+'/'+p.id);
    }
    assert(gameplay.patterns.some(p=>p.id===gameplay.opening && p.cells<=82),rule);
  }
});

test('catalog rules are invariant under rotations and reflections at both vertex degrees', () => {
  for (const {physics} of Object.values(ruleProfiles).filter(p=>p.physics))
    for (const degree of [5,6]) for (const table of physics.tables[degree]) {
      for (let mask=0; mask < 1<<degree; mask++) {
        const rotate=((mask<<1)&((1<<degree)-1))|(mask>>(degree-1));
        let reflect=0;
        for (let k=0;k<degree;k++) reflect|=((mask>>k)&1)<<(degree-k-1);
        assert.equal(table[mask],table[rotate]);
        assert.equal(table[mask],table[reflect]);
      }
    }
});
