// Face interiors are unique. Only the 30 icosahedron edges and 12 vertices
// need shared identifiers, so boundary storage grows with frequency, not area.
function* sphereStages(f) {
  if (!Number.isInteger(f) || f < 1 || f > 4096) throw Error('Frequência de esfera inválida.');
  const t = (1 + Math.sqrt(5)) / 2;
  const bases = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ];
  const faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  const n = 10 * f * f + 2,
    coords = new Float32Array(n * 3),
    adj = new Uint32Array(n * 6),
    deg = new Uint8Array(n);
  const positions = f <= 96 ? new Float64Array(n * 3) : coords;
  const edgeIds = new Int32Array(144 * (f + 1)).fill(-1),
    baseIds = new Int32Array(12).fill(-1);
  const polygons = f <= 96 ? new Float32Array(n * 18) : null,
    backSlot = f <= 96 ? new Uint8Array(n * 6) : null,
    pents = [];
  const edgeKey = (u, v, wv) =>
    u < v ? (u * 12 + v) * (f + 1) + wv : (v * 12 + u) * (f + 1) + f - wv;
  let total = 0;
  function triangle(a, b, c) {
    // Every directed edge occurs exactly once in the outward-facing triangles.
    adj[a * 6 + deg[a]++] = b;
    adj[b * 6 + deg[b]++] = c;
    adj[c * 6 + deg[c]++] = a;
  }
  for (let fi = 0; fi < faces.length; fi++) {
    const [aa, bb, cc] = faces[fi],
      a = bases[aa],
      b = bases[bb],
      c = bases[cc];
    let older = new Uint32Array(f + 1),
      prev = new Uint32Array(f + 1),
      row = new Uint32Array(f + 1);
    for (let i = 0; i <= f; i++) {
      const len = f - i + 1;
      for (let j = 0; j < len; j++) {
        const w = f - i - j;
        let base = -1,
          edge = -1,
          id = -1;
        if (w === f) base = aa;
        else if (i === f) base = bb;
        else if (j === f) base = cc;
        else if (!w) edge = edgeKey(bb, cc, j);
        else if (!i) edge = edgeKey(aa, cc, j);
        else if (!j) edge = edgeKey(aa, bb, i);
        if (base >= 0) id = baseIds[base];
        else if (edge >= 0) id = edgeIds[edge];
        if (id === -1) {
          id = total++;
          if (base >= 0) baseIds[base] = id;
          else if (edge >= 0) edgeIds[edge] = id;
          const wa = w / f,
            wb = i / f,
            wc = j / f;
          const x = wa * a[0] + wb * b[0] + wc * c[0],
            y = wa * a[1] + wb * b[1] + wc * c[1],
            z = wa * a[2] + wb * b[2] + wc * c[2];
          const len = Math.hypot(x, y, z),
            k = id * 3;
          coords[k] = positions[k] = x / len;
          coords[k + 1] = positions[k + 1] = y / len;
          coords[k + 2] = positions[k + 2] = z / len;
        }
        row[j] = id;
      }
      if (i)
        for (let j = 0; j < len; j++) {
          triangle(prev[j], row[j], prev[j + 1]);
          if (j + 1 < len) triangle(row[j], row[j + 1], prev[j + 1]);
        }
      // In a face interior the six triangular lattice directions already give
      // cyclic adjacency. On large planets only shared face boundaries need sorting.
      if (!polygons && i >= 2)
        for (let j = 1; j < len; j++) {
          const k = prev[j] * 6;
          adj[k] = row[j];
          adj[k + 1] = prev[j + 1];
          adj[k + 2] = older[j + 1];
          adj[k + 3] = older[j];
          adj[k + 4] = prev[j - 1];
          adj[k + 5] = row[j - 1];
        }
      const tmp = older;
      older = prev;
      prev = row;
      row = tmp;
    }
    yield Math.round((fi + 1) * 1.25);
  }
  if (total !== n) throw Error('Quantidade de vértices incorreta.');
  const ang = new Float64Array(6),
    boundaries = [];
  if (!polygons) {
    for (const id of baseIds) boundaries.push(id);
    for (const id of edgeIds) if (id >= 0) boundaries.push(id);
    boundaries.sort((a, b) => a - b);
  }
  const sortedCount = polygons ? n : boundaries.length;
  for (let sorted = 0; sorted < sortedCount; sorted++) {
    const v = polygons ? sorted : boundaries[sorted],
      j = 6 * v,
      h = 3 * v,
      d = deg[v],
      px = positions[h],
      py = positions[h + 1],
      pz = positions[h + 2];
    if (d === 5) {
      pents.push(v);
      adj[j + 5] = 0xffffffff;
    } else if (d !== 6) throw Error('Vizinhança incompleta.');
    const polar = Math.abs(py) >= 0.85;
    let ex = polar ? 0 : pz,
      ey = polar ? -pz : 0,
      ez = polar ? py : -px;
    const scale = Math.hypot(ex, ey, ez);
    ex /= scale;
    ey /= scale;
    ez /= scale;
    const nx = py * ez - pz * ey,
      ny = pz * ex - px * ez,
      nz = px * ey - py * ex;
    for (let k = 0; k < d; k++) {
      const id = adj[j + k],
        i = 3 * id,
        x = positions[i],
        y = positions[i + 1],
        z = positions[i + 2];
      const angle = Math.atan2(x * nx + y * ny + z * nz, x * ex + y * ey + z * ez);
      let p = k;
      while (p > 0 && ang[p - 1] > angle) {
        ang[p] = ang[p - 1];
        adj[j + p] = adj[j + p - 1];
        p--;
      }
      ang[p] = angle;
      adj[j + p] = id;
    }
    if (polygons) {
      for (let k = 0; k < d; k++) {
        const i = adj[j + k] * 3,
          b = adj[j + ((k + 1) % d)] * 3,
          s = (j + k) * 3;
        const x = px + positions[i] + positions[b],
          y = py + positions[i + 1] + positions[b + 1],
          z = pz + positions[i + 2] + positions[b + 2];
        const len = Math.hypot(x, y, z);
        polygons[s] = x / len;
        polygons[s + 1] = y / len;
        polygons[s + 2] = z / len;
      }
    }
    if ((sorted & 262143) === 0) yield 25 + Math.floor((35 * sorted) / sortedCount);
  }
  if (pents.length !== 12) throw Error('A esfera precisa de 12 pentágonos.');
  if (backSlot)
    for (let v = 0; v < n; v++) {
      for (let k = 0; k < deg[v]; k++) {
        const a = v * 6 + k,
          u = adj[a];
        if (u <= v) continue;
        let j = 0;
        while (j < deg[u] && adj[u * 6 + j] !== v) j++;
        if (j === deg[u]) throw Error('Aresta sem retorno.');
        backSlot[a] = j;
        backSlot[u * 6 + j] = k;
      }
      if ((v & 262143) === 0) yield 60 + Math.floor((18 * v) / n);
    }
  const distance = new Uint16Array(n).fill(65535),
    nearest = new Uint8Array(n),
    queue = new Uint32Array(n);
  let front = 0,
    back = 0;
  for (let i = 0; i < pents.length; i++) {
    const id = pents[i];
    distance[id] = 0;
    nearest[id] = i;
    queue[back++] = id;
  }
  while (front < back) {
    const u = queue[front++];
    for (let k = 0; k < deg[u]; k++) {
      const v = adj[u * 6 + k];
      if (distance[v] !== 65535) continue;
      distance[v] = distance[u] + 1;
      nearest[v] = nearest[u];
      queue[back++] = v;
    }
    if ((front & 262143) === 0) yield 78 + Math.floor((18 * front) / n);
  }
  let farthest = 0;
  for (let i = 0; i < n; i++) if (distance[i] > distance[farthest]) farthest = i;
  const edges = 3 * n - 6;
  return { n, f, adj, deg, coords, polygons, backSlot, pents, distance, nearest, edges, farthest };
}
function buildSphere(f, onProgress) {
  const stages = sphereStages(f);
  for (let step = stages.next(); ; step = stages.next()) {
    if (step.done) return step.value;
    if (onProgress) onProgress(step.value);
  }
}
function sphereCorner(g, id, k, out, offset = 0) {
  const j = id * 6 + k;
  if (g.polygons) {
    const i = j * 3;
    out[offset] = g.polygons[i];
    out[offset + 1] = g.polygons[i + 1];
    out[offset + 2] = g.polygons[i + 2];
    return out;
  }
  const p = g.coords,
    a = id * 3,
    b = g.adj[j] * 3,
    c = g.adj[id * 6 + ((k + 1) % g.deg[id])] * 3;
  const x = p[a] + p[b] + p[c],
    y = p[a + 1] + p[b + 1] + p[c + 1],
    z = p[a + 2] + p[b + 2] + p[c + 2],
    len = Math.sqrt(x * x + y * y + z * z);
  out[offset] = x / len;
  out[offset + 1] = y / len;
  out[offset + 2] = z / len;
  return out;
}

export { buildSphere, sphereCorner, sphereStages };
