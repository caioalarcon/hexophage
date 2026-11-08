import { DEFAULT_ECONOMY, generationEnergy } from './constructive-economy.js';

function randomIndex(game, length) {
  let x = game.rngState >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  game.rngState = x >>> 0;
  return Math.floor((game.rngState / 4294967296) * length);
}

export function gameEconomyTick(world, game, removeLive, finishIfDecided) {
  if (!game.players.length || game.initializing || game.ended) return;
  const e = game.economy || DEFAULT_ECONOMY;
  let ages = world.cellAges || (world.cellAges = new Uint8Array(world.graph.n));
  let ageCapacity = 2 ** (8 * ages.BYTES_PER_ELEMENT) - 1;
  // advanceGeneration swaps its buffers: "next" and "nextActive" now hold
  // the exact occupancy immediately before the last physical CA generation.
  const newborn = new Uint32Array(8), naturalDeaths = new Uint32Array(8);
  for (let i = 0; i < world.nextActiveCount; i++) {
    const id = world.nextActive[i], owner = world.nextOwners[id];
    if (!world.cells[id]) {
      ages[id] = 0;
      if (owner >= 1 && owner <= 6) naturalDeaths[owner]++;
    }
  }
  for (let i = 0; i < world.activeCount; i++) {
    const id = world.active[i], owner = world.owners[id];
    if (world.next[id]) {
      const age = (ages[id] || 1) + 1;
      if (age > ageCapacity) {
        // Keep the history when a player raises the threshold during a running match.
        // Only pay for a wider world buffer once an actual survivor needs it.
        const Wider = ages.BYTES_PER_ELEMENT === 1 ? Uint16Array :
          ages.BYTES_PER_ELEMENT === 2 ? Uint32Array : Float64Array;
        world.cellAges = ages = new Wider(ages);
        ageCapacity = 2 ** (8 * ages.BYTES_PER_ELEMENT) - 1;
      }
      ages[id] = age;
    } else {
      ages[id] = 1;
      if (owner >= 1 && owner <= 6) newborn[owner]++;
    }
  }
  for (const p of game.players) {
    p.lastBirths = newborn[p.id];
    p.lastDeaths = naturalDeaths[p.id];
    p.totalBirths = (p.totalBirths || 0) + p.lastBirths;
    p.totalDeaths = (p.totalDeaths || 0) + p.lastDeaths;
    if (p.out) continue;
    let stable = 0;
    for (const id of world.ownerCells[p.id])
      if (ages[id] >= e.stableAfter) stable++;
    const { income, upkeep } = generationEnergy(p.lastBirths, stable, e);
    const balance = p.reserve + income - upkeep;
    p.received += income;
    p.paid += Math.min(upkeep, Math.max(0, p.reserve + income));
    p.lastIncome = income;
    p.lastUpkeep = upkeep;
    p.lastFlow = income - upkeep;
    p.flowAverage = p.flowAverage == null ? p.lastFlow : p.flowAverage * 0.8 + p.lastFlow * 0.2;
    p.lastEroded = 0;
    p.reserve = Math.max(0, balance);
    if (balance < -1e-9) {
      // A lost living cell repays one stamp-cell cost toward the deficit.
      // With a zero-cost slider, one erosion unit repays one energy.
      const count = Math.min(world.ownerCells[p.id].length,
        Math.ceil((-balance - 1e-9) / Math.max(1, e.stampCost)));
      for (let j = 0; j < count; j++) {
        const owned = world.ownerCells[p.id];
        const id = owned[randomIndex(game, owned.length)];
        if (removeLive(id)) {
          ages[id] = 0;
          p.eroded++;
          p.lastEroded++;
        }
      }
    }
    p.stable = 0;
    for (const id of world.ownerCells[p.id]) if (ages[id] >= e.stableAfter) p.stable++;
    if (p.reserve <= 0 && world.ownerCells[p.id].length === 0) p.out = true;
  }
  const alive = game.players.filter(p => !p.out);
  game.average = alive.length
    ? alive.reduce((sum,p) => sum + world.ownerCells[p.id].length, 0) / alive.length
    : 0;
  finishIfDecided(alive);
}
