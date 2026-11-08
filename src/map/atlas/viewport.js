import { world } from '../../browser/world-state.js';
import { cv } from '../../layout/elements.js';
import { atlasCamera, atlasCapBlend, atlasUp } from './camera.js';

// One unwrapped cartographic copy, centered on the current camera frame.
const atlasMetrics = {
  visibleCount: 0,
  total: 0,
  gridVisible: false,
  bounds: [0, 0, 0, 0],
  pitch: 0,
};
let atlasLayer = null;
const atlasPick = { id: 0 };
function atlasState() {
  const r = cv.getBoundingClientRect(),
    s = atlasCamera.scale,
    up = atlasUp(),
    g = world.graph;
  const w = r.width,
    h = r.height,
    dpr = cv.width / Math.max(w, 1),
    look = atlasCamera.look,
    right = atlasCamera.right;
  const signature = [w, h, dpr, s, ...look, ...right, ...up, Number(world.showFaults)].join('|');
  if ((!atlasLayer || atlasLayer.g !== g) && !g.polygons) {
    // Large spheres retain no per-world projection buffers. Geometry and visibility
    // are queried only for the working region, live cells, the cursor, and stamps.
    atlasLayer = { g, base: document.createElement('canvas'), version: 0 };
    atlasPick.id = world.center;
  } else if (!atlasLayer || atlasLayer.g !== g) {
    const aliases = new Int32Array(g.n * 6);
    // Each triangle barycenter is shared by three neighboring cells. Project it once.
    for (let id = 0; id < g.n; id++)
      for (let k = 0; k < g.deg[id]; k++) {
        const next = (k + 1) % g.deg[id],
          a = g.adj[id * 6 + k],
          b = g.adj[id * 6 + next];
        if (id < a && id < b) {
          aliases[id * 6 + k] = id * 6 + k;
          continue;
        }
        const slot = a < b ? k : next,
          owner = Math.min(a, b),
          other = Math.max(a, b);
        const rev = g.backSlot[id * 6 + slot],
          deg = g.deg[owner];
        const corner = g.adj[owner * 6 + ((rev + 1) % deg)] === other ? rev : (rev + deg - 1) % deg;
        aliases[id * 6 + k] = owner * 6 + corner;
      }
    atlasLayer = {
      g,
      aliases,
      base: document.createElement('canvas'),
      cornersX: new Float32Array(6 * g.n),
      cornersY: new Float32Array(6 * g.n),
      epoch: new Uint32Array(6 * g.n),
      version: 0,
      visible: new Uint8Array(g.n),
    };
    atlasPick.id = world.center;
  }
  const a = atlasLayer;
  if (a.signature === signature) return a;
  a.signature = signature;
  a.version++;
  a.w = w;
  a.h = h;
  a.s = s;
  a.dpr = dpr;
  a.look = look;
  a.right = right;
  a.up = up;
  a.cx = w / 2;
  a.cy = h / 2;
  a.turn = Math.PI * 2 * s;
  a.capBlend = atlasCapBlend(s);
  a.x0 = Math.max(0, a.cx - Math.PI * s);
  a.x1 = Math.min(w, a.cx + Math.PI * s);
  a.y0 = Math.max(0, a.cy - (Math.PI * s) / 2);
  a.y1 = Math.min(h, a.cy + (Math.PI * s) / 2);
  atlasMetrics.total = g.n;
  atlasMetrics.pitch = (1.16 * s) / g.f;
  atlasMetrics.bounds = [a.x0, a.y0, a.x1, a.y1];
  a.drawGrid = atlasMetrics.gridVisible = atlasMetrics.pitch >= 4.25;
  return a;
}

function clearAtlasLayer() {
  atlasLayer = null;
}

export { atlasMetrics, atlasPick, atlasState, clearAtlasLayer };
