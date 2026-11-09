// Three unassisted five-player matches: cold, transfer into a new seed, then
// a cold control of that exact new seed. The previous source checkout can
// run through the same recorder; no changes to its simulation are required.
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [rule='ashley15', firstSeed='4751', frequency='40', horizon='8192',
  root=fileURLToPath(new URL('../../',import.meta.url)), policy='activity', growth='contained'] = process.argv.slice(2);
const source = path => import(pathToFileURL(resolve(root,path)).href);
const {createHeadlessMatch} = await source('src/match/headless.js');
const {buildSphere} = await source('src/world/sphere.js');
const {ACTIVITY_ECONOMY, STABILITY_ECONOMY} = await source('src/match/constructive-economy.js');
const {createBrainArchive} = await source('src/bots/brain/memory.js');
const economy = policy === 'activity' ? ACTIVITY_ECONOMY : STABILITY_ECONOMY;
const graph = buildSphere(Number(frequency));
const saved = new Map();
const storage = {getItem:k=>saved.get(k)??null, setItem:(k,v)=>saved.set(k,v)};

for (const [session,seed] of [['cold',+firstSeed],['warm',+firstSeed+1],['cold-control',+firstSeed+1]]) {
  const firstTrial = {}, first = {}, buys = {}, buyers = {};
  // Reopening a new archive from the saved bytes also verifies that the next
  // session is not accidentally reading private data from the live learners.
  const archive = createBrainArchive(session === 'cold-control' ? undefined : storage);
  const observed = {open(namespace) {
    const bank = archive.open(namespace);
    return {...bank, observe(owner,kind,id,value) {
      if (kind === 'empty' || kind === 'own' || kind === 'rival') firstTrial[id] ??= m.world.gen;
      bank.observe(owner,kind,id,value);
    }};
  }};
  function onPlacement({stamp,owner,gen}) {
    first[stamp] ??= gen;
    buys[stamp] = (buys[stamp] ?? 0) + 1;
    (buyers[stamp] ??= new Set()).add(owner);
  }
  const m = createHeadlessMatch(graph, {rule, growth, conflict:'lineage', economy, botMode:'learn',
    brain:{seed, archive:observed, onPlacement}});
  m.game.players[0].out = true;
  while (m.world.gen < +horizon && !m.game.ended) m.nextTick();

  const {studies,visits,tactical,actions} = m.game.brainMetrics;
  const bots = m.game.players.slice(1);
  const cash = bots.reduce((total,p)=>total+p.reserve,0);
  const paid = bots.reduce((total,p)=>total+p.stampedEnergy,0);
  const row = {rule, tariff:policy, growth, session, seed, F:+frequency, limit:+horizon, gen:m.world.gen,
    prior:m.game.brainMemory.stats().priorSamples, measured:studies, visits, field:m.world.activeCount,
    aimed:tactical, orders:actions, survivors:bots.filter(p=>!p.out).length, cash, paid,
    operatingCash:cash+paid-bots.length*m.game.init, firstTrial, first, buys,
    buyers:Object.fromEntries(Object.entries(buyers).map(([id,owners])=>[id,owners.size]))};
  m.resetPlayers(); // the same archive flush as the browser's New match button
  console.log(JSON.stringify(row));
}
