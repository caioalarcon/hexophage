import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSphere} from '../../../src/world/sphere.js';
import {createTypedWorld} from '../engine.mjs';
import {footprint} from '../catalog.mjs';
import {gameEconomies} from './match.mjs';
import {atlasCards,automaticDeck,advanceFrame,rankCards,seedFrame,stampCost} from './atlas-model.mjs';

test('entire atlas drives the economic deck and every native rule keeps an attack option',()=>{
  assert.equal(atlasCards.length,409);
  const all=Object.values(gameEconomies).map(e=>rankCards(atlasCards,e));
  for(const r of all){
    assert(r.every(o=>Number.isFinite(o.flow)&&o.deaths>=0));
    const deck=automaticDeck(r);
    assert.equal(deck.length,54);assert.equal(new Set(deck.map(c=>c.key)).size,54);
    assert.equal(new Set(deck.filter(c=>c.group==='nave').map(c=>c.rule)).size,9);
  }
  const order=r=>r.map(o=>o.card.key).join();
  assert.equal(new Set(all.map(order)).size,4);
});
test('planar stamp preview charges and earns the actual isolated spherical ledger',()=>{
  const graph=buildSphere(32);
  for(const e of Object.values(gameEconomies))for(const key of ['callahan/p2','hex-b2s245/farm-4-12','bays/glider']){
    const card=atlasCards.find(c=>c.key===key);
    const w=createTypedWorld(graph,{wallets:[10000],economy:e}),p=w.players[1];
    assert(w.stamp(1,card.rule,card.resolver,footprint(graph,key,graph.farthest)));
    let frame=seedFrame(card),cash=10000-stampCost(card,e),born=0,dead=0;
    for(let g=0;g<16;g++){
      const step=advanceFrame(frame,card,e);cash+=step.flow;frame=step.next;born+=step.births;dead+=step.deaths;w.step();
      assert.equal(frame.size,p.field);assert(Math.abs(cash-p.reserve)<1e-8);
    }
    assert.equal(born,p.births);if(e.deathEnergy)assert(Math.abs(dead*e.deathEnergy-p.deathIncome)<1e-9);
  }
});
