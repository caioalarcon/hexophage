// One cold, unassisted match. All five bots start without a field.
import assert from 'node:assert/strict';
import {buildSphere} from '../../src/world/sphere.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {getCandidate} from './candidates.mjs';

const [rule, candidate, frequency='20', limit='4096', seed='8273', growth='classic'] = process.argv.slice(2);
const economy = getCandidate(rule, candidate), graph = buildSphere(+frequency);
const purchases = new Map(), stamps = new Set(), rivals = new Set();
let first = null, fifth = null, firstAttack = null;
let early = 0, maxField = 0, fieldTurns = 0;

function record({owner, stamp, gen, rival}) {
  purchases.set(owner, 1 + (purchases.get(owner) ?? 0));
  stamps.add(stamp);
  first ??= gen;
  if (gen <= 1024) early = purchases.size;
  if (purchases.size === 5) fifth ??= gen;
  if (rival) {
    firstAttack ??= gen;
    rivals.add(rival);
  }
}

const {world, game, nextTick} = createHeadlessMatch(graph, {
  rule, conflict:'lineage', botMode:'learn', growth, economy, brain:{seed:+seed, onPlacement:record},
});
assert.deepEqual(game.economy, economy);
game.players[0].out = true;
const bots = game.players.slice(1);
const withField = () => bots.filter(p => world.ownerCells[p.id].length > 0).length;
while (world.gen < +limit && !game.ended) {
  nextTick();
  maxField = Math.max(maxField, world.activeCount);
  if (world.gen % 128 === 0) fieldTurns += withField();
}
const treasury = bots.reduce((sum, p) => sum + p.reserve, 0);
const paid = bots.reduce((sum, p) => sum + p.stampedEnergy, 0);
const repeatBuyers = [...purchases.values()].filter(count => count >= 2).length;
const start = bots.length * game.init;
const row = [
  rule, candidate, frequency, limit, seed, growth, world.gen, game.init,
  early, purchases.size, repeatBuyers, first ?? '', fifth ?? '', firstAttack ?? '',
  game.brainMetrics.actions, game.brainMetrics.tactical, stamps.size, rivals.size,
  Math.round(100 * bots.reduce((sum, p) => sum + p.tributePaid, 0)) / 100,
  bots.filter(p => p.out).length, withField(), game.winner, maxField, world.activeCount,
  Number((maxField / graph.n).toFixed(4)),
  Number((fieldTurns / (bots.length * Math.max(1, Math.floor(world.gen / 128)))).toFixed(4)),
  Number((treasury / start).toFixed(4)), Math.round(treasury + paid - start),
  Math.round(bots.reduce((sum, p) => sum + (p.unfundedBirths ?? 0), 0)), Math.round(paid),
];
console.log(row.join(','));
