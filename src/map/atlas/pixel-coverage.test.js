import test from 'node:test';
import assert from 'node:assert/strict';
import { depositCoverage } from './pixel-coverage.js';

function scene() {
  const width = 16,
    height = 12;
  const buffer = {
    w: width,
    h: height,
    words: new Uint32Array(width * height),
    mask: new Uint8Array(width * height),
    palette: Array.from({ length: 128 }, (_, mask) => 1000 + mask),
  };
  const view = {
    up: [0, 1, 0],
    right: [1, 0, 0],
    look: [0, 0, 1],
    s: 5,
    dpr: 1,
    cx: 7.7,
    cy: 5.4,
    capBlend: 0,
  };
  const graph = { coords: new Float32Array([0, 0, 1, 0, 0, 1]), f: 128 };
  const cache = {
    mask: 3,
    tags: new Uint32Array(4),
    base: new Uint32Array(4),
    shape: new Uint32Array(4),
  };
  return { buffer, view, graph, cache };
}

test('subpixel owners combine on one pixel, including reuse of the cached footprint', () => {
  const { buffer, view, graph, cache } = scene();
  const center = 5 * buffer.w + 7;
  assert.equal(depositCoverage(buffer, view, graph, 0, 1, cache), true);
  assert.equal(buffer.words[center], 1001);
  assert.equal(depositCoverage(buffer, view, graph, 1, 2, cache), true);
  assert.equal(buffer.words[center], 1003);
  assert.equal(depositCoverage(buffer, view, graph, 0, 3, cache), true);
  assert.equal(buffer.words[center], 1007);
  assert.equal(buffer.mask.filter(Boolean).length, 1);
});

test('a cell straddling the map cut takes the polygon path and does not cache a pixel footprint', () => {
  const { buffer, view, graph, cache } = scene();
  graph.coords.set([0, 0, -1]);
  assert.equal(depositCoverage(buffer, view, graph, 0, 1, cache), false);
  assert.equal(cache.tags[0], 0);
});

test('subpixel cells wholly outside the backing store do not color the nearest edge', () => {
  const { buffer, view, graph, cache } = scene();
  view.cx = -20;
  assert.equal(depositCoverage(buffer, view, graph, 0, 1, cache), true);
  assert.equal(buffer.mask.some(Boolean), false);
});
