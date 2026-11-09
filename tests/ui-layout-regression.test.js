import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SLOT_COUNT } from '../src/deck/slots.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('15 pattern buttons retain the compact production flex row', () => {
  const deck = read('src/deck/hud.css');
  const compact = read('src/layout/compact-controls.css');
  const built = read('index.html');

  assert.equal(SLOT_COUNT, 15);
  assert.match(deck, /#hexlab \.br-deck\{display:flex;[^\n]*overflow-x:auto/);
  assert.match(deck, /#hexlab \.br-stampcard\{[^\n]*flex:0 0 85px/);
  assert.doesNotMatch(compact, /#hexlab \.br-deck\s*\{/);
  assert.ok(built.includes(deck.trimEnd()), 'built HTML must contain the deck CSS');
  assert.ok(built.includes(compact.trimEnd()), 'built HTML must contain the compact CSS');
});

test('slider box dismisses on outside pointerdown without dismissing inside clicks', () => {
  const drawer = read('src/layout/settings-drawer.js');
  const built = read('index.html');
  assert.match(drawer, /closest\('\.br-advanced-tuning, #br-tuning-toggle'\)/);
  assert.match(drawer, /closeTuning\(\);\s*\}, true\);/);
  assert.match(built, /closest\("\.br-advanced-tuning, #br-tuning-toggle"\)/);
  assert.match(built, /closeTuning\(\);\s*\}, true\);/);
});

test('transform controls use one narrow vertical column at all viewport sizes', () => {
  const shell = read('src/layout/game-shell.css');
  const compact = read('src/layout/compact-controls.css');
  const built = read('index.html');
  assert.match(shell, /#hexlab \.br-transform\{[^\n]*flex-direction:column/);
  assert.match(shell, /#hexlab \.br-transform button\{width:32px;[^\n]*height:clamp/);
  assert.match(compact, /#hexlab \.br-transform button\{height:17px/);
  assert.ok(built.includes(shell.trimEnd()), 'built HTML must contain the vertical control layout');
  assert.ok(built.includes(compact.trimEnd()), 'built HTML must contain the narrow-screen control layout');
});
