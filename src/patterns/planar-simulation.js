import { evaluateCell } from '../simulation/cell-fate.js';
import { DIR } from '../world/geometry.js';
import { decodeRLE } from './rle.js';

// The full observation horizon is at most 25,200 hexes in each direction.
const stride = 65536;
const adjacent = DIR.map(([q, r]) => q * stride + r);

export function patternSite(q, r) { return q * stride + r; }

export function patternOffset(id) {
  const q = Math.round(id / stride);
  return [q, id - q * stride];
}

export function seedPatternAges(pattern) {
  return new Map(decodeRLE(pattern.rle).map(([q, r]) => [patternSite(q, r), 1]));
}

// A B0 rule changes infinitely many sites even with an empty seed. Use an
// explicit finite torus for its preview and keep the seed owner's ledger
// separate from spontaneous, neutral matter. Both views use this same domain.
const torusByFrame = new WeakMap();

function makeTorus(ages) {
  let reach = 0;
  for (const id of ages.keys())
    for (const coordinate of patternOffset(id)) reach = Math.max(reach, Math.abs(coordinate));
  const side = Math.max(64, 2 * reach + 4);
  const n = side * side, half = side / 2;
  const graph = { n, adj: new Uint32Array(n * 6), deg: new Uint8Array(n).fill(6) };
  const keys = new Float64Array(n);
  for (let q = 0; q < side; q++) for (let r = 0; r < side; r++) {
    const id = q * side + r;
    keys[id] = (q - half) * stride + r - half;
    for (let k = 0; k < 6; k++) {
      const [dq, dr] = DIR[k];
      graph.adj[id * 6 + k] = ((q + dq + side) % side) * side + (r + dr + side) % side;
    }
  }
  return { graph, keys, cells: new Uint8Array(n), owners: new Uint8Array(n) };
}

function advanceTorus(ages, threshold, physics) {
  const torus = torusByFrame.get(ages) ?? makeTorus(ages);
  const { keys, cells, owners } = torus;
  for (let i = 0; i < keys.length; i++) {
    const age = ages.get(keys[i]) || 0;
    cells[i] = Number(age !== 0);
    owners[i] = age > 0 ? 1 : age < 0 ? 7 : 0;
  }
  const fate = evaluateCell({ ...torus, physics });
  const next = new Map();
  let births = 0, mature = 0;
  for (let i = 0; i < keys.length; i++) {
    const owner = fate(i);
    if (!owner) continue;
    const id = keys[i], age = Math.abs(ages.get(id) || 0) + 1;
    next.set(id, owner === 1 ? age : -age);
    if (owner !== 1) continue;
    if (age === 1) births++;
    if (age >= threshold) mature++;
  }
  torusByFrame.set(next, torus);
  return { next, births, mature };
}

export function advancePattern(ages, threshold, physics) {
  const [birth, survive] = physics.tables[6];
  if (birth[0]) return advanceTorus(ages, threshold, physics);
  const masks = new Map();
  for (const id of ages.keys()) {
    // A live site with zero neighbours still needs evaluation under S0.
    if (survive[0] && !masks.has(id)) masks.set(id, 0);
    for (let k = 0; k < adjacent.length; k++) {
      const target = id - adjacent[k];
      masks.set(target, (masks.get(target) || 0) | (1 << k));
    }
  }
  const next = new Map();
  let births = 0, mature = 0;
  for (const [id, mask] of masks) {
    const age = ages.get(id) || 0;
    if (!(age ? survive : birth)[mask]) continue;
    next.set(id, age + 1);
    if (age === 0) births++;
    if (age + 1 >= threshold) mature++;
  }
  return { next, births, mature };
}
