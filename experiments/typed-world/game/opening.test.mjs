import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSphere} from '../../../src/world/sphere.js';
import {createGameMatch} from './match.mjs';
import {normalizeOpening} from './opening.mjs';

const graph=buildSphere(16);
test('spatial game seeds every player with a productive base and free illuminated build space',()=>{
  const s=createGameMatch({graph,F:16,players:2,spatial:{enabled:true},unseededOwners:[1]});
  assert(s.opening[1]);assert(s.baseTrial.income>0);
  for(const owner of [1,2]){
    const view=s.match.visibility(owner);
    assert(view.visible.size>s.opening[owner].ids.length);
    assert(s.opening[owner].ids.every(id=>view.visible.has(id)));
  }
  for(let i=0;i<64;i++)s.step();
  assert(s.alive[1]&&s.alive[2]);
  assert(s.match.players[1].income>0);
});

test('custom renamed base receives the same physical opening test',()=>{
  const card=normalizeOpening();card.name='Base pesquisada por mim';card.key='my/custom-experiment';
  const s=createGameMatch({graph,F:16,players:2,spatial:{enabled:true},initialCard:card});
  assert.equal(s.opening[1].key,card.key);
  assert(s.baseTrial.ok);
});

test('a nonproductive starting pattern is rejected before the match replaces the current session',()=>{
  assert.throws(()=>createGameMatch({graph,F:16,players:2,spatial:{enabled:true},initialCard:{rule:'hex-b2s245',offsets:[[0,0]]}}),/base precisa produzir|perdeu todas/);
});

test('invalid base coordinates and duplicated cells are rejected',()=>{
  assert.throws(()=>normalizeOpening({offsets:[[0,0],[0,0]]}),RangeError);
  assert.throws(()=>normalizeOpening({offsets:[[Infinity,0]]}),RangeError);
});
