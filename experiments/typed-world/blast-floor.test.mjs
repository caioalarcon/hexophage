import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTypedWorld} from './engine.mjs';
import {simulateBlast} from './blast.mjs';
import {buildSphere} from '../../src/world/sphere.js';

test('protectedMature is a nonnegative integer number of conventional assets',()=>{
  const g=buildSphere(4);
  for(const n of [-1,0.5,NaN])assert.throws(()=>createTypedWorld(g,{economy:{protectedMature:n}}),RangeError);
  assert.equal(createTypedWorld(g).economy.protectedMature,0);
});

test('selling some assets while reserving the older farm lets the owner pay for another ship',()=>{
  const config={F:32,treasury:3200,farm:'portfolio',horizon:384};
  const open=simulateBlast(config);
  let buyTick=0;
  const kept=simulateBlast({...config,tariff:{protectedMature:12}},(g,m,graph,scene,state)=>{
    if(!buyTick && m.players[1].eroded && !state.wave && m.players[1].reserve>=72){
      if(m.fork().stamp(1,'hex-b2s245','antimatter',scene.launch(3)))buyTick=g;
    }
  });
  assert.deepEqual([open.survivingFarm,open.sponsorOut,open.eroded],[0,1,15]);
  assert.deepEqual([kept.survivingFarm,kept.sponsorOut,kept.eroded],[12,0,3]);
  assert(kept.firstLiquidation<kept.firstWaveExtinction && buyTick>=kept.firstWaveExtinction);
  assert(kept.attackerReserve>3000);
});

test('earmarking a mature farm as collateral-exempt gives it no physical immunity',()=>{
  const r=simulateBlast({F:16,treasury:1000000,farm:'small',observer:true,horizon:200,tariff:{protectedMature:100}});
  assert.equal(r.eroded,0);
  assert.equal(r.survivingFarm,0);
  assert(r.friendlyErased>0);
});
