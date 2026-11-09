export function allocateCells(n) {
  const store = {lastOutbreak:null};
  store.cells = new Uint8Array(n);
  store.next = new Uint8Array(n);
  store.owners = new Uint8Array(n);
  store.nextOwners = new Uint8Array(n);
  store.ownerIndex = new Uint32Array(n);
  store.ownerCells = Array.from({ length: 8 }, () => []);
  store.nextOwnerCells = Array.from({ length: 8 }, () => []);
  const workSize = Math.min(n, 4096);
  store.active = new Uint32Array(workSize);
  store.nextActive = new Uint32Array(workSize);
  store.positionsActive = new Uint32Array(n);
  store.candidates = new Uint32Array(workSize);
  store.marks = new Uint32Array(Math.ceil(n / 32));
  return store;
}

export function fitIndexBuffer(buffer, needed, limit) {
  if (buffer.length >= needed) return buffer;
  const capacity = Math.min(limit, Math.max(needed, buffer.length * 2)),
    grown = new Uint32Array(capacity);
  grown.set(buffer);
  return grown;
}

export function createPopulation(world, effects) {
  function addLive(id, owner = 7) {
    if (world.cells[id]) return false;
    world.cells[id] = 1;
    world.owners[id] = owner;
    world.active = fitIndexBuffer(world.active, world.activeCount + 1, world.graph.n);
    world.active[world.activeCount] = id;
    world.positionsActive[id] = ++world.activeCount;
    const owners = world.ownerCells[owner];
    world.ownerIndex[id] = owners.length + 1;
    owners.push(id);
    effects.populationChanged?.();
    return true;
  }
  function removeLive(id) {
    if (!world.cells[id]) return false;
    world.cells[id] = 0;
    const loc = world.positionsActive[id] - 1,
      last = world.active[--world.activeCount];
    world.active[loc] = last;
    world.positionsActive[last] = loc + 1;
    world.positionsActive[id] = 0;
    const owner = world.owners[id],
      items = world.ownerCells[owner];
    const slot = world.ownerIndex[id] - 1,
      tail = items.pop();
    if (slot < items.length) {
      items[slot] = tail;
      world.ownerIndex[tail] = slot + 1;
    }
    world.owners[id] = 0;
    world.ownerIndex[id] = 0;
    effects.populationChanged?.();
    return true;
  }

  function clearCells() {
    effects.pause?.();
    for (let i = 0; i < world.activeCount; i++) {
      const id = world.active[i];
      world.cells[id] = world.owners[id] = world.ownerIndex[id] = world.positionsActive[id] = 0;
    }
    for (let i = 0; i < world.nextActiveCount; i++) {
      const id = world.nextActive[i];
      world.next[id] = world.nextOwners[id] = 0;
    }
    world.ownerCells = Array.from({ length: 8 }, () => []);
    world.nextOwnerCells = Array.from({ length: 8 }, () => []);
    world.activeCount = 0;
    world.nextActiveCount = 0;
    world.gen = 0;
    world.lastOutbreak = null;
    world.evaluated = 0;
    effects.populationCleared?.();
  }

  return { addLive, removeLive, clearCells };
}
