import test from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessMatch} from './headless.js';
import {STABILITY_ECONOMY} from './constructive-economy.js';
import {buildSphere} from '../world/sphere.js';
test('each player earns and pays only their own energy',()=>{
  const {world,game,nextTick}=createHeadlessMatch(buildSphere(20),{interval:5,economy:STABILITY_ECONOMY});
  nextTick();
  assert.equal(game.players[0].reserve,game.init);
  for(const bot of game.players.slice(1)){
    assert.equal(bot.stamps,1);
    assert.equal(bot.reserve,game.init - 36 * game.economy.stampCost);
  }
  nextTick();
  assert(game.players.slice(1).every(p=>p.lastIncome===0 && p.lastUpkeep > 0));
  assert(game.players.slice(1).every(p=>p.reserve===game.init - p.stampedEnergy - p.lastUpkeep));
  assert.equal(game.players[0].received,0);
  assert.equal(game.players[0].paid,0);
  assert.equal(world.gen,2);
});
