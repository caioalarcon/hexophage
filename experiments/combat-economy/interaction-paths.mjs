// Replay the same funded contacts through the production cell evaluator.
// Each shadow is local to one generation and starts again from the factual
// prior field; this measures mechanisms, not the descendants of one shot.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {buildSphere} from '../../src/world/sphere.js';
import {evaluateCell} from '../../src/simulation/cell-fate.js';
import {replay} from './contacts.mjs';
import {suppressedBirths} from './birth-denial.mjs';

const metrics=['death','savedSurvivor','birthSuppressed','birthBlockedByResident','birthBecameNeutral','ownedBirthEnabled'];
function localShadow(graph,player,removeNeutral) {
  const cells=new Uint8Array(graph.n), owners=new Uint8Array(graph.n);
  const removed=removeNeutral ? o=>o===7 : o=>o!==player && o!==7;
  const sums=Object.fromEntries(metrics.map(k=>[k,0]));
  const first={};
  function observe(world,g){
    const affected=new Set();
    for(let k=0;k<world.nextActiveCount;k++){
      const id=world.nextActive[k],o=world.nextOwners[id];
      if(removed(o)){
        affected.add(id);
        for(let j=0;j<graph.deg[id];j++)affected.add(graph.adj[id*6+j]);
      }else{
        cells[id]=1;owners[id]=o;
      }
    }
    const counterfactual=evaluateCell({...world,cells,owners});
    for(const id of affected){
      const before=world.nextOwners[id], after=world.owners[id];
      const wouldOwn=counterfactual(id)===player;
      let event=null;
      if(before===player){
        if(wouldOwn && !after)event='death';
        if(!wouldOwn && after===player)event='savedSurvivor';
      }else if(!before || removed(before)){
        if(wouldOwn && !before && !after)event='birthSuppressed';
        if(wouldOwn && before)event='birthBlockedByResident';
        if(wouldOwn && !before && after===7)event='birthBecameNeutral';
        if(!wouldOwn && !before && after===player)event='ownedBirthEnabled';
      }
      if(event){sums[event]++; first[event]??=g;}
    }
    for(let k=0;k<world.nextActiveCount;k++){
      const id=world.nextActive[k]; cells[id]=0;owners[id]=0;
    }
  }
  return {observe,report:{sums,first}};
}
const here=name=>new URL(name,import.meta.url);
const {named,sweep}=JSON.parse(readFileSync(here('contacts.json')));
function trace(g,spec,detail=false){
  const tabs=[1,2].map(p=>[localShadow(g,p,false),localShadow(g,p,true)]);
  const neutralParents={},firstNeutralBirth={},emptyFeeByGeneration=[];
  const out=replay(g,spec,false,(world,generation)=>{
    for(const player of tabs)for(const observer of player)observer.observe(world,generation);
    if(detail){
      const loss=[0,0];
      for(const site of suppressedBirths(world))loss[site.victim-1]++;
      if(loss.some(Boolean))emptyFeeByGeneration.push([generation,...loss]);
    }
    for(const id of world.ownerCells[7]){
      if(world.next[id])continue;
      const parents=new Set();
      for(let j=0;j<g.deg[id];j++){
        const o=world.nextOwners[g.adj[id*6+j]];
        if(o)parents.add(o);
      }
      const key=[...parents].sort().join('+');
      neutralParents[key]=(neutralParents[key]??0)+1;
      firstNeutralBirth[key]??=generation;
    }
  });
  assert.deepEqual(tabs.map(([hostile])=>hostile.report.sums.death),out.direct);
  assert.equal(Object.values(neutralParents).reduce((a,b)=>a+b,0),out.neutralBorn);
  if(detail) for(let i=0;i<2;i++)
    assert.equal(emptyFeeByGeneration.reduce((sum,row)=>sum+row[i+1],0),tabs[i][0].report.sums.birthSuppressed);
  return {name:spec.name,horizon:spec.horizon,neutralParents,firstNeutralBirth,...(detail?{emptyFeeByGeneration}:{}),
    byPlayer:tabs.map(([hostile,neutral],i)=>({player:i+1,removeRivals:hostile.report,removeNeutrals:neutral.report}))};
}
const branch=buildSphere(256);
const result=named.map(s=>trace(branch,s,true));
writeFileSync(here('interaction-paths.json'),JSON.stringify(result,null,2)+'\n');

if(process.argv.includes('--survey')){
  const local=buildSphere(48),table={},directions={},routes=[];
  function account(label,kind,attack,defense){
    directions[label]??={};
    const row=directions[label][kind]??={n:0,toAttacker:0,toDefender:0,net:0,positive:0,equal:0,negative:0,min:null,max:null};
    const net=attack-defense;
    row.n++;row.toAttacker+=attack;row.toDefender+=defense;row.net+=net;
    row[net===0?'equal':net>0?'positive':'negative']++;
    row.min=Math.min(row.min??net,net);row.max=Math.max(row.max??net,net);
  }
  function count(group,name,yes){
    group[name]??=0;
    if(yes)group[name]++;
  }
  for(const s of sweep){
    const r=trace(local,s);
    const defender=r.byPlayer[1],direct=defender.removeRivals.sums, neutral=defender.removeNeutrals.sums;
    const paths={
      total:true,
      rivalKilled:direct.death>0,
      birthSuppressed:direct.birthSuppressed>0,
      blockedByResident:direct.birthBlockedByResident>0,
      rescuedByRival:direct.savedSurvivor>0,
      newMixedNeutral:r.neutralParents['1+2']>0,
      rivalKilledOrBlockedBirth:direct.death+direct.birthSuppressed+direct.birthBlockedByResident>0,
      anyHostileEffect:Object.values(direct).some(v=>v>0),
      anyNeutralEffect:Object.values(neutral).some(v=>v>0),
    };
    const delta=s.live[1]-s.controlLive, sign=delta<0?'fieldLoss':delta>0?'fieldGain':'equalSize';
    const defenderLost=s.live[1]===0 && s.controlLive>0;
    const labels=['all',sign,...(defenderLost?['defenderExtinct']:[]),...(s.altered!==null?['altered']:[])];
    const a=r.byPlayer[0].removeRivals.sums;
    for(const label of labels){
      account(label,'empty',direct.birthSuppressed,a.birthSuppressed);
      account(label,'occupied',direct.birthBlockedByResident,a.birthBlockedByResident);
      account(label,'both',direct.birthSuppressed+direct.birthBlockedByResident,a.birthSuppressed+a.birthBlockedByResident);
    }
    routes.push([s.target,s.orientation,s.q,s.r,s.shotAt,direct.birthSuppressed,a.birthSuppressed,direct.birthBlockedByResident,a.birthBlockedByResident]);
    for(const target of ['all',s.target,sign]){
      const cell=table[target]??={altered:{},unaltered:{}};
      const group=s.altered===null?cell.unaltered:cell.altered;
      for(const [key,val] of Object.entries(paths))count(group,key,val);
    }
  }
  writeFileSync(here('interaction-survey.json'),JSON.stringify(table,null,2)+'\n');
  writeFileSync(here('birth-fee.json'),JSON.stringify({directions,columns:['target','orientation','q','r','shotAt','emptyToAttacker','emptyToDefender','residentToAttacker','residentToDefender'],routes})+'\n');
}
