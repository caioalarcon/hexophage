import { world } from '../../browser/world-state.js';
import { reverseSlot } from '../local/oriented-step.js';

// For dense tiles without visible internal strokes, fill the exact union of
// adjacent same-owner hexes. Include the oppositely wound loops around holes.
function liveTileContours(a, t) {
  const cache = a.contours;
  if (cache.has(t)) return cache.get(t);
  const g = a.graph,
    owned = world.owners,
    ids = [],
    slot = new Map();
  for (let j = a.heads[t]; j; j = a.links[j - 1]) {
    const id = world.active[j - 1];
    slot.set(id, ids.length);
    ids.push(id);
  }
  const boundary = new Uint8Array(ids.length);
  let edges = 0;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i],
      o = owned[id];
    let mask = 0;
    for (let d = 0; d < g.deg[id]; d++) {
      const n = g.adj[id * 6 + d];
      if (owned[n] === o && slot.has(n)) continue;
      mask |= 1 << d;
      edges++;
    }
    boundary[i] = mask;
  }
  let rings = null;
  if (edges < ids.length * 2.5) {
    rings = [];
    for (let i = 0; i < ids.length; i++) {
      while (boundary[i]) {
        const start = ids[i],
          s = 31 - Math.clz32(boundary[i]),
          owner = owned[start],
          corners = [];
        let id = start,
          d = s;
        do {
          const idx = slot.get(id),
            side = id * 6 + d;
          boundary[idx] &= ~(1 << d);
          // Edge d ends at the triangle (id, neighbor[d], neighbor[d+1]).
          corners.push(side);
          const next = (d + 1) % g.deg[id],
            n = g.adj[id * 6 + next];
          if (owned[n] === owner && slot.has(n)) {
            d = (reverseSlot(g, id, next) + 1) % g.deg[n];
            id = n;
          } else d = next;
        } while (id !== start || d !== s);
        rings.push({ owner, corners: Uint32Array.from(corners) });
      }
    }
  }
  // Limit retained contours independently of planet resolution.
  // Stop admitting tiles at the budget instead of evicting on every full-map sweep.
  if (cache.size < 8192 && a.contourEdges + edges <= 262144) {
    cache.set(t, rings);
    if (rings) a.contourEdges += edges;
  }
  return rings;
}

export { liveTileContours };
