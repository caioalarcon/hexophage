import { energyCost, generationEnergy } from '../match/constructive-economy.js';
import { plantFounder } from '../match/founding.js';
import { advancePattern, seedPatternAges } from '../patterns/planar-simulation.js';
import { decodeRLE } from '../patterns/rle.js';
import { patchForStamp } from '../patterns/spherical-patch.js';
import { eastAt } from '../world/geometry.js';
import { nextBotAnchor } from './spiral.js';

// Compare the actual first eight generations of affordable seeds. The bot
// caches their physical history, then reprices it using the live tariffs.
export function createExplorationStrategy(world, game, commitStamp) {
  const candidates = Object.keys(game.gameplay.kit).map(id => {
    const pattern = game.gameplay.patterns.find(p => p.id === id);
    return { pattern, offsets: decodeRLE(pattern.rle) };
  });
  const histories = new Map();
  let threshold;
  function observe(seed) {
    if (threshold !== game.economy.stableAfter) {
      threshold = game.economy.stableAfter;
      histories.clear();
    }
    if (histories.has(seed)) return histories.get(seed);
    let ages = seedPatternAges(seed.pattern);
    const turns = [];
    for (let i = 0; i < 8; i++) {
      const { births, mature, next } = advancePattern(ages, threshold, world.physics);
      turns.push({ births, mature, living: next.size });
      ages = next;
    }
    histories.set(seed, turns);
    return turns;
  }
  return player => {
    if (!player.stamps && plantFounder(world, game, player, commitStamp)) return;
    let affordable = candidates.filter(seed => energyCost(seed.offsets.length, game.economy) <= player.reserve);
    // Unseeded births change the entire background. Small isolated previews
    // do not predict ownership in that field, so explore the playable seeds.
    if (!world.physics.birthsFromVacuum) {
      const scored = affordable.map(seed => {
        let net = 0, living = 0;
        for (const turn of observe(seed)) {
          const {income, upkeep} = generationEnergy(turn.births, turn.mature, game.economy);
          net += income - upkeep;
          living = turn.living;
        }
        return {seed, net: net / seed.offsets.length, living: living / seed.offsets.length};
      });
      const metric = player.pattern === 'income' ? 'net' : 'living';
      const tie = metric === 'net' ? 'living' : 'net';
      scored.sort((a, b) => b[metric] - a[metric] || b[tie] - a[tie]);
      affordable = scored.map(item => item.seed);
    }
    const plan = game.botPlans[player.id - 1];
    for (let attempt = 0; attempt < 32 && affordable.length; attempt++) {
      const center = nextBotAnchor(world.graph, plan);
      if (center < 0) break;
      const direction = eastAt(world.graph, center);
      for (const seed of affordable) {
        const ids = patchForStamp(world, center, direction, seed.offsets, true);
        if (ids && commitStamp(player.id, ids, false)) return;
      }
    }
  };
}
