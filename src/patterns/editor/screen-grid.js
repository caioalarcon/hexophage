import { axialFromPixels } from '../../map/local/hex-layout.js';

export function editorGridLayout(w, h, n) {
  const r = Math.max(
    1,
    Math.min((w - 28) / (Math.sqrt(3) * (n - 0.5) + 2), (h - 24) / (1.5 * (n - 1) + 2)),
  );
  const dx = Math.sqrt(3) * r,
    dy = 1.5 * r,
    ox = (w - dx * (n - 0.5)) / 2,
    oy = (h - dy * (n - 1)) / 2;
  return { r, dx, dy, ox, oy };
}

export function editorCellAt(layout, rect, n, x, y) {
  if (!layout) return null;
  const cell = axialFromPixels(x - rect.left - layout.ox, y - rect.top - layout.oy, layout.r);
  const row = cell.r,
    col = cell.q + Math.floor(row / 2);
  return row >= 0 && row < n && col >= 0 && col < n ? { c: col, r: row } : null;
}
