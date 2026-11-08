import { world } from '../../browser/world-state.js';
import { nearestGlobeVertex } from '../../globe/camera/nearest-vertex.js';
import { atlasCapLon } from './polar-projection.js';
import { atlasMetrics } from './viewport.js';
import { clamp } from '../../world/geometry.js';

// Project one cell center for viewport culling or subpixel occupancy marks.
const atlasCenterScratch = new Float64Array(2);
function largeAtlasCenter(id, a, margin = 0) {
  const at = 3 * id,
    c = a.g.coords,
    x = c[at],
    y = c[at + 1],
    z = c[at + 2],
    u = a.up,
    r = a.right,
    l = a.look;
  const n = x * u[0] + y * u[1] + z * u[2];
  if (Math.abs(n) > Math.sin(Math.min(Math.PI / 2, a.h / (2 * a.s) + margin)) + 1e-7) return null;
  const lat = Math.asin(clamp(n, -1, 1)),
    lon = Math.atan2(x * r[0] + y * r[1] + z * r[2], x * l[0] + y * l[1] + z * l[2]);
  const mapped = atlasCapLon(lon, lat, a.capBlend),
    x0 = a.cx + a.s * mapped,
    y0 = a.cy - a.s * lat;
  const slack = margin * a.s * (2 + 1 / Math.max(0.01, Math.cos(lat)));
  if (x0 < a.x0 - slack - 0.001 || x0 > a.x1 + slack + 0.001) return null;
  atlasCenterScratch[0] = x0;
  atlasCenterScratch[1] = y0;
  return atlasCenterScratch;
}
function largeAtlasRegion(a, expected) {
  a.detailIds = null;
  a.detailSet = null;
  if (atlasMetrics.pitch < 4.25 || expected > 12500) return;
  const g = a.g,
    margin = 2 / g.f,
    center = nearestGlobeVertex(g, a.look, world.center);
  const ids = [center],
    seen = new Set(ids);
  for (let head = 0; head < ids.length; head++) {
    const id = ids[head];
    for (let k = 0; k < g.deg[id]; k++) {
      const n = g.adj[6 * id + k];
      if (seen.has(n)) continue;
      seen.add(n);
      if (largeAtlasCenter(n, a, margin)) ids.push(n);
    }
  }
  a.detailIds = ids;
  a.detailSet = new Set(ids);
}

export { largeAtlasCenter, largeAtlasRegion };
