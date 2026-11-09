import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSphere} from '../world/sphere.js';
import {rankEconomicPatterns} from '../patterns/economic-ranking.js';
import {ACTIVITY_ECONOMY} from './constructive-economy.js';
import {economicStarts} from './economic-starts.js';
import {plantFounder, plantSuggestedFounder} from './founding.js';
import {createHeadlessMatch} from './headless.js';
import {resolveRuleProfile, ruleProfiles} from './rule-profiles.js';

test('every shipped automaton installs its editable opening tariff', () => {
  const graph = buildSphere(12);
  const shipped = Object.keys(ruleProfiles).filter(id => !ruleProfiles[id].compile);
  assert.deepEqual(Object.keys(economicStarts).sort(), shipped.sort());
  for (const id of shipped) {
    const profile = resolveRuleProfile(id), preset = economicStarts[id];
    const {game} = createHeadlessMatch(graph, {rule:id});
    assert.deepEqual(game.economy, preset);
    assert.notEqual(game.economy, preset);
    assert.equal(game.players[0].reserve, preset.stampCost * preset.initialCells);
    assert(profile.gameplay.patterns.find(p => p.id === profile.gameplay.opening).cells <= preset.initialCells, id);
    assert.equal(preset.fundBirths, preset.policy === 'stability');
    assert.equal(preset.emptyFieldUpkeep, true);
  }
});

test('automatic paid founder follows the actual opening tariff and respects an existing purchase', () => {
  const graph = buildSphere(32);
  for (const options of [{rule:'bays'}, {rule:'bays', economy:ACTIVITY_ECONOMY}, {rule:'hex-b2s245'}, {rule:'ashley15'}]) {
    const {world, game, commitStamp} = createHeadlessMatch(graph, options);
    const player = game.players[0];
    const [best] = rankEconomicPatterns(game.gameplay.patterns, game.profile.id, game.economy);
    const reference = createHeadlessMatch(graph, options);
    assert(plantFounder(reference.world, reference.game, reference.game.players[0], reference.commitStamp, best.id));
    assert(plantSuggestedFounder(world, game, player, commitStamp));
    assert.deepEqual(world.ownerCells[1], reference.world.ownerCells[1]);
    assert.equal(player.reserve, game.init - best.cells * game.economy.stampCost);
    assert.equal(plantSuggestedFounder(world, game, player, commitStamp), false);
    assert.equal(player.stamps, 1);
  }
});
