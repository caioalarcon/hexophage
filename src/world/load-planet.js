import { world } from '../browser/world-state.js';
import { navigatorView } from '../globe/navigator/surface.js';
import { gpu } from '../globe/webgl/context.js';
import { clearGlobeWireMesh } from '../globe/wireframe/level-of-detail.js';
import { $, cv } from '../layout/elements.js';
import { clearAtlasLayer } from '../map/atlas/viewport.js';
import { ensureInitialViewport } from '../map/camera/surface.js';
import { chooseEast, point } from '../map/camera/world-point.js';
import { clearFrameLayout } from '../map/local/hex-layout.js';
import { bumpPopulationRevision, clearLiveTileIndex } from '../map/population/tile-index.js';
import { setPlay } from '../match/controls/playback.js';
import { markRender, updateStats } from '../match/hud/status.js';
import { clearStampGeometry } from '../patterns/placement/footprint.js';
import { allocateCells } from '../simulation/population.js';
import { buildSphere } from './sphere.js';

function newWorld(f, prepared, storage) {
  const graph = prepared || buildSphere(f),
    n = graph.n;
  const buffers = storage || allocateCells(n);
  setPlay(false);
  world.graph = graph;
  clearLiveTileIndex();
  gpu.planet = null;
  clearFrameLayout();
  world.globeZoom = 1;
  clearGlobeWireMesh();
  clearAtlasLayer();
  clearStampGeometry();
  Object.assign(world, buffers);
  world.activeCount = 0;
  world.nextActiveCount = 0;
  world.epoch = 0;
  world.gen = 0;
  world.evaluated = 0;
  bumpPopulationRevision();
  world.center = world.graph.farthest;
  world.orient = chooseEast(world.center);
  world.side = 1;
  world.view = 'flat';
  world.homeZoom = cv.clientWidth < 550 ? 0.76 : 0.94;
  world.zoom = world.homeZoom;
  $('hl-side').textContent = 'Exterior';
  navigatorView.dirty = true;
  ensureInitialViewport();
  world.globeLook = point(world.center);
  world.globeRight = null;
  $('hl-dims').textContent = n.toLocaleString('pt-BR') + ' células';
  $('hl-mesh').textContent = `${f} · 12 pentágonos / ${(n - 12).toLocaleString('pt-BR')} hexágonos`;
  markRender();
  updateStats();
}

export { newWorld };
