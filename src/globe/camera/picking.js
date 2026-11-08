import { world } from '../../browser/world-state.js';
import { nearestGlobeVertex } from './nearest-vertex.js';
import { globeContext } from './view.js';
import { globeTarget } from '../navigator/surface.js';
import { normal } from '../../world/geometry.js';

function closestVisibleCell(clientX, clientY) {
  const rect = globeTarget.getBoundingClientRect(),
    v = globeContext();
  let x, y, z;
  if (v.inside) {
    x = (clientX - rect.left - v.cx) / v.focal;
    y = -(clientY - rect.top - v.cy) / v.focal;
    z = 1;
    const l = Math.hypot(x, y, z);
    x /= l;
    y /= l;
    z /= l;
  } else {
    x = (clientX - rect.left - v.cx) / v.radius;
    y = -(clientY - rect.top - v.cy) / v.radius;
    if (x * x + y * y > 1) return null;
    z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  }
  const target = normal([
    v.right[0] * x + v.up[0] * y + v.look[0] * z,
    v.right[1] * x + v.up[1] * y + v.look[1] * z,
    v.right[2] * x + v.up[2] * y + v.look[2] * z,
  ]);
  return nearestGlobeVertex(world.graph, target, world.center);
}

export { closestVisibleCell };
