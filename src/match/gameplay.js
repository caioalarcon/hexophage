import { createGrowthStrategy } from '../bots/growth-strategy.js';
import { createExplorationStrategy } from '../bots/exploration-strategy.js';
import { atlasPatterns } from '../patterns/atlas-data.js';
import { patterns } from '../patterns/catalog.js';
import { fieldKit } from '../patterns/callahan-kit.js';
import { isStabilityEconomy } from './constructive-economy.js';

const explorationPlans = {
  choices: [['field', 'Expandir população'], ['income', 'Priorizar renda']],
  defaults: ['field', 'income', 'field', 'income', 'field'],
};
const growthPlans = {
  choices: [
    ['farmer', 'Expandir colmeias rentáveis e atacar'],
    ['cycler', 'Incursões com glider P4'],
    ['core', 'Guardar para uma colmeia de reserva'],
    ['slow', 'Poupar para cerco · Gun P42'],
    ['diverse', 'Poupar para cerco · Gun P20'],
  ],
  defaults: ['farmer', 'cycler', 'core', 'slow', 'diverse'],
};

// No discovered patterns are required. The geometric seeds carry no claims
// about their motion, stability or profitability under a new automaton.
export function explorationGameplay(catalog, opening) {
  const seeds = catalog?.length ? catalog : patterns.custom;
  return {
    patterns: seeds,
    kit: Object.fromEntries(seeds.map(p => [p.id, {}])),
    opening: opening ?? seeds[0].id,
    botPlans: explorationPlans,
    createStrategy: createExplorationStrategy,
  };
}

export const genericGameplay = explorationGameplay(patterns.custom, 'triangle');
export const baysGameplay = explorationGameplay(patterns.bays, 'osc2');
export const callahanGameplay = {
  patterns: patterns.callahan,
  atlas: atlasPatterns,
  kit: fieldKit,
  opening: 'stalk',
  botPlans: growthPlans,
  plansFor: economy => isStabilityEconomy(economy) ? growthPlans : explorationPlans,
  createStrategy: (world, game, commitStamp) => isStabilityEconomy(game.economy)
    ? createGrowthStrategy(world, game, commitStamp)
    : createExplorationStrategy(world, game, commitStamp),
};

export function getBotPlans(gameplay, economy) {
  return gameplay.plansFor?.(economy) ?? gameplay.botPlans;
}
