import { game } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { project3D } from '../camera/projection.js';
import { globeContext, globeProjection } from '../camera/view.js';
import { ctx, cv } from '../../layout/elements.js';

function drawGlobeBase(wire) {
  const startedBase = performance.now();
  const back = world.globeBase,
    rect = cv.getBoundingClientRect();
  if (back.width !== cv.width) back.width = cv.width;
  if (back.height !== cv.height) back.height = cv.height;
  const dpr = back.width / Math.max(rect.width, 1),
    bc = back.getContext('2d'),
    v = globeContext();
  bc.setTransform(dpr, 0, 0, dpr, 0, 0);
  bc.fillStyle = v.inside ? '#14283b' : '#0c1421';
  bc.fillRect(0, 0, v.w, v.h);
  if (!v.inside) {
    const grad = bc.createRadialGradient(
      v.cx - v.radius * 0.3,
      v.cy - v.radius * 0.25,
      v.radius * 0.1,
      v.cx,
      v.cy,
      v.radius,
    );
    grad.addColorStop(0, '#233f59');
    grad.addColorStop(0.75, '#17273a');
    grad.addColorStop(1, '#0b1727');
    bc.beginPath();
    bc.arc(v.cx, v.cy, v.radius, 0, 2 * Math.PI);
    bc.fillStyle = grad;
    bc.fill();
    bc.save();
    bc.beginPath();
    bc.arc(v.cx, v.cy, v.radius, 0, Math.PI * 2);
    bc.clip();
  }
  bc.beginPath();
  const g = world.graph;
  // Use a cached visual LOD mesh rather than scanning every world cell.
  const lines = wire?.wireLines;
  if (lines) {
    const cutoff = v.inside ? 0.1 : 0.035;
    for (let i = 0; i < lines.length; i += 6) {
      const ax = lines[i],
        ay = lines[i + 1],
        az = lines[i + 2];
      const bx = lines[i + 3],
        by = lines[i + 4],
        bz = lines[i + 5];
      const x0 = ax * v.right[0] + ay * v.right[1] + az * v.right[2];
      const y0 = ax * v.up[0] + ay * v.up[1] + az * v.up[2];
      const z0 = ax * v.look[0] + ay * v.look[1] + az * v.look[2];
      const x1 = bx * v.right[0] + by * v.right[1] + bz * v.right[2];
      const y1 = bx * v.up[0] + by * v.up[1] + bz * v.up[2];
      const z1 = bx * v.look[0] + by * v.look[1] + bz * v.look[2];
      if (z0 < cutoff || z1 < cutoff) continue;
      const sx0 = v.cx + (v.inside ? (x0 / z0) * v.focal : x0 * v.radius);
      const sy0 = v.cy - (v.inside ? (y0 / z0) * v.focal : y0 * v.radius);
      const sx1 = v.cx + (v.inside ? (x1 / z1) * v.focal : x1 * v.radius);
      const sy1 = v.cy - (v.inside ? (y1 / z1) * v.focal : y1 * v.radius);
      if (
        (sx0 < 0 && sx1 < 0) ||
        (sy0 < 0 && sy1 < 0) ||
        (sx0 > v.w && sx1 > v.w) ||
        (sy0 > v.h && sy1 > v.h)
      )
        continue;
      bc.moveTo(sx0, sy0);
      bc.lineTo(sx1, sy1);
    }
  }
  bc.strokeStyle = v.inside ? '#5d8095' : '#4c6a7c';
  bc.globalAlpha = v.inside ? 0.6 : 0.48;
  bc.lineWidth = v.inside ? 0.65 : 0.48;
  bc.stroke();
  bc.globalAlpha = 1;
  if (world.showFaults) {
    for (const id of g.pents) {
      const p = globeProjection(id, v);
      const screen = project3D(p[0], p[1], p[2], v);
      if (!screen) continue;
      const [x, y] = screen;
      if (x < -20 || x > v.w + 20 || y < -20 || y > v.h + 20) continue;
      bc.beginPath();
      bc.arc(x, y, v.inside ? 9 : 6.2, 0, Math.PI * 2);
      bc.fillStyle = '#ff7b65';
      bc.fill();
      bc.strokeStyle = '#ffe0b4';
      bc.lineWidth = 1.5;
      bc.stroke();
    }
  }
  if (!v.inside) {
    bc.restore();
    bc.beginPath();
    bc.arc(v.cx, v.cy, v.radius, 0, 2 * Math.PI);
    bc.strokeStyle = '#b8d9ea';
    bc.lineWidth = 1;
    bc.stroke();
  }
  world.lastBaseRenderMs = performance.now() - startedBase;
  world.needsGlobeBase = false;
}
function drawGlobeLegacy(wire) {
  if (world.needsGlobeBase) drawGlobeBase(wire);
  const c = ctx,
    rect = cv.getBoundingClientRect(),
    w = rect.width,
    h = rect.height,
    dpr = cv.width / Math.max(w, 1);
  const v = globeContext(),
    g = world.graph;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  c.drawImage(world.globeBase, 0, 0, w, h);
  c.save();
  if (!v.inside) {
    c.beginPath();
    c.arc(v.cx, v.cy, v.radius, 0, Math.PI * 2);
    c.clip();
  }
  const coords = g.coords,
    size = v.inside
      ? Math.max(1.8, (v.focal / g.f) * 0.27)
      : Math.max(1.2, (v.radius / g.f) * 0.34);
  for (let owner = 1; owner <= 7; owner++) {
    c.fillStyle = game.colors[owner];
    c.beginPath();
    for (const id of world.ownerCells[owner]) {
      const i = id * 3,
        ax = coords[i],
        ay = coords[i + 1],
        az = coords[i + 2];
      const z = ax * v.look[0] + ay * v.look[1] + az * v.look[2];
      if (z <= (v.inside ? 0.1 : 0.035)) continue;
      const scale = v.inside ? v.focal / z : v.radius;
      const x = v.cx + scale * (ax * v.right[0] + ay * v.right[1] + az * v.right[2]);
      const y = v.cy - scale * (ax * v.up[0] + ay * v.up[1] + az * v.up[2]);
      if (x < -size || x > v.w + size || y < -size || y > v.h + size) continue;
      c.moveTo(x + size, y);
      c.arc(x, y, size, 0, Math.PI * 2);
    }
    c.fill();
  }
  c.restore();
  const p = globeProjection(world.center, v),
    screen = project3D(...p, v);
  if (screen) {
    const [x, y] = screen;
    c.beginPath();
    c.arc(x, y, 9, 0, Math.PI * 2);
    c.strokeStyle = '#ffe28b';
    c.lineWidth = 2;
    c.stroke();
    c.beginPath();
    c.arc(x, y, 2.3, 0, Math.PI * 2);
    c.fillStyle = '#ffe28b';
    c.fill();
  }
  world.needsDraw = false;
}

export { drawGlobeLegacy };
