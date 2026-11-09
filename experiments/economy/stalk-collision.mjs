// Replay Callahan's two-glider + flipper stalk synthesis with Hexophage ownership.
// Published layout: https://conwaylife.com/forums/viewtopic.php?p=176808
import { buildSphere } from '../../src/world/sphere.js';
import { createHeadlessMatch } from '../../src/match/headless.js';
import { decodeRLE } from '../../src/patterns/rle.js';

const graph = buildSphere(256);
const seed = decodeRLE('10bob$10bob$2bo8bo2bob$3b2o7bob$13bob$b$b$2ob$2bob$3bob$4bob$2bob!');
const idleBots = new Map([2, 3, 4, 5, 6].map(id => [id, () => {}]));
// Clusters in axial q: the flipper is at q=0,1; the two incoming gliders are on opposite sides.
for (const [name, left, flipper, right] of [
  ['same owner', 1, 1, 1],
  ['two attacking gliders + defending flipper', 1, 2, 1],
  ['left glider attacks both defending pieces', 1, 2, 2],
  ['right glider attacks both defending pieces', 2, 2, 1],
]) {
  const match = createHeadlessMatch(graph, { conflict: 'legacy', init: 1e9, strategies: idleBots });
  const ids = match.patchForStamp(graph.farthest, 0, seed);
  seed.forEach(([q], i) => match.addLive(ids[i], q < 0 ? left : q > 1 ? right : flipper));
  const checkpoints = [];
  for (let generation = 1; generation <= 256; generation++) {
    match.nextTick();
    if (![32, 64, 128, 256].includes(generation)) continue;
    const w = match.world;
    checkpoints.push({ generation, attacker: w.ownerCells[1].length,
      defender: w.ownerCells[2].length, neutral: w.ownerCells[7].length,
      defenderUpkeep: match.game.players[1].lastUpkeep });
  }
  console.log(JSON.stringify({ name, checkpoints }));
}
