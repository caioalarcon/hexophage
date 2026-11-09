import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessMatch } from './headless.js';
import { buildSphere } from '../world/sphere.js';
import { callahanGameplay, baysGameplay, genericGameplay, explorationGameplay, getBotPlans } from './gameplay.js';
import { BAYS } from '../simulation/rules.js';
import { seedPatternAges, patternOffset, advancePattern } from '../patterns/planar-simulation.js';

test('the Bays catalog describes the actual periods, velocities and activity of its own seeds', () => {
  for (const pattern of baysGameplay.patterns) {
    let ages = seedPatternAges(pattern);
    const initial = [...ages.keys()].map(patternOffset);
    let births = 0;
    for (let gen = 0; gen < pattern.period; gen++) {
      const turn = advancePattern(ages, 2, BAYS);
      births += turn.births;
      ages = turn.next;
    }
    assert.equal(births, pattern.birthsCycle);
    assert.equal(ages.size, pattern.cells);
    const dy = pattern.id === 'glider' ? -1 : 0;
    const translated = new Set(initial.map(([q, r]) => [q, r + dy].join(',')));
    assert.deepEqual(new Set([...ages.keys()].map(pos => patternOffset(pos).join(','))), translated);
  }
});

test('five bots take paid, legal openings and subsequent turns under each rule and tariff', () => {
  const graph = buildSphere(16);
  for (const [rule, notation, policy, size] of [
    ['callahan', undefined, 'stability', 36], ['callahan', undefined, 'activity', 36],
    ['bays', undefined, 'activity', 2], ['custom', 'B/S0123456', 'stability', 3],
  ]) {
    const {game, world, nextTick} = createHeadlessMatch(graph, {rule, notation, interval: 1,
      init: 1200, economy: {policy, stampCost: 10}});
    const plans = getBotPlans(game.gameplay, game.economy);
    assert.deepEqual(game.bots, plans.defaults);
    const choices = plans.choices.map(([value]) => value);
    assert(game.players.slice(1).every(p => choices.includes(p.pattern)));
    nextTick();
    for (const bot of game.players.slice(1)) {
      assert.equal(bot.stamps, 1, rule);
      assert.equal(bot.reserve, 1200 - size * 10);
      assert.equal(world.ownerCells[bot.id].length, size);
    }
    for (let t = 0; t < 3; t++) nextTick();
    if (game.gameplay !== callahanGameplay || policy === 'activity')
      assert(game.players.slice(1).every(p => p.stamps >= 2), rule);
  }
});

test('a new automaton with no catalog receives editable experimental seeds', () => {
  const fallback = explorationGameplay([]);
  assert.deepEqual(fallback.patterns, genericGameplay.patterns);
  assert(fallback.patterns.every(p => !p.period && p.group === 'semente'));
  for (const profile of [fallback, baysGameplay, callahanGameplay]) {
    const ids = new Set(profile.patterns.map(p => p.id));
    assert(ids.has(profile.opening));
    for (const id of Object.keys(profile.kit)) assert(ids.has(id));
  }
});
