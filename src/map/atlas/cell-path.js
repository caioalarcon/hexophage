import { atlasCapFactor, atlasCapLat, trimCap } from './polar-projection.js';
import { clamp } from '../../world/geometry.js';
import { sphereCorner } from '../../world/sphere.js';

// Build a closed cell, unwrapping each corner next to its predecessor so that
// a seam crossing creates two short pieces. A face surrounding a pole gets its cap.
const atlasXs = new Float64Array(8),
  atlasYs = new Float64Array(8),
  atlasCorner = new Float64Array(3);

function paintCapCell(path, a, n, minX, maxX, wire) {
  const b = a.s * atlasCapLat,
    yTop = a.cy - b,
    yBot = a.cy + b,
    part = a.turn / 4,
    west = a.cx - a.turn / 2;
  let poly = Array.from({ length: n }, (_, k) => [atlasXs[k], atlasYs[k]]);
  const first = poly[0],
    last = poly[n - 1];
  if (Math.abs(first[0] - last[0]) > a.turn / 2) {
    const end = first[0] + Math.sign(last[0] - first[0]) * a.turn,
      pole = first[1] < a.cy ? a.cy - a.turn / 4 : a.cy + a.turn / 4;
    poly.push([end, first[1]], [end, pole], [first[0], pole]);
    minX = Math.min(minX, end);
    maxX = Math.max(maxX, end);
  }
  function paint(points, mid, cap) {
    if (points.length < 3) return;
    const warped = cap
      ? points.map(([x, y]) => [mid + (x - mid) * atlasCapFactor((a.cy - y) / a.s, a.capBlend), y])
      : points;
    let lo = Infinity,
      hi = -Infinity;
    for (const v of warped) {
      lo = Math.min(lo, v[0]);
      hi = Math.max(hi, v[0]);
    }
    for (let i = Math.ceil((a.x0 - hi) / a.turn); i <= Math.floor((a.x1 - lo) / a.turn); i++) {
      const shift = i * a.turn;
      path.moveTo(warped[0][0] + shift, warped[0][1]);
      for (let k = 1; k <= warped.length; k++) {
        const v = warped[k % warped.length],
          p = warped[k - 1];
        if (wire && v[1] === p[1] && (Math.abs(v[1] - yTop) < 1e-4 || Math.abs(v[1] - yBot) < 1e-4))
          path.moveTo(v[0] + shift, v[1]);
        else path.lineTo(v[0] + shift, v[1]);
      }
      if (!wire) path.closePath();
    }
  }
  let minY = Infinity,
    maxY = -Infinity;
  for (const [, y] of poly) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (minY < yBot && maxY > yTop) paint(trimCap(trimCap(poly, 1, yTop, 1), 1, yBot, -1), 0, false);
  for (const [cut, sign] of [
    [yTop, -1],
    [yBot, 1],
  ]) {
    if (sign < 0 ? minY >= cut : maxY <= cut) continue;
    const p = trimCap(poly, 1, cut, sign);
    for (let j = Math.floor((minX - west) / part); j <= Math.floor((maxX - west) / part); j++) {
      const x0 = west + j * part,
        sector = trimCap(trimCap(p, 0, x0, 1), 0, x0 + part, -1);
      paint(sector, x0 + part / 2, true);
    }
  }
}

function atlasCell(path, id, a, wire = false) {
  const g = a.g,
    count = g.deg[id],
    half = a.turn / 2,
    poly = g.polygons,
    version = a.version;
  let minX = Infinity,
    maxX = -Infinity,
    last = 0,
    polar = false;
  for (let k = 0; k < count; k++) {
    const j = poly ? a.aliases[id * 6 + k] : 0;
    let x, y;
    if (poly && a.epoch[j] === version) {
      x = a.cornersX[j];
      y = a.cornersY[j];
    } else {
      if (!poly) sphereCorner(g, id, k, atlasCorner);
      const i = poly ? j * 3 : 0,
        p = poly || atlasCorner,
        px = p[i],
        py = p[i + 1],
        pz = p[i + 2];
      x =
        a.cx +
        a.s *
          Math.atan2(
            px * a.right[0] + py * a.right[1] + pz * a.right[2],
            px * a.look[0] + py * a.look[1] + pz * a.look[2],
          );
      y = a.cy - a.s * Math.asin(clamp(px * a.up[0] + py * a.up[1] + pz * a.up[2], -1, 1));
      if (poly) {
        a.cornersX[j] = x;
        a.cornersY[j] = y;
        a.epoch[j] = version;
      }
    }
    if (k) {
      if (x - last > half) x -= a.turn;
      else if (last - x > half) x += a.turn;
    }
    atlasXs[k] = last = x;
    atlasYs[k] = y;
    if (Math.abs(y - a.cy) > a.s * atlasCapLat) polar = true;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }
  if (polar && a.capBlend > 0) {
    paintCapCell(path, a, count, minX, maxX, wire);
    return;
  }
  if (wire) {
    for (let k = 0; k < count; k++) {
      const n = (k + 1) % count,
        neighbor = g.adj[id * 6 + n];
      if (
        id > neighbor &&
        g.deg[neighbor] === 6 &&
        (a.visible ? a.visible[neighbor] : a.detailSet.has(neighbor))
      )
        continue;
      const x0 = atlasXs[k],
        y0 = atlasYs[k],
        y1 = atlasYs[n];
      if (Math.max(y0, y1) < a.y0 || Math.min(y0, y1) > a.y1) continue;
      let x1 = atlasXs[n];
      if (x1 - x0 > half) x1 -= a.turn;
      else if (x0 - x1 > half) x1 += a.turn;
      const low = Math.ceil((a.x0 - Math.max(x0, x1)) / a.turn),
        high = Math.floor((a.x1 - Math.min(x0, x1)) / a.turn);
      for (let v = low; v <= high; v++) {
        path.moveTo(x0 + v * a.turn, y0);
        path.lineTo(x1 + v * a.turn, y1);
      }
    }
    return;
  }
  let n = count;
  if (Math.abs(last - atlasXs[0]) > half) {
    const end = atlasXs[0] + (last > atlasXs[0] ? a.turn : -a.turn),
      pole = atlasYs[0] < a.cy ? a.cy - half / 2 : a.cy + half / 2;
    minX = Math.min(minX, end);
    maxX = Math.max(maxX, end);
    // The final edge returns to the first corner at the opposite longitude.
    const start = Math.ceil((a.x0 - maxX) / a.turn),
      stop = Math.floor((a.x1 - minX) / a.turn);
    for (let wrap = start; wrap <= stop; wrap++) {
      const shift = wrap * a.turn;
      path.moveTo(atlasXs[0] + shift, atlasYs[0]);
      for (let k = 1; k < n; k++) path.lineTo(atlasXs[k] + shift, atlasYs[k]);
      path.lineTo(end + shift, atlasYs[0]);
      path.lineTo(end + shift, pole);
      path.lineTo(atlasXs[0] + shift, pole);
      path.closePath();
    }
    return;
  }
  const start = Math.ceil((a.x0 - maxX) / a.turn),
    stop = Math.floor((a.x1 - minX) / a.turn);
  for (let wrap = start; wrap <= stop; wrap++) {
    const shift = wrap * a.turn;
    path.moveTo(atlasXs[0] + shift, atlasYs[0]);
    for (let k = 1; k < n; k++) path.lineTo(atlasXs[k] + shift, atlasYs[k]);
    path.closePath();
  }
}

export { atlasCell, atlasCorner };
