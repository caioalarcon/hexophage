import assert from 'node:assert/strict';
import test from 'node:test';
import {buildSphere} from '../../src/world/sphere.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {patchForStamp} from '../../src/patterns/spherical-patch.js';
import {evaluateCell} from '../../src/simulation/cell-fate.js';
import {resolveRuleProfile,ruleProfiles} from '../../src/match/rule-profiles.js';
import {createTypedWorld,resolvers} from './engine.mjs';

// Low-level arbitration fixtures start at an exact instant of contact. Real
// stamps have a clearance check so construct these snapshots from typed cells
// issued by the same world's stamping command, before advancing the clock.
function arrange(m, groups) {
  const scene=[];
  for(const [owner,rule,policy,ids] of groups) {
    assert(m.stamp(owner,rule,policy,[0]));
    const c=m.cells.get(0);
    m.cells.delete(0);
    scene.push(...ids.map(id=>[id,c]));
  }
  for(const [id,c] of scene){assert(!m.cells.has(id));m.cells.set(id,c);}
}
const g=buildSphere(14), mid=g.farthest;
const neighbor=(id,d,graph=g)=>graph.adj[6*id+d];
const free={stableEnergy:0,birthCost:0,stampCost:0,blastBirthCost:0,eraseCost:0,salvage:0};
const view=m=>[...m.cells].sort(([a],[b])=>a-b)
  .map(([id,c])=>[id,c.owner,c.rule,c.resolver,c.age,c.wave]);

test('all nine registered automata and four resolvers match production tables in isolation, across a pentagon',()=>{
  const pent=Array.from(g.deg).indexOf(5);
  const ids=[pent,neighbor(pent,0),neighbor(pent,1),neighbor(pent,3),neighbor(neighbor(pent,0),2)];
  const seed=[...new Set(ids)];
  for(const id of Object.keys(ruleProfiles).filter(k=>k!=='custom')) {
    const physics=resolveRuleProfile(id).physics;
    const worlds=resolvers.map(resolver=>{
      const m=createTypedWorld(g,{economy:free});
      assert(m.stamp(1,id,resolver,seed));return m;
    });
    let cells=new Uint8Array(g.n);
    for(const i of seed)cells[i]=1;
    for(let t=0;t<12;t++){
      const next=new Uint8Array(g.n);
      const fate=evaluateCell({graph:g,physics,cells,owners:cells});
      const expected=[];
      for(let i=0;i<g.n;i++)if(fate(i)){next[i]=1;expected.push(i);}
      cells=next;
      for(const m of worlds){m.step();assert.deepEqual([...m.cells.keys()].sort((a,b)=>a-b),expected,id);}
    }
  }
});

test('a paid phase birth enters a material body; an unfunded shot preserves its native survival and age',()=>{
  function intercept(wallet,guard=false) {
    const m=createTypedWorld(g,{wallets:[0,0],economy:{...free,eraseCost:24}});
    arrange(m,[[2,'hex-b2s245',guard?'guard':'contact',[mid,neighbor(mid,3),neighbor(mid,4)]],
      [1,'bays','phase',[neighbor(mid,0),neighbor(mid,1)]]]);
    m.players[1].reserve=wallet;m.step();return m;
  }
  const hit=intercept(100), miss=intercept(0), shield=intercept(100,true);
  assert.equal(hit.cells.get(mid).owner,1);
  assert.equal(hit.cells.get(mid).rule,'bays');
  assert.equal(hit.players[1].eraseSpent,24*hit.players[2].lost);
  assert.equal(hit.players[1].erased,hit.players[2].lost);
  assert.equal(miss.cells.get(mid).age,2);
  assert.equal(miss.cells.get(mid).owner,2);
  assert(miss.players[1].refused>0);
  assert.equal(miss.players[1].eraseSpent,0);
  assert.equal(shield.cells.get(mid).owner,2);
});

test('a carrier collides, seeds a triangle, then the observed shock follows native B2/S245 with no event radius',()=>{
  const graph=buildSphere(44), origin=graph.farthest, target=neighbor(origin,0,graph);
  const m=createTypedWorld(graph,{economy:free});
  arrange(m,[[1,'ashley15','antimatter',[origin]],[2,'bays','phase',[target]]]);
  m.step();
  assert.deepEqual([m.lastIgnitions.length,m.cells.size,m.players[1].detonations],[1,3,1]);
  const reference=createTypedWorld(graph,{economy:free});
  reference.stamp(1,'hex-b2s245','contact',[...m.cells.keys()]);
  for(let t=1;t<=32;t++) {
    m.step();reference.step();
    assert([...m.cells.values()].every(c=>c.wave && c.rule==='hex-b2s245' && c.owner===1));
    assert.deepEqual([...m.cells.keys()].sort((a,b)=>a-b),[...reference.cells.keys()].sort((a,b)=>a-b));
    if(t===16)assert.equal(m.cells.size,54);
    if(t===32)assert.equal(m.cells.size,108);
  }
  assert.equal(m.players[1].detonations,1);
});

