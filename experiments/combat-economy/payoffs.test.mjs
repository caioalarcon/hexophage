import assert from 'node:assert/strict';
import test from 'node:test';
import {chargeStamp,duelClaims,settle} from './payoffs.mjs';
const book=(cash,escrow=cash.map(()=>0))=>({cash,escrow});
test('simultaneous payouts use opening balances before incoming transfers',()=>{
 const events=duelClaims([3,2]), start=book([4,0]);
 const cleared=settle(start,events,3,'transfer');
 assert.deepEqual(cleared.cash,[0,4]);
 assert.deepEqual(settle(start,[...events].reverse(),3,'transfer'),cleared);
 assert.equal(cleared.minted,0);
});
test('divide a capped reserve between creditors, proportionally to attribution',()=>{
 const claims=[{from:0,to:1,units:.5},{from:0,to:2,units:1.5}];
 const result=settle(book([4,10,0]),claims,4,'transfer');
 assert.deepEqual(result.cash,[0,11,3]);
});
test('paid stamps can reserve part of their sunk cost; an unpaid descendant creates no fund',()=>{
 const loaded=chargeStamp(book([200,50]),0,60,.25);
 assert.deepEqual(loaded,book([140,50],[15,0]));
 const paid=settle(loaded,duelClaims([10,0]),5,'salvage');
 assert.deepEqual(paid.cash,[140,65]);
 assert.deepEqual(paid.escrow,[0,0]);
 const again=settle(paid,duelClaims([10,0]),5,'salvage');
 assert.deepEqual(again.cash,paid.cash);assert.equal(again.minted,0);
 assert.throws(()=>chargeStamp(loaded,1,60,.25));
});
test('a faucet pays even when the two opponents have no money',()=>{
 const r=settle(book([0,0]),duelClaims([3,2]),2,'bounty');
 assert.deepEqual(r.cash,[4,6]);assert.equal(r.minted,10);
 assert.deepEqual(settle(book([0,0]),duelClaims([3,2]),2,'transfer').cash,[0,0]);
 assert.deepEqual(settle(book([0,0]),[],2,'bounty').cash,[0,0]);
});
test('indemnifying the owner of the lost unit reverses the closed transfer',()=>{
 const r=settle(book([0,7]),duelClaims([4,0]),3,'indemnity');
 assert.deepEqual(r.cash,[7,0]);
 assert.equal(r.minted,0);
});
test('a nonrepresentable proportional ratio cannot overdraw the original account',()=>{
 const r=settle(book([31,0]),duelClaims([1,0]),60,'transfer');
 assert.deepEqual(r.cash,[0,31]);
 assert.deepEqual(r.taken,[31,0]);
});
