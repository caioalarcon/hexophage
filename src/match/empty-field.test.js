import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSphere} from '../world/sphere.js';
import {createHeadlessMatch} from './headless.js';
import {beginLocalTrial} from '../bots/brain/local-world.js';

test('a vacant wallet has a grace period, a real paid restart restores it, and the mind prices waiting', () => {
  const quiet = new Map([2,3,4,5,6].map(i=>[i,()=>{}]));
  const m=createHeadlessMatch(buildSphere(12),{rule:'custom',notation:'B/S0',strategies:quiet,
    economy:{emptyFieldUpkeep:true,stampCost:64,stableEnergy:0,initialCells:3}});
  const p=m.game.players[0], site=p.seed;
  m.addLive(m.game.players[1].seed,2);
  for(let i=0;i<512;i++)m.nextTick();
  assert.equal(p.reserve,192);
  m.nextTick();
  assert.deepEqual([p.reserve,p.lastFlow,p.emptyFieldPaid],[191,-1,1]);
  const trial=beginLocalTrial(m.world,m.game,1,site,[site],{radius:4,horizon:8});
  const quote=trial.step(8);
  assert.equal(quote.ownCash,-64+8);
  assert(m.commitStamp(1,[site]));
  m.nextTick();
  assert.equal(p.emptyGenerations,0);
  m.removeLive(site);
  for(let i=0;i<512;i++)m.nextTick();
  assert.deepEqual([p.reserve,p.emptyFieldPaid],[127,1]);
  for(let i=0;i<64;i++)m.nextTick();
  assert(p.out);
});
