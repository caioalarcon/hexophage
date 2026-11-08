import { test } from 'node:test';
import assert from 'node:assert/strict';
import { burst, energyQuote } from '../economy/simulator.js';
test('recent order history quotes scale by stamp, not natural cells or past biomass', () => {
  const rule={price:10, orderPressureDoubling:2,pressureHalfLife:60000,sizePower:0};
  assert.equal(energyQuote(rule,0,3),30);
  assert.equal(energyQuote(rule,2,6),120);
  const cost=Array.from({length:4},(_,i)=>energyQuote(rule,0.63+i,6)).reduce((a,b)=>a+b,0);
  assert.equal(burst(rule,cost,0,0.63,71,6),4);
  assert.equal(burst(rule,cost-0.1,0,0.63,71,6),3);
});
test('paid-cell integral is invariant under splitting and merging stamps in one generation', () => {
  const rule={price:400, massPressureDoubling:2.4,pressureHalfLife:24000};
  for (const parts of [[1,2],[15,15],[3,45,4],[5,2,11,3]]) {
    let h=1.75, actual=0;
    for (const s of parts){actual+=energyQuote(rule,h,s);h+=s/3;}
    const together=energyQuote(rule,1.75,parts.reduce((a,b)=>a+b));
    assert(Math.abs(actual/together-1)<1e-12);
  }
  const seven=energyQuote(rule,4,21);
  assert.equal(burst(rule,seven,0,4,9,3),7);
  assert.equal(burst(rule,seven-1,0,4,9,3),6);
});
test('polynomial quotes use the same conservative line integral and founding price', () => {
  for (const a of [1,2,3]) {
    const rule={price:2500,massPressureScale:14,massPressurePower:a,pressureHalfLife:960000};
    assert.equal(energyQuote(rule,0,3),7500);
    const F=h => h+h**(a+1)/((a+1)*14**a);
    const start=1.94, pieces=[1,7,24,20];
    const expected=7500*(F(start+52/3)-F(start))/F(1);
    let h=start,total=0;
    for(const n of pieces){total+=energyQuote(rule,h,n);h+=n/3;}
    assert(Math.abs(total/expected-1)<1e-12);
    assert.equal(burst(rule,energyQuote(rule,start,51),0,start,3),17);
  }
});
