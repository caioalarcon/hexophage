// Legal editor geometry and a game-engine control for an economic order-merging exploit.
import assert from 'node:assert/strict';
import { createHeadlessMatch } from '../../src/match/headless.js';
import { buildSphere } from '../../src/world/sphere.js';
import { atlasPatterns } from '../../src/patterns/atlas-data.js';
import { decodeRLE } from '../../src/patterns/rle.js';
import {fitStampPoints} from '../../src/patterns/editor/fit-pattern.js';
const sphere=buildSphere(128);
const p2=decodeRLE(atlasPatterns.find(p=>p.id==='p2').rle);
const positions=Array.from({length:10},(_,i)=>p2.map(([q,r])=>[q+6*(i%5),r+6*Math.floor(i/5)]));
const patches=positions.flat();
const match=()=>createHeadlessMatch(sphere,{init:100000,strategies:new Map([2,3,4,5,6].map(i=>[i,()=>{}]))});
const batch=match(), split=match();
const p=(m,points)=>m.patchForStamp(sphere.farthest,0,points);
assert(batch.commitStamp(1,p(batch,patches),false));
for(const points of positions) assert(split.commitStamp(1,p(split,points),false));
for(let t=0;t<160;t++){
  batch.nextTick();split.nextTick();
  assert.equal(batch.world.activeCount,30);
  assert.equal(batch.game.players[0].lastFlow,10);
  assert.deepEqual(batch.world.ownerCells[1].slice().sort((a,b)=>a-b),split.world.ownerCells[1].slice().sort((a,b)=>a-b));
}
console.log(JSON.stringify({editor:fitStampPoints(patches).n,stamps:[batch.game.players[0].stamps,split.game.players[0].stamps],
  gens:160,live:batch.world.activeCount,net:batch.game.players[0].lastFlow}));
