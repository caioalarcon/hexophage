import test from 'node:test';
import assert from 'node:assert/strict';
import { conflictPolicies, withConflict } from './conflict.js';
import { evaluateCell } from './cell-fate.js';
import { advanceGeneration } from './generation.js';
import { compileTotalistic } from './rules.js';
import { createHeadlessMatch } from '../match/headless.js';
import { setConflictPolicy, resolveRuleProfile, applyRuleProfile } from '../match/rule-profiles.js';
import { buildSphere } from '../world/sphere.js';
import { brainNamespace } from '../bots/brain/memory.js';
import { recognizes, witness } from '../bots/brain/proposals.js';
import { beginLocalTrial } from '../bots/brain/local-world.js';

const anyBirth = compileTotalistic('B0123456/S0123456');
function fate(parents, policy, { owner = 0, reverse, ids } = {}) {
  const owners = [owner, ...parents], cells = owners.map(o=>Number(o !== 0));
  const adj = parents.map((_,i)=>i+1);
  if (reverse) adj.reverse();
  const graph = {deg:[parents.length], adj, ids};
  return evaluateCell({graph, physics: withConflict(anyBirth, policy), owners, cells})(0);
}

test('mixed births on hexagons and pentagons obey the explicit policy independently of survivor ownership', () => {
  for (const degree of [5,6]) {
    const ring = (...values) => Array.from({length:degree}, (_,i)=>values[i]??0);
    for (const policy of Object.keys(conflictPolicies)) {
      assert.equal(fate(ring(),policy),7);
      assert.equal(fate(ring(7,7),policy),7);
      assert.equal(fate(ring(6,6),policy),6);
      assert.equal(fate(ring(2,2,2,1),policy,{owner:4}),4);
    }
    assert.equal(fate(ring(1,1,2), 'lineage'),1);
    assert.equal(fate(ring(1,1,2), 'block'),0);
    assert.equal(fate(ring(2,7,7), 'legacy'),7);
    assert.equal(fate(ring(2,7,7), 'lineage'),2);
    assert.equal(fate(ring(2,7,7), 'block'),2);
    const pair = ring(1,2), swapped = ring(2,1), winners = new Set();
    assert.equal(fate(pair,'legacy'),7);
    for (let site=1;site<=64;site++) {
      const options = {ids: [site*7, ...pair.map((_,i)=>site*7+i+1)]};
      const winner = fate(pair,'lineage',options);
      assert([1,2].includes(winner));
      winners.add(winner);
      assert.equal(fate(swapped,'lineage',options),3-winner);
      assert.equal(fate(pair,'lineage',{...options,reverse:true}),winner);
      assert.equal(fate(pair,'lineage',options),winner);
    }
    assert.equal(winners.size,2);
  }
});

const graph = buildSphere(24);
const noop = new Map([2,3,4,5,6].map(id=>[id,()=>{}]));
test('local projected trials use the real global sites, ownership, and tribute of spherical collisions', () => {
  for (const conflict of Object.keys(conflictPolicies)) {
    // The rival and the potential stamp can legally start at distance two.
    // Their overlapping neighbourhood creates team ties on the first tick.
    for (let dir=0;dir<3;dir++) {
      const args = {rule:'hex-b2s245',conflict,strategies:noop,
        economy:{policy:'activity',stampCost:1,birthCost:2,combatFee:5,stableAfter:2}};
      const base=createHeadlessMatch(graph,args), action=createHeadlessMatch(graph,args);
      const site=graph.farthest;
      const offset=m=>m.patchForStamp(site,dir,[[2,0],[2,1],[3,0]]);
      for (const m of [base,action]) assert(m.commitStamp(2,offset(m),false));
      const stamp=action.patchForStamp(site,dir,[[0,0],[0,-1]]);
      const brain=beginLocalTrial(action.world,action.game,1,site,stamp,{radius:12,horizon:6});
      const result=brain.step(6);
      assert(action.commitStamp(1,stamp,false));
      for (let n=0;n<6;n++) { base.nextTick(); action.nextTick(); }
      for (const [id,side] of [[1,'own'],[2,'rival']]) {
        assert.equal(result[side+'Cells'],action.world.ownerCells[id].length-base.world.ownerCells[id].length,conflict);
        assert(Math.abs(result[side+'Cash']-(action.game.players[id-1].reserve-base.game.players[id-1].reserve))<1e-8,conflict);
      }
      assert.equal(result.boundary,false);
    }
  }
});

test('a live policy switch isolates learned memories, preserves balances and survives a rule change', () => {
  const match=createHeadlessMatch(graph,{rule:'hex-b2s245', conflict:'legacy', strategies:noop});
  const {world,game}=match;
  const key=()=>brainNamespace(world,game);
  const original=key(), originalPhysics=world.physics;
  assert(match.commitStamp(1,[graph.farthest],false));
  match.nextTick();
  const cash=game.players[0].reserve;
  setConflictPolicy(world,game,'lineage');
  const lineage=key(); assert.notEqual(lineage,original);
  assert.equal(world.gen,1);
  assert.equal(cash,game.players[0].reserve);
  assert.equal(world.physics.tables,originalPhysics.tables);
  const spot={center:graph.farthest,heading:0};
  const proof=witness(world,spot,3,2,4);
  assert.equal(proof.offsets,null);
  assert(recognizes(world,spot,proof));
  assert(!recognizes(world,{...spot,center:graph.adj[6*spot.center]},proof));
  assert.throws(()=>setConflictPolicy(world,game,'unknown'),RangeError);
  assert.equal(game.conflict,'lineage');
  setConflictPolicy(world,game,'block');
  assert.notEqual(key(),lineage);
  assert.notEqual(key(),original);
  setConflictPolicy(world,game,'legacy');
  assert.equal(key(),original);
  assert.equal(world.physics,originalPhysics);
  setConflictPolicy(world,game,'lineage');
  applyRuleProfile(world,game,resolveRuleProfile('bays'));
  assert.equal(game.conflict,'lineage');
  assert.equal(world.physics.siteDependentBirths,true);
});

test('the reported nine-cell ship impact has zero neutral descendants under lineage with identical binary occupancy', () => {
  const sphere=buildSphere(32), targets=[248,271,272,273,274,295,297,317,318,319,320,340];
  const ship=[75,134,162,163,164,190,191,192,217];
  const impact=policy=>{
    const m=createHeadlessMatch(sphere,{rule:'hex-b2s245',conflict:policy});
    for(const id of targets) m.addLive(id,2);
    for(const id of ship) m.addLive(id,1);
    return m.world;
  };
  const old=impact('legacy'), contested=impact('lineage'), blocked=impact('block');
  for(let g=1;g<=36;g++) {
    for(const w of [old,contested,blocked]) advanceGeneration(w);
    assert.deepEqual(old.cells,contested.cells,'occupancy at G'+g);
    assert.equal(contested.ownerCells[7].length,0);
    if(g===6) assert.equal(old.ownerCells[7].length,2);
  }
  assert.equal(old.ownerCells[7].length,152);
  assert.equal(blocked.ownerCells[7].length,0);
  assert.equal(blocked.ownerCells[2].length,12);
});
