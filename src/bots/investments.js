import { energyCost, generationEnergy } from '../match/constructive-economy.js';
import { atlasPatterns } from '../patterns/atlas-data.js';
import { advancePattern, seedPatternAges } from '../patterns/cycle-economy.js';

// Compare small stationary openings when a custom budget cannot fund a grower.
// Reprice only when the player changes the tariffs, scale or maturity threshold.
export function createInvestmentQuotes(economy) {
  const cache = new Map();
  let lastSettings;
  return function quote(id) {
    const { stableEnergy, birthCost, stableAfter, stampCost } = economy;
    const settings = [stableEnergy, birthCost, stableAfter, stampCost, economy.productionScale].join('/');
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
    const cyclesSkipped = Math.floor(delayed / pattern.period);
    const turnsSkipped = cyclesSkipped * pattern.period;
    const maturity = stableAfter - turnsSkipped;
    const turns = Math.max(2 * pattern.period, maturity + pattern.period);
    let capital = 0, balance = 0, recent = 0, cycleCost = 0;
    for (let gen = 1; gen <= turns; gen++) {
      const { next, births, mature } = advancePattern(ages, maturity);
      ages = next;
      const { income, upkeep } = generationEnergy(births, mature, economy);
      const net = income - upkeep;
      if (gen <= pattern.period) cycleCost += upkeep;
      balance += net;
      capital = Math.max(capital, -balance);
      if (gen > turns - pattern.period) recent += net;
    }
    const delayedCost = cyclesSkipped * cycleCost;
    const result = { id, budget: price + capital + delayedCost, yield: recent / pattern.period };
    cache.set(id, result);
    return result;
  };
}
