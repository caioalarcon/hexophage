// Constructive economy: actual CA births produce energy; living cells of sufficient
// uninterrupted age consume energy. Only a player's own living cells can erode.
export const DEFAULT_ECONOMY = Object.freeze({
  birthEnergy: 1, stampCost: 10, upkeep: 1, stableAfter: 2, initialCells: 3,
});
export const ECONOMY_KEYS = Object.freeze(Object.keys(DEFAULT_ECONOMY));
export function energyCost(cells, economy) {
  return cells * economy.stampCost;
}
export function availableCells(reserve, economy) {
  return economy.stampCost === 0 ? Infinity : Math.floor((reserve + 1e-9) / economy.stampCost);
}
// The slider has an inclusive 0..100 domain; fractional values are never saved.
export function parameterValue(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}
export function initialEnergy(economy) {
  return economy.initialCells * economy.stampCost;
}
