// Each mature coordinate produces energy each generation. Natural births cost
// energy; stamping pays once for each cell placed.
export const DEFAULT_ECONOMY = Object.freeze({
  combatFee: 0.25,
  stableEnergy: 0.02, productionScale: 1500, birthCost: 1, stableAfter: 256,
  stampCost: 10000, initialCells: 37,
});
export const ECONOMY_KEYS = Object.freeze(Object.keys(DEFAULT_ECONOMY));
export function generationEnergy(births, stable, economy) {
  if (economy.generationQuote) return economy.generationQuote(births, stable, economy);
  // At the scale S=K a colony earns half its maximum gross production.
  // The scale applies to all mature cells of that owner, including separate farms.
  const effective = economy.productionScale > 0 ? stable / (1 + stable / economy.productionScale) : stable;
  return { income: effective * economy.stableEnergy, upkeep: births * economy.birthCost };
}
export function energyCost(cells, economy) {
  return cells * economy.stampCost;
}
export function availableCells(reserve, economy) {
  return economy.stampCost === 0 ? Infinity : Math.floor((reserve + 1e-9) / economy.stampCost);
}
export function parameterValue(value, maximum = 100, step = 1) {
  const units = Math.round((Number(value) || 0) / step);
  const places = String(step).split('.')[1]?.length ?? 0;
  return Math.max(0, Math.min(maximum, Number((units * step).toFixed(places))));
}
export function initialEnergy(economy) {
  return economy.initialCells * economy.stampCost;
}
