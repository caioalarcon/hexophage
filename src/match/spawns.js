export function sphereSpawns(g) {
  const n = g.n,
    c = g.coords,
    cut = Math.max(8, Math.floor(g.f * 0.12)),
    picks = [g.farthest],
    separation = new Float64Array(n);
  // Track each candidate's distance to its nearest selected seed. A new seed
  // adds exactly one dot product per candidate per pass.
  for (let k = 1; k < 6; k++) {
    const anchor = 3 * picks[k - 1],
      x = c[anchor],
      y = c[anchor + 1],
      z = c[anchor + 2];
    let best = -1,
      score = -Infinity;
    for (let id = 0, j = 0; id < n; id++, j += 3) {
      const distance = g.distance[id];
      if (distance < cut) continue;
      const d = 1 - (c[j] * x + c[j + 1] * y + c[j + 2] * z);
      const min = k === 1 || d < separation[id] ? d : separation[id];
      separation[id] = min;
      const value = min + distance * 0.000002;
      if (value > score) {
        score = value;
        best = id;
      }
    }
    if (best < 0) throw Error('Não foi possível distribuir seis jogadores na esfera');
    picks.push(best);
  }
  return picks;
}
