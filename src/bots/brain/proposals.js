import { decodeRLE } from '../../patterns/rle.js';
import { patchForStamp } from '../../patterns/spherical-patch.js';

// Keep the centre of a stamp near its target, regardless of its RLE origin.
export function stampCatalog(patterns) {
  const catalog = [];
  const seen = new Set();
  for (const p of [...patterns].sort((a, b) => a.id.localeCompare(b.id, 'en'))) {
    if (seen.has(p.rle)) continue;
    seen.add(p.rle);
    const points = decodeRLE(p.rle);
    if (!points.length) continue;
    const q = Math.round(points.reduce((sum, v) => sum + v[0], 0) / points.length);
    const r = Math.round(points.reduce((sum, v) => sum + v[1], 0) / points.length);
    const offsets = points.map(([x, y]) => [x - q, y - r]);
    const radius = Math.max(...offsets.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y), Math.abs(x + y))));
    catalog.push({ id: p.id, offsets, radius });
  }
  return catalog;
}

// Advance along a geodesic, transporting the heading at each hexagon.
function walk(graph, site, direction, distance) {
  for (let i = 0; i < distance; i++) {
    if (graph.deg[site] !== 6) return null;
    const next = graph.adj[site * 6 + direction];
    if (graph.deg[next] !== 6) return null;
    let back = 0;
    while (graph.adj[next * 6 + back] !== site) back++;
    direction = (back + 3) % 6;
    site = next;
  }
  return { site, direction };
}

// A small, oriented fingerprint of the actual front: owner and age of the
// anchor and six neighbours. Rotating the front and the heading preserves it.
export function signature(world, owner, spot) {
  if (spot.kind === 'empty') return 'empty';
  const g = world.graph, site = spot.target;
  const encode = id => !world.cells[id] ? '0' : world.owners[id] === owner ? '1' :
    world.owners[id] === 7 ? '2' : world.cellAges[id] <= 2 ? '3' : '4';
  let word = encode(site);
  for (let i = 0; i < g.deg[site]; i++)
    word += encode(g.adj[site * 6 + (i + spot.direction) % g.deg[site]]);
  return spot.kind + '/' + word;
}

function sampleFront(world, cells, random) {
  let target = cells[Math.floor(random() * cells.length)];
  for (let i = 0; i < 6; i++) {
    const candidate = cells[Math.floor(random() * cells.length)];
    if (world.cellAges[candidate] < world.cellAges[target]) target = candidate;
  }
  return target;
}

export function selectSpot(world, game, player, random) {
  const rivals = game.players.filter(p => !p.out && p !== player && world.ownerCells[p.id].length);
  const own = world.ownerCells[player.id];
  const direction = Math.floor(random() * 6);
  if (rivals.length && player.stamps && random() < 0.55) {
    const rival = rivals[Math.floor(random() * rivals.length)];
    // In a large colony most cells may be old. Reuse the small snapshot of
    // actual births to find the advancing edge without walking the planet.
    const sites = game.recentBirthSites?.[rival.id];
    if (sites && random() < 0.75) {
      const start = Math.floor(random() * sites.length);
      for (let i = 0; i < sites.length; i++) {
        const target = sites[(start + i) % sites.length];
        if (target < 0 || world.owners[target] !== rival.id || world.cellAges[target] > 8) continue;
        if (world.graph.deg[target] !== 6) continue;
        for (let k = 0; k < 6; k++) {
          const facing = (direction + k) % 6, offset = target * 6;
          const ahead = world.graph.adj[offset + facing];
          const behind = world.graph.adj[offset + (facing + 3) % 6];
          if (!world.cells[ahead] && world.owners[behind] === rival.id)
            return { kind: 'rival', target, direction: facing };
        }
      }
    }
    return { kind: 'rival', target: sampleFront(world, world.ownerCells[rival.id], random), direction };
  }
  if (own.length && random() < 0.7)
    return { kind: 'own', target: sampleFront(world, own, random), direction };
  return { kind: 'empty', target: player.seed, direction };
}

export function placement(world, spot, stamp, turn, distance) {
  const pose = walk(world.graph, spot.target, spot.direction, distance);
  if (!pose) return null;
  const ids = patchForStamp(world, pose.site, (pose.direction + turn) % 6, stamp.offsets);
  return ids && { ids, center: pose.site, heading: pose.direction };
}

const disks = new Map();
function disk(radius) {
  if (!disks.has(radius)) {
    const offsets = [];
    for (let q = -radius; q <= radius; q++)
      for (let r = Math.max(-radius, -q-radius); r <= Math.min(radius, -q+radius); r++)
        offsets.push([q,r]);
    disks.set(radius, offsets);
  }
  return disks.get(radius);
}

