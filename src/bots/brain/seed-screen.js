import { advancePattern, patternOffset, patternSite } from '../../patterns/planar-simulation.js';
import { generationEnergy } from '../../match/constructive-economy.js';

const horizon = 18;
const persistentAge = horizon / 2;

function centroid(ages) {
  let q = 0, r = 0;
  for (const id of ages.keys()) {
    const [x, y] = patternOffset(id);
    q += x; r += y;
  }
  return ages.size ? [q / ages.size, r / ages.size] : [0, 0];
}

// A physics measurement has no owner or reward. Bots can reuse the trajectory
// of a card they independently request, then price it against their own colony.
export function createSeedScreen(physics) {
  const measured = new Map();
  let job;
  return {
    result: stamp => measured.get(stamp),
    run(stamp, threshold, allowance) {
      if (measured.has(stamp)) return { visits: 0, done: true };
      if (job?.stamp !== stamp) {
        const ages = new Map(stamp.offsets.map(([q, r]) => [patternSite(q, r), 1]));
        job = { stamp, ages, start: centroid(ages), turns: 0, births: 0, mature: 0, midCore: 0, reach: stamp.radius, history: [] };
      }
      let visits = 0;
      while (job.turns < horizon) {
        // Bound neighbourhood accumulation plus candidate evaluation. Abort
        // unusually large growth instead of blocking the main simulation.
        const cost = Math.max(1, 13 * job.ages.size);
        if (cost > 2400) { measured.set(stamp, null); job = null; return { visits, done: true }; }
        if (visits + cost > allowance) return { visits, done: false };
        const turn = advancePattern(job.ages, threshold, physics);
        visits += cost;
        job.ages = turn.next;
        job.turns++;
        let pending = 0, core = 0;
        for (const [id, age] of job.ages) {
          const [q, r] = patternOffset(id);
          job.reach = Math.max(job.reach, Math.abs(q), Math.abs(r), Math.abs(q + r));
          if (age >= persistentAge && age < threshold) pending++;
          if (age > job.turns) core++;
        }
        job.history.push({ births: turn.births, mature: turn.mature, pending, core });
        if (job.turns === persistentAge) job.midCore = pending + turn.mature;
        if (job.turns > horizon - 8) {
          job.births += turn.births;
          job.mature += turn.mature;
        }
      }
      const end = centroid(job.ages);
      let lateCore = 0;
      for (const age of job.ages.values()) if (age >= persistentAge) lateCore++;
      measured.set(stamp, { initial: stamp.offsets.length, live: job.ages.size, turns: horizon,
        births: job.births / 8, mature: job.mature / 8, midCore: job.midCore, lateCore,
        history: job.history, reach: job.reach,
        drift: [end[0] - job.start[0], end[1] - job.start[1]] });
      job = null;
      return { visits, done: true };
    },
  };
}

export function expectedSeedFlow(measure, player, economy) {
  if (!measure?.live) return -Infinity;
  let mature = measure.mature;
  if (economy.stableAfter > measure.turns) {
    // A persistent, expanding cohort can earn (or cost) money after the
    // maturity threshold. A flat or flickering seed gets no growth credit.
    const trend = measure.live > measure.initial * 1.2
      ? Math.max(0, (measure.lateCore - measure.midCore) / persistentAge) : 0;
    mature = measure.lateCore + trend * Math.min(512, 2 * economy.stableAfter);
  }
  return marginalSeedFlow(measure.births, mature, player, economy);
}

export function marginalSeedFlow(births, mature, player, economy) {
  const before = generationEnergy(player.lastBirths, player.stable, economy);
  const after = generationEnergy(player.lastBirths + births, player.stable + mature, economy);
  return after.income - after.upkeep - (before.income - before.upkeep);
}

// Exact local repricing for a certified empty, regular hexagonal patch. Every
// live site stayed inside its halo for this entire trace. Exterior production
// follows the same frozen boundary assumption as the paired graph simulator.
export function quoteEmptySeed(measure, player, economy, audit = false) {
  const cost = measure.initial * economy.stampCost;
  const base = generationEnergy(player.lastBirths, player.stable, economy);
  const baseFlow = base.income - base.upkeep;
  let cash = -cost, flow = 0, mid = 0, deferred = 0;
  for (const [index, step] of measure.history.entries()) {
    const births = player.lastBirths + step.births, mature = player.stable + step.mature;
    const quote = generationEnergy(births, mature, economy);
    const delta = quote.income - quote.upkeep - baseFlow;
    cash += delta;
    if (player.reserve + (index + 1) * baseFlow + cash < -1e-9 ||
        player.reserve + (index + 1) * baseFlow < -1e-9) return null;
    if (index >= horizon - 8) flow += delta / 8;
    if (index === persistentAge - 1 || index === horizon - 1) {
      const later = generationEnergy(births, mature + step.pending, economy);
      deferred = later.income - later.upkeep - quote.income + quote.upkeep;
      if (index === persistentAge - 1) mid = deferred;
    }
  }
  return { cost, added: measure.initial, turns: horizon, boundary: false, ownUnfunded: false,
    ownCash: cash, ownFlow: flow, ownCells: measure.live, ownCore: measure.history.at(-1).core,
    ...(audit ? {forecast:{radius:measure.reach+2, own:{
      tailAction:baseFlow+flow,tailHold:baseFlow,actionOperating:baseFlow*horizon+cash+cost,holdOperating:baseFlow*horizon,
      action:{births:measure.history.at(-1).births, mature:measure.history.at(-1).mature, cells:measure.live},
      hold:{births:0,mature:0,cells:0}, outsideBirths:player.lastBirths, outsideMature:player.stable}, rival:null}} : {}),
    ownDeferredMid: mid, ownDeferredFlow: deferred, ownDeferredTrend: (deferred - mid) / persistentAge,
    rivalCash: 0, rivalFlow: 0, rivalCells: 0, rivalDeferredMid: 0, rivalDeferredFlow: 0, rivalDeferredTrend: 0 };
}
