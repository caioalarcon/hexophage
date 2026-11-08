import { world } from '../../browser/world-state.js';
import { clamp } from '../../world/geometry.js';

// An index over the active list only. A busy region behind the camera should
// never reduce the amount of detail available to a quiet region in view.
let liveRevision = 0,
  liveTileIndex = null;
function visitLiveTiles(acceptTile, visitCell, visitTile) {
  const g = world.graph,
    n = world.activeCount,
    active = world.active,
    owners = world.owners;
  if (n < 8192) {
    for (let i = 0; i < n; i++) {
      const id = active[i];
      visitCell(id, owners[id]);
    }
    return;
  }
  let a = liveTileIndex;
  if (!a || a.graph !== g) {
    const side = clamp(Math.ceil(g.f / 8), 4, 256),
      area = side * side,
      size = 6 * area;
    a = liveTileIndex = {
      graph: g,
      side,
      area,
      heads: new Uint32Array(size),
      used: new Uint32Array(size),
      centers: new Float32Array(size * 3),
      sizes: new Uint32Array(size),
      contours: new Map(),
      links: new Uint32Array(0),
      count: 0,
      revision: -1,
    };
  }
  if (a.revision !== liveRevision) {
    const { heads, used, side, area, centers } = a,
      xyz = g.coords;
    for (let i = 0; i < a.count; i++) {
      heads[used[i]] = 0;
      a.sizes[used[i]] = 0;
    }
    a.contours.clear();
    a.contourEdges = 0;
    if (a.links.length < n)
      a.links = new Uint32Array(Math.min(g.n, Math.max(n, Math.ceil(a.links.length * 1.5))));
    const links = a.links;
    let count = 0;
    for (let i = 0; i < n; i++) {
      const j = 3 * active[i],
        x = xyz[j],
        y = xyz[j + 1],
        z = xyz[j + 2],
        ax = Math.abs(x),
        ay = Math.abs(y),
        az = Math.abs(z);
      let face, u, v;
      if (ax >= ay && ax >= az) {
        face = x >= 0 ? 0 : 1;
        u = y / ax;
        v = z / ax;
      } else if (ay >= az) {
        face = y >= 0 ? 2 : 3;
        u = x / ay;
        v = z / ay;
      } else {
        face = z >= 0 ? 4 : 5;
        u = x / az;
        v = y / az;
      }
      const col = Math.min(side - 1, Math.floor((u + 1) * 0.5 * side)),
        row = Math.min(side - 1, Math.floor((v + 1) * 0.5 * side));
      const t = face * area + row * side + col;
      if (!heads[t]) {
        used[count++] = t;
        const k = t * 3;
        if (centers[k] === 0 && centers[k + 1] === 0 && centers[k + 2] === 0) {
          const p = ((col + 0.5) * 2) / side - 1,
            q = ((row + 0.5) * 2) / side - 1,
            inv = 1 / Math.sqrt(1 + p * p + q * q),
            s = (face % 2 ? -1 : 1) * inv;
          centers[k] = face < 2 ? s : p * inv;
          centers[k + 1] = face < 2 ? p * inv : face < 4 ? s : q * inv;
          centers[k + 2] = face < 4 ? q * inv : s;
        }
      }
      a.sizes[t]++;
      links[i] = heads[t];
      heads[t] = i + 1;
    }
    a.count = count;
    a.revision = liveRevision;
  }
  const radius = Math.SQRT2 / a.side + 2 / g.f;
  for (let i = 0; i < a.count; i++) {
    const t = a.used[i],
      k = t * 3;
    if (acceptTile && !acceptTile(a.centers[k], a.centers[k + 1], a.centers[k + 2], radius))
      continue;
    if (visitTile && visitTile(a, t, radius)) continue;
    for (let j = a.heads[t]; j; j = a.links[j - 1]) {
      const id = active[j - 1];
      visitCell(id, owners[id]);
    }
  }
}

function clearLiveTileIndex() {
  liveTileIndex = null;
}

function bumpPopulationRevision() {
  liveRevision++;
}

export { bumpPopulationRevision, clearLiveTileIndex, visitLiveTiles };
