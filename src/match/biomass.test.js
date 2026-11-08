import test from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessMatch} from './headless.js';
import {buildSphere} from '../world/sphere.js';
test('each player earns and pays only their own energy',()=>{
  const {world,game,nextTick}=createHeadlessMatch(buildSphere(20),{interval:5});
  nextTick();
  assert.equal(game.players[0].reserve,30);
  for(const bot of game.players.slice(1)){
    assert.equal(bot.stamps,1);
    assert.equal(bot.reserve,0);
  }
  nextTick();
  assert(game.players.slice(1).every(p=>p.lastIncome===2 && p.lastUpkeep===1));
  assert(game.players.slice(1).every(p=>p.reserve===1));
  assert.equal(game.players[0].received,0);
  assert.equal(game.players[0].paid,0);
  assert.equal(world.gen,2);
});
