import { world } from '../../browser/world-state.js';
import { ectx, ev } from '../../layout/elements.js';
import { measure } from '../../map/canvas-size.js';
import { editorGridLayout, editorCellAt } from './screen-grid.js';
import { hexPath } from '../../map/local/hex-path.js';

function drawEditor() {
  measure(ev);
  const rect = ev.getBoundingClientRect(),
    w = rect.width,
    h = rect.height,
    dpr = ev.width / Math.max(w, 1),
    c = ectx,
    n = world.stampN;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = '#0b1523';
  c.fillRect(0, 0, w, h);
  world.editorLayout = editorGridLayout(w, h, n);
  const { r, dx, dy, ox, oy } = world.editorLayout;
  for (let row = 0; row < n; row++)
    for (let col = 0; col < n; col++) {
      const live = world.stamp[row * n + col],
        x = ox + dx * (col + 0.5 * (row & 1)),
        y = oy + dy * row;
      c.beginPath();
      hexPath(c, x, y, r * 0.9);
      c.fillStyle = live ? '#42d1aa' : '#19293d';
      c.fill();
      c.strokeStyle = live ? '#bcffe8' : '#35495f';
      c.lineWidth = live ? 1.2 : 0.7;
      c.stroke();
    }
  const mid = Math.floor(n / 2);
  c.beginPath();
  hexPath(c, ox + dx * (mid + 0.5 * (mid & 1)), oy + dy * mid, r * 0.94);
  c.strokeStyle = '#edbb5d';
  c.lineWidth = 1.5;
  c.stroke();
  world.needsEditor = false;
}
function editorHit(x, y) {
  return editorCellAt(world.editorLayout, ev.getBoundingClientRect(), world.stampN, x, y);
}

export { drawEditor, editorHit };
