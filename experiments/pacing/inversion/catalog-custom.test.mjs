import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyClosedStrips } from './catalog-custom.mjs';

test('editor-built stationary P3 persists and earns six-birth-cost income', () => {
  const [founder, ...seeds] = verifyClosedStrips();
  assert.equal(founder.cells, 36);
  assert.deepEqual(founder.opening, [{ survivors: 34, births: 4, deaths: 2 }]);
  assert.deepEqual(founder.phases.map(p => p.survivors - 6 * p.births), [-2, 10, 10]);
  assert.deepEqual(seeds.map(s => [s.cells, s.editorSize]), [[56, 25], [68, 25], [128, 51], [296, 101]]);
  for (const seed of seeds) {
    assert.deepEqual(seed.phases.map(p => p.births), [4, 6, 4]);
    assert.deepEqual(seed.phases.map(p => p.deaths), [4, 4, 6]);
    assert.ok(seed.phases.every(p => p.survivors === seed.cells - 4 && p.survivors > 6 * p.births));
  }
});
