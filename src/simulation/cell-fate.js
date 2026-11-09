// Bind the current buffers and rule once per generation. Zero denotes a dead site.
export function evaluateCell({ cells, owners, graph: { adj, deg, ids }, physics }) {
  const { tables, birthOwner } = physics;
  const counts = new Uint8Array(8);
  return (id) => {
    const offset = id * 6, degree = deg[id];
    let mask = 0;
    for (let k = 0; k < degree; k++) mask |= cells[adj[offset + k]] << k;
    if (!tables[degree][cells[id]][mask]) return 0;
    return cells[id] ? owners[id] : birthOwner(owners, adj, offset, degree, mask, counts, ids);
  };
}
