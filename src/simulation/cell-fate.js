// Bind the current buffers once per generation. Each lookup yields zero or the surviving/newborn owner.
export function evaluateCell(world) {
  const {
    cells: a,
    owners: oa,
    graph: { adj, deg },
  } = world;
  const callahan = world.rule === 'callahan';
  const ownerCounts = new Uint8Array(8); // Reused for optional custom rules.
  return (id) => {
    const j = id * 6,
      d = deg[id];
    let count = 0,
      mask = 0;
    for (let k = 0; k < d; k++) {
      const bit = a[adj[j + k]];
      count += bit;
      mask |= bit << k;
    }
    const live = callahan
      ? d === 6
        ? a[id]
          ? world.callSurv6[mask]
          : world.callBirth6[mask]
        : a[id]
          ? world.callSurv5[mask]
          : world.callBirth5[mask]
      : a[id]
        ? world.survival[count]
        : world.birth[count];
    if (!live) return 0;
    if (a[id]) return oa[id];
    // Births with parents from different owners become physically live neutral cells.
    // A unique strict majority of living parents is required for ownership.
    if (callahan) {
      let first = 0;
      for (let k = 0; k < d; k++)
        if ((mask >>> k) & 1) {
          const parent = oa[adj[j + k]];
          if (first && first !== parent) return 7;
          first = parent;
        }
      return first || 7;
    }
    ownerCounts.fill(0);
    let best = 0,
      winning = 7,
      tied = false;
    for (let k = 0; k < d; k++)
      if ((mask >> k) & 1) {
        const idOwner = oa[adj[j + k]];
        ownerCounts[idOwner]++;
      }
    for (let owner = 1; owner <= 7; owner++) {
      if (ownerCounts[owner] > best) {
        best = ownerCounts[owner];
        winning = owner;
        tied = false;
      } else if (ownerCounts[owner] === best && best > 0) tied = true;
    }
    return tied || winning === 7 ? 7 : winning;
  };
}
