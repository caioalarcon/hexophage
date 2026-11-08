import { world } from '../../browser/world-state.js';
import { ensureInitialViewport } from './surface.js';
import { point } from './world-point.js';
import { makeChart } from '../local/chart.js';
import { axialFromPixels } from '../local/hex-layout.js';
import { DX, DY } from '../local/hex-metrics.js';
import { stepPose } from '../local/oriented-step.js';
import { markRender } from '../../match/hud/status.js';
import { DIR } from '../../world/geometry.js';

function moveCenterTo(id, ori, notify = true) {
  if (world.graph.deg[id] !== 6) return false;
  world.center = id;
  world.orient = ori;
  world.globeLook = point(id);
  world.globeRight = null;
  ensureInitialViewport();
  markRender();
  return true;
}
function panBy(dx, dy) {
  const g = world.graph,
    z = world.zoom;
  // Accumulate the gesture below one hex. The screen lattice never changes phase.
  let x = world.offsetX - dx / z,
    y = world.offsetY - dy / z,
    moved = false;
  const edge = DX * DX * 0.500001;
  for (let n = 0; n < 256; n++) {
    const target = axialFromPixels(x, y);
    if (!target.q && !target.r) break;
    const choices = [];
    for (let d = 0; d < 6; d++) {
      const [q, r] = DIR[d],
        sx = DX * (q + r / 2),
        sy = DY * r,
        score = sx * x + sy * y;
      if (score > edge) choices.push({ d, sx, sy, score });
    }
    choices.sort((a, b) => b.score - a.score);
    let advanced = false;
    for (const { d, sx, sy } of choices) {
      const pose = stepPose(g, world.center, world.orient, d, world.side);
      const chart = pose && makeChart(pose.id, pose.ori);
      if (!chart) continue;
      world.center = pose.id;
      world.orient = pose.ori;
      world.chart = chart;
      x -= sx;
      y -= sy;
      moved = advanced = true;
      break;
    }
    if (!advanced) {
      // Drop pressure into the wall; retain tangential input and respond to reversal.
      const dir = choices[0];
      if (dir) {
        if (Math.abs(x) > Math.abs(y) * 2) x = 0;
        else if (Math.abs(y) > Math.abs(x) * 2) y = 0;
        else {
          const over = (x * dir.sx + y * dir.sy) / (DX * DX);
          x -= over * dir.sx;
          y -= over * dir.sy;
        }
      }
      break;
    }
  }
  world.offsetX = x;
  world.offsetY = y;
  if (moved) {
    world.globeLook = point(world.center);
    world.globeRight = null;
    world.hover = null;
    world.needsDraw = true;
  }
  return moved;
}

export { moveCenterTo, panBy };
