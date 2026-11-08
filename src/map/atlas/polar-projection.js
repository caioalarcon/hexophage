import { clamp } from '../../world/geometry.js';

// At wide zoom, collapse the last 30 degrees at each pole into four triangular
// sectors. Latitude and the equatorial map stay continuous as the user scrolls.
const atlasCapLat = Math.PI / 3,
  atlasPole = Math.PI / 2;

function atlasCapFactor(lat, d) {
  return 1 - d * clamp((Math.abs(lat) - atlasCapLat) / (atlasPole - atlasCapLat), 0, 1);
}
function atlasMeridian(lon) {
  return (
    -Math.PI + (Math.min(3, Math.max(0, Math.floor((lon + Math.PI) / atlasPole))) + 0.5) * atlasPole
  );
}
function atlasCapLon(lon, lat, d) {
  const mid = atlasMeridian(lon);
  return mid + (lon - mid) * atlasCapFactor(lat, d);
}
function atlasCapInverse(lon, lat, d, clipped) {
  const mid = atlasMeridian(lon),
    fac = atlasCapFactor(lat, d),
    limit = atlasPole * 0.5 * fac;
  if (!clipped && Math.abs(lon - mid) > limit + 1e-8) return null;
  if (fac < 1e-8) return mid;
  return mid + clamp(lon - mid, -limit, limit) / fac;
}
function trimCap(poly, axis, limit, sign) {
  const out = [];
  if (!poly.length) return out;
  let prev = poly[poly.length - 1],
    pa = (prev[axis] - limit) * sign;
  for (const vertex of poly) {
    const va = (vertex[axis] - limit) * sign;
    if (pa < 0 !== va < 0) {
      const t = pa / (pa - va);
      out.push([prev[0] + (vertex[0] - prev[0]) * t, prev[1] + (vertex[1] - prev[1]) * t]);
    }
    if (va >= 0) out.push(vertex);
    prev = vertex;
    pa = va;
  }
  return out;
}

export {
  atlasCapFactor,
  atlasCapInverse,
  atlasCapLat,
  atlasCapLon,
  atlasMeridian,
  atlasPole,
  trimCap,
};
