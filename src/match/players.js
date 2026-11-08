import { sphereSpawns } from './spawns.js';
import { botSpiralPlan } from '../bots/spiral.js';

export function resetPlayers(world, game) {
  game.humanHistory = {
    births: 0,
    deaths: 0,
    placed: 0,
    peak: null,
    largest: null,
    eliminated: null,
  };
  const g = world.graph,
    seedIds = g.spawnIds || (g.spawnIds = sphereSpawns(g));
  game.players = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    name: game.names[i + 1],
    symbol: game.symbols[i + 1],
    seed: seedIds[i],
    reserve: game.init,
    stable: 0,
    totalBirths: 0,
    totalDeaths: 0,
    lastBirths: 0,
    lastDeaths: 0,
    lastIncome: 0,
    lastUpkeep: 0,
    lastEroded: 0,
    flowAverage: 0,
    stamps: 0,
    out: false,
    debtCarry: 0,
    received: 0,
    paid: 0,
    eroded: 0,
    lastFlow: 0,
    pattern: i === 0 ? 'manual' : game.bots[i - 1],
  }));
  world.cellAges = new Uint8Array(world.graph.n);
  game.botPlans = game.players.map((p) => (p.id === 1 ? null : botSpiralPlan(world.graph, p.seed)));
  // Each bot owns a compact reservation mask for its established oscillators.
  // Keep the mask even if one is destroyed by combat: new stamps must not
  // inadvertently overwrite debris from the same structure.
  game.botReserved = new Uint8Array(world.graph.n);
}
