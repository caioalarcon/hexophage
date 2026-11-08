import { world } from '../../browser/world-state.js';
import { clamp } from '../../world/geometry.js';

// A stable camera can reuse the covered device pixels of a site across births
// and ownership changes. The direct-mapped cache is bounded independently of f.
function coverageCacheFor(a) {
  let c = a.coverage;
  const size = 2 ** Math.ceil(Math.log2(clamp(world.activeCount * 1.5, 8192, 524288)));
  if (!c || c.tags.length < size)
    c = a.coverage = {
      tags: new Uint32Array(size),
      base: new Uint32Array(size),
      shape: new Uint32Array(size),
      mask: size - 1,
    };
  if (c.version !== a.version) {
    c.version = a.version;
    c.tags.fill(0);
  }
  return c;
}

export { coverageCacheFor };
