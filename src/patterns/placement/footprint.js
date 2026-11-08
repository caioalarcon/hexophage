import { world } from '../../browser/world-state.js';
import { stepPose } from '../../map/local/oriented-step.js';
import { DIR, key } from '../../world/geometry.js';

// An off-screen part of a stamp must extend the same oriented patch as its anchor.
// Walk its axial convex hull once per hover cell. Only geometry is cached.
let stampGeometry = null;
function stampTargets(anchor, offsets) {
  const chart = world.chart,
    side = world.side,
    graph = world.graph;
  const aq = anchor.q ?? 0,
    ar = anchor.r ?? 0;
  const at = (q, r) => key(aq + q, ar + r);
  const origin = anchor.id !== undefined ? anchor : chart?.map.get(at(0, 0));
  if (!origin || graph.deg[origin.id] !== 6) return null;
  if (
    stampGeometry?.graph === graph &&
    stampGeometry.chart === chart &&
    stampGeometry.side === side &&
    stampGeometry.offsets === offsets &&
    stampGeometry.id === origin.id &&
    stampGeometry.ori === origin.ori
  )
    return stampGeometry.ids;
  const result = (stampGeometry = {
    graph,
    chart,
    side,
    offsets,
    id: origin.id,
    ori: origin.ori,
    ids: null,
  });
  if (chart) {
    const ids = offsets.map(([q, r]) => chart.map.get(at(q, r))?.id);
    if (ids.every((id) => id !== undefined)) return (result.ids = ids);
  }
  let q0 = 0,
    q1 = 0,
    r0 = 0,
    r1 = 0,
    s0 = 0,
    s1 = 0;
  for (const [q, r] of offsets) {
    q0 = Math.min(q0, q);
    q1 = Math.max(q1, q);
    r0 = Math.min(r0, r);
    r1 = Math.max(r1, r);
    s0 = Math.min(s0, q + r);
    s1 = Math.max(s1, q + r);
  }
  const queue = [{ q: 0, r: 0, id: origin.id, ori: origin.ori }];
  const local = new Map([[at(0, 0), queue[0]]]),
    projected = new Map();
  if (chart) for (const [k, c] of chart.map) projected.set(c.id, k);
  for (let head = 0; head < queue.length; head++) {
    const src = queue[head];
    for (let d = 0; d < 6; d++) {
      const q = src.q + DIR[d][0],
        r = src.r + DIR[d][1];
      if (q < q0 || q > q1 || r < r0 || r > r1 || q + r < s0 || q + r > s1) continue;
      const nextPose = stepPose(graph, src.id, src.ori, d, side);
      if (!nextPose) return null;
      const { id, ori } = nextPose,
        k = at(q, r);
      const other = local.get(k) || chart?.map.get(k);
      if (other && (other.id !== id || other.ori !== ori)) return null;
      if (projected.has(id) && projected.get(id) !== k) return null;
      if (local.has(k)) continue;
      const next = { q, r, id, ori };
      local.set(k, next);
      projected.set(id, k);
      queue.push(next);
    }
  }
  return (result.ids = offsets.map(([q, r]) => local.get(at(q, r)).id));
}

function clearStampGeometry() {
  stampGeometry = null;
}

export { clearStampGeometry, stampTargets };
