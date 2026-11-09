import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSphere } from '../src/world/sphere.js';
import { compileHexRule } from '../src/simulation/rules.js';
import { createHeadlessMatch } from '../src/match/headless.js';
import { resolveRuleProfile, ruleProfiles } from '../src/match/rule-profiles.js';

test('one new registry entry runs with independent defaults, opening and bots', t => {
  // An isolated live cell survives. Cells with a neighbour disappear.
  ruleProfiles.isolated = {
    label: 'Isoladas',
    physics: compileHexRule((alive, mask) => alive && mask === 0),
    economy: { policy: 'activity', initialCells: 20, stableAfter: 1 },
  };
  t.after(() => delete ruleProfiles.isolated);
  const graph = buildSphere(24);
  const match = createHeadlessMatch(graph, { rule: 'isolated' });
  const bays = createHeadlessMatch(graph, { rule: 'bays' });
  assert.equal(match.world.graph, bays.world.graph);
  assert.equal(match.world.physics, ruleProfiles.isolated.physics);
  assert.notDeepEqual(match.game.gameplay.patterns, bays.game.gameplay.patterns);
  assert.equal(match.game.players[0].reserve, 20 * match.game.economy.stampCost);
  const seed = match.game.players[0].seed;
  assert(match.commitStamp(1, [seed], false));
  for (let n = 0; n < 5; n++) match.nextTick();
  assert.equal(match.world.cells[seed], 1);
  assert.equal(match.game.players[0].lastIncome, 0);
  assert(match.game.players[0].lastUpkeep > 0);
  assert(match.game.players.slice(1).every(p => p.stamps > 0));
  assert.equal(bays.world.gen, 0);
  assert.equal(bays.game.economy.initialCells, 82);
});

test('custom B/S identities are canonical and invalid profiles fail before play', () => {
  assert.equal(resolveRuleProfile('custom', ' b22 / s53 ').key, resolveRuleProfile('custom', 'B2/S35').key);
  assert.notEqual(resolveRuleProfile('custom', 'B2/S35').key, resolveRuleProfile('bays').key);
  const graph = buildSphere(4);
  assert.throws(() => createHeadlessMatch(graph, { rule: 'custom', notation: 'B7/S0' }), RangeError);
  assert.throws(() => createHeadlessMatch(graph, { rule: 'unregistered' }), RangeError);
});

test('vacuum births give every bot exactly one opening before neutral cells fill the sphere', () => {
  const match = createHeadlessMatch(buildSphere(24), { rule: 'custom', notation: 'B0/S0123456' });
  match.nextTick();
  assert(match.world.ownerCells[7].length > 0);
  for (const bot of match.game.players.slice(1)) {
    assert.equal(bot.stamps, 1);
    assert(match.world.ownerCells[bot.id].length > 0);
  }
});
