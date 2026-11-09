import test from 'node:test';
import assert from 'node:assert/strict';
import { burst, fieldQuote, energyQuote, manaQuote, simulate } from './simulator.js';

const p2 = {id:'p2',cells:3,net:1,core:1,meanLive:3,netSlope:0,coreSlope:0,liveSlope:0};
const profiles = new Map([['p2',p2]]);
const policy = {id:'flipper',start:['p2'],repeat:['p2']};
const price = {id:'linear',price:10};
const close = (a,b) => assert(Math.abs(a-b) < 1e-8*Math.max(1,Math.abs(b)),a+' vs '+b);
test('field pressure prices a batch and all partitions identically',()=>{
  for (const f of [0,2,3,100,10000]) for (const L of [12,96]) {
    close(fieldQuote(f,6,10,L),fieldQuote(f,2,10,L)+fieldQuote(f+2,4,10,L));
  }
  assert.equal(fieldQuote(0,3,10,96),30);
});
test('burst calculation reprices every stamp and respects both budgets',()=>{
  for (const rule of [price,{...price,fieldDoubling:24},{...price,sizeDoubling:6},
    {...price,manaInterval:3000,orderDoubling:4},{...price,energyOrderDoubling:8},{...price,manaInterval:3000,fieldDoubling:24}]) {
    let e=5000,m=100,f=19,n=7,stamps=0;
    for (;;) {
      const eq=energyQuote(rule,f,3,n);
      const mq=manaQuote(rule,n);
      if(eq>e||mq>m) break;
      e-=eq; m-=mq; f+=3; n++; stamps++;
    }
    assert.equal(burst(rule,5000,100,19,7),stamps);
  }
  assert.equal(burst({...price,fieldDoubling:6},1e12,0,1e7,100),0);
});
test('a flipper replicates on G30 exactly, then hits 10k on G298',()=>{
  const r=simulate(profiles,price,policy,{horizon:310});
  assert.equal(r.marks[2],30);assert.equal(r.stop,298);
  assert.deepEqual(r.checkpoints.map(c=>c.status),['order-limit','parked-after-limit']);
});
test('first deficit is recorded before random cell losses invalidate the profile',()=>{
  const r=simulate(new Map([['p2',{...p2,net:-1}]]),price,policy,{horizon:100});
  assert.equal(r.firstInsolvent,1);assert.equal(r.checkpoints[0].shortfall,1);
  assert.equal(r.checkpoints[0].bank,0);assert.equal(r.checkpoints[0].status,'first-deficit');
});
test('idle treasury obeys exponential reserve decay and bounded mana',()=>{
  const rule={...price,manaInterval:3,manaStorage:'core',energyHalfLife:10};
  const r=simulate(profiles,rule,policy,{horizon:100,buyThrough:0}).checkpoints.at(-1);
  assert.equal(r.mana,2);close(r.bank,(1-2**-10)/(1-2**-.1));
});

test('recent-plant pressure decays on paid cells only and leaves natural population separate',()=>{
  const rule={...price,fieldDoubling:96,pressureHalfLife:100};
  const growing = new Map([['p2',{...p2,liveSlope:2}]]);
  const final=simulate(growing,rule,policy,{horizon:100,buyThrough:0}).checkpoints.at(-1);
  close(final.pressure,1.5);
  assert.equal(final.field,203);
  assert.equal(final.burst,burst(rule,final.bank,0,1.5,1));
});
test('progressive fixed tax charges a dense core but a zero-core asset adds no tax',()=>{
  const rule={...price,fixedTaxScale:24};
  const fixed = new Map([['p2',{...p2,core:4,net:2}]]);
  const final=simulate(fixed,rule,policy,{horizon:10,buyThrough:0}).checkpoints.at(-1);
  close(final.energyFlow,1.5); close(final.bank,15);
});
