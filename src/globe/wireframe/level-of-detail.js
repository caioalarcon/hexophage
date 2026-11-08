import { world } from '../../browser/world-state.js';
import { nearestGlobeVertex } from '../camera/nearest-vertex.js';
import { navigatorView } from '../navigator/surface.js';
import { gpu } from '../webgl/context.js';
import { globeWireLines } from './edge-lines.js';
import { vdot } from '../../world/geometry.js';
import { buildSphere, sphereCorner } from '../../world/sphere.js';

// Visual LOD only: neither ownership nor graph adjacency is altered.
function globeWireGraph() {
  const target = !navigatorView.expanded
    ? 16
    : gpu.failed && world.drag?.moved
      ? 12
      : world.globeZoom >= 2.5
        ? 48
        : 24;
  const full = gpu.wireMode === 'full' && world.graph.f <= 96;
  const f = gpu.wireMode === 'none' ? 0 : full ? world.graph.f : Math.min(world.graph.f, target);
  if (!f) return null;
  if (f === world.graph.f) return world.graph;
  if (!gpu.lodGraphs.has(f)) gpu.lodGraphs.set(f, buildSphere(f));
  return gpu.lodGraphs.get(f);
}

// At close range, build just the real wires covering the screen. The padded
// spherical cap can be reused over multiple rotations and zoom steps.
let localGlobeWire = null;

function globeWireMesh(v) {
  if (gpu.wireMode === 'none') return null;
  const g = world.graph,
    scale = v.inside ? v.focal : v.radius,
    diagonal = Math.hypot(v.w, v.h) / 2;
  const angle = v.inside ? Math.atan(diagonal / scale) : Math.asin(Math.min(1, diagonal / scale));
  const pitch = (1.205 * scale) / g.f,
    limit = gpu.wireMode === 'full' ? 4 : 7;
  const estimated = g.n * (1 - Math.cos(angle)) * 0.5;
  if (angle < 1.15 && pitch >= limit && estimated < 22000) {
    const saved = localGlobeWire;
    if (
      saved?.g === g &&
      angle <= saved.angle &&
      vdot(v.look, saved.look) >= Math.cos(saved.angle - angle)
    )
      return saved;
    const reach = angle * 1.2 + 2 / g.f,
      bound = Math.cos(reach),
      c = g.coords;
    const seed = nearestGlobeVertex(g, v.look, saved?.g === g ? saved.seed : world.center);
    const ids = [seed],
      seen = new Set(ids);
    for (let h = 0; h < ids.length; h++) {
      const id = ids[h];
      for (let k = 0; k < g.deg[id]; k++) {
        const n = g.adj[6 * id + k];
        if (seen.has(n)) continue;
        seen.add(n);
        if (c[3 * n] * v.look[0] + c[3 * n + 1] * v.look[1] + c[3 * n + 2] * v.look[2] >= bound)
          ids.push(n);
      }
    }
    const lines = new Float32Array(ids.length * 36);
    let w = 0;
    for (const id of ids)
      for (let k = 0; k < g.deg[id]; k++) {
        const nk = (k + 1) % g.deg[id];
        if (id > g.adj[6 * id + nk]) continue;
        for (const corner of [k, nk]) {
          if (g.polygons) {
            const j = (id * 6 + corner) * 3;
            lines[w] = g.polygons[j];
            lines[w + 1] = g.polygons[j + 1];
            lines[w + 2] = g.polygons[j + 2];
          } else sphereCorner(g, id, corner, lines, w);
          w += 3;
        }
      }
    localGlobeWire = {
      g,
      f: g.f,
      look: v.look,
      angle: reach,
      seed,
      wireLines: lines.subarray(0, w),
      local: true,
    };
    return localGlobeWire;
  }
  const wire = globeWireGraph();
  globeWireLines(wire);
  return wire;
}

function clearGlobeWireMesh() {
  localGlobeWire = null;
}

export { clearGlobeWireMesh, globeWireMesh };
