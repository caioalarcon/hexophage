import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from './simulator.js';

test('a single funded flipper fills both stores and overflow cannot be spent', () => {
  const p2 = { id:'p2', cells:3, net:1, core:1, meanLive:3, netSlope:0, coreSlope:0, liveSlope:0 };
  const rule = { id:'storage',price:10,manaInterval:10,manaStorage:'core',battery:100 };
  const policy = { id:'retain',start:['p2'],repeat:['p2'] };
  const run = simulate(new Map([['p2',p2]]),rule,policy,{horizon:1000,buyThrough:0});
  const last = run.checkpoints.at(-1);
  assert.equal(last.bank,130);
  assert.equal(last.overflow,870);
  assert.equal(last.mana,2);
  assert.equal(last.burst,2);
});