test('supported guard withstands unpaid shock penetration and charges armour for both friendly and enemy cuts',()=>{
  function ignite(targetOwner,wallet) {
    const m=createTypedWorld(g,{economy:{...free,eraseCost:24,guardMultiplier:2}});
    arrange(m,[[targetOwner,'hex-b2s245','guard',[mid,neighbor(mid,3),neighbor(mid,4)]],
      [1,'bays','antimatter',[neighbor(mid,0)]]]);
    m.players[1].reserve=wallet;m.step();return m;
  }
  for(const targetOwner of [1,2]) {
    const cheap=ignite(targetOwner,47);
    assert.equal(cheap.cells.get(mid).resolver,'guard');
    assert(cheap.players[1].refused>=1);assert.equal(cheap.players[1].detonations,1);
    const enough=ignite(targetOwner,48);
    assert.equal(enough.cells.get(mid).wave,true);
    const p=enough.players[1];
    assert.equal(p.eraseSpent+p.friendlyEraseSpent,48);
    assert.equal(p.friendlyErased,targetOwner===1?1:0);
    assert.equal(p.erased,targetOwner===2?1:0);
  }
});

test('liquidation sacrifices real non-wave assets, cannot create debt and reconciles each wallet',()=>{
  function fire(salvage) {
    const m=createTypedWorld(g,{wallets:[0,0],economy:{...free,blastBirthCost:2,salvage}});
    const remote=0;
    arrange(m,[[1,'bays','antimatter',[mid]],[2,'ashley15','phase',[neighbor(mid,0)]],
      [1,'hex-b2s245','contact',[remote,neighbor(remote,0),neighbor(remote,1)]]]);
    m.step();return m;
  }
  const cashless=fire(0), sold=fire(3);
  assert.equal(cashless.players[1].waveBirths,0);
  assert.equal(cashless.players[1].erased,0);
  const p=sold.players[1];
  assert.equal(p.waveBirths,3);assert.equal(p.eroded,2);
  assert.equal([0,neighbor(0,0),neighbor(0,1)].filter(id=>sold.cells.has(id)).length,1);
  assert.equal(p.reserve,p.income+p.salvageIncome-p.birthSpent-p.eraseSpent-p.stampSpent-p.friendlyEraseSpent);
  assert(p.reserve>=0);
});

test('funding and ties are invariant to swapped owner IDs and reversed insertion order',()=>{
  function game(flip) {
    const owner=i=>flip?3-i:i;
    const m=createTypedWorld(g,{wallets:[140,140],seed:93,economy:{...free,birthCost:2,eraseCost:9}});
    let groups=[[owner(1),'bays','phase',[neighbor(mid,0),neighbor(mid,1)]],
      [owner(2),'hex-b2s245','phase',[neighbor(mid,3),neighbor(mid,4)]]];
    if(flip)groups=groups.reverse().map(([o,r,p,ids])=>[o,r,p,ids.reverse()]);
    arrange(m,groups);
    for(let i=0;i<23;i++)m.step();
    return {sites:view(m).map(([id,o,...rest])=>[id,owner(o),...rest]),
      accounts:[1,2].map(o=>m.players[owner(o)])};
  }
  assert.deepEqual(game(false),game(true));
});

test('stamps reject direct attacks; bounded forks preserve outside rent and do not modify reality',()=>{
  const m=createTypedWorld(g,{wallets:[200,200],economy:{...free,stampCost:2,guardStampExtra:4,stableEnergy:1,stableAfter:1}});
  assert(m.canStamp(1,'hex-b2s245','guard',[mid,neighbor(mid,0),neighbor(mid,1)]));
  assert(m.stamp(1,'hex-b2s245','guard',[mid,neighbor(mid,0),neighbor(mid,1)]));
  assert.equal(m.players[1].stampSpent,18);
  assert(!m.canStamp(2,'bays','phase',[mid]));
  assert(!m.stamp(2,'bays','phase',[neighbor(mid,2)]));
  const small=m.fork(new Set([0,neighbor(0,0)]));
  assert.equal(small.cells.size,0);
  assert(!small.canStamp(2,'bays','phase',[g.farthest]));
  small.step();
  assert.equal(small.players[1].field,3);
  assert.equal(small.players[1].income,3/(1+3/60));
  assert.equal(m.players[1].income,0);assert.equal(m.gen,0);
  const twin=m.fork();
  assert(Object.isFrozen(twin.cells.get(mid)));
  twin.step();m.step();
  assert.deepEqual(view(twin),view(m));assert.deepEqual(twin.players,m.players);
});

test('strict phase passage changes a simultaneous empty-site birth without an erase, independently of owner labels',()=>{
  function winner(seed,phasePriority,reverse) {
    const m=createTypedWorld(g,{seed,economy:{...free,eraseCost:24,phasePriority}});
    const phase=reverse?2:1, contact=3-phase;
    const groups=[[phase,'bays','phase',[neighbor(mid,0),neighbor(mid,1)]],
      [contact,'bays','contact',[neighbor(mid,3),neighbor(mid,4)]]];
    arrange(m,reverse?groups.reverse():groups);m.step();
    assert.equal(m.players[1].eraseSpent+m.players[2].eraseSpent,0);
    return m.cells.get(mid)?.resolver;
  }
  const ordinary=new Set();
  for(let seed=0;seed<8;seed++) {
    const open=winner(seed,0,false);
    ordinary.add(open);assert.equal(winner(seed,0,true),open);
    assert.equal(winner(seed,1,false),'phase');assert.equal(winner(seed,1,true),'phase');
  }
  assert.deepEqual(ordinary,new Set(['phase','contact']));
});

