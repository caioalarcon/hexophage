import { generationEnergy } from '../match/constructive-economy.js';
import { plantFounder } from '../match/founding.js';
import { createOscillatorStrategy } from './oscillator-strategy.js';
import { createInvestmentQuotes } from './investments.js';
import { expectedGunExpense, raidBudget, raidMatureCore } from './raids.js';

const farmCandidates = ['censo-oscillator-6-p2-1', 'censo-oscillator-12-p3-1', 'p7a', 'p2'];

// One more front at the observed size of our existing fronts. An active stalk
// births 143 cells per 24 generations; production scales across the entire field.
export function growthMargin(economy, stable, fronts) {
  const before = generationEnergy(0, stable, economy).income;
  const after = generationEnergy(143/24, stable + stable/fronts, economy);
  return after.income - after.upkeep - before;
}

export function createGrowthStrategy(world, game, commitStamp) {
  const plant = createOscillatorStrategy(world, game, commitStamp);
  const quote = createInvestmentQuotes(game.economy);
  return player => {
    const e = game.economy, plan = game.botPlans[player.id - 1];
    if (!player.stamps) {
      if (plantFounder(world, game, player, commitStamp)) {
        plan.fronts = 1;
      } else {
        // A custom opening budget may fund a smaller productive seed.
        const profitable = farmCandidates.map(quote).filter(q => q.yield > 0 && player.reserve >= q.budget);
        profitable.sort((a,b) => a.budget/a.yield - b.budget/b.yield);
        if (profitable.length) plant(player, profitable[0].id);
      }
      return;
    }
    const growerPrice = 36 * e.stampCost;
    const growerBudget = growerPrice + (e.stableAfter + 24) * 6 * e.birthCost;
    const farmer = player.pattern === 'farmer' || player.pattern === 'core';
    if (farmer && player.stable && growthMargin(e, player.stable, plan.fronts || 1) > 0) {
      if (player.reserve < growerBudget) return;
      if (plant(player, 'stalk')) {
        plan.fronts = (plan.fronts || 0) + 1;
        return;
      }
    }
    let weapon = player.pattern === 'slow' ? 'gun42' : player.pattern === 'diverse' ? 'gun20' : 'glider';
    let savings = player.pattern === 'core' ? growerBudget : 0;
    if (weapon !== 'glider' && player.flowAverage < expectedGunExpense(e, weapon)) {
      // While an entire battery would run a deficit, keep a partial siege
      // fund and send sorties that can end when their target is hit.
      savings = raidBudget(e, weapon) / 2;
      weapon = 'glider';
    }
    if (player.flowAverage <= 0 || player.reserve < savings + raidBudget(e, weapon)) return;
    raidMatureCore(world, game, player, commitStamp, weapon);
  };
}
