import { eastAt } from '../world/geometry.js';
import { estimateEconomicReturn, rankEconomicPatterns } from '../patterns/economic-ranking.js';
import { decodeRLE } from '../patterns/rle.js';
import { patchForStamp } from '../patterns/spherical-patch.js';

// The named profile opener is still available to specialized strategies.
export function plantFounder(world, game, player, commitStamp, patternId = game.gameplay.opening) {
  if (player.stamps || player.out) return false;
  const pattern = game.gameplay.patterns.find(p => p.id === patternId);
  if (!pattern) return false;
  const cells = decodeRLE(pattern.rle);
  if (player.reserve < cells.length * game.economy.stampCost) return false;
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

// Try the same measured, affordable investment that leads the economic atlas.
// The exact graph, price and placement checks remain authoritative at the site.
export function plantSuggestedFounder(world, game, player, commitStamp) {
  if (player.stamps || player.out) return false;
  const { patterns } = game.gameplay;
  for (const p of rankEconomicPatterns(patterns, game.profile.id, game.economy)) {
    const quote = estimateEconomicReturn(game.profile.id, p, game.economy);
    if (quote?.flow > 0 && quote.cost <= player.reserve &&
        plantFounder(world, game, player, commitStamp, p.id)) return true;
  }
  return plantFounder(world, game, player, commitStamp);
}
