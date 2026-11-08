// Two P20 emitters aim across one corridor with no further paid orders.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {buildSphere} from '../../src/world/sphere.js';
import {replay} from './contacts.mjs';
const key=w=>[1,2,7].map(o=>w.ownerCells[o].slice().sort((a,b)=>a-b).join(',')).join('|');
function duel(graph,params,detail=false){
  const seen=new Map();let cycle;
  const r=replay(graph,{name:'gun-crossfire',target:'gun20',shot:'gun20',orientation:3,...params},true,(w,g)=>{
    if(g<=params.shotAt || cycle)return;
    const state=key(w);
    if(seen.has(state))cycle={from:seen.get(state),to:g};
    else seen.set(state,g);
  });
  assert(r);
  if(cycle){
    cycle.period=cycle.to-cycle.from;
    const series=r.frames.slice(cycle.from+1,cycle.to+1);
    for(const k of ['direct','adjacent','deaths','births','stable'])cycle[k]=[0,1].map(i=>series.reduce((v,x)=>v+x[k][i],0));
  }
  if(!detail)delete r.frames;
  return {...r,cycle:cycle??null};
}
const graph=buildSphere(64), cases=[];
for(const q of [1,2,3,4,5,6,7,8,9,10,11])for(const r of [-37,-42,-48])for(const shotAt of [0,1,2,4,10,16])
  cases.push(duel(graph,{q,r,shotAt,horizon:170}));
const candidates=cases.filter(r=>r.cycle?.direct[0]+r.cycle?.direct[1]>0).sort((a,b)=>b.cycle.direct[0]+b.cycle.direct[1]-a.cycle.direct[0]-a.cycle.direct[1]);
const bothGone=cases.filter(r=>!r.live[0]&&!r.live[1]);
const bothTouch=cases.filter(r=>r.direct[0]+r.direct[1]>0);
const choice=candidates[0]??bothTouch[0]??bothGone[0]??cases[0];
const full=buildSphere(256);
const confirm=c=>duel(full,{q:c.q,r:c.r,shotAt:c.shotAt,horizon:512},true);
const selected=confirm(choice);
const unbalanced=candidates.find(r=>r.cycle.direct[0]!==r.cycle.direct[1]);
assert(unbalanced);
const oneWay=confirm(unbalanced);
assert.deepEqual(oneWay.cycle,unbalanced.cycle);
assert.deepEqual(selected.cycle,choice.cycle);
assert.deepEqual(oneWay.cycle.direct,[2,0]);
assert.deepEqual(selected.cycle.direct,[2,2]);
const summary={searched:cases.length,repeat:cases.filter(x=>x.cycle).length,positiveRepeat:candidates.length,
  mutualRepeat:candidates.filter(x=>x.cycle.direct.every(n=>n>0)).length,withDirectCells:bothTouch.length,choice,
  verified:{...selected,frames:undefined},verifiedOneWay:{...oneWay,frames:undefined},lifetime:'funded; no further player orders after two 52-cell stamps'};
console.log(JSON.stringify(summary));
writeFileSync(new URL('./gun-crossfire.json',import.meta.url),JSON.stringify({summary,chosenFrames:selected.frames,asymmetricFrames:oneWay.frames,search:cases.map(x=>({q:x.q,r:x.r,shotAt:x.shotAt,direct:x.direct,live:x.live,cycle:x.cycle}))})+'\n');
