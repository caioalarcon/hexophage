// Four cold learners and one solvent player who never plants. Rotate the passive
// seat across seeds. Compare liquid reserves after paying for every placement.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {buildSphere} from '../../src/world/sphere.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {resolveRuleProfile} from '../../src/match/rule-profiles.js';
import {getCandidate, rules} from './candidates.mjs';

const graph = buildSphere(32);
const rows = [['rule','tariff','seed','passiveSeat','generation','initial','player','stamps','reserve','reserveVsWait','field','out','winner']];
for (const [seed, passiveSeat] of [[9181,2], [16921,4], [41597,6]]) {
  for (const rule of rules) {
    for (const tariff of ['original','selected']) {
      const economy = tariff === 'original' ? getCandidate(rule,'original') : resolveRuleProfile(rule).economy;
      const {world, game, nextTick} = createHeadlessMatch(graph, {
        rule, economy:{...economy, emptyFieldUpkeep:false}, conflict:'lineage', growth:'classic', botMode:'learn', brain:{seed},
        strategies:new Map([[passiveSeat, () => {}]]),
      });
      game.players[0].out = true;
      while (world.gen < 16384 && !game.ended) nextTick();
      const passive = game.players[passiveSeat - 1];
      assert.equal(passive.stamps, 0);
      assert.equal(passive.reserve, game.init);
      for (const p of game.players.slice(1)) {
        rows.push([rule,tariff,seed,passiveSeat,world.gen,game.init,p.id,p.stamps,
          p.reserve.toFixed(2),(p.reserve - passive.reserve).toFixed(2),
          world.ownerCells[p.id].length,Number(p.out),game.winner]);
      }
    }
  }
}
writeFileSync(new URL('./wait-control.csv', import.meta.url), rows.map(r=>r.join(',')).join('\n')+'\n');
