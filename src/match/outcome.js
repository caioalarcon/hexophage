export function finishIfDecided(game, alive, effects) {
  if (alive.length > 1) return false;
  game.ended = true;
  game.winner = alive[0]?.id || 0;
  effects.pause?.();
  effects.matchDecided?.(alive[0]);
  return true;
}
