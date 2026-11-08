import { atlasPatterns } from '../patterns/atlas-data.js';
import { decodeRLE } from '../patterns/rle.js';
import { patchForStamp } from '../patterns/spherical-patch.js';

// This glider advances two hexagons along +q every four turns. Launch it
// eight hexagons behind the selected mature enemy cell on that approach.
const glider = decodeRLE(atlasPatterns.find(p => p.id === 'glider').rle)
  .map(([q,r]) => [q - 8, r - 2]);

export function raidMatureCore(world, game, player, commitStamp) {
  const rivals = game.players.filter(p => p !== player && !p.out && p.stable)
    .sort((a,b) => b.stable - a.stable);
  for (const rival of rivals) {
    const cells = world.ownerCells[rival.id];
    // Bounded sampling keeps a raid cheap even against a planet-sized farm.
    const stride = Math.max(1, Math.ceil(cells.length / 8));
    for (let index = world.gen % stride; index < cells.length; index += stride) {
      const target = cells[index];
      if (world.cellAges[target] < game.economy.stableAfter) continue;
      for (let dir = 0; dir < 6; dir++) {
        const ids = patchForStamp(world, target, dir, glider, true);
        if (ids && commitStamp(player.id, ids, false)) return true;
      }
    }
  }
  return false;
}
