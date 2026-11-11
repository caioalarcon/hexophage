import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameMatch,gameEconomies} from './match.mjs';
import {createGameBots} from './bots.mjs';

test('equal, paid founders use the configured tariffs and conventional elimination freezes the result',()=>{
  for(const policy of Object.keys(gameEconomies)){
    const g=createGameMatch({F:16,players:3,seed:2,policy,bank:700,economy:{stampCost:11}});
    const seats=g.match.players.slice(1);
    assert.equal(new Set(seats.map(p=>p.reserve)).size,1);
    for(const [i,p] of seats.entries()){
      assert.equal(p.reserve,700-11*g.opening[i+1].ids.length);
      assert.equal(p.conventional,g.opening[i+1].ids.length);
    }
    assert.equal(new Set(g.starts.slice(1)).size,3);
  }
  const doomed=createGameMatch({F:16,players:2,policy:'birth',bank:16,economy:{birthEnergy:0}});
  doomed.step();
  assert.equal(doomed.outcome,0);assert.deepEqual(doomed.eliminatedAt.slice(1),[1,1]);
  assert.equal(doomed.step(),false);assert.equal(doomed.match.gen,1);
  assert.equal(doomed.match.stamp(1,'bays','contact',doomed.opening[1].ids),false);
});

test('private probes cannot place cards or debit a treasury while still in progress',()=>{
  const g=createGameMatch({F:16,seed:7}),control=createGameMatch({graph:g.graph,seed:7});
  const bots=createGameBots(g.match,{seed:7,budget:1,horizon:16});
  for(let t=0;t<12;t++){
    g.step();bots.turn();control.step();
    for(const [id,p] of g.match.players.entries())if(p)assert.deepEqual(p,control.match.players[id]);
  }
  assert(bots.stats.some(s=>s.trials>0));
});

test('purchases are deterministic, use real funds, share a single work budget and respect the human seat',()=>{
  function play(){
    const g=createGameMatch({F:16,seed:109,policy:'activity'}),orders=[];
    const bots=createGameBots(g.match,{seed:109,budget:4,beforeOrder:o=>{
      assert(g.alive[o.owner]);
      if(o.tool!=='eraser')assert(g.match.players[o.owner].reserve>=g.match.stampPrice(o.resolver)*o.ids.length-1e-8);
    },onOrder:o=>orders.push([o.owner,o.key,o.gen])});
    let work=0;
    while(g.outcome===null && g.match.gen<144){
      g.step();if(g.outcome===null){bots.turn();bots.turn();}
      const now=bots.stats.reduce((n,s)=>n+s.work,0);
      assert(now-work<=4);work=now;
    }
    assert(orders.length>1);assert(orders.every(([owner])=>owner>=2));
    return orders;
  }
  assert.deepEqual(play(),play());
});

test('a solvent colony with repeated rejected investments tests a different crop on new terrain',()=>{
  const g=createGameMatch({F:48,seed:991}),orders=[];
  const bots=createGameBots(g.match,{seed:991,recoveryOwners:[2],onOrder:o=>{if(o.owner===2)orders.push(o);}});
  while(g.outcome===null&&g.match.gen<256){g.step();if(g.outcome===null)bots.turn();}
  assert(orders.some(o=>o.recovery&&o.expected>0&&o.gen>=orders[0].gen+96));
  assert(orders.length>1);
  assert(orders.every(o=>o.expected>0));
});
