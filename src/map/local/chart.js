import { world } from '../../browser/world-state.js';
import { cv } from '../../layout/elements.js';
import { chartWithinBudget, layoutFor } from './hex-layout.js';
import { reverseSlot } from './oriented-step.js';
import { clamp, mod } from '../../world/geometry.js';

function makeChart(center, orient, z = world.zoom, rect = cv.getBoundingClientRect()) {
  // Guard before building the layout: at low zoom the old chart used millions of
  // JS objects/Map entries and blocked scrolling on large planets.
  if (!chartWithinBudget(rect, z)) return null;
  const g = world.graph,
    l = layoutFor(rect.width || 1, rect.height || 1, z),
    side = world.side;
  const cacheKey = (center * 6 + orient) * 2 + (side === 1 ? 1 : 0);
  if (l.cache.has(cacheKey)) return l.cache.get(cacheKey);
  function finish(result) {
    // Bound retained cell records as well as the number of camera poses.
    const cacheLimit = clamp(Math.floor(18000 / l.cells.length), 2, 18);
    if (l.cache.size >= cacheLimit) l.cache.delete(l.cache.keys().next().value);
    l.cache.set(cacheKey, result);
    return result;
  }
  if (g.deg[center] !== 6 || l.cells.length > g.n - 12) return finish(null);
  const ids = new Int32Array(l.cells.length).fill(-1),
    ors = new Uint8Array(ids.length);
  const queue = new Int32Array(ids.length),
    used = new Set([center]);
  ids[l.origin] = center;
  ors[l.origin] = orient;
  queue[0] = l.origin;
  let tail = 1;
  for (let head = 0; head < tail; head++) {
    const i = queue[head],
      id = ids[i],
      ori = ors[i];
    for (let d = 0; d < 6; d++) {
      const j = l.adj[i * 6 + d];
      if (j < 0) continue;
      const slot = mod(ori + side * d, 6),
        next = g.adj[id * 6 + slot];
      if (g.deg[next] !== 6) return finish(null);
      const no = mod(reverseSlot(g, id, slot) - side * ((d + 3) % 6), 6);
      if (ids[j] !== -1) {
        if (ids[j] !== next || ors[j] !== no) return finish(null);
        continue;
      }
      if (used.has(next)) return finish(null);
      used.add(next);
      ids[j] = next;
      ors[j] = no;
      queue[tail++] = j;
    }
  }
  if (tail !== ids.length) return finish(null);
  const map = new Map();
  for (let i = 0; i < ids.length; i++) {
    const { q, r } = l.cells[i];
    map.set(l.cells[i].key, { q, r, id: ids[i], ori: ors[i] });
  }
  return finish({ center, orient, map, bad: new Set(), limit: { w: l.w, h: l.h } });
}
function viewportValid(chart) {
  return !!chart;
}

export { makeChart, viewportValid };
