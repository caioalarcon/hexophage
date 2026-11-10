import assert from 'node:assert/strict';
import test from 'node:test';
import {buildSphere} from '../../world/sphere.js';
import {createHeadlessMatch} from '../../match/headless.js';
import {ACTIVITY_ECONOMY} from '../../match/constructive-economy.js';
import {phaseAt, scoutEmpty, scoutRival} from './scout.js';

test('a global shortlist can prefer remote open ground and the more productive exposed enemy', () => {
  const graph = buildSphere(24);
  const {world, game, addLive} = createHeadlessMatch(graph);
  const [hunter, cheap, productive] = game.players;
  const remote = game.players[3].seed;
  addLive(hunter.seed, hunter.id);
  const empty = scoutEmpty(world, hunter, () => (remote + .5) / graph.n);
  assert.equal(empty.target, remote);
  addLive(cheap.seed, cheap.id);
  addLive(productive.seed, productive.id);
  productive.flowAverage = 100;
  const attack = scoutRival(world, game, hunter, () => .5);
  assert.equal(attack.target, productive.seed);
  assert.equal(attack.rivalId, productive.id);
  assert.equal(world.cells[graph.adj[6 * attack.target + attack.direction]], 0);
  const phase = phaseAt(world, attack);
  addLive(graph.adj[6 * attack.target + attack.direction], cheap.id);
  assert.notEqual(phaseAt(world, attack), phase);
});

test('learners compare two actual phases of one launch and respect the purchase cooldown off slot', () => {
  const orders = [], comparisons = [];
  const match = createHeadlessMatch(buildSphere(40), {rule:'ashley15', conflict:'lineage',
    growth:'classic', economy:ACTIVITY_ECONOMY, botMode:'learn',
    brain:{seed:4751, onPlacement:o=>orders.push(o), onComparison:c=>comparisons.push(c)}});
  match.game.players[0].out = true;
  while (match.world.gen < 16384 && !orders.some(o=>o.phaseOffset > 0)) match.nextTick();
  const delayed = orders.find(o=>o.rival && o.phaseOffset > 0);
  assert(delayed);
  const last = new Map();
  for (const o of orders) {
    assert(o.gen - (last.get(o.owner) ?? -Infinity) >= match.game.interval);
    last.set(o.owner,o.gen);
    if (o.rival) assert.equal(o.poseKey, o.stamp + '@' + o.turn + '/' + o.gap);
  }
  const round = comparisons.find(c=>c.owner===delayed.owner && c.alternatives.some(a=>
    a.center===delayed.center && a.at===delayed.proposedAt && a.delay===delayed.phaseOffset));
  assert(round.sites >= 2);
  const same = round.alternatives.filter(a=>a.at===delayed.proposedAt && a.center===delayed.center &&
    a.heading===delayed.heading && a.stamp===delayed.stamp);
  assert.equal(same.length,2);
  const [immediate,later] = same;
  assert.equal(immediate.delay,0);
  assert.equal(later.delay,delayed.phaseOffset);
  assert.notEqual(immediate.phase,later.phase);
  assert(!immediate.boundary && !later.boundary);
  assert(later.approved && (!immediate.approved || later.bid >= immediate.bid));
  assert(round.alternatives.every(a=>!a.approved || a.bid<=later.bid));
  assert(match.game.brainMetrics.visits<=8192+match.world.gen*96*match.game.brainRate);
});
