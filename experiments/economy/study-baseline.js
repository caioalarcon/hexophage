// Parameters from the published two-hour study and its collision replay.
// Reproduce those runs even when the playable preview uses another economy.
export const studyEconomy = Object.freeze({
  stampCost: 10, initialCells: 3, stableAfter: 2,
  generationQuote: (births, stable) => ({ income: births, upkeep: stable }),
});
