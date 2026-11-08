import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserElements } from '../../tests/support/browser-elements.js';

function card(pattern) {
  const meter = { style: {} };
  const state = {
    dataset: { pattern },
    meter,
    unavailable: false,
    classList: {
      toggle(name, value) {
        assert.equal(name, 'unavailable');
        state.unavailable = value;
      },
    },
    querySelector(selector) {
      assert.equal(selector, '.br-charge i');
      return meter;
    },
  };
  return state;
}

const dock = { children: [] };
installBrowserElements({ 'br-deck': dock });
const { game } = await import('../browser/game.js');
const { deckPoints } = await import('./cards.js');
const { savedPatterns } = await import('../patterns/editor/saved-patterns.js');
const { updateDeckAvailability } = await import('./hand.js');

test('each deck price follows the saved version before the factory pattern', () => {
  assert.equal(deckPoints('gun').length, 64);
  assert.deepEqual(deckPoints('manual'), []);
  const saved = [
    [0, 0],
    [1, 0],
  ];
  savedPatterns.set('gun', saved);
  try {
    assert.deepEqual(deckPoints('gun'), saved);
    savedPatterns.set('gun', []);
    assert.deepEqual(deckPoints('gun'), []);
  } finally {
    savedPatterns.delete('gun');
  }
});

test('deck charge clamps at 100%, empty patterns stay unavailable, and match end closes all cards', () => {
  const gun = card('gun'),
    manual = card('manual');
  dock.children = [gun, manual];
  game.players = [{ reserve: 32 }];
  game.ended = false;
  updateDeckAvailability();
  assert.deepEqual([gun.unavailable, gun.meter.style.width], [true, '50%']);
  assert.deepEqual([manual.unavailable, manual.meter.style.width], [true, '0%']);
  game.players[0].reserve = 128;
  updateDeckAvailability();
  assert.deepEqual([gun.unavailable, gun.meter.style.width], [false, '100%']);
  game.ended = true;
  updateDeckAvailability();
  assert.equal(gun.unavailable, true);
});
