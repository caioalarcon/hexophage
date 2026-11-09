// The stamp is projected down a graph ray pointing away from its target. In
// that local frame the target is on the negative q axis. Rotate the measured
// axial displacement toward it, keeping the sampled heading for weak signals.
export function aimAtTarget(observation, fallbackTurn) {
  if (!observation?.drift) return fallbackTurn;
  let [q, r] = observation.drift;
  if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) < 1.5) return fallbackTurn;
  let bestTurn = fallbackTurn, bestProjection = -Infinity;
  for (let turn = 0; turn < 6; turn++) {
    const approach = -q - r / 2;
    if (approach > bestProjection || (approach === bestProjection && turn === fallbackTurn)) {
      bestProjection = approach;
      bestTurn = turn;
    }
    [q, r] = [q + r, -q];
  }
  return bestTurn;
}
