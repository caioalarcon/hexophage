import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserElements } from '../../../tests/support/browser-elements.js';

const tag = { style: {} },
  mode = {},
  demo = {};
installBrowserElements({ 'hl-stampcount': tag, 'hl-mode': mode, 'hl-demo': demo });
const { world } = await import('../../browser/world-state.js');
const { game } = await import('../../browser/game.js');
const { stampReady, updateStampReadiness } = await import('./readiness.js');

test('selected-stamp affordability controls both actions and displays the missing biomass', () => {
  world.stampCount = 3;
  game.players = [{ reserve: 2, out: false }];
  game.ended = false;
  updateStampReadiness();
  assert.equal(stampReady(), false);
  assert.deepEqual(
    [tag.textContent, tag.style.color, mode.disabled, demo.disabled],
    ['3 células · 30 energia · faltam 28', '#ffb99b', true, true],
  );
  game.players[0].reserve=30;
  updateStampReadiness();
  assert.equal(stampReady(), true);
  assert.deepEqual(
    [tag.textContent, tag.style.color, mode.disabled, demo.disabled],
    ['3 células · 30 energia · pronto', '', false, false],
  );
});

test('message precedence distinguishes an empty stamp, an eliminated player and an ended match', () => {
  world.stampCount = 3;
  game.players = [{ reserve: 10, out: true }];
  game.ended = false;
  updateStampReadiness();
  assert.equal(tag.textContent, 'Eliminado');
  assert.equal(stampReady(), false);
  world.stampCount = 0;
  updateStampReadiness();
  assert.equal(tag.textContent, 'Vazio');
  game.ended = true;
  updateStampReadiness();
  assert.equal(tag.textContent, 'Partida encerrada');
  assert.equal(demo.disabled, true);
});
