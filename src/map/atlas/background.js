import { world } from '../../browser/world-state.js';
import { cv } from '../../layout/elements.js';
import { atlasCell } from './cell-path.js';
import { atlasCapLat, atlasCapLon, atlasPole } from './polar-projection.js';
import { atlasMetrics } from './viewport.js';
import { largeAtlasCenter, largeAtlasRegion } from './visible-region.js';
import { clamp } from '../../world/geometry.js';

function atlasSurface(c, a) {
  const left = a.cx - a.turn / 2,
    part = a.turn / 4;
  c.fillRect(left, a.cy - atlasCapLat * a.s, a.turn, 2 * atlasCapLat * a.s);
  for (let band = 0; band < 4; band++)
    for (const sign of [-1, 1]) {
      const x = left + band * part,
        mid = x + part / 2,
        y = a.cy + sign * atlasCapLat * a.s,
        pole = a.cy + sign * atlasPole * a.s,
        half = ((1 - a.capBlend) * part) / 2;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + part, y);
      c.lineTo(mid + half, pole);
      c.lineTo(mid - half, pole);
      c.closePath();
      c.fill();
    }
}

function atlasContext(c, a) {
  c.setTransform(a.dpr, 0, 0, a.dpr, 0, 0);
  c.beginPath();
  c.rect(a.x0, a.y0, a.x1 - a.x0, a.y1 - a.y0);
  c.clip();
}

function atlasRebuild(a) {
  const base = a.base;
  if (base.width !== cv.width) base.width = cv.width;
  if (base.height !== cv.height) base.height = cv.height;
  const c = base.getContext('2d');
  c.setTransform(a.dpr, 0, 0, a.dpr, 0, 0);
  c.fillStyle = '#080f18';
  c.fillRect(0, 0, a.w, a.h);
  c.save();
  atlasContext(c, a);
  c.fillStyle = '#101c28';
  atlasSurface(c, a);
  const g = a.g,
    xyz = g.coords,
    r = a.right,
    u = a.up,
    l = a.look,
    margin = 2 / g.f;
  const maxLat = Math.min(Math.PI / 2, a.h / (2 * a.s)),
    latClip = Math.sin(Math.min(Math.PI / 2, maxLat + margin));
  const maxLon = Math.min(Math.PI, a.w / (2 * a.s));
  let count = 0;
  atlasMetrics.estimated = false;
  if (!a.visible) {
    const full = maxLon >= Math.PI - 1e-7 && maxLat >= Math.PI / 2 - 1e-7;
    count = full ? g.n : Math.ceil(g.n * (maxLon / Math.PI) * Math.sin(maxLat));
    largeAtlasRegion(a, count);
    if (a.detailIds) {
      count = 0;
      for (const id of a.detailIds) if (largeAtlasCenter(id, a)) count++;
    } else atlasMetrics.estimated = !full;
  } else {
    a.visible.fill(0);
    for (let id = 0; id < g.n; id++) {
      const i = id * 3,
        x = xyz[i],
        y = xyz[i + 1],
        z = xyz[i + 2],
        n = x * u[0] + y * u[1] + z * u[2];
      if (Math.abs(n) > latClip) continue;
      const lon = Math.atan2(x * r[0] + y * r[1] + z * r[2], x * l[0] + y * l[1] + z * l[2]);
      const mapped =
        Math.abs(n) > Math.sin(atlasCapLat) && a.capBlend > 0
          ? atlasCapLon(lon, Math.asin(clamp(n, -1, 1)), a.capBlend)
          : lon;
      if (
        Math.abs(mapped) >
        maxLon + margin / Math.max(0.01, Math.sqrt(Math.max(0, 1 - n * n))) + margin * 2
      )
        continue;
      a.visible[id] = 1;
      if (Math.abs(mapped) <= maxLon + 1e-7 && Math.abs(n) <= Math.sin(maxLat) + 1e-7) count++;
    }
  }
  atlasMetrics.visibleCount = count;
  a.drawGrid = atlasMetrics.gridVisible =
    atlasMetrics.pitch >= 4.25 && count <= 10500 && !!(a.visible || a.detailIds);
  if (a.drawGrid) {
    c.strokeStyle = atlasMetrics.pitch < 7 ? '#25384a' : '#354b5e';
    c.lineWidth = atlasMetrics.pitch < 8 ? 0.6 : 0.85;
    let batch = 0;
    c.beginPath();
    const length = a.detailIds ? a.detailIds.length : g.n;
    for (let i = 0; i < length; i++) {
      const id = a.detailIds ? a.detailIds[i] : i;
      if (g.deg[id] !== 6 || (a.visible && !a.visible[id])) continue;
      atlasCell(c, id, a, true);
      if (++batch === 96) {
        c.stroke();
        c.beginPath();
        batch = 0;
      }
    }
    if (batch) c.stroke();
  }
  if (world.showFaults) {
    c.fillStyle = '#b67d66';
    for (const id of g.pents) {
      if (a.visible ? !a.visible[id] : !largeAtlasCenter(id, a, margin)) continue;
      const i = id * 3,
        x = xyz[i],
        y = xyz[i + 1],
        z = xyz[i + 2];
      const lat = Math.asin(clamp(x * u[0] + y * u[1] + z * u[2], -1, 1)),
        lon = Math.atan2(x * r[0] + y * r[1] + z * r[2], x * l[0] + y * l[1] + z * l[2]);
      const px = a.cx + a.s * atlasCapLon(lon, lat, a.capBlend),
        py = a.cy - a.s * lat;
      c.beginPath();
      c.arc(px, py, clamp(atlasMetrics.pitch * 0.14, 1.2, 3.5), 0, 2 * Math.PI);
      c.fill();
    }
  }
  c.restore();
}

export { atlasContext, atlasRebuild };
