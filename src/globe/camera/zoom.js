import { world } from '../../browser/world-state.js';
import { orientGlobe } from './drag.js';
import { grabVector } from './projection.js';
import { globeContext } from './view.js';
import { globeTarget, navigatorView } from '../navigator/surface.js';
import { clamp, cross, vdot } from '../../world/geometry.js';

function maxGlobeZoom() {
  const r = globeTarget.getBoundingClientRect();
  return Math.max(
    6,
    Math.min(512, (60 * world.graph.f) / Math.max(1, Math.min(r.width, r.height))),
  );
}
function zoomGlobe(factor, x, y, prevX = x, prevY = y) {
  if (!navigatorView.expanded) return; // The miniature is a navigator, not a zoomable view.
  const before = globeContext(),
    old = world.globeZoom;
  world.globeZoom = clamp(old * factor, 0.5, maxGlobeZoom());
  const after = globeContext(),
    r = globeTarget.getBoundingClientRect();
  if (Number.isFinite(x) && Number.isFinite(y)) {
    const captured =
      before.inside ||
      Math.hypot(prevX - r.left - before.cx, prevY - r.top - before.cy) <= before.radius;
    if (captured) {
      const from = grabVector(x - r.left, y - r.top, after),
        to = grabVector(prevX - r.left, prevY - r.top, before);
      const axis = cross(from, to),
        len = Math.hypot(...axis);
      if (len > 1e-10)
        orientGlobe(
          before,
          axis.map((a) => a / len),
          Math.atan2(len, vdot(from, to)),
        );
    }
  }
  if (world.drag) {
    world.drag.startX = world.drag.x;
    world.drag.startY = world.drag.y;
    world.drag.arcball = null;
  }
  world.needsGrid = world.needsDraw = world.needsGlobeBase = true;
}

export { maxGlobeZoom, zoomGlobe };
