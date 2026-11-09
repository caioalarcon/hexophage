import { world } from './world-state.js';
import { createMatchEngine } from '../match/engine.js';
import { createMatchState } from '../match/state.js';

const effects = {};
export function attachMatchEffects(handlers) {
  Object.assign(effects, handlers);
}

const game = createMatchState(world);

const {
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
  nextTick,
  patchForStamp,
  resetPlayers,
  stampAdditions,
};
