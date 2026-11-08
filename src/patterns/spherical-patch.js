import { DIR, mod } from '../world/geometry.js';

const stampStencils = new WeakMap();
function stampStencil(offsets) {
  let stencil = stampStencils.get(offsets);
  if (stencil) return stencil;
  let bound = 2;
  for (const [q, r] of offsets)
    bound = Math.max(bound, 2 + Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)));
  const side = 2 * bound + 1,
    area = side * side,
    origin = bound * (side + 1);
  const slot = (q, r) => origin + q + r * side,
    neighbors = new Int32Array(6 * area).fill(-1);
  for (let r = -bound; r <= bound; r++)
    for (let q = -bound; q <= bound; q++) {
      if (Math.abs(q + r) > bound) continue;
      for (let d = 0; d < 6; d++) {
        const nq = q + DIR[d][0],
          nr = r + DIR[d][1];
        if (Math.max(Math.abs(nq), Math.abs(nr), Math.abs(nq + nr)) <= bound)
          neighbors[slot(q, r) * 6 + d] = slot(nq, nr);
      }
    }
  const wanted = offsets.map(([q, r]) => slot(q, r)),
    needed = new Uint8Array(area);
  for (const k of wanted) needed[k] = 1;
  stencil = {
    origin,
    wanted,
    needed,
    neighbors,
    id: new Int32Array(area),
    ori: new Int8Array(area),
    bad: new Uint8Array(area),
    queue: new Int32Array(area),
  };
  stampStencils.set(offsets, stencil);
  return stencil;
}
function botSpaceTaken(world, v) {
  if (world.cells[v]) return true;
  const g = world.graph;
  for (let d = 0; d < g.deg[v]; d++) if (world.cells[g.adj[v * 6 + d]]) return true;
  return false;
}
export function patchForStamp(world, center, orientation, offsets, requireClear = false) {
  const g = world.graph;
  if (!offsets.length || g.deg[center] !== 6) return null;
  const { origin, wanted, needed, neighbors, id, ori, bad, queue } = stampStencil(offsets);
  if (requireClear && needed[origin] && botSpaceTaken(world, center)) return null;
  id.fill(-1);
  bad.fill(0);
  id[origin] = center;
  ori[origin] = orientation;
  const reverse = new Map([[center, origin]]);
  queue[0] = origin;
  let tail = 1;
  for (let head = 0; head < tail; head++) {
    const k = queue[head],
      v = id[k];
    for (let d = 0; d < 6; d++) {
      const nk = neighbors[k * 6 + d];
      if (nk < 0) continue;
      const nv = g.adj[v * 6 + ((ori[k] + d) % 6)];
      if (g.deg[nv] !== 6) {
        bad[nk] = 1;
        continue;
      }
      let back = 0;
      while (g.adj[nv * 6 + back] !== v) back++;
      const no = mod(back - ((d + 3) % 6), 6);
      if (id[nk] !== -1) {
        if (id[nk] !== nv || ori[nk] !== no) bad[nk] = 1;
        continue;
      }
      const prev = reverse.get(nv);
      if (prev !== undefined && prev !== nk) {
        bad[nk] = bad[prev] = 1;
        continue;
      }
      if (requireClear && needed[nk] && botSpaceTaken(world, nv)) return null;
      id[nk] = nv;
      ori[nk] = no;
      reverse.set(nv, nk);
      queue[tail++] = nk;
    }
  }
  const ids = [];
  for (const k of wanted) {
    if (id[k] < 0 || bad[k]) return null;
    ids.push(id[k]);
  }
  return ids;
}
