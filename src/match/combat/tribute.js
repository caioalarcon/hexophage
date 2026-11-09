// Claims from the same generation clear against operating cash after births,
// mature-cell income and erosion. Incoming transfers fund only later generations.
export function settleCombatTribute(players, claims, fee) {
  const receipts = new Float64Array(7);
  for (const payer of players) {
    const weights = claims[payer.id];
    if (!weights) continue;
    const units = weights.reduce((sum, weight) => sum + weight, 0);
    const payment = Math.min(payer.reserve, units * fee);
    payer.reserve -= payment;
    payer.tributePaid += payment;
    payer.paid += payment;
    payer.lastFlow -= payment;
    let remaining = payment;
    let unitsLeft = units;
    for (const receiver of players) {
      const weight = weights[receiver.id];
      if (!weight) continue;
      // Give the last creditor the remainder, including any rounding dust.
      unitsLeft -= weight;
      const share = unitsLeft < 1e-9 ? remaining : Math.min(remaining, payment * weight / units);
      receipts[receiver.id] += share;
      remaining -= share;
    }
  }
  for (const player of players) {
    const amount = receipts[player.id];
    player.reserve += amount;
    player.tributeReceived += amount;
    player.received += amount;
    player.lastFlow += amount;
  }
}
