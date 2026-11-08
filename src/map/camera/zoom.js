import { world } from '../../browser/world-state.js';
import { zoomGlobe } from '../../globe/camera/zoom.js';
import {
  atlasAlign,
  atlasCamera,
  atlasRay,
  atlasZoomAt,
  syncAtlasFromLocal,
  syncLocalFromAtlas,
} from '../atlas/camera.js';
import { chooseMapSurface, maximumZoom, minimumZoom } from './surface.js';
import { mapUnit } from './scale.js';
import { point } from './world-point.js';
import { hit, hitAtlas } from '../hit-test.js';
import { makeChart } from '../local/chart.js';
import { markRender } from '../../match/hud/status.js';
import { clamp, key, normal } from '../../world/geometry.js';

function zoom(factor, clientX, clientY) {
  if (world.view === 'globe') {
    zoomGlobe(factor, clientX, clientY);
    return;
  }
  const old = world.zoom,
    wanted = clamp(old * factor, minimumZoom(), maximumZoom());
  if (Math.abs(old - wanted) < 1e-7) return;
  const pointed = Number.isFinite(clientX) && world.view === 'flat';
  const oldHit = pointed ? hit(clientX, clientY) : null;
  const target = oldHit
    ? (oldHit.id ?? world.chart.map.get(key(oldHit.q, oldHit.r))?.id)
    : undefined;
  if (world.chart) {
    syncAtlasFromLocal();
    atlasCamera.scale = old * mapUnit(world.graph.f);
  }
  atlasZoomAt(atlasCamera.scale, wanted * mapUnit(world.graph.f), clientX, clientY);
  world.zoom = wanted;
  syncLocalFromAtlas();
  chooseMapSurface();
  // Use graph identity across projection changes so zooming in on a structure
  // keeps the same cell beneath the mouse, including after the lattice snaps.
  if (target !== undefined && world.chart) {
    const cursor = hit(clientX, clientY);
    if (cursor && world.chart.map.get(key(cursor.q, cursor.r))?.id !== target) {
      let node;
      for (const cell of world.chart.map.values()) {
        if (cell.id === target) {
          node = cell;
          break;
        }
      }
      const pose = node && world.chart.map.get(key(node.q - cursor.q, node.r - cursor.r));
      const chart = pose && makeChart(pose.id, pose.ori);
      if (chart?.map.get(key(cursor.q, cursor.r))?.id === target) {
        world.center = pose.id;
        world.orient = pose.ori;
        world.chart = chart;
      } else world.chart = null;
    }
  }
  if (target !== undefined && !world.chart && hitAtlas(clientX, clientY)?.id !== target) {
    const ray = atlasRay(clientX, clientY);
    if (ray) {
      atlasAlign(ray, normal(point(target)));
      syncLocalFromAtlas();
    }
  }
  if (pointed) world.hover = hit(clientX, clientY);
  world.globeLook = point(world.center);
  world.globeRight = null;
  markRender();
}

export { zoom };
