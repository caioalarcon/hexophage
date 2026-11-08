import { game } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { ctx, cv } from '../../layout/elements.js';
import { aperture } from './hex-layout.js';
import { DX, DY, R } from './hex-metrics.js';
import { hexPath } from './hex-path.js';
import { drawAnomalyOverlay } from './pentagon.js';
import { stampOffsets } from '../../patterns/editor/stamp-grid.js';
import { placementAt } from '../../patterns/placement/plant.js';

function drawFlat() {
  const c = ctx,
    rect = cv.getBoundingClientRect(),
    w = rect.width,
    h = rect.height,
    dpr = cv.width / Math.max(w, 1);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  const a = aperture(w, h);
  c.save();
  c.beginPath();
  c.rect(a.x0, a.y0, a.x1 - a.x0, a.y1 - a.y0);
  c.clip();
  c.translate(a.cx, a.cy);
  c.scale(world.zoom, world.zoom);
  const vis = world.chart.map;
  // Owner-aware rendering, using only cells in the local chart.
  const paths = Array.from({ length: 8 }, () => new Path2D());
  let count = 0;
  for (const item of vis.values()) {
    if (!world.cells[item.id]) continue;
    const x = DX * (item.q + item.r / 2),
      y = DY * item.r;
    if (
      Math.abs(x * world.zoom) > w / 2 + R * world.zoom ||
      Math.abs(y * world.zoom) > h / 2 + R * world.zoom
    )
      continue;
    hexPath(paths[world.owners[item.id]], x, y, R * 0.92);
    count++;
  }
  for (let id = 1; id <= 7; id++) {
    c.fillStyle = game.colors[id];
    c.fill(paths[id]);
    if (count && world.zoom > 0.75) {
      c.strokeStyle = id === 7 ? '#a6b2c4' : '#ffffff70';
      c.lineWidth = 0.55 / world.zoom;
      c.stroke(paths[id]);
    }
  }
  if (world.hover && !world.drag && placementAt(world.hover)) {
    c.beginPath();
    for (const [dq, dr] of stampOffsets()) {
      const q = world.hover.q + dq,
        r = world.hover.r + dr;
      hexPath(c, DX * (q + r / 2), DY * r, R * 0.91);
    }
    c.fillStyle = '#f0b95155';
    c.fill();
    c.strokeStyle = '#ffd078';
    c.lineWidth = 1 / world.zoom;
    c.stroke();
  }
  c.restore();
  c.save();
  c.translate(a.x0, a.y0);
  drawAnomalyOverlay(c, a.x1 - a.x0, a.y1 - a.y0);
  c.restore();
  world.needsDraw = false;
}

export { drawFlat };
