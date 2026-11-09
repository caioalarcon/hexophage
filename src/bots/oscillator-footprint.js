import { DIR, key } from '../world/geometry.js';
import { advancePattern, patternOffset, seedPatternAges } from '../patterns/planar-simulation.js';

// Guard a full stationary cycle. A stalk has no closing cycle, so protect
// its seed and the corridor swept by its growing tip in the first 32 turns.
export function createFootprintLookup(world) {
  const cache = new Map();
  function botProtectedOffsets(pattern) {
    if (cache.has(pattern.id)) return cache.get(pattern.id);
    const grower = pattern.group === 'crescedor';
    const turns = grower ? 32 : pattern.period ?? Number(pattern.id.slice(3));
    if (!Number.isInteger(turns) || turns < 1 || turns > 256)
      throw Error('Período inválido: ' + pattern.id);
    let ages = seedPatternAges(pattern);
    const initial = new Set(ages.keys()), footprint = new Set(initial);
    for (let gen = 0; gen < turns; gen++) {
      ages = advancePattern(ages, 2, world.physics).next;
      for (const id of ages.keys()) footprint.add(id);
    }
    if (!grower && (ages.size !== initial.size || [...ages.keys()].some(id => !initial.has(id))))
      throw Error('O padrão do bot não é estacionário em ' + turns + ' gerações: ' + pattern.id);
    const guarded = new Set();
    for (const id of footprint) {
      const [q, r] = patternOffset(id);
      guarded.add(key(q, r));
      for (const [dq, dr] of DIR) guarded.add(key(q + dq, r + dr));
    }
    const offsets = [...guarded].map(c => c.split(',').map(Number));
    cache.set(pattern.id, offsets);
    return offsets;
  }
  return { botProtectedOffsets };
}
