import { world } from '../../browser/world-state.js';
import { grabVector } from './projection.js';
import { globeContext } from './view.js';
import { globeTarget } from '../navigator/surface.js';
import { cross, normal, vdot } from '../../world/geometry.js';

// Store the camera at pointer-down. Rotating that basis as a whole preserves
// roll across the poles and keeps a grabbed surface point under the cursor.

function rotateGlobeFromDrag(drag) {
  let v = drag.arcball;
  if (!v) {
    v = globeContext();
    const rect = globeTarget.getBoundingClientRect();
    v.cx += rect.left;
    v.cy += rect.top;
    v.start = grabVector(drag.startX, drag.startY, v);
    v.outside = !v.inside && Math.hypot(drag.startX - v.cx, drag.startY - v.cy) >= v.radius;
    drag.arcball = v;
  }
  let axis, angle;
  if (v.outside) {
    const dx = drag.x - drag.startX,
      dy = drag.y - drag.startY;
    axis = normal([-dy, -dx, 0]);
    angle = Math.hypot(dx, dy) / v.radius;
  } else {
    const target = grabVector(drag.x, drag.y, v),
      n = cross(target, v.start);
    angle = Math.atan2(Math.hypot(...n), vdot(target, v.start));
    axis = normal(n);
  }
  orientGlobe(v, axis, angle);
}
function orientGlobe(v, axis, angle) {
  const [x, y, z] = axis,
    s = Math.sin(angle),
    c = Math.cos(angle),
    d = 1 - c;
  const fromCamera = (a, b, c) =>
    normal(v.look.map((_, i) => v.right[i] * a + v.up[i] * b + v.look[i] * c));
  world.globeRight = fromCamera(c + x * x * d, y * x * d + z * s, z * x * d - y * s);
  world.globeLook = fromCamera(x * z * d + y * s, y * z * d - x * s, c + z * z * d);
  world.needsGlobeBase = true;
  world.needsDraw = true;
}

export { orientGlobe, rotateGlobeFromDrag };
