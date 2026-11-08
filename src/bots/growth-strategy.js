import { createOscillatorStrategy } from './oscillator-strategy.js';
import { createInvestmentQuotes } from './investments.js';
import { raidMatureCore } from './raids.js';

// Each bridge is stationary and has a permanently living core. A fast cheap
// bridge brings forward the next purchase; a larger core yields more per turn.
const small = 'censo-oscillator-5-p2-1', medium = 'censo-oscillator-6-p2-1';
const large = 'censo-oscillator-12-p3-1';
const plans = {
  farmer: [medium, small],
  cycler: [medium],
  core: [large, medium],
  slow: [large],
  diverse: [large, medium],
};

export function createGrowthStrategy(world, game, commitStamp) {
  const plant = createOscillatorStrategy(world, game, commitStamp);
  const quote = createInvestmentQuotes(game.economy);
  return player => {
    const afford = q => q.yield > 0 && player.reserve >= q.budget;
    const flipper = quote('p2');
    if (!world.ownerCells[player.id].length && afford(flipper)) {
      plant(player, flipper.id);
      return;
    }
    const plan = game.botPlans[player.id - 1];
    const grower = quote('stalk');
    if (player.pattern === 'diverse' && plan.nextRaid != null && world.gen >= plan.nextRaid &&
        player.flowAverage > 5 * game.economy.birthCost &&
        player.reserve >= grower.budget + quote('glider').budget) {
      // The attack budget includes the first turns of flight. Never sell a
      // future stalk to pay for a speculative shot.
      plan.nextRaid = world.gen + 24;
      if (raidMatureCore(world, game, player, commitStamp)) return;
    }
    if (afford(grower) && plant(player, grower.id)) {
      plan.nextRaid ??= world.gen + 24;
      return;
    }
    const flow = Math.max(0, player.flowAverage);
    const wait = grower.yield > 0 && flow > 0
      && grower.budget > player.reserve ? (grower.budget - player.reserve) / flow : Infinity;
    const bridges = player.pattern === 'core' && player.stamps >= 2
      ? [large] : (plans[player.pattern] ?? plans.cycler);
    for (const id of bridges) {
      const bridge = quote(id);
      if (!afford(bridge)) continue;
      // With a productive field, keep saving if another farm would take
      // longer to repay its seed and warm-up than the wait for the stalk.
      if (wait < game.economy.stableAfter + bridge.budget / bridge.yield) continue;
      if (plant(player, id)) return;
    }
  };
}
