// Paid Ashley 2015 P30 launch against all eight native stamps. CLI emits CSV.
import assert from 'node:assert/strict';
import { buildSphere } from '../../src/world/sphere.js';
import { createHeadlessMatch } from '../../src/match/headless.js';
import { ACTIVITY_ECONOMY } from '../../src/match/constructive-economy.js';
import { advanceGeneration } from '../../src/simulation/generation.js';
import { gameEconomyTick } from '../../src/match/biomass.js';
import { decodeRLE } from '../../src/patterns/rle.js';
import { resolveRuleProfile } from '../../src/match/rule-profiles.js';

const [growth='classic', f='32', cap='512', selected='*']=process.argv.slice(2);
const F=Number(f), horizon=Number(cap), graph=buildSphere(F);
const {patterns}=resolveRuleProfile('ashley15').gameplay;
const puffer=patterns.find(p=>p.id==='puff30');
function shape(p){
  const cells=decodeRLE(p.rle);
  const [x,y]=[0,1].map(k=>Math.round(cells.reduce((sum,v)=>sum+v[k],0)/cells.length));
  return cells.map(([q,r])=>[q-x,r-y]);
}
const rotate=([q,r])=>[-r,q+r];
function step(m){
  advanceGeneration(m.world);
  gameEconomyTick(m.world,m.game,m.removeLive,()=>{});
}
function run(p,angle,lane,warm){
  const m=createHeadlessMatch(graph,{rule:'ashley15',conflict:'lineage',economy:ACTIVITY_ECONOMY,growth});
  assert.equal(m.game.growth??'classic',growth);
  const anchor=graph.farthest;
  if(p)assert(m.commitStamp(2,m.patchForStamp(anchor,0,shape(p)),false));
  for(let i=0;i<warm;i++)step(m);
  let body=shape(puffer), forward=[2,-1], cross=[0,1];
  for(let i=0;i<angle;i++){
    body=body.map(rotate);forward=rotate(forward);cross=rotate(cross);
  }
  let placed=false;
  for(let back=3;back<=14;back++){
    const offsets=body.map(([q,r])=>[q-back*forward[0]+lane*cross[0],r-back*forward[1]+lane*cross[1]]);
    const ids=m.patchForStamp(anchor,0,offsets);
    if(ids && m.commitStamp(1,ids,false)){placed=true;break;}
  }
  if(!placed)throw Error('No legal launch '+[p?.id,angle,lane,warm]);
  let peak=m.world.activeCount,firstTouch=null;
  for(let i=1;i<=horizon;i++){
    step(m);peak=Math.max(peak,m.world.activeCount);
    if(p && firstTouch===null){
      for(const id of m.world.ownerCells[1]){
        for(let k=0;k<graph.deg[id];k++){
          if(m.world.owners[graph.adj[6*id+k]]===2){firstTouch=i;break;}
        }
        if(firstTouch!==null)break;
      }
    }
  }
  console.log([growth,F,horizon,p?.id??'alone',angle,lane,warm,firstTouch??'',peak,m.world.activeCount,
    m.world.ownerCells[1].length,m.world.ownerCells[2].length,m.world.ownerCells[7].length].join(','));
}
console.log('growth,F,generations,target,rotation,lane,warm,firstAdjacent,peakLive,finalLive,attacker,defender,neutral');
if(selected==='*'||selected==='alone')run(null,0,0,0);
for(const p of patterns.filter(p=>selected==='*'||p.id===selected))
  for(const warm of [0,16])for(let rot=0;rot<6;rot++)for(const lane of [-2,0,2])run(p,rot,lane,warm);
