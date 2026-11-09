// Counterfactual value of unassisted rival-directed purchases. Reconstruct the
// natural match's exact paid orders. Branch at each attack and let both copies
// evolve without further orders; include stamp cost and all economic settlement.
import assert from 'node:assert/strict';
import {buildSphere} from '../../src/world/sphere.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {createPopulation} from '../../src/simulation/population.js';
import {advanceGeneration} from '../../src/simulation/generation.js';
import {createStampCommands} from '../../src/match/stamping.js';
import {gameEconomyTick} from '../../src/match/biomass.js';
import {finishIfDecided} from '../../src/match/outcome.js';
import {ACTIVITY_ECONOMY} from '../../src/match/constructive-economy.js';

const [rule='ashley15', f='40', generations='65536', seed='4751', conflict='lineage', sample='all']=process.argv.slice(2);
const graph=buildSphere(+f), orders=[], economy=ACTIVITY_ECONOMY;
const live=createHeadlessMatch(graph,{ growth:'classic',rule,conflict,economy,botMode:'learn',
  brain:{seed:+seed,onPlacement:o=>orders.push(o)}});
const silent=new Map([2,3,4,5,6].map(id=>[id,()=>{}]));
const replay=createHeadlessMatch(graph,{ growth:'classic',rule,conflict,economy,strategies:silent});
live.game.players[0].out=replay.game.players[0].out=true;

function branch(m) {
  const {graph,physics,...buffers}=m.world;
  const world={...structuredClone(buffers),graph,physics};
  const game={...m.game,players:structuredClone(m.game.players),recentBirthSites:null};
  const pop=createPopulation(world,{});
  const stamp=createStampCommands(world,game,pop.addLive,{});
  return {world,game,stamp,step(){
    if(game.ended)return;
    advanceGeneration(world);
    gameEconomyTick(world,game,pop.removeLive,alive=>finishIfDecided(game,alive,{}));
  }};
}
const round=n=>+n.toFixed(2);
const keys=['reserve','totalBirths','totalDeaths','stamps','eroded','out'];
function ledger(m){return m.game.players.map(p=>keys.map(k=>p[k]));}
let aimed=0;
const windows=sample==='first-long'?[16384,32768]:[128,1024,4096];
function audit(order) {
  const hit=branch(replay), wait=branch(replay);
  assert(hit.stamp.commitStamp(order.owner,order.ids,false));
  const cost=wait.game.players[order.owner-1].reserve-hit.game.players[order.owner-1].reserve;
  for(let t=1;t<=windows.at(-1);t++){
    hit.step();wait.step();
    if(!windows.includes(t))continue;
    const diff=(id,key)=>hit.game.players[id-1][key]-wait.game.players[id-1][key];
    const field=id=>hit.world.ownerCells[id].length-wait.world.ownerCells[id].length;
    const ownCash=diff(order.owner,'reserve'), rivalCash=diff(order.rival,'reserve');
    console.log([rule,f,conflict,seed,order.gen,order.owner,order.rival,order.stamp,cost,t,
      round(ownCash),round(rivalCash),round(ownCash-rivalCash),field(order.owner),field(order.rival),
      hit.game.ended?hit.world.gen-order.gen:'',wait.game.ended?wait.world.gen-order.gen:''].join(','));
  }
}
while(live.world.gen<+generations && !live.game.ended){
  live.nextTick();replay.nextTick();
  for(const o of orders){
    if(o.rival){aimed++;if(sample!=='first-long'||aimed===1)audit(o);}
    assert(replay.commitStamp(o.owner,o.ids,false));
  }
  if(orders.length)assert.deepEqual(ledger(replay),ledger(live));
  orders.length=0;
}
assert.deepEqual(replay.world.owners,live.world.owners);
assert.deepEqual(ledger(replay),ledger(live));
assert.equal(aimed,live.game.brainMetrics?.tactical??0);
