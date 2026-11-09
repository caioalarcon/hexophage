// One row per authorised shot. Silent controls use the same target, geometry
// and wallet, and let the same number of generations elapse.
import assert from 'node:assert/strict';
import {buildSphere} from '../../src/world/sphere.js';
import {createTypedWorld} from './engine.mjs';
import {poses,cases} from './duels-fixtures.mjs';

const [name='slider-farm', split='validation', mode='league'] = process.argv.slice(2);
assert(name in cases);
const validation=split==='validation';
const F=validation?48:32, seed=validation?18457:551, graph=buildSphere(F);
const horizon=Number(process.argv[7]??96), policies=['contact','phase','guard','antimatter'];
const angles=validation?[1,3,5]:[0,2,4], lanes=validation?[-1,0,1]:[-2,0,2];
const guardStampExtra=Number(process.argv[5]??0), selectedFee=Number(process.argv[6]??24);
const terms={guardStampExtra,stampCost:8,birthCost:1,eraseCost:24,stableEnergy:1,stableAfter:12,productionScale:60,salvage:8,blastBirthCost:4};
function newWorld(fee=terms.eraseCost,bank=768){
  return createTypedWorld(graph,{wallets:[bank,bank],seed,economy:{...terms,eraseCost:fee}});
}
const evolve=(w,count)=>{for(let t=0;t<count;t++)w.step();};
const count=(w,id)=>{let n=0;for(const c of w.cells.values())if(c.owner===id)n++;return n;};
function prepare(f,policy,defender,fee,bank){
  const w=newWorld(fee,bank);
  assert(w.stamp(defender,f.target.rule,policy,f.base));
  evolve(w,f.warm);return w;
}
function touch(w,owner,gap){
  // Hex distance two already allows simultaneous proposals into empty ground.
  for(const [id,c] of w.cells)if(c.owner===owner){
    for(let k=0;k<graph.deg[id];k++){
      const j=graph.adj[id*6+k],d=w.cells.get(j);
      if(d && d.owner!==owner)return true;
      if(gap===2)for(let m=0;m<graph.deg[j];m++){
        const e=w.cells.get(graph.adj[j*6+m]);if(e && e.owner!==owner)return true;
      }
    }
  }
  return false;
}
function legal(f,defender){
  const w=prepare(f,'contact',defender);
  for(const option of f.layouts){
    if(w.stamp(3-defender,f.raider.rule,'contact',option.shot))return option;
  }
  throw Error('no legal shot '+JSON.stringify([name,split,f.rotation,f.lane]));
}
function targetOnly(f,dp,defender,fee,bank){
  const w=prepare(f,dp,defender,fee,bank);
  evolve(w,horizon);
  return {population:count(w,defender),reserve:w.players[defender].reserve};
}
function attack(f,site,ap,dp,defender,fee,bank,hold,same=false){
  const attacker=same?defender:3-defender;
  const w=prepare(f,dp,defender,fee,bank);
  const opening=w.players[attacker].reserve;
  if(!w.stamp(attacker,f.raider.rule,ap,site.shot))return null;
  let near=-1,adjacent=-1,peak=0;
  for(let i=0;i<=horizon;i++){
    if(!same && near<0 && touch(w,attacker,2))near=i;
    if(!same && adjacent<0 && touch(w,attacker,1))adjacent=i;
    peak=Math.max(peak,w.cells.size);
    if(i<horizon)w.step();
  }
  const a=w.players[attacker],d=w.players[defender];
  const pA=count(w,attacker),pD=count(w,defender);
  const types=new Set([...w.cells.values()].filter(c=>c.owner===attacker).map(c=>c.rule));
  const rounded=n=>+n.toFixed(3);
  return {phase:split,arena:name,F,seed,angle:f.rotation,lane:f.lane,warm:f.warm,gap:site.distance,
    attackerPolicy:ap,defenderPolicy:dp,attacker,defender,generations:horizon,fee,bank,near,adjacent,
    aCash:rounded(a.reserve),dCash:rounded(d.reserve),aN:pA,dN:pD,aErased:a.erased,dErased:d.erased,
    aEraseSpent:rounded(a.eraseSpent),dEraseSpent:rounded(d.eraseSpent),aDetonations:a.detonations,dDetonations:d.detonations,
    aErosion:a.eroded,dErosion:d.eroded,peak,holdN:hold.population,holdCash:rounded(hold.reserve),
    deltaTargetN:pD-hold.population,deltaTargetCash:rounded(d.reserve-hold.reserve),
    relativeVsHold:rounded(a.reserve-opening-d.reserve+hold.reserve),rulesOfAttacker:types.size};
}

let header=false;
function emit(row){
  assert(row);
  if(!header){console.log(Object.keys(row).join(','));header=true;}
  console.log(Object.values(row).join(','));
}
for(const angle of angles)for(const lane of lanes){
  // Rotate the identity independently of resolver assignment.
  const defender=(angles.indexOf(angle)+lanes.indexOf(lane)+(validation?1:0))%2+1;
  const warm=name==='glider-ship'?2:validation?9:8;
  const f=poses(graph,name,angle,lane,warm), site=legal(f,defender);
  if(mode==='league' || mode==='sweep' || mode==='confirm'){
    const arms=mode==='sweep'?policies.slice(0,3):policies;
    for(const dp of arms){
      const hold=targetOnly(f,dp,defender,selectedFee,768);
      for(const ap of arms){
        if(mode==='sweep' && ap===dp)continue;
        emit(attack(f,site,ap,dp,defender,selectedFee,768,hold));
      }
    }
  }else if(mode==='prices'){
    for(const bank of [384,1536])for(const fee of [0,8,24,96]){
      const dp='contact', ap='phase', hold=targetOnly(f,dp,defender,fee,bank);
      emit(attack(f,site,ap,dp,defender,fee,bank,hold));
    }
  }else if(mode==='friendly'){
    const hold=targetOnly(f,'contact',defender,24,768);
    for(const same of [false,true])emit(attack(f,site,'phase','contact',defender,24,768,hold,same));
  }else throw Error('Unexpected mode '+mode);
}
