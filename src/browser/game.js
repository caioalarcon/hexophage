import { world } from './world-state.js';
import { createMatchEngine } from '../match/engine.js';
import { createMatchState } from '../match/state.js';

const effects = {};
const brain = {
  get seed() { return crypto.getRandomValues(new Uint32Array(1))[0]; },
};
export function attachMatchEffects(handlers, archive) {
  brain.archive = archive;
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
  invalidateBrain,
  resetPlayers,
} = createMatchEngine(world, game, effects, undefined, brain);

export {
  addLive,
  applyStamp,
  clearCells,
  commitStamp,
  game,
  nextTick,
  patchForStamp,
  invalidateBrain,
  resetPlayers,
  stampAdditions,
};
