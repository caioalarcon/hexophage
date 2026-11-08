import { world } from '../../browser/world-state.js';
import { visitLiveTiles } from '../../map/population/tile-index.js';
import { sphereCorner } from '../../world/sphere.js';

// Keep every distinguishable face. Only fuse centers if the complete footprint
// is smaller than one backing-store pixel in this camera projection.
let globePixelBins = new Uint16Array(0);
function visitGlobePopulation(v, dpr, face, pixel) {
  const g = world.graph,
    c = g.coords,
    look = v.look,
    right = v.right,
    up = v.up,
    scale = v.inside ? v.focal : v.radius;
  const w = Math.round(v.w * dpr),
    h = Math.round(v.h * dpr);
  if (!w || !h || !world.activeCount) return;
  const dpx = w / v.w,
    dpy = h / v.h;
  const diag = Math.hypot(v.w, v.h) / 2,
    angle = v.inside ? Math.atan(diag / scale) : Math.asin(Math.min(1, diag / scale));
  const halfCell = 1.4 / g.f,
    cut = v.inside ? 0.1 : 0,
    xs = new Float64Array(6),
    ys = new Float64Array(6),
    corner = new Float64Array(3);
  const overallDiameter = 2 * halfCell * scale * dpr;
  let usedPixels = false;
  function subpixel(x, y, owner) {
    const i = Math.floor(x),
      j = Math.floor(y);
    if (i < 0 || j < 0 || i >= w || j >= h) return;
    if (!usedPixels) {
      if (globePixelBins.length !== w * h) globePixelBins = new Uint16Array(w * h);
      else globePixelBins.fill(0);
      usedPixels = true;
    }
    // Sample the closest cell center in the pixel. Tie-breaking is independent of traversal order.
    const px = x - i - 0.5,
      py = y - j - 0.5,
      rank = (Math.round((px * px + py * py) * 4096) << 3) + owner,
      index = j * w + i,
      old = globePixelBins[index];
    if (!old || rank < old) globePixelBins[index] = rank;
  }
  visitLiveTiles(
    (x, y, z, r) =>
      x * look[0] + y * look[1] + z * look[2] >= Math.cos(Math.min(Math.PI, angle + r)),
    (id, owner) => {
      const j = id * 3,
        x = c[j],
        y = c[j + 1],
        z = c[j + 2],
        depth = x * look[0] + y * look[1] + z * look[2];
      if (depth <= cut) return;
      const s = v.inside ? scale / depth : scale,
        margin = v.inside ? (halfCell * s) / Math.max(0.05, depth - halfCell) : halfCell * s;
      const cx = v.cx + s * (x * right[0] + y * right[1] + z * right[2]),
        cy = v.cy - s * (x * up[0] + y * up[1] + z * up[2]);
      if (cx < -margin || cy < -margin || cx > v.w + margin || cy > v.h + margin) return;
      if ((v.inside ? 2 * margin * dpr : overallDiameter) < 1) {
        subpixel(cx * dpx, cy * dpy, owner);
        return;
      }
      let x0 = Infinity,
        x1 = -Infinity,
        y0 = Infinity,
        y1 = -Infinity;
      const deg = g.deg[id];
      for (let k = 0; k < deg; k++) {
        sphereCorner(g, id, k, corner);
        const ax = corner[0],
          ay = corner[1],
          az = corner[2],
          t = v.inside ? scale / Math.max(cut, ax * look[0] + ay * look[1] + az * look[2]) : scale;
        const u = v.cx + t * (ax * right[0] + ay * right[1] + az * right[2]),
          b = v.cy - t * (ax * up[0] + ay * up[1] + az * up[2]);
        xs[k] = u;
        ys[k] = b;
        x0 = Math.min(x0, u);
        x1 = Math.max(x1, u);
        y0 = Math.min(y0, b);
        y1 = Math.max(y1, b);
      }
      if (dpr * Math.max(x1 - x0, y1 - y0) < 1) {
        subpixel(cx * dpx, cy * dpy, owner);
        return;
      }
      face(owner, xs, ys, deg);
    },
  );
  if (usedPixels)
    for (let i = 0; i < globePixelBins.length; i++) {
      const code = globePixelBins[i];
      if (code) pixel(code & 7, ((i % w) + 0.5) / dpx, (Math.floor(i / w) + 0.5) / dpy);
    }
}

export { visitGlobePopulation };
