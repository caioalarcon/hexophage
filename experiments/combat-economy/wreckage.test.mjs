import assert from 'node:assert/strict';
import test from 'node:test';
import {wreckage} from './wreckage.mjs';

test('only actual prepaid losses fund the site; neutral occupancy leaves it intact',()=>{
  const f=wreckage();
  f.deposit(41,2,0); f.deposit(41,2,1);
  f.deposit(41,1,1); f.deposit(41,7,100);
  assert.equal(f.birth(41,7),0);
  assert.equal(f.birth(40,1),0);
  assert.equal(f.birth(41,1),1);
  assert.equal(f.birth(41,2),0);
  assert.deepEqual(f.report(),{deposited:1,claimed:1,returned:.5,looted:.5,outstanding:0,sites:0,byOwner:{1:1}});
});
test('a surviving casualty deposit can only be paid out once',()=>{
  const f=wreckage(.25);
  f.deposit(2,1,10);
  assert.equal(f.report().outstanding,2.5);
  assert.equal(f.birth(2,2),2.5);
  assert.equal(f.report().looted,2.5);
  assert.equal(f.report().returned,0);
  assert.throws(()=>wreckage(1.1));assert.throws(()=>f.deposit(1,1,-1));
});
