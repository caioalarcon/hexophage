import { basis, mod, pointOnSphere } from '../world/geometry.js';

// Grow the BFS frontier on demand. Sorting one equal-distance ring by the
// original angle (and vertex ID for ties) gives the same construction order.
export function botSpiralPlan(g, seed) {
  const seen = new Uint8Array(Math.ceil(g.n / 8));
  seen[seed >>> 3] |= 1 << (seed & 7);
  return {
    seen,
    base: basis(pointOnSphere(g, seed)),
    ring: [seed],
    radius: 0,
    order: [],
    index: 0,
  };
}
export function nextBotAnchor(g, plan) {
  const v = g.coords;
  while (plan.index >= plan.order.length) {
    if (!plan.ring.length) return -1;
    const next = [],
      order = [],
      r = plan.radius;
    for (const id of plan.ring) {
      if (g.deg[id] === 6 && g.distance[id] >= 3) {
        const i = id * 3,
          x = v[i],
          y = v[i + 1],
          z = v[i + 2],
          { right, up } = plan.base;
        const angle = mod(
          Math.atan2(
            x * up[0] + y * up[1] + z * up[2],
            x * right[0] + y * right[1] + z * right[2],
          ) -
            r * 0.23,
          Math.PI * 2,
        );
        order.push({ id, angle });
      }
      for (let k = 0; k < g.deg[id]; k++) {
        const n = g.adj[id * 6 + k],
          slot = n >>> 3,
          bit = 1 << (n & 7);
        if (plan.seen[slot] & bit) continue;
        plan.seen[slot] |= bit;
        next.push(n);
      }
    }
    order.sort((x, y) => x.angle - y.angle || x.id - y.id);
    plan.ring = next;
    plan.radius = r + 1;
    plan.order = order;
    plan.index = 0;
  }
  return plan.order[plan.index++].id;
}
