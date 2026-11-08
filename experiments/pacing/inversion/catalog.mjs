// Isolated atlas calibration only. Long matches can consume these coefficients without a CA.
import { writeFileSync } from 'node:fs';
import { verifyClosedStrips } from './catalog-custom.mjs';
import { generateProfiles } from '../../economy/profiles.js';
import { analyzePatternCycles } from '../../../src/patterns/cycle-economy.js';
import { atlasPatterns } from '../../../src/patterns/atlas-data.js';
import { DEFAULT_ECONOMY } from '../../../src/match/constructive-economy.js';

const price = 10;
const epsilon = 1e-8;
const ledgers = {
  births: { birthCost: 1, deathCost: 0 },
  flips: { birthCost: 1, deathCost: 1 },
  sixBirths: { birthCost: 6, deathCost: 0 },
  threeFlips: { birthCost: 3, deathCost: 3 },
};

function summarize(seed, profile, turns, { birthCost, deathCost }) {
  let cumulative = 0, minimum = 0, maximum = 0;
  let payback = null, firstDeficit = null;
  const windows = [];
  const opening = [];
  let blockSum = 0;
  for (const { generation, survivors, births, deaths } of turns) {
    const flow = survivors - birthCost * births - deathCost * deaths;
    if (generation <= 6) opening.push(flow);
    cumulative += flow;
    blockSum += flow;
    minimum = Math.min(minimum, cumulative);
    maximum = Math.max(maximum, cumulative);
    if (firstDeficit === null && cumulative < 0) firstDeficit = generation;
    if (payback === null && cumulative >= price * seed.cells) payback = generation;
    if (generation % profile.window === 0) {
      windows.push(blockSum / profile.window);
      blockSum = 0;
    }
  }
  // D = B - (L[t]-L[t-1]); for a bounded period mean D equals mean B.
  // With unbounded cumulative descendants, a single window is phase dependent.
  const slope = profile.upkeepSlope - (birthCost + deathCost) * profile.birthsSlope;
  const periodicMean = profile.upkeep - (birthCost + deathCost) * profile.births;
  // Exact purchase recovery (and first shortage) can occur after the two measured periods.
  // Reuse the measured phase rather than extending the cellular simulation.
  if (profile.period) {
    const period = profile.period;
    const cash = turns.map(t => t.survivors - birthCost * t.births - deathCost * t.deaths);
    if (cash.slice(period).some((v, i) => v !== cash[i])) throw new Error('Phase mismatch ' + seed.id);
    const cycleFlow = cash.slice(0, period).reduce((sum, v) => sum + v, 0);
    let partial = 0;
    for (let i = 0; i < period; i++) {
      partial += cash[i];
      if (cycleFlow > 0) {
        const cycles = Math.max(0, Math.ceil((price * seed.cells - partial) / cycleFlow));
        payback = Math.min(payback ?? Infinity, cycles * period + i + 1);
      }
      if (cycleFlow < 0) {
        const cycles = Math.max(0, Math.floor(partial / -cycleFlow) + 1);
        firstDeficit = Math.min(firstDeficit ?? Infinity, cycles * period + i + 1);
      }
    }
  }
  const trend = Math.abs(slope) > epsilon ? (slope > 0 ? 'rising' : 'falling') :
    periodicMean > epsilon ? 'positive' : periodicMean < -epsilon ? 'negative' : 'zero';
  return {
    trend, slope, boundedMean: Math.abs(slope) <= epsilon ? periodicMean : null,
    opening, firstWindowMean: windows[0], lastWindowMean: windows.at(-1),
    firstNonpositiveWindow: windows.findIndex(value => value <= 0) + 1 || null,
    firstDeficit, extraCapitalThroughObservation: -minimum || 0,
    maxOperatingSurplusThroughObservation: maximum, recoversStampAt: payback,
  };
}

const profiles = await generateProfiles();
const records = [];
let founderLiquidity = [];
for (const [index, p] of profiles.entries()) {
  const seed = atlasPatterns[index];
  if (!p.usable || p.id !== seed.id) throw new Error('Missing profile for ' + seed.id);
  const length = p.period ? 2 * p.period : p.group === 'gerador' ? 24 * p.window :
    p.group === 'crescedor' ? 1500 : (p.skip + 2 * p.fitBlock) * p.window;
  // A one-step reporting window exposes the existing atlas solver's true per-tick counts.
  const { rows } = await analyzePatternCycles({ ...seed, period: 1 }, DEFAULT_ECONOMY, { cycles: length });
  let previous = seed.cells;
  const turns = rows.map(({ to, births, live, maintenanceCellTurns }) => {
    const deaths = previous + births - live;
    previous = live;
    if (live !== births + maintenanceCellTurns || deaths < 0) throw new Error('Bad ledger ' + p.id);
    return { generation: to, survivors: maintenanceCellTurns, births, deaths };
  });
  if (p.id === 'stalk') {
    founderLiquidity = [1, 3, 6, 8, 12, 16, 28, 60, 63].map(birthCost => {
      const v = summarize(seed, p, turns, { birthCost, deathCost: 0 });
      return { birthCost, purchaseAndBuffer: price * seed.cells + v.extraCapitalThroughObservation,
        recoversStampAt: v.recoversStampAt };
    });
  }
  records.push({
    id: p.id, name: p.name, group: p.group, cells: seed.cells, window: p.window,
    measuredGenerations: length, fitBlock: p.fitBlock, skip: p.skip,
    birthsPerGeneration: p.births, survivorsPerGeneration: p.upkeep, windowCore: p.core,
    birthsSlope: p.birthsSlope, survivorsSlope: p.upkeepSlope, liveSlope: p.liveSlope,
    ...Object.fromEntries(Object.entries(ledgers).map(([id, rule]) => [id, summarize(seed, p, turns, rule)])),
  });
}
const counts = {};
for (const id of Object.keys(ledgers)) {
  counts[id] = {};
  for (const r of records) counts[id][r[id].trend] = (counts[id][r[id].trend] ?? 0) + 1;
}
const report = { pricePerCell: price, ageThreshold: DEFAULT_ECONOMY.stableAfter, ledgers, counts, founderLiquidity, custom: verifyClosedStrips(), records };
writeFileSync(new URL('catalog.json', import.meta.url), JSON.stringify(report) + '\n');
console.log(JSON.stringify(counts));
