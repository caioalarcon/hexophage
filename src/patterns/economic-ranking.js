import { generationEnergy, initialEnergy } from '../match/constructive-economy.js';
import { physicalYields } from './physical-yields.js';

// This is a price-sensitive prior, NOT a replacement for the agents' local
// simulations. Only an unchanged maturity threshold makes the census valid.
export function estimateEconomicReturn(ruleId, pattern, economy) {
  const sample = physicalYields[ruleId]?.[pattern.id];
  if (!sample || economy.stableAfter !== 256 || economy.generationQuote) return null;
  const [initialCells, births, mature] = sample;
  const cost = (pattern.cells ?? pattern.offsets?.length ?? initialCells) * economy.stampCost;
  const { income, upkeep } = generationEnergy(births, mature, economy);
  const flow = income - upkeep;
  return {
    flow, cost,
    feasible: cost <= initialEnergy(economy) + 1e-9,
    payback: flow > 0 ? cost / flow : null,
    efficiency: flow / Math.max(1, cost),
    generations: 1024, window: 128,
  };
}

function category(estimate) {
  if (!estimate) return 4;
  if (estimate.feasible && estimate.flow > 0) return 0;
  if (!estimate.feasible && estimate.flow > 0) return 1;
  return estimate.feasible ? 2 : 3;
}

export function compareEconomicPatterns(a, b, ruleId, economy) {
  const x = estimateEconomicReturn(ruleId, a, economy);
  const y = estimateEconomicReturn(ruleId, b, economy);
  const band = category(x) - category(y);
  if (band) return band;
  if (x && y) {
    // For profitable patterns prefer the shortest estimated amortization,
    // not raw output which favors arbitrarily expensive seeds.
    if (x.flow > 0 && y.flow > 0) {
      const returnOrder = x.payback - y.payback;
      if (returnOrder) return returnOrder;
    } else if (x.flow !== y.flow) return y.flow - x.flow;
  }
  const count = p => p.cells ?? p.offsets?.length ?? 0;
  return count(a) - count(b) || a.id.localeCompare(b.id, 'en');
}

export function rankEconomicPatterns(patterns, ruleId, economy) {
  return [...patterns].sort((a, b) => compareEconomicPatterns(a, b, ruleId, economy));
}
