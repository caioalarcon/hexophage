import { world } from '../browser/world-state.js';
import { $, cv, ev } from './elements.js';
import { atlasCamera, syncAtlasFromLocal, syncLocalFromAtlas } from '../map/atlas/camera.js';
import { chooseMapSurface, maximumZoom, minimumZoom } from '../map/camera/surface.js';
import { mapUnit } from '../map/camera/scale.js';
import { measure } from '../map/canvas-size.js';
import { clamp } from '../world/geometry.js';

function observeCanvasSizes() {
  let mapWidth = 0,
    mapHeight = 0;
  const observer = new ResizeObserver(() => {
    const r = cv.getBoundingClientRect();
    if (world.graph && (r.width !== mapWidth || r.height !== mapHeight)) {
      const wasOverview =
        mapWidth > 0 &&
        Math.abs(world.zoom * mapUnit(world.graph.f) - Math.min(mapWidth / (2 * Math.PI), mapHeight / Math.PI)) <
          0.01;
      mapWidth = r.width;
      mapHeight = r.height;
      measure(cv);
      if (world.view === 'flat') {
        if (world.chart) syncAtlasFromLocal();
        world.zoom = wasOverview ? minimumZoom() : clamp(world.zoom, minimumZoom(), maximumZoom());
        atlasCamera.scale = world.zoom * mapUnit(world.graph.f);
        syncLocalFromAtlas();
        chooseMapSurface();
      }
      world.needsDraw = world.needsGrid = world.needsGlobeBase = true;
    }
    if (measure(ev)) world.needsEditor = true;
  });
  observer.observe($('hl-worldbox'));
  observer.observe($('hl-editorbox'));
}

export { observeCanvasSizes };
