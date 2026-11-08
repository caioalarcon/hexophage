import { world } from '../browser/world-state.js';
import { globeContext } from './camera/view.js';
import { drawGlobeLegacy } from './canvas/legacy.js';
import { drawGlobeGPU } from './webgl/draw.js';
import { globeWireMesh } from './wireframe/level-of-detail.js';
import { $, ctx, cv, gpuCanvas } from '../layout/elements.js';

let globeBackgroundKey = '';
function drawGlobeBackground() {
  const key = [cv.width, cv.height, world.side, world.globeZoom].join('/');
  if (globeBackgroundKey === key) return;
  globeBackgroundKey = key;
  const c = ctx,
    rect = cv.getBoundingClientRect(),
    w = rect.width,
    h = rect.height,
    dpr = cv.width / Math.max(w, 1);
  const v = globeContext();
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  c.fillStyle = v.inside ? '#14283b' : '#0c1421';
  c.fillRect(0, 0, w, h);
  if (!v.inside) {
    const grad = c.createRadialGradient(
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
    c.beginPath();
    c.arc(v.cx, v.cy, v.radius, 0, Math.PI * 2);
    c.fillStyle = grad;
    c.fill();
    c.strokeStyle = '#b8d9ea';
    c.lineWidth = 1;
    c.stroke();
  }
}
function drawGlobe() {
  const wire = globeWireMesh(globeContext()),
    worked = drawGlobeGPU(wire);
  gpuCanvas.style.display = worked ? 'block' : 'none';
  const status =
    (worked ? 'WebGL' : 'Canvas') +
    (wire
      ? ' · ' +
        (wire.local ? 'detalhe local f' : wire.f < world.graph.f ? 'malha visual f' : 'malha f') +
        wire.f
      : ' · sem linhas');
  if ($('hl-renderstatus').textContent !== 'Render: ' + status)
    $('hl-renderstatus').textContent = 'Render: ' + status;
  if (worked) {
    drawGlobeBackground();
    world.needsDraw = false;
    world.needsGlobeBase = false;
  } else drawGlobeLegacy(wire);
}

function invalidateGlobeBackground() {
  globeBackgroundKey = '';
}

export { invalidateGlobeBackground };
