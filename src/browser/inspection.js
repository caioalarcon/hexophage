import { commitStamp, game, nextTick, patchForStamp } from './game.js';
import { world } from './world-state.js';
import { gpu } from '../globe/webgl/context.js';
import { atlasMetrics } from '../map/atlas/viewport.js';
import { rotateWorld, sideFlip } from '../map/camera/orientation.js';
import { moveCenterTo } from '../map/camera/pan.js';
import { zoom } from '../map/camera/zoom.js';
import { makeChart, viewportValid } from '../map/local/chart.js';
import { inspectPentagon } from '../map/local/pentagon.js';
import { resetGame } from '../match/controls/new-match.js';
import { chooseRule } from '../match/controls/rule.js';
import { stampOffsets } from '../patterns/editor/stamp-grid.js';
import { stampAt } from '../patterns/placement/plant.js';
import { decodeRLE } from '../patterns/rle.js';
import { newWorld } from '../world/load-planet.js';
import { buildSphere } from '../world/sphere.js';

// Public inspection API retained for existing tools and instrumented tests.
export function exposeSphereLab() {
  window.__sphereLab = {
    world,
    game,
    gpu,
    get atlasMetrics() {
      return atlasMetrics;
    },
    buildSphere,
    makeChart,
    viewportValid,
    nextTick,
    stampAt,
    decodeRLE,
    chooseRule,
    newWorld,
    resetGame,
    inspectPentagon,
    moveCenterTo,
    zoom,
    rotateWorld,
    sideFlip,
    stampOffsets,
    patchForStamp,
    commitStamp,
  };
}
