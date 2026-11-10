import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSphere } from '../../world/sphere.js';
import { atlasPatterns } from '../../patterns/atlas-data.js';
import { decodeRLE } from '../../patterns/rle.js';
import { createHeadlessMatch } from '../headless.js';
import { settleCombatTribute } from './tribute.js';

test('insolvent payer splits its opening balance, even when it has incoming claims', () => {
  const players = [0.75, 0, 0].map((reserve, i) => ({
    id: i + 1, reserve, received: 0, paid: 0, tributePaid: 0, tributeReceived: 0, lastFlow: 0,
  }));
  const claims = [null, [0, 0, 1, 2], [0, 1, 0, 0]];
  settleCombatTribute(players, claims, 2);
  assert.deepEqual(players.map(p => p.reserve), [0, .25, .5]);
  assert.deepEqual(players.map(p => p.lastFlow), [-.75, .25, .5]);
  assert.equal(players[0].paid, .75);
  assert.equal(players[1].tributePaid, 0);
});

function siege(economy = {}) {
  const graph = buildSphere(64);
  const m = createHeadlessMatch(graph, {
    strategies: new Map([2, 3, 4, 5, 6].map(id => [id, () => {}])),
    init: 2, economy: { policy:'stability', fundBirths:false, stableEnergy: 0, birthCost: 0, stampCost: 0, combatFee: .25, ...economy },
  });
  function plant(owner, id, turns, dq, dr) {
    let points = decodeRLE(atlasPatterns.find(p => p.id === id).rle);
    for (let i = 0; i < turns; i++) points = points.map(([q, r]) => [-r, q + r]);
    const patch = m.patchForStamp(graph.farthest, 0, points.map(([q, r]) => [q + dq, r + dr]));
    assert(m.commitStamp(owner, patch, false));
  }
  plant(1, 'censo-oscillator-9-p6-1', 0, 0, 0);
  plant(2, 'censo-oscillator-10-p2-3', 4, 4, -2);
  return m;
}

test('the collection of combat claims precedes erosion due to unpaid births', () => {
  const m = siege({ birthCost: 100 });
  m.nextTick();
  assert(m.game.players.some(p => p.lastEroded > 0));
  assert(m.game.players.every(p => p.tributePaid === 0 && p.tributeReceived === 0));
});

test('an actual P12 siege transfers once per period and disabling it stops further payments', () => {
  const m = siege();
  for (let g = 0; g < 12; g++) m.nextTick();
  const [one, two] = m.game.players;
  assert.equal(one.reserve, 1.75);
  assert.equal(two.reserve, 2.25);
  assert.equal(one.tributePaid, .25);
  assert.equal(two.tributeReceived, .25);
  assert.equal(one.paid, .25);
  assert.equal(two.received, .25);
  m.game.economy.combatFee = 0;
  for (let g = 0; g < 12; g++) m.nextTick();
  assert.equal(one.reserve, 1.75);
  assert.equal(two.reserve, 2.25);
});
