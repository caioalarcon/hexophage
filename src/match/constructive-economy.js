// A profile selects a policy and may override rates or provide its own generationQuote.
// Rates stay attached to the physical event when the direction of payment changes.
const rates = {
  combatFee: 0.25,
  stableEnergy: 0.02, productionScale: 8000, birthCost: 1, stableAfter: 256,
  stampCost: 10000, initialCells: 82,
};
export const ECONOMY_KEYS = Object.freeze(Object.keys(rates));
export const STABILITY_ECONOMY = Object.freeze({ ...rates, policy: 'stability' });
export const ACTIVITY_ECONOMY = Object.freeze({ ...rates, policy: 'activity' });
export const DEFAULT_ECONOMY = STABILITY_ECONOMY;

const policies = new Map([
  ['stability', (birthValue, matureValue) => ({ income: matureValue, upkeep: birthValue })],
  ['activity', (birthValue, matureValue) => ({ income: birthValue, upkeep: matureValue })],
]);

export function isStabilityEconomy(economy) {
  return !economy.generationQuote && (economy.policy ?? 'stability') === 'stability';
}

export function generationEnergy(births, stable, economy) {
  if (economy.generationQuote) return economy.generationQuote(births, stable, economy);
  const quote = policies.get(economy.policy ?? 'stability');
  if (!quote) throw new RangeError('Unknown economy policy: ' + economy.policy);
  // The saturation scale covers all mature cells of one owner, across farms.
  const effective = economy.productionScale > 0 ? stable / (1 + stable / economy.productionScale) : stable;
  return quote(births * economy.birthCost, effective * economy.stableEnergy);
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
