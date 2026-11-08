import { DX, DY, R } from './hex-metrics.js';
import { DIR, key } from '../../world/geometry.js';

// The screen owns the rectangular window. The graph can accept or reject a camera pose.
let frameLayout = null;

function layoutFor(w, h, z) {
  if (frameLayout && frameLayout.w === w && frameLayout.h === h && frameLayout.z === z)
    return frameLayout;
  const hw = w / (2 * z),
    hh = h / (2 * z),
    rows = Math.ceil((hh + R) / DY);
  const ranges = [];
  for (let r = -rows; r <= rows; r++) {
    const dy = Math.max(0, Math.abs(r * DY) - hh);
    if (dy >= R - 1e-7) continue;
    const extent = hw + DX * 0.5 * Math.min(1, 2 * (1 - dy / R));
    const first = Math.ceil(-extent / DX - r / 2 + 1e-8),
      last = Math.floor(extent / DX - r / 2 - 1e-8);
    ranges.push({ r, first, last });
  }
  // Fractional wheel deltas often expose exactly the same set of hexes.
  if (
    frameLayout &&
    frameLayout.w === w &&
    frameLayout.h === h &&
    frameLayout.ranges.length === ranges.length &&
    ranges.every(({ r, first, last }, i) => {
      const row = frameLayout.ranges[i];
      return row.r === r && row.first === first && row.last === last;
    })
  ) {
    frameLayout.z = z;
    return frameLayout;
  }
  const cells = [];
  for (const row of ranges) {
    row.start = cells.length;
    for (let q = row.first; q <= row.last; q++) cells.push({ q, r: row.r, key: key(q, row.r) });
  }
  const firstRow = ranges[0].r,
    adj = new Int32Array(cells.length * 6);
  for (let i = 0; i < cells.length; i++) {
    const { q, r } = cells[i];
    for (let d = 0; d < 6; d++) {
      const row = ranges[r + DIR[d][1] - firstRow],
        nq = q + DIR[d][0];
      adj[i * 6 + d] = row && nq >= row.first && nq <= row.last ? row.start + nq - row.first : -1;
    }
  }
  const middle = ranges[-firstRow];
  frameLayout = {
    w,
    h,
    z,
    cells,
    adj,
    ranges,
    origin: middle.start - middle.first,
    cache: new Map(),
  };
  return frameLayout;
}

function aperture(w, h) {
  return { cx: w / 2, cy: h / 2, x0: 0, y0: 0, x1: w, y1: h };
}

function chartWithinBudget(rect, z) {
  if (!(z > 0)) return false;
  const w = rect.width || 1,
    h = rect.height || 1;
  // Conservative upper bound; a local chart includes a little overdraw.
  const cols = Math.ceil((w / z + 2 * R) / DX) + 2;
  const rows = Math.ceil((h / z + 2 * R) / DY) + 2;
  return cols * rows <= 8500;
}

function axialFromPixels(px, py, r = R) {
  const q = ((Math.sqrt(3) / 3) * px - py / 3) / r,
    rr = (2 * py) / 3 / r;
  let x = q,
    y = -q - rr,
    z = rr;
  let rx = Math.round(x),
    ry = Math.round(y),
    rz = Math.round(z);
  const dx = Math.abs(rx - x),
    dy = Math.abs(ry - y),
    dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

function clearFrameLayout() {
  frameLayout = null;
}

export { aperture, axialFromPixels, chartWithinBudget, clearFrameLayout, layoutFor };
