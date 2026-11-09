import test from 'node:test';
import assert from 'node:assert/strict';
import { beginLocalTrial } from './local-world.js';
import { createHeadlessMatch } from '../../match/headless.js';
import { buildSphere } from '../../world/sphere.js';

const graph = buildSphere(32);
const strategies = new Map([2,3,4,5,6].map(id => [id, () => {}]));
const match = (notation, economy) => createHeadlessMatch(graph, { rule: 'custom', notation, economy, strategies });
const anchor = graph.farthest;

test('sliced action and waiting agree with two real matches in a contested region without mutating the source', () => {
  const economy = { policy: 'activity', stampCost: 1, birthCost: 5, stableEnergy: 0, combatFee: 2 };
  const base = match('B1/S0', economy), move = match('B1/S0', economy);
  for (const m of [base,move]) {
    const rival = m.patchForStamp(anchor, 0, [[4,0]]);
    assert(m.commitStamp(2, rival, false));
  }
  const before = move.game.players.map(p => p.reserve);
  const brain = beginLocalTrial(move.world, move.game, 1, anchor, [anchor], { radius: 12, horizon: 5 });
  assert.equal(brain.step(2), null);
  assert.equal(brain.generations, 2);
  assert(brain.nodes < 500 && brain.work > 0 && brain.work <= 2 * 2 * brain.nodes);
  const result = brain.step(3);
  assert.equal(brain.step(1), result);
  assert.deepEqual(move.game.players.map(p => p.reserve), before);
  assert.equal(move.world.activeCount, 1);
  assert.equal(move.world.gen, 0);

  assert(move.commitStamp(1, [anchor], false));
  for (let g = 0; g < 5; g++) { base.nextTick(); move.nextTick(); }
  for (const [id, side] of [[1,'own'],[2,'rival']]) {
    assert.equal(result[side+'Cash'], move.game.players[id-1].reserve - base.game.players[id-1].reserve);
    assert.equal(result[side+'Cells'], move.world.ownerCells[id].length - base.world.ownerCells[id].length);
  }
  assert.equal(result.boundary, false);
  assert(result.rivalCash < 0 && result.rivalCells < 0);
});

test('the frozen outside mature colony participates in marginal income; stamp cost is paid once', () => {
  const economy = { policy: 'stability', stampCost: 1, productionScale: 1, stableEnergy: 10, stableAfter: 2 };
  const m = match('B/S0', economy);
  assert(m.commitStamp(1, [m.game.players[1].seed], false)); m.nextTick();
  assert.equal(m.game.players[0].stable, 1);
  const brain = beginLocalTrial(m.world,m.game,1,anchor,[anchor],{ radius: 5, horizon: 18 });
  const result = brain.step(18);
  const marginal = 10 * (2/3 - 1/2);
  assert(Math.abs(result.ownCash - (18 * marginal - 1)) < 1e-8);
  assert(Math.abs(result.ownFlow - marginal) < 1e-8);
  assert.equal(result.ownCore, 1);
  assert.equal(result.rivalCore, 0);
});

test('real stamp legality, boundary censoring, frozen snapshots, and exhaustion of funding', () => {
  const m = match('B1/S0', { stampCost: 1, birthCost: 2 });
  const rival = m.patchForStamp(anchor, 0, [[4,0]])[0];
  assert(m.commitStamp(2, [rival], false));
  assert.equal(beginLocalTrial(m.world,m.game,1,anchor,[rival]), null);
  assert.equal(beginLocalTrial(m.world,m.game,1,anchor,[graph.adj[rival*6]]), null);
  m.game.players[0].reserve = 2;
  const job = beginLocalTrial(m.world,m.game,1,anchor,[anchor],{radius:4,horizon:16});
  m.game.players[0].reserve = 600; m.game.economy.birthCost = 0;
  const result = job.step(16);
  assert.equal(result.turns,1);
  assert(result.ownUnfunded && result.boundary);
});

test('a copied pentagon has five actual neighbours, and vacuum births stay neutral', () => {
  const m = match('B01/S0', { policy: 'activity', stampCost: 1, birthCost: 1 });
  const pentagon = graph.pents[0];
  const brain = beginLocalTrial(m.world,m.game,1,pentagon,[pentagon],{radius:6,horizon:1});
  const result = brain.step();
  assert.equal(result.ownCells, 6);
  assert.equal(result.ownCash, 4);
  assert.equal(result.rivalCash, 0);
  assert(result.boundary);
});

test('the deferred quote changes sign when persistent sites become liabilities', () => {
  for (const [policy, sign] of [['stability',1],['activity',-1]]) {
    const m = match('B/S0', { policy, stableAfter: 64, stableEnergy: 2, productionScale: 0, stampCost: 1 });
    const result = beginLocalTrial(m.world,m.game,1,anchor,[anchor],{radius:5,horizon:12}).step(12);
    assert.equal(result.ownCash, -1);
    assert.equal(result.ownFlow, 0); // The possible future tariff has not been paid.
    assert.equal(result.ownDeferredMid, sign*2);
    assert.equal(result.ownDeferredFlow, sign*2);
    assert.equal(result.ownDeferredTrend, 0);
  }
});
