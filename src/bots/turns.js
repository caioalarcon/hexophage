// Keys are player IDs. An absent override uses the match's default strategy.
export function runBotTurns(world, game, defaultStrategy, strategies) {
  if (game.ended || !game.players.length || world.gen % game.interval !== 0) return;
  for (let index = 1; index < 6; index++) {
    const player = game.players[index];
    if (!player.out) (strategies.get(player.id) ?? defaultStrategy)(player);
  }
}
