import test from 'node:test';
import assert from 'node:assert/strict';
import { measure } from './canvas-size.js';

test('canvas backing store follows CSS size with a 2x DPR cap and changes only on resize', () => {
  const canvas = {
    width: 0,
    height: 0,
    getBoundingClientRect: () => ({ width: 10.9, height: 24.2 }),
  };
  const original = globalThis.devicePixelRatio;
  try {
    globalThis.devicePixelRatio = 3;
    assert.equal(measure(canvas), true);
    assert.deepEqual([canvas.width, canvas.height], [21, 48]);
    assert.equal(measure(canvas), false);
    canvas.getBoundingClientRect = () => ({ width: 0, height: 0 });
    assert.equal(measure(canvas), true);
    assert.deepEqual([canvas.width, canvas.height], [1, 1]);
  } finally {
    if (original === undefined) delete globalThis.devicePixelRatio;
    else globalThis.devicePixelRatio = original;
  }
});
