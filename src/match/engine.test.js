import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessMatch } from './headless.js';
import { createMatchEngine } from './engine.js';
import { buildSphere } from '../world/sphere.js';

test('two simultaneous matches on one graph keep separate turns, buffers, finances and bot plans', () => {
  const graph = buildSphere(20);
  const actions = [];
  const overrides = new Map([[2, (p) => actions.push(p.id)]]);
  const first = createHeadlessMatch(graph, { tax: 0, interval: 1, strategies: overrides });
  const second = createHeadlessMatch(graph, { tax: 0, interval: 1 });
  first.nextTick();
  assert.deepEqual(actions, [2]);
  assert.equal(first.game.players[1].stamps, 0);
  assert.equal(second.world.gen, 0);
  assert.equal(second.world.activeCount, 0);
  assert.equal(second.game.players[2].stamps, 0);
  assert.notEqual(second.game.botPlans[2], first.game.botPlans[2]);
  second.nextTick();
  assert.equal(second.game.players[1].stamps, 1);
  assert.equal(second.game.players[1].reserve, 8000 - 17);
});

test('ghost and commit share checks for cost, overlap, border ownership and duplicate IDs', () => {
  const match = createHeadlessMatch(buildSphere(20));
  const { world, game } = match;
  const changes = [];
  const engine = createMatchEngine(world, game, {
    populationChanged: () => changes.push('cell'),
    stampApplied: (p, n) => changes.push([p.id, n, p.reserve]),
  });
  const [human, bot] = game.players;
  const a = human.seed,
    b = world.graph.adj[6 * a];
  assert.deepEqual(engine.stampAdditions(1, [a]), [a]);
  assert(engine.commitStamp(1, [a]));
  assert.deepEqual(changes, ['cell', [1, 1, 7999]]);
  assert.equal(engine.commitStamp(2, [a]), false);
  assert.equal(engine.commitStamp(2, [b]), false);
  assert.equal(engine.commitStamp(1, [a, a, b]), false);
  assert.equal(engine.commitStamp(1, [a]), false);
  human.reserve = 1;
  assert.equal(engine.commitStamp(1, [a, b]), false);
  human.reserve = 2;
  assert.deepEqual(engine.stampAdditions(1, [a, b]), [b]);
  assert(engine.commitStamp(1, [a, b], false));
  assert.deepEqual(changes, ['cell', [1, 1, 7999], 'cell']);
  assert.equal(human.reserve, 1);
  assert.equal(bot.reserve, 8000);
  assert.equal(game.humanHistory.placed, 2);
  assert.equal(game.humanHistory.peak.field, 2);
});

test('first-generation and match-end signals preserve their original relative order', () => {
  const { world, game } = createHeadlessMatch(buildSphere(20));
  game.players.forEach((p, i) => {
    p.reserve = i === 0 ? 1 : 0;
  });
  const calls = [];
  const engine = createMatchEngine(world, game, {
    populationChanged: () => calls.push('changed'),
    pause: () => calls.push('pause'),
    matchDecided: (p) => calls.push(p.id),
    firstGeneration: () => calls.push('settings'),
    showResults: () => calls.push('result'),
  });
  engine.nextTick();
  engine.nextTick();
  assert.equal(world.gen, 1);
  assert.equal(game.winner, 1);
  assert.deepEqual(calls, ['changed', 'pause', 1, 'settings', 'result']);
});
