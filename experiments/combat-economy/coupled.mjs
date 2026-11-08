// Physical counterfactual deaths -> ordinary inverted account and erosion ->
// simultaneous combat payments -> the actual next generation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {atlasPatterns} from '../../src/patterns/atlas-data.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {gameEconomyTick} from '../../src/match/biomass.js';
import {finishIfDecided} from '../../src/match/outcome.js';
import {advanceGeneration} from '../../src/simulation/generation.js';
import {buildSphere} from '../../src/world/sphere.js';
import {combatDeaths} from './causality.mjs';
import {duelClaims,settle} from './payoffs.mjs';

const graph=buildSphere(128), patterns=new Map(atlasPatterns.map(p=>[p.id, decodeRLE(p.rle)]));
const {fight}=JSON.parse(readFileSync(new URL('./recurring-contact.json',import.meta.url)))[0];
const horizon=512, seed=18427;
function run({fee,mode,opening,remote},control) {
  const m=createHeadlessMatch(graph,{init:1e6,economy:{birthEnergy:-1,upkeep:-1}});
  const {world:w, game}=m;
  game.rngState=seed;
  for(const p of game.players.slice(2)){p.out=true;p.reserve=0;}
  function stamp(owner,anchor,poly) {assert(m.commitStamp(owner,m.patchForStamp(anchor,0,poly),false));}
  const anchor=graph.farthest;
  stamp(1,anchor,patterns.get(fight.first));
  let b=patterns.get(fight.second);
  for(let i=0;i<fight.k;i++)b=b.map(([q,r])=>[-r,q+r]);
  stamp(2,anchor,b.map(([q,r])=>[q+fight.q,r+fight.r]));
  if(remote)stamp(1,game.players[3].seed,patterns.get('glider'));
  const ps=game.players.slice(0,2);
  for(const p of ps)p.reserve=opening;
  const states=[],direct=[0,0],received=[0,0],paid=[0,0],firstErosion=[null,null],eliminated=[null,null];
  let diverged=null,firstZero=[null,null],last=0;
  for(let g=1;g<=horizon&&!game.ended;g++){
    advanceGeneration(w);
    const victims=[0,0];
    for(const event of combatDeaths(w)) if(event.attackers.length)victims[event.victim-1]++;
    gameEconomyTick(w,game,m.removeLive,(alive)=>finishIfDecided(game,alive,{}));
    const ledger=settle({cash:ps.map(p=>p.reserve),escrow:[0,0]},duelClaims(victims),fee,mode);
    for(let i=0;i<2;i++){
      direct[i]+=victims[i];received[i]+=ledger.received[i];paid[i]+=ledger.taken[i];
      ps[i].reserve=ledger.cash[i];
      if(ps[i].lastEroded)firstErosion[i]??=g;
      if(ps[i].out)eliminated[i]??=g;
      if(ps[i].reserve===0)firstZero[i]??=g;
    }
    // Exact per-tile and per-owner equality to the matched no-combat-fee run.
    const state=[1,2,7].map(o=>[...w.ownerCells[o]].sort((a,b)=>a-b).join(',')).join('|');
    if(control&&state!==control.states[g-1])diverged??=g;
    states.push(state);last=g;
  }
  return {states,row:{fee,mode,opening,remote,last,direct,received,paid,firstZero,firstErosion,
    eroded:ps.map(p=>p.eroded),eliminated,diverged,live:[1,2,7].map(o=>w.ownerCells[o].length),cash:ps.map(p=>p.reserve)}};
}
const rows=[];
for(const remote of [false,true])for(const opening of [30,100]){
  const control=run({fee:0,mode:'none',opening,remote});
  rows.push(control.row);
  for(const fee of [1,10,60])for(const mode of ['bounty','transfer'])rows.push(run({fee,mode,opening,remote},control).row);
}
const matched=(fee,remote=true,mode='transfer')=>rows.find(r=>r.opening===30 && r.fee===fee && r.remote===remote && r.mode===mode);
assert.deepEqual(matched(0,true,'none').firstErosion,[null,null]);
assert.equal(matched(1).diverged,null);
assert.equal(matched(60,false).diverged,null);
assert.deepEqual(matched(10).eliminated,[147,null]);
assert.deepEqual(matched(60).eliminated,[15,null]);
assert.equal(matched(60,true,'bounty').diverged,null);
writeFileSync(new URL('./coupled.json',import.meta.url),JSON.stringify({sphere:128,seed,horizon,rows},null,2)+'\n');
