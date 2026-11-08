// Raid a genuinely matured stalk. An unstamped birth that reaches age 64
// earmarks 1/4 of its existing 129 award; its actual death frees the deposit.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {atlasPatterns} from '../../src/patterns/atlas-data.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {buildSphere} from '../../src/world/sphere.js';

const seeds=Object.fromEntries(['stalk','glider'].map(id=>[id,decodeRLE(atlasPatterns.find(p=>p.id===id).rle)]));
const idle=new Map([2,3,4,5,6].map(id=>[id,()=>{}]));
const turn=([q,r])=>[-r,q+r];
const rotated=(xy,k)=>{for(let i=0;i<k;i++)xy=turn(xy);return xy;};
const hold=32.25;

function run(graph,spec){
  const {fire,zone,orientation,lateral,center}=spec, horizon=fire+160;
  const match=createHeadlessMatch(graph,{init:1e9,economy:{birthEnergy:0,upkeep:0},strategies:idle});
  const w=match.world, place=points=>match.patchForStamp(graph.farthest,0,points);
  assert(match.commitStamp(2,place(seeds.stalk),false));
  const attached=new Map(), ground=new Map(), matured=[0,0,0],released=[0,0,0];
  const claimed=[[0,0,0],[0,0,0],[0,0,0]],first={};
  for(let g=1;g<=horizon;g++){
    match.nextTick();
    for(let k=0;k<w.nextActiveCount;k++){
      const id=w.nextActive[k],owner=attached.get(id);
      if(owner && !w.cells[id]){
        attached.delete(id);
        const amounts=ground.get(id)??[0,0,0]; amounts[owner]++;ground.set(id,amounts);
        released[owner]++;
      }
    }
    for(const owner of [1,2])for(const id of w.ownerCells[owner]){
      if(w.cellAges[id]===64 && g!==(owner===2?63:fire+63)){
        assert(!attached.has(id));attached.set(id,owner);matured[owner]++;
      }
      if(!w.next[id] && ground.has(id)){
        const amounts=ground.get(id);
        for(const from of [1,2]) if(amounts[from]){
          claimed[from][owner]+=amounts[from];first[from+'to'+owner]??=g;
        }
        ground.delete(id);
      }
    }
    if(g===fire && center){
      const pts=seeds.glider.map(([q,r])=>rotated([q-15,r+lateral-2],orientation)).map(([q,r])=>[q+center[0],r+center[1]]);
      const patch=place(pts);
      if(!patch || patch.some(id=>w.cells[id]))return null;
      if(!match.commitStamp(1,patch,false))return null;
      assert.equal(w.ownerCells[1].length,6);
    }
  }
  const units=matured[1]+matured[2],taken=claimed.flat().reduce((a,b)=>a+b,0);
  const pending=[...ground.values()].reduce((n,a)=>n+a[1]+a[2],0);
  assert.equal(units,attached.size+pending+taken);
  return {...spec,horizon,matured:matured.slice(1),released:released.slice(1),attached:attached.size,pending,claimed:{attackerOwn:claimed[1][1],attackerLoot:claimed[2][1],defenderOwn:claimed[2][2],defenderLoot:claimed[1][2]},first,live:[w.ownerCells[1].length,w.ownerCells[2].length]};
}
const g=buildSphere(256);
const trials=[],controls=[],misses=[],attempted={};
for(const [fire,zones] of [[80,[[-3,11],[-5,17],[-12,29]]],[160,[[-5,14],[-10,23],[-24,49]]]]){
  controls.push(run(g,{fire,zone:'solo',center:null}));
  const miss=run(g,{fire,zone:'miss',center:[25,-25],orientation:0,lateral:0});
  assert(miss && miss.live[0]===6);
  misses.push(miss);
  for(const [i,center] of zones.entries())for(let orientation=0;orientation<6;orientation++)
    for(const lateral of [-6,-4,-2,0,2,4,6]){
      const zone=['base','middle','tip'][i];
      attempted[zone]=(attempted[zone]??0)+1;
      const r=run(g,{fire,zone,center,orientation,lateral});
      if(r)trials.push(r);
    }
}
writeFileSync(new URL('mature-salvage.json',import.meta.url),JSON.stringify({hold,sweepSphere:256,attempted,controls,misses,trials})+'\n');
console.log(JSON.stringify({legal:trials.length,offensive:trials.filter(t=>t.claimed.attackerLoot).length,controls}));
