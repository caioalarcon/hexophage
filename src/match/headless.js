import { createSimulationState } from '../simulation/state.js';
import { allocateCells } from '../simulation/population.js';
import { createMatchState } from './state.js';
import { createMatchEngine } from './engine.js';

// Construct a prepared match using the same engine, setup and defaults as the browser.
export function createHeadlessMatch(graph, { init, tax, interval, strategies, rule, notation, economy, botMode, brain } = {}) {
  const world = Object.assign(createSimulationState(), { graph }, allocateCells(graph.n));
  const game = createMatchState(world, { rule, notation, economy, botMode });
  if (init !== undefined) game.init = init;
  if (tax !== undefined) game.tax = tax;
  if (interval !== undefined) game.interval = interval;
  const engine = createMatchEngine(world, game, {}, strategies, brain);
  engine.resetPlayers();
  return { world, game, ...engine };
}
