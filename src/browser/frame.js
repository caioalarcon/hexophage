import { nextTick } from './game.js';
import { world } from './world-state.js';
import { drawMiniGlobe } from '../globe/navigator/draw.js';
import { gpu } from '../globe/webgl/context.js';
import { $, cv } from '../layout/elements.js';
import { atlasCamera } from '../map/atlas/camera.js';
import { drawAtlas } from '../map/atlas/draw.js';
import { flushWheel, queuedWheel } from '../map/camera/pointer.js';
import { measure } from '../map/canvas-size.js';
import { drawFlat } from '../map/local/draw.js';
import { drawGrid } from '../map/local/grid.js';
import { updateGamePanel } from '../match/hud/ranking.js';
import { updateStats } from '../match/hud/status.js';
import { drawEditor } from '../patterns/editor/canvas.js';

let frameMeterAt = 0,
  drawsInWindow = 0,
  atlasLastPaintAt = 0,
  atlasLastCamera = '';
function shouldUpdateAtlas(t) {
  if (world.chart || !world.graph || world.activeCount < 30000) return true;
  const pitch = (1.16 * atlasCamera.scale) / world.graph.f;
  if (pitch >= 9) return true;
  const r = cv.getBoundingClientRect(),
    cam = atlasCamera;
  const key = [
    r.width,
    r.height,
    cam.scale,
    ...cam.look,
    ...cam.right,
    world.hover?.id ?? -1,
    world.stampRotation,
    world.stampCount,
  ].join('/');
  if (key !== atlasLastCamera || world.drag) {
    atlasLastCamera = key;
    atlasLastPaintAt = t;
    return true;
  }
  if (t - atlasLastPaintAt < 90) return false;
  atlasLastPaintAt = t;
  return true;
}
function frame(t) {
  if (queuedWheel) flushWheel();
  if (!world.prev) world.prev = t;
  const elapsed = Math.min(300, t - world.prev);
  world.prev = t;
  if (world.playing) {
    world.accum += (elapsed * world.speed) / 1000;
    let steps = 0;
    const start = performance.now();
    const budget = world.drag ? 4 : 12;
    while (world.playing && world.accum >= 1 && steps < 250 && performance.now() - start < budget) {
      world.accum -= 1;
      nextTick();
      steps++;
    }
    // Prevent a minute-long backlog after tab throttling.
    world.accum = Math.min(world.accum, world.speed);
  }
  if (t - world.statPrev > 250) {
    if (world.statPrev)
      world.actual = 0.7 * world.actual + (0.3 * world.statCount * 1000) / (t - world.statPrev);
    world.statCount = 0;
    world.statPrev = t;
    updateStats();
    updateGamePanel();
  }
  if (world.needsGrid) drawGrid();
  if (world.needsDraw && shouldUpdateAtlas(t)) {
    drawsInWindow++;
    measure(cv);
    if (world.chart) drawFlat();
    else drawAtlas();
  }
  drawMiniGlobe(t);
  if (world.needsEditor) drawEditor();
  if (t - frameMeterAt >= 600) {
    const fps =
      frameMeterAt && drawsInWindow > 1
        ? Math.round((1000 * drawsInWindow) / (t - frameMeterAt)) + ' fps'
        : '';
    const api = world.view === 'globe' ? (gpu.gl ? 'WebGL' : 'Canvas') : '';
    $('br-fps').textContent = [api, fps].filter(Boolean).join(' · ');
    $('br-rail-gen').textContent = 'G ' + world.gen.toLocaleString('pt-BR');
    frameMeterAt = t;
    drawsInWindow = 0;
  }
  requestAnimationFrame(frame);
}

export { frame };
