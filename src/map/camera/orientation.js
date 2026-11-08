import { world } from '../../browser/world-state.js';
import { invalidateGlobeBackground } from '../../globe/draw.js';
import { $, gpuCanvas } from '../../layout/elements.js';
import { atlasCamera, syncAtlasFromLocal, syncLocalFromAtlas } from '../atlas/camera.js';
import { chooseMapSurface, ensureInitialViewport } from './surface.js';
import { markRender } from '../../match/hud/status.js';
import { basis, cross, mod } from '../../world/geometry.js';

function toggleView() {
  const intoGlobe = world.view === 'flat';
  if (intoGlobe) {
    if (world.chart) syncAtlasFromLocal();
    world.globeLook = atlasCamera.look.slice();
    world.globeRight = atlasCamera.right.slice();
  } else {
    atlasCamera.look = world.globeLook.slice();
    atlasCamera.right = (world.globeRight || basis(world.globeLook).right).slice();
    syncLocalFromAtlas();
    chooseMapSurface();
    gpuCanvas.style.display = 'none';
  }
  world.view = intoGlobe ? 'globe' : 'flat';
  world.hover = null;
  $('hl-viewmode').textContent = intoGlobe ? 'Voltar ao mapa' : 'Globo 3D';
  $('hl-modehint').textContent = intoGlobe
    ? 'Arraste para girar · roda ou pinça para zoom'
    : 'Arraste para mover · clique para carimbar';
  invalidateGlobeBackground();
  markRender();
}
function sideFlip() {
  world.side *= -1;
  world.hover = null;
  if (world.chart) {
    syncAtlasFromLocal();
    chooseMapSurface();
  }
  $('hl-side').textContent = world.side === 1 ? 'Exterior' : 'Interior';
  markRender();
}
function rotateWorld(dir) {
  if (world.view === 'globe') {
    const right = world.globeRight || basis(world.globeLook).right,
      up = cross(world.globeLook, right),
      a = (dir * Math.PI) / 3;
    world.globeRight = right.map((v, i) => v * Math.cos(a) + up[i] * Math.sin(a));
  } else if (world.chart) {
    world.orient = mod(world.orient + dir, 6);
    ensureInitialViewport();
  } else {
    const up = cross(atlasCamera.look, atlasCamera.right),
      a = (dir * Math.PI) / 3;
    atlasCamera.right = atlasCamera.right.map((v, i) => v * Math.cos(a) + up[i] * Math.sin(a));
    syncLocalFromAtlas();
  }
  world.hover = null;
  markRender();
}

export { rotateWorld, sideFlip, toggleView };
