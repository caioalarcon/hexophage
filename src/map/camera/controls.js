import { world } from '../../browser/world-state.js';
import { gpu } from '../../globe/webgl/context.js';
import { $ } from '../../layout/elements.js';
import { rotateWorld, sideFlip, toggleView } from './orientation.js';
import { minimumZoom } from './surface.js';
import { zoom } from './zoom.js';
import { inspectPentagon } from '../local/pentagon.js';
import { markRender } from '../../match/hud/status.js';

function bindMapControls() {
  $('hl-viewmode').onclick = toggleView;
  $('hl-sideflip').onclick = sideFlip;
  $('hl-rotatecw').onclick = () => rotateWorld(-1);
  $('hl-rotateccw').onclick = () => rotateWorld(1);
  $('hl-pentagon').onclick = inspectPentagon;
  $('hl-debug').onchange = (e) => {
    world.showFaults = e.target.checked;
    markRender();
  };
  $('hl-meshdetail').onchange = (e) => {
    gpu.wireMode = e.target.value;
    gpu.planet = null;
    world.needsGlobeBase = true;
    world.needsDraw = true;
  };
  $('hl-zplus').onclick = () => zoom(1.3);
  $('hl-zminus').onclick = () => zoom(1 / 1.3);
  $('hl-fit').onclick = () =>
    zoom(world.view === 'globe' ? 1 / world.globeZoom : world.homeZoom / world.zoom);
  $('hl-overview').onclick = () => zoom(minimumZoom() / world.zoom);
}

export { bindMapControls };
