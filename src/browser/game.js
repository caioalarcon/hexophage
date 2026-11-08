import { world } from './world-state.js';
import { createMatchEngine } from '../match/engine.js';
import { createMatchState } from '../match/state.js';

const effects = {};
export function attachMatchEffects(handlers) {
  Object.assign(effects, handlers);
}

const game = createMatchState();

const {
  initRuleTables,
  parseRule,
  addLive,
  stampAdditions,
  applyStamp,
  commitStamp,
  clearCells,
  nextTick,
  patchForStamp,
  resetPlayers,
} = createMatchEngine(world, game, effects);

export {
  addLive,
  applyStamp,
  clearCells,
  commitStamp,
  game,
  initRuleTables,
  nextTick,
  parseRule,
  patchForStamp,
  resetPlayers,
  stampAdditions,
};
