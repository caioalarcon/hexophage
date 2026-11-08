import { world } from '../../browser/world-state.js';
import { toast } from '../../layout/announcements.js';
import { moveCenterTo } from '../camera/pan.js';
import { chooseEast, point } from '../camera/world-point.js';
import { makeChart } from './chart.js';
import { DX, DY } from './hex-metrics.js';
import { mod, normal, vdot } from '../../world/geometry.js';

function inspectPentagon() {
  const g = world.graph;
  if (!world.chart) {
    const pent = g.pents[g.nearest[world.center]],
      near = g.adj[pent * 6];
    moveCenterTo(near, chooseEast(near), false);
    toast('Anomalia próxima ao centro do mapa.');
    return;
  }
  for (let i = 0; i < g.f + 10; i++) {
    const u = world.center,
      dist = g.distance[u];
    if (dist <= 1) break;
    let found = false;
    const ns = [];
    for (let k = 0; k < 6; k++) {
      const id = g.adj[u * 6 + k];
      if (g.distance[id] < dist) ns.push({ id, k });
    }
    for (const n of ns) {
      let reverse = -1;
      for (let j = 0; j < 6; j++)
        if (g.adj[n.id * 6 + j] === u) {
          reverse = j;
          break;
        }
      // The old camera direction k corresponds to some hex direction d.
      const d = mod(world.side * (n.k - world.orient), 6);
      const ori = mod(reverse - world.side * ((d + 3) % 6), 6);
      if (makeChart(n.id, ori) && moveCenterTo(n.id, ori, false)) {
        found = true;
        break;
      }
    }
    if (!found) break;
  }
  toast(
    'Distância à anomalia mais próxima: ' +
      g.distance[world.center] +
      ' arestas. A janela não a inclui.',
  );
}

function drawAnomalyOverlay(c, w, h) {
  if (!world.showFaults) return;
  const g = world.graph,
    dist = g.distance[world.center];
  const threshold =
    Math.ceil(Math.max(w / (2 * world.zoom * DX), h / (2 * world.zoom * DY)) * 0.88) + 5;
  if (dist > threshold) return;
  const id = g.pents[g.nearest[world.center]],
    center = point(world.center),
    pent = point(id);
  const ev = point(g.adj[world.center * 6 + world.orient]);
  const nv = point(g.adj[world.center * 6 + mod(world.orient + world.side, 6)]);
  const tangent = (p) => {
    const dot = vdot(p, center);
    return normal([p[0] - center[0] * dot, p[1] - center[1] * dot, p[2] - center[2] * dot]);
  };
  const right = tangent(ev),
    northRaw = tangent(nv);
  const up = normal([
    northRaw[0] - vdot(northRaw, right) * right[0],
    northRaw[1] - vdot(northRaw, right) * right[1],
    northRaw[2] - vdot(northRaw, right) * right[2],
  ]);
  const delta = tangent(pent);
  let x = vdot(delta, right),
    y = -vdot(delta, up);
  const len = Math.hypot(x, y) || 1;
  x /= len;
  y /= len;
  // A small directional mark on the frame, never a simulated cell.
  const reach = Math.min(
    (w / 2 - 4) / Math.max(Math.abs(x), 0.0001),
    (h / 2 - 4) / Math.max(Math.abs(y), 0.0001),
  );
  const cx = w / 2 + x * reach,
    cy = h / 2 + y * reach;
  c.beginPath();
  c.moveTo(cx - y * 4, cy + x * 4);
  c.lineTo(cx + x * 2, cy + y * 2);
  c.lineTo(cx + y * 4, cy - x * 4);
  c.strokeStyle = '#e69271';
  c.lineWidth = 2;
  c.stroke();
}

export { drawAnomalyOverlay, inspectPentagon };
