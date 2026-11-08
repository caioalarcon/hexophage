import { energyCost, generationEnergy } from '../match/constructive-economy.js';
import { atlasPatterns } from '../patterns/atlas-data.js';
import { advancePattern, seedPatternAges } from '../patterns/cycle-economy.js';

// Quotes depend on live sliders. Only the handful of structures a strategy
// considers are measured, once per tariff or maturity change.
export function createInvestmentQuotes(economy) {
  const cache = new Map();
  let lastSettings;
  return function quote(id) {
    const { stableEnergy, birthCost, stableAfter, stampCost } = economy;
    const settings = [stableEnergy, birthCost, stableAfter, stampCost].join('/');
    if (settings !== lastSettings) {
      cache.clear();
      lastSettings = settings;
    }
    if (cache.has(id)) return cache.get(id);
    const pattern = atlasPatterns.find(p => p.id === id);
    let ages = seedPatternAges(pattern);
    const price = energyCost(ages.size, economy);
    // Beyond a full period, only the oscillator's permanent core can reach
    // the threshold. Postponing maturity by whole periods adds exactly those
    // periods' birth costs and leaves the subsequent cash flows unchanged.
    const delayed = Math.max(0, stableAfter - 72);
    const stationary = pattern.group === 'oscilador';
    const cyclesSkipped = stationary ? Math.floor(delayed / pattern.period) : 0;
    const turnsSkipped = stationary ? cyclesSkipped * pattern.period : delayed;
    const maturity = stableAfter - turnsSkipped;
    const turns = Math.max(32, maturity + 12);
    let capital = 0, balance = 0, recent = 0, cycleCost = 0, peakBurn = 0;
    for (let gen = 1; gen <= turns; gen++) {
      const { next, births, mature } = advancePattern(ages, maturity);
      ages = next;
      const { income, upkeep } = generationEnergy(births, mature, economy);
      const net = income - upkeep;
      if (gen <= pattern.period) cycleCost += upkeep;
      peakBurn = Math.max(peakBurn, upkeep);
      balance += net;
      capital = Math.max(capital, -balance);
      if (gen > turns - 12) recent += net;
    }
    // A grower's path is open. Budget the largest observed birth bill for
    // each extra warm-up turn; collisions and later growth remain uncertain.
    const delayedCost = stationary ? cyclesSkipped * cycleCost :
      pattern.group === 'crescedor' ? turnsSkipped * peakBurn : 0;
    const result = { id, budget: price + capital + delayedCost, yield: recent / 12 };
    cache.set(id, result);
    return result;
  };
}
