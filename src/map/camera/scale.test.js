import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapUnit, minimumAtlasScale } from './scale.js';

test('the overview fits the full longitude and latitude into tall and wide viewports', () => {
  assert.equal(minimumAtlasScale({ width: 200*Math.PI, height: 400*Math.PI }), 100);
  assert.equal(minimumAtlasScale({ width: 600*Math.PI, height: 50*Math.PI }), 50);
  assert.equal(minimumAtlasScale({ width: 0, height: 0 }), 1);
});

test('the local-to-atlas conversion maintains a fixed hex pitch as frequency changes', () => {
  assert.equal(mapUnit(1), Math.sqrt(3) * 12 / 1.205);
  assert.equal(mapUnit(320), 2 * mapUnit(160));
});
