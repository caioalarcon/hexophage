export function transferProportional(total, players, weights) {
  // Exact integer allocation by largest remainders; source of truth is the actually paid integer amount.
  if (!total || !players.length) return;
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return;
  const entitlements = weights.map((w) => (total * w) / sum);
  const prizes = entitlements.map((v) => Math.floor(v));
  let remaining = total - prizes.reduce((a, b) => a + b, 0);
  const rank = entitlements
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || players[a.i].id - players[b.i].id);
  for (let k = 0; k < remaining; k++) prizes[rank[k].i]++;
  for (let i = 0; i < players.length; i++) {
    const amount = prizes[i];
    players[i].reserve += amount;
    players[i].received += amount;
    players[i].lastFlow += amount;
  }
}

function rng(game) {
  let x = game.rngState;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  game.rngState = x >>> 0;
  return game.rngState / 4294967296;
}

export function gameEconomyTick(world, game, removeLive, finishIfDecided) {
  if (!game.players.length || game.initializing || game.ended) return;
  let alive = game.players.filter((p) => !p.out);
  for (const p of alive) if (p.reserve <= 0 && world.ownerCells[p.id].length === 0) p.out = true;
  alive = alive.filter((p) => !p.out);
  if (finishIfDecided(alive)) return;
  let sum = 0;
  for (const p of alive) sum += world.ownerCells[p.id].length;
  const avg = sum / alive.length;
  game.average = avg;
  const winners = [],
    weights = [];
  let totalPaid = 0;
  for (const p of alive) {
    p.lastFlow = 0;
    const diff = world.ownerCells[p.id].length - avg;
    if (diff > 1e-9) {
      winners.push(p);
      weights.push(diff);
    }
  }
  for (const p of alive) {
    const deficit = avg - world.ownerCells[p.id].length;
    if (deficit <= 1e-9) continue;
    const amountExact = p.debtCarry + deficit * game.tax;
    const due = Math.floor(amountExact + 1e-9);
    p.debtCarry = Math.max(0, amountExact - due);
    let payment = Math.min(due, p.reserve);
    p.reserve -= payment;
    let unpaid = due - payment;
    const owned = world.ownerCells[p.id];
    const vanish = Math.min(unpaid, owned.length);
    for (let j = 0; j < vanish; j++) {
      const id = owned[Math.floor(rng(game) * owned.length)];
      removeLive(id);
    }
    payment += vanish;
    p.eroded += vanish;
    p.paid += payment;
    p.lastFlow -= payment;
    totalPaid += payment;
    if (payment < due) p.debtCarry = 0;
  }
  transferProportional(totalPaid, winners, weights);
  for (const p of alive) if (p.reserve <= 0 && world.ownerCells[p.id].length === 0) p.out = true;
  finishIfDecided(alive.filter((p) => !p.out));
}
