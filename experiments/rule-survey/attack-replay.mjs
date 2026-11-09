// Replay the naturally chosen attack in the cold B2/S245 match with and without its purchase.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { patchForStamp } from '../../src/patterns/spherical-patch.js';
import { createHeadlessMatch } from '../../src/match/headless.js';
import { STABILITY_ECONOMY } from '../../src/match/constructive-economy.js';
import { buildSphere } from '../../src/world/sphere.js';

const rule = 'hex-b2s245', horizon = 360000, graph = buildSphere(32);
const candidates = JSON.parse(readFileSync(new URL('./attack-catalog.json', import.meta.url)));
function play(tape, capture) {
  const overrides = new Map();
  const m = createHeadlessMatch(graph, { growth:'classic', conflict: 'legacy', rule, economy: STABILITY_ECONOMY,
    botMode:tape ? 'profile' : 'learn', strategies:overrides, brain:{ seed:4751 } });
  const { world, game } = m;
  game.gameplay = { ...game.gameplay, patterns:candidates, kit:Object.fromEntries(candidates.map(p=>[p.id,{}])) };
  game.players[0].out = true;
  const bots = game.players.slice(1), orders = [], counts = {}, spending = {}, picks = {};
  if (tape) {
    for (const p of bots) {
      const queue = tape.filter(o => o.owner === p.id);
      overrides.set(p.id, () => {
        if (queue[0]?.gen !== world.gen) return;
        assert(m.commitStamp(p.id, queue.shift().cells, false));
      });
    }
  }
  while (world.gen < horizon && !game.ended) {
    const before = game.brainMetrics?.tactical ?? 0;
    m.nextTick();
    capture?.(world, game);
    if (tape) continue;
    const targeted = (game.brainMetrics?.tactical ?? 0) > before;
    const fresh = [];
    for (const p of bots) {
      if ((counts[p.id] ?? 0) === p.stamps) continue;
      const added = (p.stampedEnergy - (spending[p.id] ?? 0)) / game.economy.stampCost;
      const hand = game.brainMetrics.byBot[p.id].patterns;
      const changes = Object.keys(hand).filter(id => hand[id] !== picks[p.id]?.[id]);
      assert.equal(changes.length, 1);
      picks[p.id] = { ...hand };
      fresh.push({ gen:world.gen, owner:p.id, stamp:changes[0], cells:world.ownerCells[p.id].slice(-added), targeted });
      counts[p.id] = p.stamps; spending[p.id] = p.stampedEnergy;
    }
    if (targeted) assert.equal(fresh.length, 1, 'Targeted purchase must be unambiguous');
    orders.push(...fresh);
  }
  return { orders, gen:world.gen, players:bots.map(p => ({ id:p.id, cash:p.reserve, flow:p.flowAverage,
    cells:world.ownerCells[p.id].length, births:p.totalBirths, deaths:p.totalDeaths, tribute:p.tributePaid,
    stamps:p.stamps, out:p.out })) };
}
const real = play();
const attack = real.orders.filter(o => o.targeted);
assert.equal(attack.length, 1);
assert.equal(real.orders.at(-1), attack[0]);
const from = attack[0].gen;
const moments = new Set([from - 1, ...Array.from({length:33}, (_,i)=>from+i),
  from+64, from+256, from+1024, from+4096, horizon]);
const offsets = [];
for (let q = -8; q <= 8; q++) for (let r = -8; r <= 8; r++)
  if (Math.abs(q+r) <= 8) offsets.push([q,r]);
const ids = patchForStamp({graph},attack[0].cells[0],0,offsets);
assert(ids);
function recorder(frames) {
  return (world,game) => {
    if (!moments.has(world.gen)) return;
    const live = [];
    for (let i=0;i<ids.length;i++)
      if (world.owners[ids[i]]) live.push([...offsets[i],world.owners[ids[i]]]);
    const victim = game.players[1];
    frames.push({gen:world.gen, live, cash:Math.round(victim.reserve), flow:+victim.flowAverage.toFixed(3)});
  };
}
const actual = [], omitted = [];
const replay = play(real.orders,recorder(actual));
const control = play(real.orders.filter(o => !o.targeted),recorder(omitted));
assert.deepEqual([real.gen,real.players],[replay.gen,replay.players]);
assert.equal(control.gen,real.gen);
assert.equal(actual.length,moments.size);
const page = new URL('./attack-view.html',import.meta.url);
const html = readFileSync(page,'utf8');
writeFileSync(page,html.replace(/(<script id="frames" type="application\/json">)[^<]*(<\/script>)/,
  (_,open,close) => open+JSON.stringify({from,actual,omitted})+close));
console.log(JSON.stringify({ rule, F:graph.f, seed:4751, gen:real.gen, attack:attack[0],
  openingOrders:real.orders.filter(o => !o.targeted), withAttack:real.players, withoutAttack:control.players }, null, 2));
