import { world } from '../../browser/world-state.js';
import { nearestGlobeVertex } from '../../globe/camera/nearest-vertex.js';
import { cv } from '../../layout/elements.js';
import { atlasCapInverse, atlasPole } from './polar-projection.js';
import { mapUnit, minimumAtlasScale } from '../camera/scale.js';
import { point } from '../camera/world-point.js';
import { DX } from '../local/hex-metrics.js';
import { clamp, cross, normal, vdot } from '../../world/geometry.js';

// Regional map camera. Its basis rotates with the surface, including across a geographic pole.
const atlasCamera = { look: [0, 0, 1], right: [1, 0, 0], scale: 1, pitch: 0, graph: null };
function atlasRect() {
  return cv.getBoundingClientRect();
}
function atlasUp() {
  return cross(atlasCamera.look, atlasCamera.right).map((v) => v * world.side);
}
function atlasScaleForZoom(z) {
  const pitch =
    atlasCamera.graph === world.graph && atlasCamera.pitch > 0
      ? atlasCamera.pitch
      : 1.205 / world.graph.f;
  return (DX * z) / pitch;
}
function syncAtlasFromLocal() {
  const g = world.graph,
    look = normal(point(world.center));
  const neighbor = normal(point(g.adj[world.center * 6 + world.orient]));
  const dot = vdot(look, neighbor);
  atlasCamera.look = look;
  atlasCamera.right = normal(neighbor.map((v, i) => v - dot * look[i]));
  atlasCamera.pitch = Math.atan2(Math.hypot(...cross(look, neighbor)), dot);
  atlasCamera.graph = g;
  atlasCamera.scale = atlasScaleForZoom(world.zoom);
}
// +longitude at a cell is the direction the player's stamp should treat as screen-right.
function atlasOrientationAt(id) {
  const g = world.graph,
    p = normal(point(id)),
    pole = cross(atlasCamera.look, atlasCamera.right);
  let east = cross(pole, p);
  if (vdot(east, east) < 1e-14) east = atlasCamera.right;
  const orient = normal(east);
  let best = 0,
    score = -Infinity;
  for (let k = 0; k < g.deg[id]; k++) {
    const nb = point(g.adj[id * 6 + k]),
      along = vdot(p, nb);
    const tangent = normal(nb.map((v, i) => v - along * p[i]));
    const dot = vdot(tangent, orient);
    if (dot > score) {
      score = dot;
      best = k;
    }
  }
  return best;
}
function syncLocalFromAtlas() {
  const g = world.graph,
    look = atlasCamera.look;
  let best = nearestGlobeVertex(g, look, world.center);
  if (g.deg[best] === 5) {
    const pent = best;
    let score = -Infinity;
    for (let k = 0; k < 5; k++) {
      const id = g.adj[pent * 6 + k],
        d = vdot(look, point(id));
      if (d > score) {
        score = d;
        best = id;
      }
    }
  }
  world.center = best;
  world.orient = atlasOrientationAt(best);
  world.offsetX = world.offsetY = 0;
  world.hover = null;
}

function atlasCapBlend(scale) {
  const home = mapUnit(world.graph.f) * world.homeZoom,
    far = minimumAtlasScale(atlasRect()),
    d = clamp((home - scale) / Math.max(1, home - far), 0, 1);
  return d * d * (3 - 2 * d);
}

function atlasRay(clientX, clientY, scale = atlasCamera.scale, clampToMap = false) {
  const r = atlasRect(),
    lon = (clientX - r.left - r.width / 2) / scale,
    lat = (r.top + r.height / 2 - clientY) / scale;
  if (!clampToMap && (Math.abs(lon) > Math.PI || Math.abs(lat) > Math.PI / 2)) return null;
  const b = clamp(lat, -atlasPole, atlasPole),
    a = atlasCapInverse(clamp(lon, -Math.PI, Math.PI), b, atlasCapBlend(scale), clampToMap);
  if (a === null) return null;
  const c = Math.cos(b);
  const x = c * Math.sin(a),
    y = Math.sin(b),
    z = c * Math.cos(a),
    up = atlasUp();
  return atlasCamera.look.map((v, i) => z * v + x * atlasCamera.right[i] + y * up[i]);
}
function atlasAlign(from, to) {
  // Rotate the entire frame so the original grabbed point stays at its new pixel.
  let axis = cross(from, to),
    sin = Math.hypot(...axis);
  const cos = clamp(vdot(from, to), -1, 1);
  if (sin < 1e-12) {
    if (cos > 0) return false;
    axis = normal(cross(from, Math.abs(from[1]) < 0.85 ? [0, 1, 0] : [1, 0, 0]));
    sin = 0;
  } else axis = axis.map((v) => v / sin);
  const rotate = (v) => {
    const t = cross(axis, v),
      k = vdot(axis, v) * (1 - cos);
    return v.map((value, i) => cos * value + sin * t[i] + k * axis[i]);
  };
  const look = normal(rotate(atlasCamera.look)),
    right = rotate(atlasCamera.right),
    dot = vdot(look, right);
  atlasCamera.look = look;
  atlasCamera.right = normal(right.map((v, i) => v - dot * look[i]));
  return true;
}
function atlasPan(prevX, prevY, x, y) {
  const scale = atlasCamera.scale;
  return atlasAlign(atlasRay(x, y, scale, true), atlasRay(prevX, prevY, scale, true));
}
function atlasZoomAt(oldScale, newScale, x, y) {
  if (!(newScale > 0)) return;
  if (Number.isFinite(x) && Number.isFinite(y)) {
    const grabbed = atlasRay(x, y, oldScale);
    if (grabbed) atlasAlign(atlasRay(x, y, newScale, true), grabbed);
  }
  atlasCamera.scale = newScale;
}

export {
  atlasAlign,
  atlasCamera,
  atlasCapBlend,
  atlasOrientationAt,
  atlasPan,
  atlasRay,
  atlasUp,
  atlasZoomAt,
  syncAtlasFromLocal,
  syncLocalFromAtlas,
};