test('one owner grows a B2/S245 farm and a Bays ship on the same planet, earning and spending from one wallet',()=>{
  const graph=buildSphere(48), start=graph.farthest;
  const end=Array.from({length:graph.n},(_,i)=>i).find(i=>graph.distance[i]>8 &&
    [0,1,2].reduce((s,k)=>s+graph.coords[3*i+k]*graph.coords[3*start+k],0)<-.7);
  const make=()=>createTypedWorld(graph,{wallets:[5000,5000],economy:{stampCost:5,
    stableEnergy:1,stableAfter:4,productionScale:8,birthCost:1}});
  const both=make(),farm=make(),ship=make();
  function buy(m,rule,id,site) {
    const pat=resolveRuleProfile(rule).gameplay.patterns.find(p=>p.id===id);
    const points=patchForStamp({graph},site,0,decodeRLE(pat.rle));
    assert(m.stamp(1,rule,'contact',points));
  }
  for(const m of [both,farm])buy(m,'hex-b2s245','farm-4-12',start);
  for(const m of [both,ship])buy(m,'bays','glider',end);
  assert.equal(both.players[1].stampSpent,ship.players[1].stampSpent+farm.players[1].stampSpent);
  for(let i=0;i<40;i++){
    both.step();farm.step();ship.step();
    assert.deepEqual(view(both),[...view(farm),...view(ship)].sort(([a],[b])=>a-b));
  }
  assert.equal(farm.cells.size,12);assert(ship.cells.size>0);
  const p=both.players[1];
  assert(Math.abs(p.reserve-(5000+p.income-p.stampSpent-p.birthSpent))<1e-8);
  assert(p.income>0 && p.birthSpent>0);
});

test('a narrow forecast clips the real ignition triangle without moving its third vertex',()=>{
  const m=createTypedWorld(g,{economy:free});
  arrange(m,[[1,'bays','antimatter',[mid]],[2,'bays','phase',[neighbor(mid,0)]]]);
  const full=m.fork();
  full.step();
  const missing=full.lastIgnitions[0].sites[2];
  const visible=new Set(Array.from({length:g.n},(_,i)=>i).filter(i=>i!==missing));
  const local=m.fork(visible);
  local.step();
  assert.deepEqual(view(local),view(full).filter(([site])=>visible.has(site)));
  assert.deepEqual(local.lastIgnitions[0].sites,full.lastIgnitions[0].sites.filter(i=>visible.has(i)));
});

test('nested forecasts cannot expand their parent view',()=>{
  const m=createTypedWorld(g,{economy:free});
  const disk=m.fork([mid]), nested=disk.fork([mid,neighbor(mid,0)]);
  assert(nested.canStamp(1,'bays','phase',[mid]));
  assert(!nested.canStamp(1,'bays','phase',[neighbor(mid,0)]));
});

test('simultaneous explosions have the same replay event order for both insertions',()=>{
  function fire(reverse) {
    const m=createTypedWorld(g,{economy:free});
    const groups=[
      [1,'bays','antimatter',[mid]],[2,'bays','contact',[neighbor(mid,0)]],
      [2,'bays','antimatter',[0]],[1,'bays','contact',[neighbor(0,0)]],
    ];
    arrange(m,reverse?groups.reverse():groups);
    m.step();
    assert.equal(m.lastIgnitions.length,2);
    return {events:m.lastIgnitions,sites:view(m)};
  }
  assert.deepEqual(fire(true),fire(false));
});

test('phase cannot overwrite another type sharing its wallet, including a dying allied site',()=>{
  function intercept(owner,support) {
    const m=createTypedWorld(g,{economy:{...free,eraseCost:5}});
    arrange(m,[[owner,'hex-b2s245','contact',[mid,...support]],[1,'bays','phase',[neighbor(mid,0),neighbor(mid,1)]]]);
    m.step();return m;
  }
  const supports=[neighbor(mid,3),neighbor(mid,4)];
  const ally=intercept(1,supports), lone=intercept(1,[]), rival=intercept(2,supports);
  assert.equal(ally.cells.get(mid).resolver,'contact');
  assert.equal(ally.cells.get(mid).age,2);
  assert.equal(ally.players[1].friendlyErased,0);
  assert.equal(lone.cells.has(mid),false);
  assert.equal(rival.cells.get(mid).resolver,'phase');
  assert(rival.players[1].eraseSpent>=5);
});

test('stamps require a numeric player identity present in the match',()=>{
  const m=createTypedWorld(g,{economy:free});
  for(const id of ['1','length','constructor',0,3,1.5])
    assert.equal(m.stamp(id,'bays','phase',[mid]),false);
  assert.equal(m.cells.size,0);
  assert(m.stamp(1,'bays','phase',[mid]));
});
