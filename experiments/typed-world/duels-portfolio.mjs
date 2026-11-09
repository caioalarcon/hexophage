// Compare the exact native footprints and isolate the common-wallet subsidy.
import assert from 'node:assert/strict';
import {buildSphere} from '../../src/world/sphere.js';
import {patchForStamp} from '../../src/patterns/spherical-patch.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {advanceGeneration} from '../../src/simulation/generation.js';
import {createTypedWorld} from './engine.mjs';
import {card} from './duels-fixtures.mjs';

const graph=buildSphere(32), first=graph.farthest;
let second=-1;
for(let i=0;i<graph.n;i++)if(graph.distance[i]>4 &&
  graph.coords[3*i]*graph.coords[3*first]+graph.coords[3*i+1]*graph.coords[3*first+1]+graph.coords[3*i+2]*graph.coords[3*first+2]<-.7){second=i;break;}
assert(second>=0);
const farming=card('hex-b2s245','farm-4-12'), pulse=card('bays','osc2');
const farm=patchForStamp({graph},first,0,farming.shape), osc=patchForStamp({graph},second,0,pulse.shape);
function native(rule,ids){
  const m=createHeadlessMatch(graph,{rule,growth:'classic'});
  for(const id of ids)m.addLive(id,1);
  return m.world;
}
let header=false;
for(const mode of ['oscillator-only','farm-only','single-wallet','separate-wallets']){
  const w=createTypedWorld(graph,{wallets:[160,160],seed:18457}), builder=mode==='separate-wallets'?2:1;
  const wantFarm=mode!=='oscillator-only', wantOsc=mode!=='farm-only';
  if(wantFarm)assert(w.stamp(builder,farming.rule,'guard',farm));
  if(wantOsc)assert(w.stamp(1,pulse.rule,'phase',osc));
  const x=native(farming.rule,farm),y=native(pulse.rule,osc);
  let firstFarmMismatch=null, firstOscMismatch=null;
  for(let gen=0;gen<=1024;gen++){
    const actualF=new Set(),actualO=new Set();
    for(const [i,c] of w.cells)(c.rule===farming.rule?actualF:actualO).add(i);
    const same=(fresh,ref)=>fresh.size===ref.length && ref.every(id=>fresh.has(id));
    if(wantFarm && !same(actualF,x.ownerCells[1]))firstFarmMismatch??=gen;
    if(wantOsc && !same(actualO,y.ownerCells[1]))firstOscMismatch??=gen;
    if([0,32,128,256,512,1024].includes(gen)){
      const row={mode,gen,farmCells:actualF.size,oscCells:actualO.size,
        cashOscOwner:+w.players[1].reserve.toFixed(2),cashFarmOwner:wantFarm?+w.players[builder].reserve.toFixed(2):'',
        cumulativeIncome:+w.players[1].income.toFixed(2),birthSpent:w.players[1].birthSpent,refused:w.players[1].refused,
        firstFarmMismatch:firstFarmMismatch??'',firstOscMismatch:firstOscMismatch??''};
      if(!header){console.log(Object.keys(row).join(','));header=true;}
      console.log(Object.values(row).join(','));
    }
    if(gen<1024){advanceGeneration(x);advanceGeneration(y);w.step();}
  }
  if(mode==='single-wallet'){assert.equal(firstFarmMismatch,null);assert.equal(firstOscMismatch,null);}
}
