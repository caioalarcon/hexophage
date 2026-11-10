// Count natural births in one interacting reaction, irrespective of owner.
// Two prospective live cells belong to the same reaction if they touch or
// share a neighbour; a chain of these links belongs to one component.
export const DEFAULT_GROWTH = 'classic';
export const DEFAULT_GROWTH_THRESHOLD = 384;
export const growthPolicies = Object.freeze({
  contained: 'Conter surtos',
  classic: 'Crescimento livre',
});

export function withGrowth(physics, id, threshold = DEFAULT_GROWTH_THRESHOLD) {
  if (!Object.hasOwn(growthPolicies, id)) throw new RangeError('Crescimento desconhecido: ' + id);
  if (!Number.isSafeInteger(threshold) || threshold < 1) throw new RangeError('Limiar de crescimento inválido');
  // B0 creates matter from the vacuum across the entire world. There are no
  // ancestral reactions to contain, including when the B0 domain is a torus.
  if (id === 'contained' && !physics.birthsFromVacuum) return { ...physics, growthThreshold: threshold };
  if (!physics.growthThreshold) return physics;
  const { growthThreshold, ...free } = physics;
  return free;
}

// Determine the entire set to extinguish before changing occupancy or the
// active list. A traversal may start anywhere without changing the outcome.
function hotCells(liveIds, threshold, born, take, expand) {
  const hot = [], queue = [];
  const visit = id => { if (take(id)) queue.push(id); };
  for (const first of liveIds) {
    if (!take(first)) continue;
    queue.length = 0;
    queue.push(first);
    let births = 0;
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      if (born(id)) births++;
      expand(id, visit);
    }
    if (births >= threshold) for (const id of queue) hot.push(id);
  }
  return hot;
}

export function quenchReactions(liveIds, threshold, born, expand, remove) {
  const remaining = new Set(liveIds);
  for (const id of hotCells(remaining, threshold, born, id => remaining.delete(id), expand)) remove(id);
}

export function quenchGraph({ adj, deg }, before, after, liveIds, threshold, remove) {
  // The synchronous candidate buffer is complete. Use a transient second bit
  // instead of allocating a planet-sized visited array or hashing every site.
  const take = id => {
    if (after[id] !== 1) return false;
    after[id] = 2;
    return true;
  };
  const hot = hotCells(liveIds, threshold, id => !before[id], take, (id, visit) => {
    for (let k = 0; k < deg[id]; k++) {
      const near = adj[6 * id + k];
      if (after[near] === 1) visit(near);
      for (let j = 0; j < deg[near]; j++) {
        const far = adj[6 * near + j];
        if (after[far] === 1) visit(far);
      }
    }
  });
  for (const id of liveIds) after[id] = 1;
  for (const id of hot) remove(id);
}
