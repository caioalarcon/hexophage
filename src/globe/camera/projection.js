import { normal } from '../../world/geometry.js';

function project3D(x, y, z, view) {
  if (view.inside) {
    if (z <= 0.1) return null;
    return [view.cx + (x / z) * view.focal, view.cy - (y / z) * view.focal];
  }
  if (z <= 0.035) return null;
  return [view.cx + x * view.radius, view.cy - y * view.radius];
}

function grabVector(clientX, clientY, v) {
  const scale = v.inside ? v.focal : v.radius;
  const x = (clientX - v.cx) / scale,
    y = (v.cy - clientY) / scale;
  return normal([x, y, v.inside ? 1 : Math.sqrt(Math.max(0, 1 - x * x - y * y))]);
}

export { grabVector, project3D };
