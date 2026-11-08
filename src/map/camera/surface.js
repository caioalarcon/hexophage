import { world } from '../../browser/world-state.js';
import { cv } from '../../layout/elements.js';
import { atlasCamera, syncAtlasFromLocal } from '../atlas/camera.js';
import { mapUnit, minimumAtlasScale } from './scale.js';
import { makeChart } from '../local/chart.js';
import { chartWithinBudget } from '../local/hex-layout.js';
import { DX, DY } from '../local/hex-metrics.js';
import { clamp } from '../../world/geometry.js';

// A local window has one exact hexagonal coordinate system. Wider views use the
// projected game graph, so a distant pentagon never dictates the camera scale.
function minimumZoom() {
  return minimumAtlasScale(cv.getBoundingClientRect()) / mapUnit(world.graph.f);
}
function detailThreshold() {
  const r = cv.getBoundingClientRect(),
    f = world.graph.f;
  return Math.max(r.width / (0.8 * f * DX), r.height / (0.55 * f * DY));
}
function maximumZoom() {
  return Math.max(3.3, Math.min(8, detailThreshold() * 1.25));
}

function chooseMapSurface() {
  world.chart =
    world.zoom >= detailThreshold() && chartWithinBudget(cv.getBoundingClientRect(), world.zoom)
      ? makeChart(world.center, world.orient)
      : null;
  world.offsetX = world.offsetY = 0;
  world.hover = null;
}
function ensureInitialViewport() {
  world.zoom = clamp(world.zoom, minimumZoom(), maximumZoom());
  syncAtlasFromLocal();
  atlasCamera.scale = world.zoom * mapUnit(world.graph.f);
  chooseMapSurface();
}

export { chooseMapSurface, ensureInitialViewport, maximumZoom, minimumZoom };
