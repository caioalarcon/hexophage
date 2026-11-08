function globeWireLines(g) {
  if (!g) return null;
  if (g.wireLines) return g.wireLines;
  const result = new Float32Array(g.edges * 6),
    p = g.polygons,
    adj = g.adj;
  let z = 0;
  for (let id = 0; id < g.n; id++) {
    const d = g.deg[id];
    for (let k = 0; k < d; k++) {
      const nk = (k + 1) % d;
      if (id > adj[id * 6 + nk]) continue;
      const a = (id * 6 + k) * 3,
        b = (id * 6 + nk) * 3;
      result[z++] = p[a];
      result[z++] = p[a + 1];
      result[z++] = p[a + 2];
      result[z++] = p[b];
      result[z++] = p[b + 1];
      result[z++] = p[b + 2];
    }
  }
  if (z !== result.length) throw Error('Malha de linhas incompleta');
  g.wireLines = result;
  return result;
}

export { globeWireLines };
