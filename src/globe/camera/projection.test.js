import test from 'node:test';
import assert from 'node:assert/strict';
import { project3D, grabVector } from './projection.js';

test('exterior projection is orthographic and interior projection uses focal depth', () => {
  const view = { inside: false, cx: 75, cy: 40, radius: 30, focal: 90 };
  assert.deepEqual(project3D(0.25, 0.5, 0.8, view), [82.5, 25]);
  assert.equal(project3D(0, 0, 0.035, view), null);
  view.inside = true;
  assert.deepEqual(project3D(0.25, 0.5, 0.5, view), [120, -50]);
  assert.equal(project3D(0, 0, 0.1, view), null);
});

test('grabbing a point then projecting it preserves the pointer on either side', () => {
  for (const inside of [false, true]) {
    const view = { inside, cx: 100, cy: 80, radius: 60, focal: 110 };
    const ray = grabVector(115, 69, view);
    assert.ok(Math.abs(Math.hypot(...ray) - 1) < 1e-12);
    const [x, y] = project3D(...ray, view);
    assert.ok(Math.abs(x - 115) < 1e-12);
    assert.ok(Math.abs(y - 69) < 1e-12);
  }
});
