import test from 'node:test';
import assert from 'node:assert/strict';
import { transferProportional, gameEconomyTick } from './biomass.js';
import { finishIfDecided } from './outcome.js';
import { recordHumanTurn } from './field-history.js';

function player(id, reserve) {
  return { id, reserve, out: false, received: 0, paid: 0, eroded: 0, debtCarry: 0, lastFlow: 0 };
}

test('integer transfer breaks ties by player ID and conserves biomass', () => {
  const players = [3, 1, 2].map((id) => player(id, 0));
  transferProportional(8, players, [1, 1, 1]);
  assert.deepEqual(
    players.map((p) => p.received),
    [2, 3, 3],
  );
  assert(players.every((p) => p.received === p.reserve && p.lastFlow === p.reserve));
});

test('tax consumes reserve then cells, accumulating fractional debt and preserving its RNG sequence', () => {
  const game = { players: [player(1, 0), player(2, 4)], tax: 0.75, rngState: 0x6d2b79f5 };
  const world = { ownerCells: [[], [11, 12, 13], [21, 22, 23, 24, 25, 26, 27, 28, 29]] };
  const erased = [];
  const remove = (id) => {
    erased.push(id);
    world.ownerCells[1].splice(world.ownerCells[1].indexOf(id), 1);
  };
  gameEconomyTick(world, game, remove, () => false);
  assert.deepEqual(erased, [11, 13]);
  assert.deepEqual(
    [game.players[0].debtCarry, game.players[0].paid, game.players[0].eroded],
    [0.25, 2, 2],
  );
  assert.deepEqual([game.players[1].received, game.players[1].reserve, game.average], [2, 6, 6]);
});

test('zero reserve eliminates only an empty field and reports winner or draw synchronously', () => {
  for (const survivor of [true, false]) {
    const game = { players: [player(1, 0), player(2, 0)], ended: false, winner: 0 };
    const world = { ownerCells: [[], [], survivor ? [2] : []] };
    const effects = [];
    gameEconomyTick(
      world,
      game,
      () => {},
      (alive) =>
        finishIfDecided(game, alive, {
          pause: () => effects.push('pause'),
          matchDecided: (p) => effects.push(p?.id),
        }),
    );
    assert(game.ended);
    assert.equal(game.winner, survivor ? 2 : 0);
    assert.deepEqual(effects, ['pause', survivor ? 2 : undefined]);
  }
});

test('field diagnostics record natural deaths and tax erosion separately', () => {
  const h = { births: 1, deaths: 2, placed: 5, peak: null, largest: null, eliminated: null };
  const game = { humanHistory: h, players: [player(1, 4)] };
  const world = { gen: 12, ownerCells: [[], [1, 2, 3]] };
  recordHumanTurn(world, game, 8, 3, 1, 4, 2, 6);
  assert.equal(h.peak.field, 3);
  assert.deepEqual(h.largest, {
    gen: 12,
    before: 8,
    after: 3,
    births: 1,
    deaths: 4,
    erosion: 2,
    reserveBefore: 6,
    reserve: 4,
  });
  world.gen++;
  world.ownerCells[1] = [];
  game.players[0].out = true;
  recordHumanTurn(world, game, 3, 0, 0, 3, 0, 4);
  assert.equal(h.eliminated, 13);
  assert.equal(h.largest.gen, 12);
  assert.equal(h.deaths, 9);
});
