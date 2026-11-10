import { game } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { ctx, cv, grid } from '../../layout/elements.js';
import { atlasContext, atlasRebuild } from './background.js';
import { atlasCell, atlasCorner } from './cell-path.js';
import { coverageCacheFor } from './coverage-cache.js';
import { beginOccupancy } from './pixel-buffer.js';
import { depositCoverage } from './pixel-coverage.js';
import { atlasCapLat, atlasCapLon, atlasMeridian } from './polar-projection.js';
import { atlasMetrics, atlasState } from './viewport.js';
import { largeAtlasCenter } from './visible-region.js';
import { liveTileContours } from '../population/tile-contours.js';
import { visitLiveTiles } from '../population/tile-index.js';
import { stampOffsets } from '../../patterns/editor/stamp-grid.js';
import { stampTargets } from '../../patterns/placement/footprint.js';
import { placementPreview } from '../../patterns/placement/plant.js';
import { clamp } from '../../world/geometry.js';
import { sphereCorner } from '../../world/sphere.js';

function atlasMark(path, id, a) {
  if (a.visible) {
    if (!a.visible[id]) return false;
  } else {
    const p = largeAtlasCenter(id, a, 2 / a.g.f);
    if (!p) return false;
    if (atlasMetrics.pitch < 1.25) {
      path.rect(p[0] - 0.65, p[1] - 0.65, 1.3, 1.3);
      return true;
    }
  }
  atlasCell(path, id, a);
  return true;
}

function drawAtlas() {
  const a = atlasState();
  if (a.builtVersion !== a.version) {
    atlasRebuild(a);
    a.builtVersion = a.version;
  }
  grid.style.display = 'none';
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(a.base, 0, 0);
  c.save();
  atlasContext(c, a);
  const g = a.g,
    paths = new Array(8),
    counts = new Uint16Array(8),
    margin = 2 / g.f;
  const soft = atlasMetrics.pitch * a.dpr < 2.05,
    clipLat = Math.min(Math.PI / 2, a.h / (2 * a.s)),
    clipLon = Math.min(Math.PI, a.w / (2 * a.s));
  let bitmap = null;
  const coverage = soft ? coverageCacheFor(a) : null;
  function flush(owner) {
    if (!counts[owner]) return;
    c.fillStyle = game.colors[owner];
    c.fill(paths[owner]);
    if (atlasMetrics.pitch > 9) {
      c.strokeStyle = '#ffffff55';
      c.lineWidth = 0.6;
      c.stroke(paths[owner]);
    }
    counts[owner] = 0;
    paths[owner] = null;
  }
  function paint(id, owner) {
    if ((a.visible && !a.visible[id]) || (a.detailSet && !a.detailSet.has(id))) return;
    if (soft) {
      if (!bitmap) bitmap = beginOccupancy(cv.width, cv.height);
      if (depositCoverage(bitmap, a, g, id, owner, coverage)) return;
    } else if (!a.visible && !a.detailSet && !largeAtlasCenter(id, a, margin)) return;
    if (!paths[owner]) paths[owner] = new Path2D();
    atlasCell(paths[owner], id, a);
    if (++counts[owner] === 192) flush(owner);
  }
  function meetsView(x, y, z, radius) {
    const u = a.up,
      r = a.right,
      l = a.look,
      lat = Math.asin(clamp(x * u[0] + y * u[1] + z * u[2], -1, 1));
    if (Math.abs(lat) > clipLat + radius) return false;
    if (clipLon >= Math.PI || (a.capBlend > 0 && Math.abs(lat) + radius >= atlasCapLat))
      return true;
    // A spherical cap which meets a pole can extend to every longitude.
    if (Math.abs(lat) + radius >= Math.PI / 2) return true;
    const slack = Math.asin(Math.min(1, Math.sin(radius) / Math.cos(lat)));
    return (
      Math.abs(Math.atan2(x * r[0] + y * r[1] + z * r[2], x * l[0] + y * l[1] + z * l[2])) <=
      clipLon + slack
    );
  }
  function paintTile(index, t, radius) {
    if (soft || index.sizes[t] < 48 || atlasMetrics.pitch > 9) return false;
    const k = t * 3,
      x = index.centers[k],
      y = index.centers[k + 1],
      z = index.centers[k + 2];
    const l = a.look,
      r = a.right,
      u = a.up,
      lat = Math.asin(clamp(x * u[0] + y * u[1] + z * u[2], -1, 1));
    // Cut facets and longitude wraps still use individual clipped polygons.
    if (Math.abs(lat) + radius >= Math.PI / 2) return false;
    const lon = Math.atan2(x * r[0] + y * r[1] + z * r[2], x * l[0] + y * l[1] + z * l[2]),
      span = Math.asin(Math.min(1, Math.sin(radius) / Math.cos(lat)));
    if (Math.abs(lon) + span >= Math.PI) return false;
    const polar = a.capBlend > 0 && Math.abs(lat) + radius >= atlasCapLat;
    if (
      polar &&
      (Math.abs(lat) - radius <= atlasCapLat ||
        Math.abs(lon - atlasMeridian(lon)) + span >= Math.PI * 0.25)
    )
      return false;
    const rings = liveTileContours(index, t);
    if (!rings) return false;
    const used = new Set();
    for (const { owner, corners } of rings) {
      if (!paths[owner]) paths[owner] = new Path2D();
      const path = paths[owner];
      used.add(owner);
      for (let i = 0; i < corners.length; i++) {
        const edge = corners[i];
        sphereCorner(g, Math.floor(edge / 6), edge % 6, atlasCorner);
        const x = atlasCorner[0],
          y = atlasCorner[1],
          z = atlasCorner[2];
        const lon = Math.atan2(x * r[0] + y * r[1] + z * r[2], x * l[0] + y * l[1] + z * l[2]),
          lat = Math.asin(clamp(x * u[0] + y * u[1] + z * u[2], -1, 1));
        const px = a.cx + a.s * (polar ? atlasCapLon(lon, lat, a.capBlend) : lon),
          py = a.cy - a.s * lat;
        if (!i) path.moveTo(px, py);
        else path.lineTo(px, py);
      }
      path.closePath();
    }
    for (const o of used) {
      counts[o]++;
      flush(o);
    }
    return true;
  }
  if (a.detailIds && a.detailIds.length < world.activeCount && world.activeCount < 8192) {
    for (const id of a.detailIds) if (world.cells[id]) paint(id, world.owners[id]);
  } else visitLiveTiles(meetsView, paint, paintTile);
  for (let owner = 1; owner <= 7; owner++) flush(owner);
  if (bitmap) {
    bitmap.context.putImageData(bitmap.image, 0, 0);
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(bitmap.canvas, 0, 0);
    c.restore();
  }
  const preview = world.hover?.id !== undefined && !world.drag && placementPreview(world.hover);
  if (preview) {
    const ids = stampTargets(world.hover, stampOffsets()),
      path = new Path2D();
    for (const id of ids) atlasMark(path, id, a);
    c.fillStyle = preview.ready ? '#f0b95155' : '#ff725a55';
    c.strokeStyle = preview.ready ? '#ffd078' : '#ff8d78';
    c.lineWidth = 1;
    c.fill(path);
    c.stroke(path);
  }
  c.restore();
  world.needsDraw = false;
}

export { drawAtlas };
