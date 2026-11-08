import { world } from '../../browser/world-state.js';
import { globeTarget } from '../navigator/surface.js';
import { point } from '../../map/camera/world-point.js';
import { basis, cross, vdot } from '../../world/geometry.js';

function globeProjection(v, view) {
  const vec = point(v),
    look = view.look,
    right = view.right,
    up = view.up;
  return [vdot(vec, right), vdot(vec, up), vdot(vec, look)];
}
function globeContext() {
  const rect = globeTarget.getBoundingClientRect(),
    w = rect.width,
    h = rect.height;
  const look = world.globeLook || point(world.center);
  const right = world.globeRight || (world.globeRight = basis(look).right),
    up = cross(look, right),
    radius = Math.min(w, h) * 0.425 * world.globeZoom;
  return {
    w,
    h,
    look,
    right,
    up,
    radius,
    focal: Math.min(w, h) * 1.1 * world.globeZoom,
    cx: w / 2,
    cy: h / 2,
    inside: world.side === -1,
  };
}

export { globeContext, globeProjection };
