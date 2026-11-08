import { rememberHumanPeak } from './field-history.js';
import { energyCost } from './constructive-economy.js';

export function createStampCommands(world, game, addLive, effects) {
  // The same placement check drives the in-world ghost and the final click/drop.
  function stampAdditions(owner, ids) {
    const player = game.players[owner - 1];
    if (
      !ids.length ||
      !player ||
      player.out ||
      game.ended ||
      new Set(ids).size !== ids.length
    )
      return null;
    const g = world.graph,
      fresh = [];
    for (const id of ids) {
      if (world.cells[id]) {
        if (world.owners[id] !== owner) return null;
        continue;
      }
      for (let k = 0; k < g.deg[id]; k++) {
        const nb = g.adj[id * 6 + k];
        if (world.cells[nb] && world.owners[nb] !== owner) return null;
      }
      fresh.push(id);
    }
    return fresh.length && player.reserve + 1e-9 >= energyCost(fresh.length, game.economy) ? fresh : null;
  }
  function applyStamp(player, fresh, notify) {
    for (const id of fresh) addLive(id, player.id);
    const cost = energyCost(fresh.length, game.economy);
    player.reserve -= cost;
    player.stampedEnergy = (player.stampedEnergy || 0) + cost;
    for (const id of fresh) if (world.cellAges) world.cellAges[id] = 1;
    player.stamps++;
    if (player.id === 1 && game.humanHistory) {
      game.humanHistory.placed += fresh.length;
      rememberHumanPeak(world, game);
    }
    if (notify) effects.stampApplied?.(player, fresh.length);
    else effects.redraw?.();
    return true;
  }
  function commitStamp(owner, ids, notify = true) {
    const fresh = stampAdditions(owner, ids);
    return fresh ? applyStamp(game.players[owner - 1], fresh, notify) : false;
  }

  return { stampAdditions, applyStamp, commitStamp };
}