const symmetricRules = new WeakMap();
function isotropic(physics) {
  if (!symmetricRules.has(physics)) {
    let invariant = true;
    for (const degree of [5,6]) for (const table of physics.tables[degree])
      for (let mask = 0; mask < table.length; mask++)
        invariant &&= table[mask] === table[((mask << 1) & (table.length-1)) | (mask >> (degree-1))];
    symmetricRules.set(physics, invariant);
  }
  return symmetricRules.get(physics);
}

// Only ages that can mature during this lookahead need to match exactly.
// The replay requires the *whole* oriented graph disk, including the halo.
function fingerprint(world, ids, threshold, horizon) {
  return ids.map(id => {
    const owner = world.owners[id], age = world.cellAges[id];
    if (!owner) return 0;
    const stage = age >= threshold ? 0 : age === 1 ? 1 :
      age + horizon < threshold ? 2 : 3 + threshold - age;
    return 8 * stage + owner;
  });
}

export const MAX_EMPTY_PATCH_SCAN = 2048;

export function emptyHexPatch(world, position, radius, turns = 0) {
  if (radius > 20 || !isotropic(world.physics) || world.physics.birthsFromVacuum) return false;
  if (world.physics.growthThreshold && turns && world.activeCount) {
    // The planar trace's radius already includes a two-cell moat. A remote
    // lineage can approach it at most one graph edge per tick. For this
    // radially projected icosahedron, every chord is shorter than 2/f:
    // its pre-projection edge is 2/f and every face is >1 from the origin.
    // Reject the shortcut if that conservative distance bound cannot prove
    // isolation; the paired graph simulation remains available.
    const {coords, f} = world.graph;
    if (!coords || !f || world.activeCount > MAX_EMPTY_PATCH_SCAN) return false;
    const reach = 2 * (radius + turns) / f + 1e-6;
    const c = position.center * 3;
    for (let i = 0; i < world.activeCount; i++) {
      const s = world.active[i] * 3;
      const x = coords[c] - coords[s], y = coords[c+1] - coords[s+1], z = coords[c+2] - coords[s+2];
      if (x*x + y*y + z*z <= reach*reach) return false;
    }
  }
  const ids = patchForStamp(world, position.center, position.heading, disk(radius));
  return !!ids && ids.every(id => world.cells[id] === 0);
}

export function witness(world, position, radius, threshold, horizon) {
  const offsets = disk(radius);
  const projected = !world.physics.siteDependentBirths && isotropic(world.physics) && patchForStamp(world, position.center, position.heading, offsets);
  let ids = projected;
  if (!ids) {
    // Site-based ties, anisotropic physics and pentagon defects are anchored to this
    // graph. Copy the absolute neighbourhood for revalidation at its own site.
    ids = [position.center];
    const seen = new Set(ids);
    let start = 0;
    for (let r = 0; r < radius; r++) {
      const end = ids.length;
      for (let i = start; i < end; i++) for (let k = 0; k < world.graph.deg[ids[i]]; k++) {
        const next = world.graph.adj[ids[i] * 6 + k];
        if (!seen.has(next)) { seen.add(next); ids.push(next); }
      }
      start = end;
    }
  }
  return { center: position.center, heading: position.heading, ids, offsets: projected ? offsets : null,
    threshold, horizon, cells: fingerprint(world, ids, threshold, horizon) };
}

export function recognizes(world, position, saved) {
  if (!saved) return false;
  const samePose = position.center === saved.center && position.heading === saved.heading;
  const ids = samePose ? saved.ids :
    saved.offsets && patchForStamp(world, position.center, position.heading, saved.offsets);
  if (!ids) return false;
  const cells = fingerprint(world, ids, saved.threshold, saved.horizon);
  return cells.every((value, i) => value === saved.cells[i]);
}

export function relocate(world, trial) {
  const { player, spot, brain, action, distance, context, saved, rivalId } = trial;
  if (!saved?.offsets || !world.ownerCells[rivalId]?.length) return null;
  const cells = world.ownerCells[rivalId], graph = world.graph;
  const targets = new Set([spot.target]);
  // Most translations are local. For a front that has travelled farther,
  // sample a fixed number of living cells of its owner, independent of F.
  for (const id of [...targets]) for (let k = 0; k < graph.deg[id]; k++) {
    const neighbor = graph.adj[id * 6 + k];
    targets.add(neighbor);
    for (let d = 0; d < graph.deg[neighbor]; d++) targets.add(graph.adj[neighbor * 6 + d]);
  }
  for (let i = 0; i < 12; i++) targets.add(sampleFront(world, cells, brain.random));
  let checks = 0;
  for (const target of targets) {
    if (world.owners[target] !== rivalId) continue;
    for (let direction = 0; direction < graph.deg[target]; direction++) {
      if (signature(world, player.id, { kind: 'rival', target, direction }) !== context) continue;
      const pose = placement(world, { target, direction }, action.stamp, action.turn, distance);
      if (pose && recognizes(world, pose, saved)) return { ...pose, target, direction };
      if (++checks >= 4) return null;
    }
  }
  return null;
}
