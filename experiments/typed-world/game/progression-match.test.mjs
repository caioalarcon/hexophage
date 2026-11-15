import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameMatch} from './match.mjs';
import {patchForStamp} from '../../../src/patterns/spherical-patch.js';

test('spatial boolean options use the same seeded opening as the engine',()=>{
  const s=createGameMatch({F:16,players:2,spatial:true,unseededOwners:[1]});
  assert(s.baseTrial.ok);assert(s.opening[1]);assert(s.match.spatial.enabled);
});

test('loss of the player-chosen base lineage eliminates agency while other cells remain',()=>{
  const s=createGameMatch({F:16,players:3,progression:{enabled:true}}),m=s.match;
  const rivalPlan=m.progression.planFor(2),node=rivalPlan.nodes.find(n=>n.id==='bot2_relay');let target;
  for(const site of m.visibility(2).visible){
    const ids=patchForStamp({graph:s.graph},site,0,node.offsets);
    if(ids&&m.canStamp(2,node.rule,node.resolver,ids,node.ballot,node.sense,{contract:node.id})){target=ids;break;}
  }
  assert(target);assert(m.stamp(2,node.rule,node.resolver,target,node.ballot,node.sense,{contract:node.id}));
  for(const [id,c] of [...m.cells])if(c.owner===2&&c.contract===rivalPlan.base)m.erase(2,id,0);
  assert([...m.cells.values()].some(c=>c.owner===2&&c.contract==='bot2_relay'));
  s.step();assert.equal(s.alive[2],false);assert.equal(m.players[2].out,true);
  assert.equal(s.eliminatedAt[2],1);assert.equal(s.outcome,null);
  assert.equal(m.progression.objective(2).defeated,true);
});

test('a low-capacity recipe clamps stamped fuel and can enter a match',()=>{
  const s=createGameMatch({F:16,players:2,progression:{enabled:true}});
  const plan=structuredClone(s.match.progression.plan);plan.nodes.find(n=>n.id==='scout').capacity=8;
  const low=createGameMatch({F:16,players:2,progression:{enabled:true,plan}});
  const node=low.match.progression.plan.nodes.find(n=>n.id==='scout');
  const quote=low.match.stampQuote(node.rule,node.resolver,node.size,{contract:node.id});
  assert.equal(quote.traits.cellCapacity,8);assert.equal(quote.traits.stampEnergy,8);
});

test('each bot receives its own deterministic template, and foreign contracts are rejected',()=>{
  const s=createGameMatch({F:16,players:4,progression:{enabled:true}}),m=s.match,p=m.progression;
  assert.equal(p.planFor(1).base,'base');
  assert.equal(p.planFor(2).base,'bot2_base');assert.equal(p.planFor(3).base,'bot3_base');
  assert.notDeepEqual(p.planFor(2).nodes[0].weights,p.planFor(3).nodes[0].weights);
  assert(s.opening[1].ids.every(site=>m.cells.get(site).contract==='base'));
  assert(s.opening[2].ids.every(site=>m.cells.get(site).contract==='bot2_base'));
  assert.equal(p.legalCards(2).some(c=>c.contract==='base'),false);
  const human=p.plan.nodes[0],id=s.opening[2].ids[0];
  assert.equal(p.getQuote(2,human.id,[id]).code,'contract');
  assert(p.objective(2).rootCells>0);
});
