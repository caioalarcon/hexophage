import { fitIndexBuffer } from './population.js';
import { evaluateCell } from './cell-fate.js';

export function advanceGeneration(world) {
  let births = 0;
  const a = world.cells,
    b = world.next,
    oa = world.owners,
    ob = world.nextOwners,
    g = world.graph,
    adj = g.adj,
    deg = g.deg,
    n = g.n;
  const act = world.active,
    actCount = world.activeCount,
    positions = world.positionsActive;
  const useDense = world.physics.birthsFromVacuum || actCount * 7 >= n;
  const bound = useDense ? n : actCount * 7;
  const newActive = (world.nextActive = fitIndexBuffer(world.nextActive, bound, n));
  if (!useDense) world.candidates = fitIndexBuffer(world.candidates, bound, n);
  let nextCount = 0,
    evaluated = 0;
  if (!useDense)
    for (let i = 0; i < world.nextActiveCount; i++) {
      const id = newActive[i];
      b[id] = 0;
      ob[id] = 0;
    }
  for (let i = 0; i < actCount; i++) {
    const id = act[i];
    positions[id] = 0;
    world.ownerIndex[id] = 0;
  }
  const oldOwnerCells = world.ownerCells,
    nextOwnerCells = world.nextOwnerCells;
  for (const items of nextOwnerCells) items.length = 0;
  const calc = evaluateCell(world);
  const store = (id, owner) => {
    if (owner === 1 && !a[id]) births++;
    b[id] = 1;
    ob[id] = owner;
    newActive[nextCount] = id;
    positions[id] = ++nextCount;
    const v = nextOwnerCells[owner];
    world.ownerIndex[id] = v.length + 1;
    v.push(id);
  };
  if (useDense) {
    for (let id = 0; id < n; id++) {
      const owner = calc(id);
      if (owner) store(id, owner);
      else {
        b[id] = 0;
        ob[id] = 0;
      }
    }
    evaluated = n;
  } else {
    const marks = world.marks,
      candidates = world.candidates;
    let nCand = 0;
    const insert = (id) => {
      const word = id >>> 5,
        bit = 1 << (id & 31);
      if ((marks[word] & bit) === 0) {
        marks[word] |= bit;
        candidates[nCand++] = id;
      }
    };
    for (let k = 0; k < actCount; k++) {
      const id = act[k],
        j = id * 6;
      insert(id);
      for (let z = 0; z < deg[id]; z++) insert(adj[j + z]);
    }
    for (let k = 0; k < nCand; k++) {
      const id = candidates[k];
      marks[id >>> 5] &= ~(1 << (id & 31));
      const owner = calc(id);
      if (owner) store(id, owner);
    }
    evaluated = nCand;
  }
  world.cells = b;
  world.next = a;
  world.owners = ob;
  world.nextOwners = oa;
  world.active = newActive;
  world.nextActive = act;
  world.activeCount = nextCount;
  world.nextActiveCount = actCount;
  world.ownerCells = nextOwnerCells;
  world.nextOwnerCells = oldOwnerCells;
  world.gen++;
  world.evaluated = evaluated;
  world.statCount++;
  return births;
}
