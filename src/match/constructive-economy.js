// Each mature coordinate produces energy each generation. Natural births cost
// energy; stamping pays once for each cell placed.
export const DEFAULT_ECONOMY = Object.freeze({
  stableEnergy: 3, stampCost: 30, birthCost: 1, stableAfter: 16, initialCells: 4,
});
export const ECONOMY_KEYS = Object.freeze(Object.keys(DEFAULT_ECONOMY));
export function generationEnergy(births, stable, economy) {
  if (economy.generationQuote) return economy.generationQuote(births, stable, economy);
  return { income: stable * economy.stableEnergy, upkeep: births * economy.birthCost };
}
export function energyCost(cells, economy) {
  return cells * economy.stampCost;
}
export function availableCells(reserve, economy) {
  return economy.stampCost === 0 ? Infinity : Math.floor((reserve + 1e-9) / economy.stampCost);
}
// Slider settings use whole units. Each control owns its upper bound.
export function parameterValue(value, maximum = 100) {
  return Math.max(0, Math.min(maximum, Math.round(Number(value) || 0)));
}
export function initialEnergy(economy) {
  return economy.initialCells * economy.stampCost;
}
