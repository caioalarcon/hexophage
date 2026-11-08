function nearestGlobeVertex(g, t, seed) {
  const c = g.coords;
  const dot = (id) => c[3 * id] * t[0] + c[3 * id + 1] * t[1] + c[3 * id + 2] * t[2];
  let id = seed,
    best = dot(id);
  for (;;) {
    let next = id;
    for (let k = 0; k < g.deg[id]; k++) {
      const n = g.adj[6 * id + k],
        d = dot(n);
      if (d > best) {
        best = d;
        next = n;
      }
    }
    if (next === id) return id;
    id = next;
  }
}

export { nearestGlobeVertex };
