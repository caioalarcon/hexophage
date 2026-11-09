import { energyCost, generationEnergy } from '../match/constructive-economy.js';
import { advancePattern, seedPatternAges } from '../patterns/planar-simulation.js';

// Compare small stationary openings when a custom budget cannot fund a grower.
// Reprice only when the player changes the tariffs, scale or maturity threshold.
export function createInvestmentQuotes(economy, catalog, physics) {
  const cache = new Map();
  let lastSettings, lastQuote;
  return function quote(id) {
    const { stableEnergy, birthCost, stableAfter, stampCost } = economy;
    const settings = [stableEnergy, birthCost, stableAfter, stampCost, economy.productionScale, economy.policy].join('/');
    if (settings !== lastSettings || lastQuote !== economy.generationQuote) {
      cache.clear();
      lastSettings = settings;
      lastQuote = economy.generationQuote;
    }
    if (cache.has(id)) return cache.get(id);
    const pattern = catalog.find(p => p.id === id);
    let ages = seedPatternAges(pattern);
    const price = energyCost(ages.size, economy);
    // Once a full period ends before maturity, each additional immature
    // period has the same cash flows, whichever event earns energy.
    const delayed = Math.max(0, stableAfter - Math.max(72, pattern.period + 2));
    const cyclesSkipped = Math.floor(delayed / pattern.period);
    const turnsSkipped = cyclesSkipped * pattern.period;
    const maturity = stableAfter - turnsSkipped;
    const turns = Math.max(2 * pattern.period, maturity + pattern.period);
    let capital = 0, balance = 0, recent = 0;
    for (let gen = 1; gen <= turns; gen++) {
      const { next, births, mature } = advancePattern(ages, maturity, physics);
      ages = next;
      const { income, upkeep } = generationEnergy(births, mature, economy);
      const net = income - upkeep;
      balance += net;
      capital = Math.max(capital, -balance);
      if (gen === pattern.period && cyclesSkipped) {
        capital += cyclesSkipped * Math.max(0, -balance);
        balance += cyclesSkipped * balance;
      }
      if (gen > turns - pattern.period) recent += net;
    }
    const result = { id, budget: price + capital, yield: recent / pattern.period };
    cache.set(id, result);
    return result;
  };
}
