import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSphere } from '../world/sphere.js';
import { createHeadlessMatch } from '../match/headless.js';
import { setGrowthPolicy, setConflictPolicy } from '../match/rule-profiles.js';
import { advanceGeneration } from './generation.js';
import { advancePattern, patternSite } from '../patterns/planar-simulation.js';
import { brainNamespace } from '../bots/brain/memory.js';
import { beginLocalTrial } from '../bots/brain/local-world.js';
import { emptyHexPatch } from '../bots/brain/proposals.js';
import { withGrowth } from './growth.js';

const sphere = buildSphere(32);
const idle = new Map([2,3,4,5,6].map(id=>[id,()=>{}]));
const fixture = [248,271,272,273,274,295,297,317,318,319,320,340,75,134,162,163,164,190,191,192,217];

test('the recorded collision quenches even under one owner while a disconnected farm of that owner survives', () => {
  const m = createHeadlessMatch(sphere, {rule:'hex-b2s245', growth:'classic'});
  for (const id of fixture) m.addLive(id,1);
  const farm = m.patchForStamp(m.game.players[1].seed,0,[[0,0],[-1,2],[-3,3],[0,3]]);
  assert(farm);
  for (const id of farm) m.addLive(id,1);
  const farmOnly = createHeadlessMatch(sphere, {rule:'hex-b2s245'});
  for (const id of farm) farmOnly.addLive(id,1);
  for (let g=0;g<144;g++) {
    advanceGeneration(m.world); advanceGeneration(farmOnly.world);
  }
  assert(m.world.activeCount>1000);
  assert.equal(farmOnly.world.activeCount,12);
  const before = m.world.activeCount, reserve=m.game.players[0].reserve;
  setGrowthPolicy(m.world,m.game,'contained');
  assert.equal(m.world.activeCount,before);
  assert.equal(m.game.players[0].reserve,reserve);
  for (let g=0;g<1024;g++) advanceGeneration(m.world);
  assert(farmOnly.world.ownerCells[1].every(id=>m.world.owners[id]===1));
  // Three isolated remnants of the original collision survive outside the farm.
  assert.equal(m.world.ownerCells[1].length,15);
  assert.equal(m.world.lastOutbreak.gen,145);
  assert(m.world.lastOutbreak.cells >= m.world.lastOutbreak.births && m.world.lastOutbreak.births >= 384);
  m.clearCells();assert.equal(m.world.lastOutbreak,null);
});

test('containment applies after physical birth arbitration and before credit, on plane, hexagons, pentagons and mental copies', () => {
  const args={rule:'custom',notation:'B1/S0',growth:'contained',growthThreshold:6,strategies:idle,
    economy:{policy:'activity',birthCost:5,stableEnergy:0,stampCost:2}};
  for (const [site,expectedBirths] of [[sphere.pents[0],5],[sphere.farthest,0]]) {
    const m=createHeadlessMatch(sphere,args), base=createHeadlessMatch(sphere,args);
    const start=m.game.players[0].reserve;
    const brain=beginLocalTrial(m.world,m.game,1,site,[site],{radius:5,horizon:1});
    const prediction=brain.step();
    assert(m.commitStamp(1,[site],false));m.nextTick();base.nextTick();
    const p=m.game.players[0];
    assert.equal(p.lastBirths,expectedBirths);
    assert.equal(p.reserve-start,5*expectedBirths-2);
    assert.equal(prediction.ownCash,p.reserve-base.game.players[0].reserve);
    assert.equal(prediction.ownCells,m.world.ownerCells[1].length);
    assert.equal(prediction.boundary,false);
    if(site===sphere.farthest){
      const turn=advancePattern(new Map([[patternSite(0,0),1]]),1,m.world.physics);
      assert.deepEqual([turn.births,turn.mature,turn.next.size],[0,0,0]);
    }
  }
  const vacuum=createHeadlessMatch(sphere,{rule:'custom',notation:'B0/S',growthThreshold:1});
  assert.equal(vacuum.world.physics.growthThreshold,undefined);
  assert.equal(vacuum.game.growth,'contained');
  advanceGeneration(vacuum.world);
  assert.equal(vacuum.world.ownerCells[7].length,sphere.n);
});

test('independent reactions can collectively exceed the birth threshold', () => {
  const m=createHeadlessMatch(sphere,{rule:'custom',notation:'B1/S0',growthThreshold:7});
  for(const p of m.game.players.slice(0,2)) m.addLive(p.seed,1);
  advanceGeneration(m.world);
  assert.equal(m.world.activeCount,14);
  assert.equal(m.world.lastOutbreak,null);
});

test('a quench pays no combat tribute for deaths that would have survived with rival neighbours', () => {
  const m=createHeadlessMatch(sphere,{rule:'custom',notation:'B1/S0123456',growthThreshold:2,strategies:idle,
    economy:{combatFee:10,stableEnergy:0,birthCost:0}});
  const site=sphere.farthest;
  m.addLive(site,1); m.addLive(sphere.adj[site*6],2);
  m.nextTick();
  assert.equal(m.world.activeCount,0);
  for(const p of m.game.players) assert.equal(p.tributePaid+p.tributeReceived,0);
});

test('the growth rule and threshold isolate memory, invalidate uncertain empty projections and survive conflict changes', () => {
  const m=createHeadlessMatch(sphere,{rule:'hex-b2s245',conflict:'legacy',growth:'classic'});
  const key=()=>brainNamespace(m.world,m.game);
  const old=key();
  setGrowthPolicy(m.world,m.game,'contained',6);
  const guarded=key(); assert.notEqual(guarded,old);
  setGrowthPolicy(m.world,m.game,'contained',7);
  assert.notEqual(key(),guarded);
  setConflictPolicy(m.world,m.game,'block');assert.equal(m.world.physics.growthThreshold,7);
  setConflictPolicy(m.world,m.game,'legacy');setGrowthPolicy(m.world,m.game,'classic');
  assert.equal(key(),old);
  assert.equal(m.world.physics.growthThreshold,undefined);
  assert.throws(()=>setGrowthPolicy(m.world,m.game,'contained',0),RangeError);
  assert.throws(()=>setGrowthPolicy(m.world,m.game,'contained',2.5),RangeError);
  assert.throws(()=>setGrowthPolicy(m.world,m.game,'invalid'),RangeError);
  assert.equal(m.game.growth,'classic');

  const c=sphere.farthest,pose={center:c,heading:0};
  const [near]=m.patchForStamp(c,0,[[5,0]]);
  m.addLive(near,2);
  assert(emptyHexPatch(m.world,pose,3,8));
  setGrowthPolicy(m.world,m.game,'contained',6);
  assert(!emptyHexPatch(m.world,pose,3,8));
  assert.equal(withGrowth(m.world.physics,'classic').growthThreshold,undefined);
});
