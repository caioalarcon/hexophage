import { atlasPatterns } from '../patterns/atlas-data.js';
import { advancePattern, seedPatternAges } from '../patterns/cycle-economy.js';
import { decodeRLE } from '../patterns/rle.js';
import { patchForStamp } from '../patterns/spherical-patch.js';

const weapons = new Map();
// Place the target in the measured firing lane. The P4 travels along +q.
// The two emitters fire along −r at different offsets from their RLE origins.
const aim = {glider: [-8, -2], gun20: [-3, 16], gun42: [-13, 16]};

function weapon(id) {
  if (weapons.has(id)) return weapons.get(id);
  const pattern = atlasPatterns.find(p => p.id === id);
  const [dq, dr] = aim[id];
  const offsets = decodeRLE(pattern.rle).map(([q,r]) => [q+dq,r+dr]);
  const period = id === 'glider' ? 4 : Number(id.slice(3));
  let ages = seedPatternAges(pattern), births = 0, firstCycleBirths = 0;
  // Finance the first 256 generations even when the first shots miss.
  for (let g = 0; g < 256; g++) {
    const turn = advancePattern(ages, 2);
    births += turn.births;
    if (g < period) firstCycleBirths += turn.births;
    ages = turn.next;
  }
  const profile = {offsets, births, period, firstCycleBirths};
  weapons.set(id, profile);
  return profile;
}

export function raidBudget(economy, id) {
  const w = weapon(id);
  return w.offsets.length * economy.stampCost + w.births * economy.birthCost;
}

// A firing lane aimed 16 hexes from the target has roughly 32 generations
// of travel. Every launched P4 consumes five births per generation in flight.
export function expectedGunExpense(economy, id) {
  const {period, firstCycleBirths} = weapon(id);
  return (firstCycleBirths + 32 * 5) / period * economy.birthCost;
}

export function raidMatureCore(world, game, player, commitStamp, id = 'glider') {
  const rivals = game.players.filter(p => p !== player && !p.out && p.stable)
    .sort((a,b) => b.stable - a.stable);
  const {offsets} = weapon(id);
  for (const rival of rivals) {
    const cells = world.ownerCells[rival.id];
    // Strike the active front of an earning colony first, then its mature core.
    const targetIds = [];
    for (const cell of cells) {
      if (world.cellAges[cell] === 1) targetIds.push(cell);
      if (targetIds.length === 8) break;
    }
    const stride = Math.max(1, Math.ceil(cells.length / 8));
    for (let i = world.gen % stride; i < cells.length; i += stride)
      if (world.cellAges[cells[i]] >= game.economy.stableAfter) targetIds.push(cells[i]);
    for (const target of targetIds) {
      for (let dir = 0; dir < 6; dir++) {
        const ids = patchForStamp(world, target, dir, offsets, true);
        if (ids && commitStamp(player.id, ids, false)) return true;
      }
    }
  }
  return false;
}
