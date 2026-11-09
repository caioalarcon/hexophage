import { evaluateCell } from '../../simulation/cell-fate.js';
import { createStampCommands } from '../../match/stamping.js';
import { energyCost, generationEnergy } from '../../match/constructive-economy.js';
import { recordCombatDeath } from '../../match/combat/direct-death.js';
import { settleCombatTribute } from '../../match/combat/tribute.js';

// Copy only a graph ball. Ring order (including a pentagon's missing slot)
// comes straight from the real mesh. Its outermost ring is a fixed boundary.
function neighborhood(source, center, radius) {
  const ids = [center], index = new Map([[center, 0]]);
  const rings = [0];
  for (let r = 0; r < radius; r++) {
    const end = ids.length;
    for (let i = rings[r]; i < end; i++) {
      const id = ids[i];
      for (let k = 0; k < source.deg[id]; k++) {
        const next = source.adj[6 * id + k];
        if (!index.has(next)) {
          index.set(next, ids.length);
          ids.push(next);
        }
      }
    }
    rings.push(end);
  }
  const n = ids.length, complete = n === source.n;
  const interior = complete ? n : rings[radius];
  const edge = complete ? n : rings[radius - 1];
  const deg = new Uint8Array(n), adj = new Uint16Array(6 * interior);
  for (let i = 0; i < interior; i++) {
    const id = ids[i];
    deg[i] = source.deg[id];
    for (let k = 0; k < deg[i]; k++) adj[i * 6 + k] = index.get(source.adj[id * 6 + k]);
  }
  return { ids, index, n, interior, edge, deg, adj };
}

function branch(snapshot, graph, physics, players) {
  const cells = snapshot.cells.slice(), owners = snapshot.owners.slice();
  const nextCells = cells.slice(), nextOwners = owners.slice();
  return {
    graph, physics, cells, owners, nextCells, nextOwners,
    fate: evaluateCell({ cells, owners, graph, physics }),
    nextFate: evaluateCell({ cells: nextCells, owners: nextOwners, graph, physics }),
    ages: snapshot.ages.slice(),
    players: players.map(p => ({ ...p })),
    births: new Uint16Array(8), mature: new Uint16Array(8), live: new Uint16Array(8),
    steady: false,
  };
}

// A stationary patch still ages. Count those cell visits in the work budget.
function advance(state, economy, outside) {
  const { graph, ages, births, mature, live } = state;
  births.fill(0); mature.fill(0); live.fill(0);
  let changed = false, claims;
  const before = { graph, physics: state.physics, nextOwners: state.owners };
  for (let i = 0; i < graph.interior; i++) {
    const prev = state.owners[i], owner = state.steady ? prev : state.fate(i);
    if (!state.steady) {
      state.nextOwners[i] = owner;
      state.nextCells[i] = Number(owner !== 0);
    }
    if (prev !== owner) {
      changed = true;
      if (prev && prev < 7 && !owner && economy.combatFee > 0) {
        // recordCombatDeath reads the previous ownership buffer under nextOwners.
        claims ??= [];
        recordCombatDeath(before, i, prev, claims);
      }
    }
    if (!owner) { ages[i] = 0; continue; }
    ages[i] = prev ? ages[i] + 1 : 1;
    live[owner]++;
    if (!prev) births[owner]++;
    if (ages[i] >= economy.stableAfter) mature[owner]++;
  }
  if (!state.steady) {
    [state.cells, state.nextCells] = [state.nextCells, state.cells];
    [state.owners, state.nextOwners] = [state.nextOwners, state.owners];
    [state.fate, state.nextFate] = [state.nextFate, state.fate];
    state.steady = !changed;
  }
  let needsErosion = false;
  for (const p of state.players) {
    if (p.out) continue;
    const id = p.id;
    const { income, upkeep } = generationEnergy(outside.births[id] + births[id],
      outside.mature[id] + mature[id], economy);
    p.lastFlow = income - upkeep;
    const balance = p.reserve + p.lastFlow;
    p.unfunded = balance < -1e-9;
    if (p.unfunded && live[id]) needsErosion = true;
    p.reserve = Math.max(0, balance);
  }
  if (claims?.length) settleCombatTribute(state.players, claims, economy.combatFee);
  return needsErosion;
}

// Reprice the *same* births and colony twice. The second quote assumes that
// sites already observed to persist will eventually reach the maturity tariff.
// Keep this conditional estimate separate from the actual cash-flow ledger.
function deferredQuote(state, economy, outside, owner, observedAge) {
  const pending = new Uint16Array(8);
  for (let i = 0; i < state.graph.interior; i++)
    if (state.ages[i] >= observedAge && state.ages[i] < economy.stableAfter)
      pending[state.owners[i]]++;
  const quote = { own: 0, rival: 0 };
  for (const p of state.players) {
    if (!pending[p.id] || p.out) continue;
    const births = state.births[p.id] + outside.births[p.id];
    const mature = state.mature[p.id] + outside.mature[p.id];
    const now = generationEnergy(births, mature, economy);
    const later = generationEnergy(births, mature + pending[p.id], economy);
    quote[p.id === owner ? 'own' : 'rival'] += (later.income - later.upkeep) - (now.income - now.upkeep);
  }
  return quote;
}

