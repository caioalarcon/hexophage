import { eastAt } from '../world/geometry.js';
import { patterns } from '../patterns/catalog.js';
import { decodeRLE } from '../patterns/rle.js';
import { patchForStamp } from '../patterns/spherical-patch.js';
import { botSpiralPlan, nextBotAnchor } from './spiral.js';
import { createFootprintLookup } from './oscillator-footprint.js';
import { energyCost } from '../match/constructive-economy.js';

export function createOscillatorStrategy(world, game, commitStamp) {
  const { botProtectedOffsets } = createFootprintLookup();
  const seeds = new Map();
  return function plantOscillator(player, chosenId = player.pattern) {
    const pat = patterns.callahan.find((x) => x.id === chosenId);
    if (!pat) return;
    if (!seeds.has(chosenId)) seeds.set(chosenId, decodeRLE(pat.rle));
    const offsets = seeds.get(chosenId);
    const protectedOffsets = botProtectedOffsets(pat);
    const plan = game.botPlans[player.id - 1];
    if (!plan || player.reserve + 1e-9 < energyCost(offsets.length, game.economy)) return;
    // A rejected grower site may still fit a compact farm later.
    const spiral = pat.group === 'crescedor'
      ? (plan.growerSpiral ??= botSpiralPlan(world.graph, player.seed)) : plan;
    let tried = 0;
    while (tried++ < 100) {
      const anchor = nextBotAnchor(world.graph, spiral);
      if (anchor === -1) break;
      const orientation = eastAt(world.graph, anchor);
      const ids = patchForStamp(world, anchor, orientation, offsets, true);
      if (!ids) continue;
      // Current cells alone are not enough: P66, for example, sweeps across
      // many more hexagons during its cycle than it occupies at time zero.
      const protectedIds = patchForStamp(world, anchor, orientation, protectedOffsets, false);
      if (!protectedIds) continue;
      let independent = true;
      for (const id of protectedIds) {
        if (game.botReserved[id] === player.id || world.cells[id]) {
          independent = false;
          break;
        }
      }
      if (!independent) continue;
      if (commitStamp(player.id, ids, false)) {
        for (const id of protectedIds) game.botReserved[id] = player.id;
        return true;
      }
    }
    return false;
  };
}
