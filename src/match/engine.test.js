import test from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessMatch} from './headless.js';
import {createMatchEngine} from './engine.js';
import {buildSphere} from '../world/sphere.js';
test('two matches share graph but not energy, population, strategy state',()=>{
  const graph=buildSphere(20),actions=[];
  const first=createHeadlessMatch(graph,{interval:1,strategies:new Map([[2,p=>actions.push(p.id)]])});
  const second=createHeadlessMatch(graph,{interval:1});
  first.nextTick();
  assert.deepEqual(actions,[2]);
  assert.equal(first.game.players[1].stamps,0);
  assert.equal(second.world.gen,0);
  second.nextTick();
  assert.equal(second.game.players[1].stamps,1);
  assert.equal(second.game.players[1].reserve,second.game.init - 36 * second.game.economy.stampCost);
  assert.notEqual(first.world.cellAges,second.world.cellAges);
});
test('stamp charges energy only for newly placed cells; ghost and commit share legality',()=>{
  const m=createHeadlessMatch(buildSphere(20));const {world,game}=m,changes=[];
  const engine=createMatchEngine(world,game,{stampApplied:(p,n)=>changes.push([p.id,n,p.reserve])});
  const a=game.players[0].seed,b=world.graph.adj[6*a];
  assert.deepEqual(engine.stampAdditions(1,[a]),[a]);
  assert(engine.commitStamp(1,[a]));
  assert.deepEqual(changes,[[1,1,game.init - game.economy.stampCost]]);
  assert.equal(engine.commitStamp(2,[a]),false);
  assert.equal(engine.commitStamp(2,[b]),false);
  assert.equal(engine.commitStamp(1,[a,a,b]),false);
  game.players[0].reserve=game.economy.stampCost;
  assert.deepEqual(engine.stampAdditions(1,[a,b]),[b]);
  assert(engine.commitStamp(1,[a,b],false));
  assert.equal(game.players[0].reserve,0);
  assert.equal(world.cellAges[b],1);
  assert.equal(game.humanHistory.placed,2);
});
test('first-generation and match-end event order remains synchronous',()=>{
  const m=createHeadlessMatch(buildSphere(20));
  m.game.players.forEach((p,i)=>p.reserve=i===0?1:0);
  const events=[];
  const engine=createMatchEngine(m.world,m.game,{
    populationChanged:()=>events.push('changed'),pause:()=>events.push('pause'),
    matchDecided:p=>events.push(p.id),
    firstGeneration:()=>events.push('settings'),showResults:()=>events.push('result')
  });
  engine.nextTick();engine.nextTick();
  assert.equal(m.world.gen,1);
  assert.equal(m.game.winner,1);
  assert.deepEqual(events,['changed','pause',1,'settings','result']);
});
