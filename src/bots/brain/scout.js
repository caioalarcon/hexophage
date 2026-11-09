// Constant-size samples from the spherical vertex and per-owner indexes.
// These cheap observations nominate launches; the paired CA simulation prices them.
export const SCOUT_VISITS = 256;

function localCounts(world, site, owner) {
  const { graph, owners, cellAges } = world;
  let kin = 0, strangers = 0, young = 0, mature = 0;
  for (let k = 0; k <= graph.deg[site]; k++) {
    const id = k === graph.deg[site] ? site : graph.adj[6 * site + k];
    if (!owners[id]) continue;
    if (owners[id] !== owner) {
      strangers++;
    } else {
      kin++;
      if (cellAges[id] <= 2) young++;
      else mature++;
    }
  }
  return { kin, strangers, young, mature };
}

export function scoutEmpty(world, player, random) {
  const { graph } = world;
  let target = player.seed, best = -Infinity;
  // Include home for an early opening and geographically independent sites
  // even when the bot has no world cells left.
  for (let i = 0; i < 8; i++) {
    const site = i === 0 ? player.seed : Math.floor(random() * graph.n);
    if (graph.deg[site] !== 6) continue;
    const { kin, strangers } = localCounts(world, site, player.id);
    const score = -8 * (kin + strangers) - 10 * strangers + Math.min(20, graph.distance[site]) / 20 + random() * .1;
    if (score > best) { best = score; target = site; }
  }
  return { kind: 'empty', target, direction: Math.floor(random() * 6) };
}

export function scoutRival(world, game, hunter, random) {
  const { graph, ownerCells } = world;
  const rivals = game.players.filter(p => p !== hunter && !p.out && ownerCells[p.id].length);
  const bestFlow = Math.max(1, ...rivals.map(p => Math.max(0, p.flowAverage ?? 0)));
  let spot, high = -Infinity;
  for (const rival of rivals) {
    const cells = ownerCells[rival.id], recent = game.recentBirthSites?.[rival.id];
    for (let i = 0; i < 3; i++) {
      let site = i === 0 && recent?.length ? recent[Math.floor(random() * recent.length)] : -1;
      if (site < 0 || world.owners[site] !== rival.id) site = cells[Math.floor(random() * cells.length)];
      if (graph.deg[site] !== 6) continue;
      const local = localCounts(world, site, rival.id);
      // Prefer exposed positions on productive colonies; preserve exploration
      // among opponents, fronts, compass approaches and ages.
      const start = Math.floor(random() * 6);
      let facing = -1;
      for (let k = 0; k < 6; k++) {
        const d = (k + start) % 6;
        if (!world.cells[graph.adj[6 * site + d]]) { facing = d; break; }
      }
      if (facing < 0) continue;
      const income = game.economy.policy === 'activity' ? local.young : local.mature;
      const score = random() * 3 + 2 * Math.max(0, rival.flowAverage ?? 0) / bestFlow + income / 3 + local.kin / 8;
      if (score > high) {
        high = score;
        spot = { kind: 'rival', target: site, direction: facing, rivalId: rival.id };
      }
    }
  }
  return spot;
}

// Identity and occupancy in the fixed launch frame, independent of cell age.
// Only a full oriented witness authorizes the eventual purchase.
export function phaseAt(world, spot) {
  const { graph, owners } = world, target = spot.target;
  const degree = graph.deg[target];
  let phase = owners[target];
  for (let i = 0; i < degree; i++) {
    const direction = (spot.direction + i) % degree;
    phase = 8 * phase + owners[graph.adj[6 * target + direction]];
  }
  return phase;
}
