import { game } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { ensureInitialViewport } from './surface.js';
import { chooseEast } from './world-point.js';
import { makeChart } from '../local/chart.js';
import { DX, DY } from '../local/hex-metrics.js';
import { stepPose } from '../local/oriented-step.js';

function centerOnPlayer(seed) {
  let center = seed,
    ori = chooseEast(seed);
  // A new player can build immediately in the middle of the screen on f20.
  // Select a nearby clear site for the camera; territories and spawning stay on their own graph.
  if (seed === game.players[0]?.seed && world.graph.f <= 24) {
    const testSize = { width: DX * 24.5, height: DY * 14 },
      queue = [{ id: seed, ori, steps: 0 }],
      seen = new Set([seed]);
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      if (makeChart(p.id, p.ori, 1, testSize)) {
        center = p.id;
        ori = p.ori;
        break;
      }
      if (p.steps >= 5) continue;
      for (let d = 0; d < 6; d++) {
        const n = stepPose(world.graph, p.id, p.ori, d, world.side);
        if (n && !seen.has(n.id)) {
          seen.add(n.id);
          n.steps = p.steps + 1;
          queue.push(n);
        }
      }
    }
  }
  world.center = center;
  world.orient = ori;
  ensureInitialViewport();
}

export { centerOnPlayer };
