import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSphere } from '../world/sphere.js';
import { createHeadlessMatch } from './headless.js';

const graph = buildSphere(12);
const idle = new Map([2, 3, 4, 5, 6].map(id => [id, () => {}]));
const match = (stampCost, combatFee = 0) => createHeadlessMatch(graph, {
  rule: 'custom', notation: 'B/S0', init: 0, strategies: idle,
  economy: { stampCost, combatFee, stableEnergy: 0 },
});

test('an empty field and unusable positive balance eliminate the player at settlement', () => {
  const m = match(10000);
  const [human, rival] = m.game.players;
  m.addLive(human.seed, human.id); // S0: a surviving cell keeps its owner in play, even at zero cash.
  rival.reserve = 264;
  assert(m.game.players.every(p => !p.out));
  m.nextTick();
  assert.equal(human.out, false);
  assert.equal(rival.out, true);
  assert.equal(rival.reserve, 264);
  assert.equal(m.game.winner, human.id);
  assert(m.game.ended);
});

test('the last affordable cell can be placed, including at a zero tariff', () => {
  for (const [cost, reserve] of [[10000, 10000], [.1 + .2, .3], [0, 0]]) {
    const m = match(cost);
    for (const p of m.game.players) p.reserve = reserve;
    m.nextTick();
    assert(!m.game.ended);
    assert(m.game.players.every(p => !p.out));
    const [human] = m.game.players;
    assert(m.commitStamp(human.id, [human.seed], false));
    m.nextTick();
    assert(!human.out);
  }
});

test('last-cell combat income can fund a return in the same generation', () => {
  const m = match(10, 1), [one, two] = m.game.players;
  const center = graph.farthest, ring = graph.adj.subarray(6 * center);
  m.addLive(center, one.id);
  m.addLive(ring[0], two.id);
  m.addLive(ring[3], two.id);
  one.reserve = 9;
  two.reserve = 11;
  m.nextTick(); // Both sides lose their entire field under S0.
  assert.equal(m.world.activeCount, 0);
  assert.equal(one.tributeReceived, 2);
  assert.equal(one.tributePaid, 1);
  assert.equal(one.reserve, 10);
  assert(!one.out && !two.out && !m.game.ended);
});
