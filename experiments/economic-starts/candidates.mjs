// Candidate budgets are in credits. Every named rule is exposed to the same
// grid. Controls use the published production presets before calibration.
import {ACTIVITY_ECONOMY, STABILITY_ECONOMY} from '../../src/match/constructive-economy.js';

export const rules=['callahan','bays','hex-b2s34','hex-b2s245','bays245','andreen','highhex','ashley15','ashley'];
export const priceGrid={
  original: null,
  patient:{policy:'stability', stableEnergy:2, stableAfter:24, productionScale:64, stampCost:400, combatFee:25},
  cores:{policy:'stability', stableEnergy:6, stableAfter:12, productionScale:32, stampCost:400, combatFee:25},
  early:{policy:'stability', stableEnergy:3, stableAfter:4, productionScale:48, stampCost:240, combatFee:40},
  scarce:{policy:'stability', stableEnergy:8, stableAfter:8, productionScale:12, stampCost:200, combatFee:40},
  pulse:{policy:'activity', birthCost:1, stableEnergy:1, stableAfter:6, productionScale:60, stampCost:800, combatFee:32},
  compact:{policy:'stability', stableEnergy:3, stableAfter:12, productionScale:5, stampCost:400, combatFee:64},
  cellbank:{policy:'stability', stableEnergy:2, stableAfter:24, productionScale:12, stampCost:800, combatFee:80},
  scarceCore:{policy:'stability', stableEnergy:4, stableAfter:8, productionScale:3, stampCost:240, combatFee:48},
  lean:{policy:'stability', stableEnergy:0.1, stableAfter:24, productionScale:48, stampCost:160, combatFee:16, initialCells:32},
  reserve:{policy:'stability', stableEnergy:0.3, stableAfter:24, productionScale:32, stampCost:160, birthCost:3, combatFee:24, initialCells:32},
  front:{policy:'stability', stableEnergy:0.6, stableAfter:12, productionScale:24, stampCost:80, birthCost:4, combatFee:16, initialCells:24},
  debt:{policy:'stability', stableEnergy:1, stableAfter:12, productionScale:16, stampCost:80, birthCost:8, combatFee:32, initialCells:24},
};
export function getCandidate(rule, key){
  if(!Object.hasOwn(priceGrid,key))throw Error('Unknown preset '+key);
  if(key==='original')return {...(rule==='bays'?ACTIVITY_ECONOMY:STABILITY_ECONOMY), emptyFieldUpkeep:false};
  const parameters=priceGrid[key];
  return {...STABILITY_ECONOMY, initialCells:48, ...parameters, fundBirths:parameters.policy==='stability', emptyFieldUpkeep:false};
}
