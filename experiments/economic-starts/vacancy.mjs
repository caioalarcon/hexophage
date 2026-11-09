// Same seats, controller and opening tariff. Toggle the engine's real
// empty-field charge so the planning model prices it in the same arm.
import assert from 'node:assert/strict';
import {buildSphere} from '../../src/world/sphere.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {EMPTY_FIELD_GRACE} from '../../src/match/constructive-economy.js';

const [rule, mode, seedArg, rateArg] = process.argv.slice(2);
const seed = Number(seedArg), rate = Number(rateArg);
const seat = ({593:2, 8087:4, 33703:6})[seed];
const passive = mode === 'wait';
const limit = 65536;
const m = createHeadlessMatch(buildSphere(32), {
  rule, conflict:'lineage', growth:'classic', botMode:'learn', brain:{seed},
  economy:{emptyFieldUpkeep:rate > 0}, strategies:passive ? new Map([[seat, () => {}]]) : new Map(),
});
const {world, game} = m;
const bots = game.players.slice(1), subject = game.players[seat-1];
game.players[0].out = true;
let lost = 0, bankAtLoss = 0, recovery = 0, subjectOut = 0;
while (world.gen < limit && !game.ended) {
  m.nextTick();
  if (mode === 'loss' && world.gen === 4096) {
    const occupied = [...world.ownerCells[seat]];
    lost = occupied.length;
    bankAtLoss = subject.reserve;
    for (const id of occupied) m.removeLive(id);
  }
  if (lost && !recovery && world.ownerCells[seat].length) recovery = world.gen;
  if (!subjectOut && subject.out) subjectOut = world.gen;
}
if (passive) assert.equal(subject.stamps, 0);
console.log([rule,mode,seed,rate,EMPTY_FIELD_GRACE,world.gen,game.winner,seat,subjectOut,subject.stamps,
  Math.round(subject.emptyFieldPaid ?? 0),Math.round(bots.reduce((sum, p) => sum + (p.emptyFieldPaid ?? 0), 0)),bots.filter(p=>p.out).length,
  game.brainMetrics.actions,game.brainMetrics.tactical,lost,Math.round(bankAtLoss),recovery].join(','));
