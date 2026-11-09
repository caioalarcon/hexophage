// Keep the peak and the largest single-generation drop, not an unbounded replay.
export function rememberHumanPeak(world, game) {
  const h = game.humanHistory,
    p = game.players[0],
    field = world.ownerCells[1].length;
  if (!h.peak || field > h.peak.field) {
    h.peak = {
      gen: world.gen,
      field,
      reserve: p.reserve,
      births: h.births,
      deaths: h.deaths,
      placed: h.placed,
      stampedEnergy: p.stampedEnergy,
      received: p.received,
      paid: p.paid,
      eroded: p.eroded,
    };
  }
}
export function recordHumanTurn(
  world,
  game,
  before,
  after,
  births,
  deaths,
  erosion,
  reserveBefore,
) {
  const h = game.humanHistory,
    p = game.players[0];
  h.births += births;
  h.deaths += deaths;
  if (before > after && (!h.largest || before - after > h.largest.before - h.largest.after)) {
    h.largest = {
      gen: world.gen,
      before,
      after,
      births,
      deaths,
      erosion,
      reserveBefore,
      reserve: p.reserve,
    };
  }
  if (p.out && h.eliminated === null) h.eliminated = world.gen;
  rememberHumanPeak(world, game);
}
