import { DIR, key } from '../world/geometry.js';
import { decodeRLE } from '../patterns/rle.js';

// A bot oscillator can grow beyond the cells visible at the moment of stamping.
// Project its entire periodic orbit onto the sphere and leave one empty-cell
// guard ring; two separate guard rings cannot overlap unless the structures
// could interact through their immediate neighbor dependencies.
export function createFootprintLookup(world) {
  const botProtectedCache = new Map();
  function botProtectedOffsets(pattern) {
    const cached = botProtectedCache.get(pattern.id);
    if (cached) return cached;
    const period = pattern.period ?? Number(pattern.id.slice(3));
    if (!Number.isInteger(period) || period < 1 || period > 256)
      throw Error('Período inválido: ' + pattern.id);
    const initial = decodeRLE(pattern.rle),
      position = ([q, r]) => key(q, r);
    let alive = new Set(initial.map(position)),
      footprint = new Set(alive);
    const beginning = new Set(alive);
    for (let generation = 0; generation < period; generation++) {
      const candidates = new Set(alive);
      for (const coord of alive) {
        const [q, r] = coord.split(',').map(Number);
        for (const [dq, dr] of DIR) candidates.add(key(q + dq, r + dr));
      }
      const after = new Set();
      for (const coord of candidates) {
        const [q, r] = coord.split(',').map(Number);
        let mask = 0;
        for (let d = 0; d < 6; d++)
          if (alive.has(key(q + DIR[d][0], r + DIR[d][1]))) mask |= 1 << d;
        const survives = alive.has(coord) ? world.callSurv6[mask] : world.callBirth6[mask];
        if (survives) after.add(coord);
      }
      alive = after;
      for (const coord of alive) footprint.add(coord);
    }
    if (alive.size !== beginning.size || [...alive].some((c) => !beginning.has(c)))
      throw Error('O padrão do bot não é estacionário em ' + period + ' gerações: ' + pattern.id);
    const guarded = new Set(footprint);
    for (const coord of footprint) {
      const [q, r] = coord.split(',').map(Number);
      for (const [dq, dr] of DIR) guarded.add(key(q + dq, r + dr));
    }
    const offsets = [...guarded].map((c) => c.split(',').map(Number));
    botProtectedCache.set(pattern.id, offsets);
    return offsets;
  }

  return { botProtectedOffsets };
}
