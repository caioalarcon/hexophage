export const DIR = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const mod = (a, b) => ((a % b) + b) % b;
export const key = (q, r) => q + ',' + r;
export const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const normal = (a) => {
  const l = Math.hypot(...a) || 1;
  return a.map((v) => v / l);
};

export function basis(look) {
  const right = normal(cross(Math.abs(look[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0], look));
  return { right, up: cross(look, right) };
}

export function pointOnSphere(graph, v) {
  const c = graph.coords;
  return [c[v * 3], c[v * 3 + 1], c[v * 3 + 2]];
}
export function eastAt(g, v) {
  const p = pointOnSphere(g, v),
    right = normal(cross(Math.abs(p[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], p));
  let best = 0,
    score = -Infinity;
  for (let k = 0; k < g.deg[v]; k++) {
    const nb = pointOnSphere(g, g.adj[v * 6 + k]),
      dot = vdot(nb, right);
    if (dot > score) {
      best = k;
      score = dot;
    }
  }
  return best;
}
