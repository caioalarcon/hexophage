// Replay every paid order. At an actual autonomous attack compare, from the
// same pre-order state, not buying it, an off-axis shot, and the identical
// placement at a later generation. No new orders enter those branches.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSphere} from '../../src/world/sphere.js';
import {advanceGeneration} from '../../src/simulation/generation.js';
import {createPopulation} from '../../src/simulation/population.js';
import {createStampCommands} from '../../src/match/stamping.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {finishIfDecided} from '../../src/match/outcome.js';
import {gameEconomyTick} from '../../src/match/biomass.js';
import {stampCatalog} from '../../src/bots/brain/proposals.js';

const data=JSON.parse(readFileSync(process.argv[2],'utf8')), max=Number(process.argv[3]??3);
const graph=buildSphere(data.F), quiet=new Map([2,3,4,5,6].map(i=>[i,()=>{}]));
const m=createHeadlessMatch(graph,{rule:data.rule,economy:data.economy,conflict:'lineage',growth:'classic',strategies:quiet});
m.game.players[0].out=true;
let remote=0, located=0;
const cards=new Map(stampCatalog(m.game.gameplay.patterns).map(s=>[s.id,s]));
function fork(){
  const {graph,physics,...buffers}=m.world;
  const world={...structuredClone(buffers),graph,physics};
  const game={...m.game,players:structuredClone(m.game.players),recentBirthSites:null};
  const pop=createPopulation(world,{}), commands=createStampCommands(world,game,pop.addLive,{});
  return {world,game,buy:commands.commitStamp,step(){
    if(game.ended)return;
    advanceGeneration(world);gameEconomyTick(world,game,pop.removeLive,alive=>finishIfDecided(game,alive,{}));
  }};
}
function audit(o,index) {
  const hold=fork(),hit=fork();
  assert(hit.buy(o.owner,o.ids,false));
  const arms={hit}, illegal=[];
  for(const delay of [1,3,8])arms['delay'+delay]=fork();
  if(o.center!=null && o.heading!=null && cards.has(o.stamp)){
    const card=cards.get(o.stamp), original=m.patchForStamp(o.center,o.heading,card.offsets);
    assert.deepEqual(new Set(original),new Set(o.ids),'recorded pose must reconstruct the actual shot');
    const rotated=m.patchForStamp(o.center,(o.heading+3)%6,card.offsets), turn=fork();
    if(rotated && !rotated.every(i=>o.ids.includes(i)) && turn.buy(o.owner,rotated,false)) arms.rotated=turn;
    else illegal.push('rotated');
  }
  for(let t=1;t<=2048;t++){
    hold.step();
    for(const [key,arm] of Object.entries(arms)){
      arm.step();
      if(key==='delay'+t && (arm.game.ended || !arm.buy(o.owner,o.ids,false))){delete arms[key];illegal.push(key);}
    }
    if(t!==64 && t!==512 && t!==2048)continue;
    const evidence={};
    for(const [key,arm] of Object.entries(arms)){
      const cash=id=>arm.game.players[id-1].reserve-hold.game.players[id-1].reserve;
      const field=id=>arm.world.ownerCells[id].length-hold.world.ownerCells[id].length;
      const own=cash(o.owner), rival=cash(o.rival);
      evidence[key]={own:+own.toFixed(2),rival:+rival.toFixed(2),relative:+(own-rival).toFixed(2),ownCells:field(o.owner),rivalCells:field(o.rival)};
    }
    console.log(JSON.stringify({rule:data.rule,seed:data.seed,F:data.F,gen:o.gen,owner:o.owner,rival:o.rival,stamp:o.stamp,
      phase:o.phase,offset:o.phaseOffset,scouted:o.scouted,compared:o.compared,sample:index,t,illegal:[...illegal],arms:evidence}));
  }
}
let cursor=0,sampled=0;
while(m.world.gen<data.gen && !m.game.ended){
  m.nextTick();
  while(cursor<data.orders.length && data.orders[cursor].gen===m.world.gen){
    const o=data.orders[cursor++];
    if(o.center!=null){
      const a=3*m.game.players[o.owner-1].seed, b=3*o.center, v=graph.coords;
      if(v[a]*v[b]+v[a+1]*v[b+1]+v[a+2]*v[b+2]<.5)remote++;
      located++;
    }
    if(o.rival && sampled<max)audit(o,++sampled);
    assert(m.commitStamp(o.owner,o.ids,false));
  }
}
assert.equal(cursor,data.orders.length);
assert.deepEqual(m.game.players.slice(1).map(p=>[p.id,p.reserve,p.totalBirths,p.totalDeaths,p.stamps,m.world.ownerCells[p.id].length]),data.finalLedger);
console.log(JSON.stringify({rule:data.rule,seed:data.seed,F:data.F,remote,located}));
