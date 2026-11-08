import { world } from '../../browser/world-state.js';
import { globeContext } from '../camera/view.js';
import { drawMiniBackdrop, drawMiniFallback } from './canvas.js';
import { fallbackMini, navigatorView } from './surface.js';
import { drawGlobeGPU } from '../webgl/draw.js';
import { globeWireMesh } from '../wireframe/level-of-detail.js';
import { $, gpuCanvas } from '../../layout/elements.js';

function drawMiniGlobe(time) {
  const slot = $('br-globe-target');
  if (
    !slot ||
    !slot.isConnected ||
    (!navigatorView.expanded && $('br-mini-panel').classList.contains('collapsed'))
  )
    return;
  if (navigatorView.expanded)
    $('br-globe-zoom-reset').textContent = Math.round(world.globeZoom * 100) + '%';
  if (!navigatorView.dirty) return;
  // Inspecting the mini-globe should not saturate the GPU when the main sim is fast.
  if (
    time - navigatorView.lastDraw <
    (navigatorView.pointer ? 16 : navigatorView.expanded ? 33 : 100)
  )
    return;
  navigatorView.lastDraw = time;
  const wire = globeWireMesh(globeContext());
  const worked = drawGlobeGPU(wire);
  gpuCanvas.style.display = worked ? 'block' : 'none';
  fallbackMini.style.display = 'block';
  if (worked) drawMiniBackdrop();
  else drawMiniFallback(wire);
  navigatorView.dirty = false;
}

export { drawMiniGlobe };
