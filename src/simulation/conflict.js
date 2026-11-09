// Occupancy is decided first by the selected automaton. These alternatives
// decide whether a mixed birth has a player ancestor or is vetoed.
export const DEFAULT_CONFLICT = 'lineage';
export const conflictPolicies = Object.freeze({
  lineage: 'Maioria · herdar de um time',
  legacy: 'Empate neutro · original',
  block: 'Bloquear nascimento misto',
});

// A fixed permutation of the 32-bit integers. For a given destination all
// distinct parents get different ranks, independent of their team or ring
// index. Local bot worlds supply the original vertex IDs too.
function mix(x) {
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

function lineageOwner(owners, adj, offset, degree, mask, counts, globalIds) {
  let first = 0, mixed = false;
  for (let k = 0; k < degree; k++) {
    if (!(mask & (1 << k))) continue;
    const owner = owners[adj[offset + k]];
    if (owner === 7) continue;
    if (first && first !== owner) { mixed = true; break; }
    first = owner;
  }
  if (!mixed) return first || 7;

  counts.fill(0);
  let most = 0;
  for (let k = 0; k < degree; k++) {
    if (!(mask & (1 << k))) continue;
    const owner = owners[adj[offset + k]];
    if (owner !== 7) most = Math.max(most, ++counts[owner]);
  }
  const center = offset / 6;
  const salt = mix(globalIds ? globalIds[center] : center);
  let best = -1, winner = 0;
  for (let k = 0; k < degree; k++) {
    if (!(mask & (1 << k))) continue;
    const parent = adj[offset + k], owner = owners[parent];
    if (counts[owner] !== most) continue;
    const rank = mix((globalIds ? globalIds[parent] : parent) ^ salt);
    if (rank > best) { best = rank; winner = owner; }
  }
  return winner;
}

function blockMixedBirth(owners, adj, offset, degree, mask) {
  let first = 0;
  for (let k = 0; k < degree; k++) {
    if (!(mask & (1 << k))) continue;
    const owner = owners[adj[offset + k]];
    if (owner === 7) continue;
    if (first && first !== owner) return 0;
    first = owner;
  }
  return first || 7;
}

export function withConflict(physics, id) {
  if (!Object.hasOwn(conflictPolicies, id)) throw new RangeError('Conflito desconhecido: ' + id);
  const base = physics.basePhysics ?? physics;
  if (id === 'legacy') return base;
  return { ...base, basePhysics: base, siteDependentBirths: id === 'lineage',
    birthOwner: id === 'lineage' ? lineageOwner : blockMixedBirth };
}
