import { eastAt } from '../world/geometry.js';
import { atlasPatterns } from '../patterns/atlas-data.js';
import { decodeRLE } from '../patterns/rle.js';
import { patchForStamp } from '../patterns/spherical-patch.js';

export const founderId = 'stalk';
const cells = decodeRLE(atlasPatterns.find(p => p.id === founderId).rle);

// Use the same legal, paid opening for the human and the five bots.
export function plantFounder(world, game, player, commitStamp) {
  if (player.stamps || player.out || player.reserve < cells.length * game.economy.stampCost) return false;
  const graph = world.graph;
  const neighbors = graph.adj.subarray(6 * player.seed, 6 * player.seed + graph.deg[player.seed]);
  for (const center of [player.seed, ...neighbors]) {
    const east = eastAt(graph, center);
    for (let turn = 0; turn < 6; turn++) {
      const ids = patchForStamp(world, center, (east + turn) % 6, cells, true);
      if (ids && commitStamp(player.id, ids, false)) return true;
    }
  }
  return false;
}
