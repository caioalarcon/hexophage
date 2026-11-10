import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRuleProfile } from '../match/rule-profiles.js';
import { ACTIVITY_ECONOMY, STABILITY_ECONOMY } from '../match/constructive-economy.js';
import { estimateEconomicReturn, rankEconomicPatterns } from './economic-ranking.js';

const catalog = rule => resolveRuleProfile(rule).gameplay.patterns;
const card = (rule, id) => catalog(rule).find(pattern => pattern.id === id);

test('the initial economic prior changes with the selected economy', () => {
  const activity = rankEconomicPatterns(catalog('ashley15'), 'ashley15', ACTIVITY_ECONOMY);
  assert.equal(activity[0].id, 'puff30');
  assert(estimateEconomicReturn('ashley15', card('ashley15', 'puff30'), ACTIVITY_ECONOMY).flow > 100);
  assert(estimateEconomicReturn('ashley15', card('ashley15', 'puff30'), STABILITY_ECONOMY).flow < -100);
  const stability = rankEconomicPatterns(catalog('hex-b2s245'), 'hex-b2s245', STABILITY_ECONOMY);
  assert.equal(stability[0].id, 'farm-18-66');
  assert(stability.indexOf(card('hex-b2s245', 'farm-4-12')) < stability.indexOf(card('hex-b2s245', 'db-50')));
});

test('re-pricing responds to tariffs and does not invent data for unmeasured maturity or custom physics', () => {
  const pattern = card('hex-b2s245', 'farm-4-12');
  const normal = estimateEconomicReturn('hex-b2s245', pattern, STABILITY_ECONOMY);
  const doubled = estimateEconomicReturn('hex-b2s245', pattern, {...STABILITY_ECONOMY, stableEnergy:0.04});
  assert(Math.abs(doubled.flow - 2 * normal.flow) < 1e-9);
  assert.equal(estimateEconomicReturn('hex-b2s245', pattern, {...STABILITY_ECONOMY, stableAfter:8}).flow, normal.flow);
  assert.equal(estimateEconomicReturn('hex-b2s245', pattern, {...STABILITY_ECONOMY, stableAfter:2048}), null);
  assert.equal(estimateEconomicReturn('custom', pattern, STABILITY_ECONOMY), null);
});

test('a moving ship earns only for its observed short-lived cohorts', () => {
  const pattern = card('bays', 'glider');
  // Across 128 observed generations this ship has 208 cell-turns at age 2 and none at age 3.
  const terms = {...STABILITY_ECONOMY, productionScale:0, stableEnergy:1, birthCost:0};
  const at = stableAfter => estimateEconomicReturn('bays', pattern, {...terms,stableAfter}).flow;
  assert.equal(at(2), 208 / 128);
  assert.equal(at(3), 0);
});

test('ranking never depends on input enumeration order', () => {
  const patterns = catalog('bays245');
  const first = rankEconomicPatterns(patterns, 'bays245', ACTIVITY_ECONOMY).map(p=>p.id);
  assert.deepEqual(first, rankEconomicPatterns([...patterns].reverse(), 'bays245', ACTIVITY_ECONOMY).map(p=>p.id));
});
