import { createSimulationState } from '../simulation/state.js';
import { allocateCells } from '../simulation/population.js';
import { createMatchState } from './state.js';
import { createMatchEngine } from './engine.js';
import { initialEnergy } from './constructive-economy.js';

// Construct a prepared match using the same engine, setup and defaults as the browser.
export function createHeadlessMatch(graph, { init, tax, interval, strategies, economy } = {}) {
  const world = Object.assign(createSimulationState(), { graph }, allocateCells(graph.n));
  const game = createMatchState();
  if (economy) Object.assign(game.economy, economy);
  game.init = init !== undefined ? init : initialEnergy(game.economy);
  if (tax !== undefined) game.tax = tax;
  if (interval !== undefined) game.interval = interval;
  const engine = createMatchEngine(world, game, {}, strategies);
  engine.initRuleTables();
  engine.parseRule('B2/S35');
  world.rule = 'callahan';
  engine.resetPlayers();
  return { world, game, ...engine };
}
