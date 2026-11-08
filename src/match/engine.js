import { initRuleTables, parseRule } from '../simulation/rules.js';
import { createPopulation } from '../simulation/population.js';
import { advanceGeneration } from '../simulation/generation.js';
import { patchForStamp } from '../patterns/spherical-patch.js';
import { createOscillatorStrategy } from '../bots/oscillator-strategy.js';
import { createGrowthStrategy } from '../bots/growth-strategy.js';
import { runBotTurns } from '../bots/turns.js';
import { recordHumanTurn } from './field-history.js';
import { resetPlayers } from './players.js';
import { createStampCommands } from './stamping.js';
import { gameEconomyTick } from './biomass.js';
import { finishIfDecided } from './outcome.js';

// Effects are synchronous observers. The engine can run without a canvas, clock or DOM.
export function createMatchEngine(world, game, effects = {}, strategies = new Map()) {
  const population = createPopulation(world, effects);
  const stamps = createStampCommands(world, game, population.addLive, effects);
  const plantOscillator = createOscillatorStrategy(world, game, stamps.commitStamp);
  const growthStrategy = createGrowthStrategy(game, plantOscillator);
  const finish = (alive) => finishIfDecided(game, alive, effects);

  function nextTick() {
    if (game.ended) return;
    const human = game.players[0],
      before = world.ownerCells[1].length;
    const reserveBefore = human?.reserve ?? 0;
    const births = advanceGeneration(world);
    effects.populationChanged?.();
    effects.redraw?.();

    const naturalField = world.ownerCells[1].length;
    gameEconomyTick(world, game, population.removeLive, finish);
    if (world.gen === 1) effects.firstGeneration?.();
    if (human && game.humanHistory) {
      const after = world.ownerCells[1].length;
      recordHumanTurn(
        world,
        game,
        before,
        after,
        births,
        before + births - naturalField,
        naturalField - after,
        reserveBefore,
      );
    }
    if (game.ended) effects.showResults?.();
    else runBotTurns(world, game, growthStrategy, strategies);
  }

  return {
    ...population,
    ...stamps,
    nextTick,
    initRuleTables: () => initRuleTables(world),
    parseRule: (value) => parseRule(world, value),
    patchForStamp: (...args) => patchForStamp(world, ...args),
    resetPlayers: () => resetPlayers(world, game),
  };
}
