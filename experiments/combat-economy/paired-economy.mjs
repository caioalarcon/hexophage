// Measure the economic value of a shot without introducing a combat reward.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {buildSphere} from '../../src/world/sphere.js';
import {replay} from './contacts.mjs';
const here=name=>new URL(name,import.meta.url);
const {named,sweep}=JSON.parse(readFileSync(here('contacts.json')));
function operating(graph,spec){
  const cash=[{survival:0,front:0},{survival:0,front:0}];
  const result=replay(graph,spec,false,(w,g)=>{
    for(const o of [1,2])for(const id of w.ownerCells[o]){
      const born=!w.next[id];
      cash[o-1].survival+=born?-1:1;
      if(born)cash[o-1].front--;
      // A stamped cell starts at age 1. Only a naturally born cell pays at 64.
      const stampTick=o===1?spec.shotAt:0;
      if(w.cellAges[id]===64 && g!==stampTick+63)cash[o-1].front+=129;
    }
  });
  assert(result);
  return cash;
}
const blank={survival:0,front:0};
function compare(graph,spec,cache){
  const {target,shot,q,r,orientation,shotAt,horizon,seedCells}=spec;
  const obtain=(key,params,o)=>{if(!cache.has(key))cache.set(key,operating(graph,params)[o]);return cache.get(key);};
  const defender=obtain([target,horizon].join('/'),{...spec,shot:null,shotAt:0},1);
  const attacker=shot?obtain([shot,q,r,orientation,shotAt,horizon].join('/'),{...spec,target:null},0):blank;
  const [a,d]=operating(graph,spec);
  const result={id:spec.name,target,shot,stampCost:10*seedCells[0],strict:spec.direct};
  for(const rule of ['survival','front']){
    const damage=defender[rule]-d[rule], cost=result.stampCost-a[rule];
    result[rule]={damageToRival:damage,shotCostVsNoShot:cost,advantageVsNoShot:damage-cost,
      ownSavingVsSameShotInIsolation:a[rule]-attacker[rule],defenderSolo:defender[rule],defenderAfter:d[rule],attackerAfter:a[rule]};
  }
  return result;
}
const namedGraph=buildSphere(256), cache=new Map();
const examples=named.filter(r=>r.shot && r.target && r.shotOwner===1).map(r=>compare(namedGraph,{...r,horizon:512},cache));
const gridGraph=buildSphere(48),gridCache=new Map();
const grid=sweep.map(r=>compare(gridGraph,r,gridCache));
const tables={};
for(const rule of ['survival','front']){
 const signs={};
 for(const r of grid){
   const measure=r[rule];const k=measure.damageToRival>0?'rival-lost-income':measure.damageToRival<0?'rival-gained-income':'no-change';
   const t=signs[k]??={n:0,positiveNet:0,neutralNet:0,negativeNet:0,favorableVsNoShot:0};
   t.n++;const n=r.strict[1]-r.strict[0];t[n>0?'positiveNet':n<0?'negativeNet':'neutralNet']++;
   if(measure.advantageVsNoShot>0)t.favorableVsNoShot++;
 }
 tables[rule]=signs;
}
const called=examples.find(r=>r.id==='stalk-hit');
assert.deepEqual([called.front.damageToRival,called.front.shotCostVsNoShot,called.front.ownSavingVsSameShotInIsolation],[42448,160,2460]);
writeFileSync(here('paired-economy.json'),JSON.stringify({horizonNamed:512,horizonGrid:96,grid:tables,examples},null,2)+'\n');
