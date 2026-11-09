// Suggested opening tariffs, selected by matched learner games in
// experiments/economic-starts. Match state copies each preset before editing.
import { ACTIVITY_ECONOMY, STABILITY_ECONOMY } from './constructive-economy.js';

const stability = overrides => Object.freeze({
  ...STABILITY_ECONOMY, fundBirths:true, emptyFieldUpkeep:true, initialCells:48, ...overrides,
});
const patient = stability({stableEnergy:2, stableAfter:24, productionScale:64, stampCost:400, combatFee:25});
const cores = stability({stableEnergy:6, stableAfter:12, productionScale:32, stampCost:400, combatFee:25});
const early = stability({stableEnergy:3, stableAfter:4, productionScale:48, stampCost:240, combatFee:40});
const scarce = stability({stableEnergy:8, stableAfter:8, productionScale:12, stampCost:200, combatFee:40});
const debt = stability({stableEnergy:1, stableAfter:12, productionScale:16, stampCost:80, combatFee:32,
  initialCells:24, birthCost:8});
const pulse = Object.freeze({...ACTIVITY_ECONOMY, emptyFieldUpkeep:true, stableEnergy:1, stableAfter:6,
  productionScale:60, stampCost:800, combatFee:32, initialCells:48});

export const economicStarts = Object.freeze({
  callahan:scarce, bays:cores, 'hex-b2s34':patient, 'hex-b2s245':debt,
  bays245:patient, andreen:early, highhex:cores, ashley15:pulse, ashley:early,
});
