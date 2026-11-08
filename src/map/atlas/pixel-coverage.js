import { atlasCapFactor, atlasCapLat, atlasMeridian, atlasPole } from './polar-projection.js';
import { clamp } from '../../world/geometry.js';

function depositCoverage(b, a, g, id, owner, cached) {
  const slot = id & cached.mask,
    w = b.w,
    h = b.h,
    flag = 1 << (owner - 1);
  let start, shape;
  if (cached.tags[slot] === id + 1) {
    start = cached.base[slot];
    shape = cached.shape[slot];
  } else {
    const pos = g.coords,
      i = 3 * id,
      px = pos[i],
      py = pos[i + 1],
      pz = pos[i + 2],
      u = a.up,
      r = a.right,
      l = a.look,
      ss = a.s * a.dpr;
    const sin = clamp(px * u[0] + py * u[1] + pz * u[2], -1, 1),
      lat = Math.asin(sin),
      y = (a.cy - a.s * lat) * a.dpr;
    const rad = (0.63 * ss) / g.f;
    const lon = Math.atan2(px * r[0] + py * r[1] + pz * r[2], px * l[0] + py * l[1] + pz * l[2]);
    let mapped = lon,
      factor = 1,
      shear = 0,
      seam = Math.PI - Math.abs(lon);
    if (a.capBlend > 0 && Math.abs(lat) > atlasCapLat) {
      const mid = atlasMeridian(lon),
        delta = lon - mid;
      factor = atlasCapFactor(lat, a.capBlend);
      mapped = mid + delta * factor;
      shear = Math.abs((delta * a.capBlend) / (atlasPole - atlasCapLat));
      seam = Math.PI * 0.25 - Math.abs(delta);
    }
    const x = (a.cx + a.s * mapped) * a.dpr,
      cos = Math.sqrt(Math.max(1e-12, 1 - sin * sin)),
      rx = rad * (factor / cos + shear);
    const ix = Math.floor(x),
      iy = Math.floor(y);
    if (seam * cos * g.f < 1.3 || rx > 3 || rad > 1.5) {
      // The split pieces at a map cut use their actual clipped polygons.
      if (ix >= 0 && ix < w && iy >= 0 && iy < h) {
        const k = iy * w + ix;
        b.words[k] = b.palette[(b.mask[k] |= flag)];
      }
      return false;
    }
    const x0 = Math.max(0, Math.min(ix, Math.ceil(x - rx - 0.5))),
      y0 = Math.max(0, Math.min(iy, Math.ceil(y - rad - 0.5)));
    start = y0 * w + x0;
    shape = 0;
    if (x + rx >= 0 && x - rx <= w && y + rad >= 0 && y - rad <= h) {
      const last = Math.min(h - 1, Math.floor(y + rad - 0.5));
      for (let j = y0; j <= last; j++) {
        const dy = (j + 0.5 - y) / rad,
          reach = rx * Math.sqrt(Math.max(0, 1 - dy * dy));
        const end = Math.min(w - 1, Math.floor(x + reach - 0.5));
        for (let k = Math.max(x0, Math.ceil(x - reach - 0.5)); k <= end; k++)
          shape |= 1 << (8 * (j - y0) + k - x0);
      }
      if (!shape && ix >= 0 && ix < w && iy >= 0 && iy < h) shape = 1 << (8 * (iy - y0) + ix - x0);
    }
    cached.tags[slot] = id + 1;
    cached.base[slot] = start;
    cached.shape[slot] = shape;
  }
  while (shape) {
    const bit = 31 - Math.clz32(shape & -shape),
      k = start + (bit >>> 3) * w + (bit & 7);
    b.words[k] = b.palette[(b.mask[k] |= flag)];
    shape &= shape - 1;
  }
  return true;
}

export { depositCoverage };
