import { generationEnergy, initialEnergy } from '../match/constructive-economy.js';
import { physicalYields } from './physical-yields.js';

// Price the measured age distribution at the selected maturity threshold.
export function estimateEconomicReturn(ruleId, pattern, economy) {
  const sample = physicalYields[ruleId]?.[pattern.id];
  if (!sample || economy.generationQuote || economy.stableAfter > 1024) return null;
  const [initialCells, births, bands] = sample;
  let matureTurns = 0;
  for (let i = 0; i < bands.length; i += 3) {
    const from = Math.max(bands[i], economy.stableAfter);
    matureTurns += Math.max(0, bands[i + 1] - from + 1) * bands[i + 2];
  }
  const mature = matureTurns / 128;
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
