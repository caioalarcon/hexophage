import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserElements } from '../../../tests/support/browser-elements.js';

const ids = [
  'hl-pattern',
  'hl-stampsize',
  'hl-ring',
  'hl-line',
  'hl-noise',
  'hl-stampclear',
  'hl-stampcw',
  'hl-stampccw',
  'hl-stampflip',
  'hl-mode',
  'hl-demo',
  'hl-patternhelp',
  'hl-stampcount',
  'br-tabs',
  'hl-gen',
  'hl-pop',
  'hl-eval',
  'hl-nearest',
  'hl-topstatus',
  'hl-current',
  'hl-actual',
  'hl-speed-val',
];
const nodes = installBrowserElements(
  Object.fromEntries(ids.map((id) => [id, { style: {}, children: [] }])),
);
const { world } = await import('../../browser/world-state.js');
await import('../../browser/game.js');
const { bindStampControls } = await import('./controls.js');
const { stampOffsets } = await import('./stamp-grid.js');
const { savedPatterns } = await import('./saved-patterns.js');

test('editor controls select, resize and preserve a manual pattern independently of its deck price', () => {
  world.graph = { distance: [0] };
  world.rule = 'callahan';
  bindStampControls();
  const choose = (id) => nodes.get('hl-pattern').onchange({ target: { value: id } });
  choose('gun');
  assert.equal(world.stampCount, 64);
  assert.equal(nodes.get('hl-pattern').value, 'gun');
  assert.equal(nodes.get('hl-demo').disabled, true);
  nodes.get('hl-stampclear').onclick();
  assert.equal(world.stampCount, 0);
  assert.equal(nodes.get('hl-pattern').value, 'manual');
  nodes.get('hl-ring').onclick();
  assert.equal(world.stampCount, 6);
  const ring = stampOffsets().map((pair) => [...pair]);
  nodes.get('hl-stampsize').onchange({ target: { value: '11' } });
  assert.equal(world.stampN, 11);
  assert.deepEqual(stampOffsets(), ring);
  assert.deepEqual(savedPatterns.get('manual'), ring);
  choose('glider');
  assert.equal(world.stampCount, 6);
  choose('manual');
  assert.deepEqual(stampOffsets(), ring);
});
