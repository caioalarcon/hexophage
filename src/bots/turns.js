// The interval is a purchase cooldown. Periodic attacks may execute between
// regular turns when their proven phase recurs; the learner enforces the same
// minimum gap after every successful purchase. Overrides keep their own slots.
export function runBotTurns(world, game, defaultStrategy, strategies) {
  if (game.ended || !game.players.length) return;
  const slot = world.gen === 1 || world.gen % game.interval === 0;
  if (!slot && !defaultStrategy.phaseTurn) return;
  for (let index = 1; index < 6; index++) {
    const player = game.players[index];
    if (player.out) continue;
    const override = strategies.get(player.id);
    if (slot) (override ?? defaultStrategy)(player);
    else if (!override) defaultStrategy.phaseTurn(player);
  }
}
