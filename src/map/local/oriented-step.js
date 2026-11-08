import { mod } from '../../world/geometry.js';

// Small debug spheres cache the reverse edge. For large spheres, find it on
// demand (at most six comparisons), saving six bytes per planet cell.
function reverseSlot(g, id, slot) {
  if (g.backSlot) return g.backSlot[id * 6 + slot];
  const to = g.adj[id * 6 + slot],
    base = to * 6;
  for (let k = 0; k < g.deg[to]; k++) if (g.adj[base + k] === id) return k;
  throw Error('Aresta sem retorno');
}

function stepPose(g, id, ori, d, side) {
  const slot = mod(ori + side * d, 6),
    next = g.adj[id * 6 + slot];
  if (g.deg[next] !== 6) return null;
  return { id: next, ori: mod(reverseSlot(g, id, slot) - side * ((d + 3) % 6), 6) };
}

export { reverseSlot, stepPose };
