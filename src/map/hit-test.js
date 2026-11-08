import { world } from '../browser/world-state.js';
import { nearestGlobeVertex } from '../globe/camera/nearest-vertex.js';
import { cv } from '../layout/elements.js';
import { atlasOrientationAt, atlasRay } from './atlas/camera.js';
import { atlasCell } from './atlas/cell-path.js';
import { atlasCapFactor, atlasCapLat, atlasMeridian, atlasPole } from './atlas/polar-projection.js';
import { atlasPick, atlasState } from './atlas/viewport.js';
import { aperture, axialFromPixels } from './local/hex-layout.js';
import { cross, vdot } from '../world/geometry.js';
import { sphereCorner } from '../world/sphere.js';

function hitAtlas(clientX, clientY) {
  const a = atlasState(),
    r = cv.getBoundingClientRect(),
    px = clientX - r.left,
    py = clientY - r.top;
  if (px < a.x0 || px >= a.x1 || py < a.y0 || py >= a.y1) return null;
  const t = atlasRay(clientX, clientY),
    g = world.graph,
    xyz = g.coords;
  if (!t) return null;
  const id = nearestGlobeVertex(
    g,
    t,
    atlasPick.id >= 0 && atlasPick.id < g.n ? atlasPick.id : world.center,
  );
  // The dual cells use triangle barycenters, so their borders can differ slightly
  // from nearest-center regions. Test the actual displayed polygons at the cursor.
  const ids = [id];
  for (let k = 0; k < g.deg[id]; k++) ids.push(g.adj[id * 6 + k]);
  for (const n of ids) {
    const path = new Path2D();
    atlasCell(path, n, a);
    const c = a.base.getContext('2d');
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const inside = c.isPointInPath(path, px, py);
    c.restore();
    if (inside) {
      atlasPick.id = n;
      return g.deg[n] === 5 ? null : { id: n, ori: atlasOrientationAt(n) };
    }
  }
  // Canvas rounds path coordinates at the one-sided border of a polar facet.
  const lat = (a.cy - py) / a.s,
    lon = (px - a.cx) / a.s;
  if (
    a.capBlend > 0 &&
    Math.abs(lat) > atlasCapLat &&
    Math.abs(
      Math.abs(lon - atlasMeridian(lon)) - atlasPole * 0.5 * atlasCapFactor(lat, a.capBlend),
    ) *
      a.s <
      0.08
  ) {
    for (const n of ids) {
      let inside = true;
      const v0 = new Float64Array(3),
        v1 = new Float64Array(3);
      for (let k = 0; k < g.deg[n] && inside; k++) {
        sphereCorner(g, n, k, v0);
        sphereCorner(g, n, (k + 1) % g.deg[n], v1);
        const normal = cross(v0, v1);
        inside = vdot(normal, t) * vdot(normal, g.coords.subarray(n * 3, n * 3 + 3)) >= -1e-11;
      }
      if (inside) {
        atlasPick.id = n;
        return g.deg[n] === 5 ? null : { id: n, ori: atlasOrientationAt(n) };
      }
    }
  }
  return null;
}

function hit(clientX, clientY) {
  if (!world.chart) return hitAtlas(clientX, clientY);
  const rect = cv.getBoundingClientRect();
  const a = aperture(rect.width, rect.height),
    x = clientX - rect.left,
    y = clientY - rect.top;
  if (x < a.x0 || x >= a.x1 || y < a.y0 || y >= a.y1) return null;
  return axialFromPixels((x - a.cx) / world.zoom, (y - a.cy) / world.zoom);
}

function within(r, x, y) {
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

export { hit, hitAtlas, within };
