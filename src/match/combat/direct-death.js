// Use the occupancy immediately before the physical generation. Erosion and
// mixed-parent neutral cells never get credit as rival factions.
const population = Uint8Array.from({ length: 128 }, (_, mask) => {
  let count = 0;
  for (; mask; mask &= mask - 1) count++;
  return count;
});

// The caller has already established that a player-owned cell died naturally.
export function recordCombatDeath(world, id, victim, claims) {
  const { adj, deg } = world.graph, degree = deg[id], before = world.nextOwners;
  const survive = world.physics.tables[degree][1];
  let rivals = 0, background = 0, occupied = 0;
  for (let k = 0; k < degree; k++) {
    const owner = before[adj[id * 6 + k]];
    if (owner) occupied |= 1 << k;
    if (owner === victim || owner === 7) background |= 1 << k;
    else if (owner) rivals |= 1 << owner;
  }
  if (!rivals || !survive[background] || survive[occupied]) return;

  let credited = rivals;
  if (population[rivals] > 1) {
    const masks = new Uint8Array(7);
    for (let k = 0; k < degree; k++) {
      const owner = before[adj[id * 6 + k]];
      if (rivals & (1 << owner)) masks[owner] |= 1 << k;
    }
    // Restore groups of rival owners onto the surviving background. Credit
    // each participant in any minimal lethal group once, excluding bystanders.
    credited = 0;
    const lethal = [];
    for (let group = 1; group <= rivals; group++) {
      if ((group & rivals) !== group || lethal.some(s => (s & group) === s)) continue;
      let mask = background;
      for (let owner = 1; owner <= 6; owner++) if (group & (1 << owner)) mask |= masks[owner];
      if (!survive[mask]) {
        lethal.push(group);
        credited |= group;
      }
    }
  }
  if (!claims[victim]) claims[victim] = new Float64Array(7);
  for (let owner = 1; owner <= 6; owner++) {
    if (credited & (1 << owner)) claims[victim][owner] += 1 / population[credited];
  }
}