// Each slice computes a bounded number of paired generations. The two branches
// have identical starting balances and outside production; only one buys cells.
// The quote includes saturation across the player's whole colony. Beyond the
// patch, birth rates and mature counts are held at their most recent values.
export function beginLocalTrial(world, game, owner, center, ids, { radius = 10, horizon = 32 } = {}) {
  if (!Number.isInteger(center) || center < 0 || center >= world.graph.n || !ids?.length ||
      !Number.isInteger(radius) || radius < 3 || radius > 20 ||
      !Number.isInteger(horizon) || horizon < 1 || horizon > 2048) return null;
  const fresh = createStampCommands(world, game).stampAdditions(owner, ids);
  if (!fresh) return null;
  const graph = neighborhood(world.graph, center, radius);
  for (const id of ids) if (!graph.index.has(id) || graph.index.get(id) >= graph.interior) return null;
  const economy = { ...game.economy };
  const snapshot = { cells: new Uint8Array(graph.n), owners: new Uint8Array(graph.n), ages: new Float64Array(graph.n) };
  const outside = { births: new Float64Array(8), mature: new Float64Array(8) };
  for (const p of game.players) {
    outside.births[p.id] = p.lastBirths;
    outside.mature[p.id] = p.stable;
  }
  for (let i = 0; i < graph.n; i++) {
    const id = graph.ids[i], occupant = world.owners[id];
    snapshot.cells[i] = world.cells[id]; snapshot.owners[i] = occupant;
    snapshot.ages[i] = occupant ? world.cellAges?.[id] || 1 : 0;
    if (i >= graph.interior || !occupant || occupant === 7) continue;
    if (world.next && world.cells[id] && !world.next[id] && snapshot.ages[i] === 1)
      outside.births[occupant] = Math.max(0, outside.births[occupant] - 1);
    if (snapshot.ages[i] >= economy.stableAfter)
      outside.mature[occupant] = Math.max(0, outside.mature[occupant] - 1);
  }
  const control = branch(snapshot, graph, world.physics, game.players);
  for (const id of fresh) {
    const i = graph.index.get(id);
    snapshot.cells[i] = 1; snapshot.owners[i] = owner; snapshot.ages[i] = 1;
  }
  const action = branch(snapshot, graph, world.physics, game.players);
  const cost = energyCost(fresh.length, economy);
  action.players[owner - 1].reserve -= cost;
  let boundary = graph.interior < graph.n && (world.physics.birthsFromVacuum ||
    snapshot.cells.subarray(graph.interior).some(Boolean));
  let turns = 0, work = 0, result, halfway;
  const mid = Math.floor(horizon / 2), observedAge = Math.min(16, Math.max(2, mid));
  function deferred() {
    const base = deferredQuote(control, economy, outside, owner, observedAge);
    const move = deferredQuote(action, economy, outside, owner, observedAge);
    return { own: move.own - base.own, rival: move.rival - base.rival };
  }
  const recent = new Float64Array(8 * 7);
  const trial = {
    nodes: graph.n,
    get generations() { return turns; },
    get work() { return work; },
    step(maxGenerations = 1) {
      const end = Math.min(horizon, turns + Math.max(0, Math.floor(maxGenerations)));
      while (!result && turns < end) {
        const baseErodes = advance(control, economy, outside), actionErodes = advance(action, economy, outside);
        work += 2 * graph.interior;
        for (let i = graph.edge; !boundary && i < graph.interior; i++)
          if (action.owners[i] || control.owners[i]) boundary = true;
        for (const p of action.players)
          recent[(turns % 8) * 7 + p.id] = p.lastFlow - control.players[p.id - 1].lastFlow;
        turns++;
        if (turns === mid) halfway = deferred();
        // Erosion randomly removes a cell from anywhere on the owner's planet.
        // End this funded comparison at that point rather than guessing a location.
        if (turns < horizon && !baseErodes && !actionErodes) continue;
        result = { ownCash: 0, rivalCash: 0, ownFlow: 0, rivalFlow: 0, ownCells: 0, rivalCells: 0, ownCore: 0, rivalCore: 0,
          cost, added: fresh.length, turns, work, boundary, ownUnfunded: !!action.players[owner - 1].unfunded };
        for (const [state, sign] of [[action, 1], [control, -1]]) {
          for (let i = 0; i < graph.interior; i++) {
            const occupant = state.owners[i];
            if (occupant && occupant < 7 && state.ages[i] > turns)
              result[occupant === owner ? 'ownCore' : 'rivalCore'] += sign;
          }
        }
        const forecast = deferred();
        for (const side of ['own', 'rival']) {
          result[side + 'DeferredFlow'] = forecast[side];
          result[side + 'DeferredMid'] = halfway?.[side] ?? 0;
          result[side + 'DeferredTrend'] = halfway && turns > mid ? (forecast[side] - halfway[side]) / (turns - mid) : 0;
        }
        const samples = Math.min(8, turns);
        for (const p of action.players) {
          const other = control.players[p.id - 1];
          let flow = 0;
          for (let row = 0; row < samples; row++) flow += recent[row * 7 + p.id];
          const side = p.id === owner ? 'own' : 'rival';
          result[side + 'Cash'] += p.reserve - other.reserve;
          result[side + 'Flow'] += flow / samples;
          result[side + 'Cells'] += action.live[p.id] - control.live[p.id];
        }
      }
      return result ?? null;
    },
  };
  return trial;
}
