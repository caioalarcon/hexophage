// Integration regression: real spherical graph, real engine, real bot planner.
// Run: node tests/bot-isolation.cjs (no dependencies).
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const raw = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const script = raw.split('<script>(() => {')[1]?.split('</script>')[0];
const cutoff = "initRuleTables();parseRule('B2/S35');";
assert(script?.includes(cutoff), 'Engine script not found');
const source = script.slice(0, script.lastIndexOf(cutoff));
const stubCtx = {};
const stub = {
  getContext: () => stubCtx, getBoundingClientRect: () => ({width: 1200, height: 800}),
  setAttribute() {}, addEventListener() {}, replaceChildren() {}, append() {}, add() {},
  querySelector: () => stub, querySelectorAll: () => [],
  classList: {toggle() {}, add() {}, remove() {}},
  value: '', textContent: '', style: {}, clientWidth: 1000,
};
const sandbox = {
  document: {getElementById: () => stub, createElement: () => stub},
  console, window: {}, performance: require('node:perf_hooks').performance,
  requestAnimationFrame() {},
};
vm.createContext(sandbox);
const setup = [
  'initRuleTables();',
  'const g = buildSphere(64);',
  'world.graph = g;',
  'Object.assign(world, allocateCells(g.n));',
  "world.rule = 'callahan'; world.gen = world.epoch = world.statCount = 0;",
  'const seeds = sphereSpawns(g);',
  'game.players = Array.from({length: 6}, (_, i) => ({',
  " id: i + 1, seed: seeds[i], reserve: 100000, stamps: 0,",
  " out: false, debtCarry: 0, received: 0, paid: 0, eroded: 0,",
  " lastFlow: 0, pattern: i === 0 ? 'manual' : game.bots[i - 1]",
  '}));',
  'game.botPlans = game.players.map(p => p.id === 1 ? null : botSpiralPlan(p.seed));',
  'game.botReserved = new Uint8Array(g.n);',
  'game.tax = 0; game.interval = 8;',
  'game.initializing = game.ended = false; game.humanHistory = null;',
  'globalThis.testGame = {world, game, nextTick};',
].join('\n');
vm.runInContext('(() => {\n' + source + '\n' + setup + '\n})();', sandbox, {timeout: 30000});
const {world, game, nextTick} = sandbox.testGame;
const oracle = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'oracle-populations.json')));
const planted = Array.from({length: 5}, () => []);
const previous = Array(5).fill(0);
for (let t = 1; t <= 600; t++) {
  nextTick();
  for (let b = 0; b < 5; b++) {
    const bot = game.players[b + 1];
    if (bot.stamps > previous[b]) {
      assert.equal(bot.stamps, previous[b] + 1);
      planted[b].push(world.gen);
      previous[b] = bot.stamps;
    }
    const period = oracle[bot.pattern];
    const expected = planted[b].reduce((sum, gen) => sum + period[(world.gen - gen) % period.length], 0);
    assert.equal(world.ownerCells[bot.id].length, expected,
      'Bot ' + bot.pattern + ' interferiu na própria população na geração ' + world.gen);
  }
}
console.log('PASS: 5 osciladores, 600 gerações, esfera f64 (' + world.graph.n +
  ' células), carimbos: ' + previous.join(', ') + '. Sem autocolisões.');
