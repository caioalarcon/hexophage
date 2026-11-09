// Reproduce a legally stamped, single-owner P42 reflector hit by one opposing P4.
// node experiments/economy/incoming-glider-replay.mjs [output.html]
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {buildSphere} from '../../src/world/sphere.js';
import {DIR} from '../../src/world/geometry.js';
import {stepPose} from '../../src/map/local/oriented-step.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {studyEconomy} from './study-baseline.js';
import {atlasPatterns} from '../../src/patterns/atlas-data.js';

const graph=buildSphere(256);
const strategies=new Map([2,3,4,5,6].map(id=>[id,()=>{}]));
const rle=id=>decodeRLE(atlasPatterns.find(p=>p.id===id).rle);
const target=[[4,0],[3,0],[4,1],[2,1],[5,2],[4,2],[3,2],[2,2],[5,3],[1,3],[4,4],[3,4],[2,4],[1,4],[0,4],[2,5],[2,6]];
const glider=rle('glider').map(([q,r])=>[q-12,r-1]);
const reflected=rle('p42').map(([q,r])=>{
  r=-q-r;
  for(let i=0;i<4;i++) [q,r]=[-r,q+r];
  return [q,r];
});
const xmin=Math.min(...reflected.map(p=>p[0])),ymin=Math.min(...reflected.map(p=>p[1]));
const coordSet=ps=>new Set(ps.map(p=>p.join(',')));
assert.deepEqual(coordSet(target),coordSet(reflected.map(([q,r])=>[q-xmin,r-ymin])));

// The live IDs come directly from the game. Lay out only the hexagonal region
// containing them in axial coordinates for the side-by-side replay.
const origin={id:graph.farthest,ori:0,q:0,r:0,d:0};
const queue=[origin], seen=new Map([[origin.id,origin]]);
for(let i=0;i<queue.length;i++){
  const pose=queue[i];if(pose.d===180)continue;
  for(let k=0;k<6;k++){
    const nb=stepPose(graph,pose.id,pose.ori,k,1);
    if(!nb||seen.has(nb.id))continue;
    const n={...nb,q:pose.q+DIR[k][0],r:pose.r+DIR[k][1],d:pose.d+1};
    seen.set(n.id,n);queue.push(n);
  }
}
const pack=(q,r)=>((q+256)<<9)+(r+256);
function run(budget,attacked,defenderSeed=target,end=768){
  const match=createHeadlessMatch(graph,{ growth:'classic', conflict: 'legacy',init:budget,strategies,economy:studyEconomy});
  if(defenderSeed.length)assert(match.commitStamp(2,match.patchForStamp(origin.id,0,defenderSeed),false));
  if(attacked)assert(match.commitStamp(1,match.patchForStamp(origin.id,0,glider),false));
  let previous=new Map(),firstErosion=null;
  const frames=[];
  for(let t=0;t<=end;t++){
    if(t)match.nextTick();
    const w=match.world,d=match.game.players[1],out=[],now=new Map();
    for(let i=0;i<w.activeCount;i++){
      const id=w.active[i],o=w.owners[id],{q,r}=seen.get(id),k=pack(q,r);
      now.set(k,o);if(previous.get(k)!==o)out.push(k*8+o);
    }
    for(const k of previous.keys())if(!now.has(k))out.push(k*8);
    if(d.lastEroded&&firstErosion===null)firstErosion=t;
    frames.push([out,d.reserve,w.ownerCells[2].length,d.lastIncome,d.lastUpkeep,d.eroded,w.ownerCells[7].length]);
    previous=now;
  }
  return {budget,attacked,firstErosion,frames};
}
const replay={};
for(const budget of [5000,1e9]){
  const pair=[run(budget,true),run(budget,false)];
  replay[budget]=pair;
  console.log(JSON.stringify({budget,firstErosion:pair.map(r=>r.firstErosion),samples:
    [128,256,512,768].map(t=>({generation:t,attacked:pair[0].frames[t].slice(1),control:pair[1].frames[t].slice(1)}))}));
}
assert.equal(replay[5000][0].firstErosion,136);
assert.equal(replay[5000][1].firstErosion,430);
assert.equal(replay[1e9][0].frames[768][2],568);
// Compare all births/deaths in the advancing tip over 64 generations with
// the catalog stalk. A radius of 22 excludes the stationary remnants at the base.
function tipEvents(frames,start,turns){
  const events=[];
  for(let t=start+1;t<=start+64;t++)for(const encoded of frames[t][0]){
    const k=encoded>>3;
    let q=(k>>9)-256,r=(k&511)-256;
    if(Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))<=22)continue;
    for(let n=0;n<turns;n++)[q,r]=[-r,q+r];
    events.push([t-start,Number((encoded&7)!==0),q,r]);
  }
  const minQ=Math.min(...events.map(v=>v[2])),minR=Math.min(...events.map(v=>v[3]));
  return events.map(([t,b,q,r])=>[t,b,q-minQ,r-minR].join(',')).sort();
}
const actual=tipEvents(replay[1e9][0].frames,300,0);
assert(actual.length>0,'moving tip is nonempty');
assert.deepEqual(actual,tipEvents(run(1e9,false,rle('stalk'),339).frames,275,2));
console.log('Moving-tip birth/death events matched exactly:',actual.length);

const solo=run(1e9,true,[],64);
const grids=[new Map(),new Map(),new Map()];
const histories=[replay[1e9][0],replay[1e9][1],solo];
for(let t=0;t<65;t++){
  for(let i=0;i<3;i++)for(const change of histories[i].frames[t][0]){
    const id=change>>3,p=change&7;
    if(p)grids[i].set(id,p);else grids[i].delete(id);
  }
  if([grids[1],grids[2]].some(expected=>[...expected].some(([id,p])=>grids[0].get(id)!==p)) ||
     grids[0].size!==grids[1].size+grids[2].size){replay.impact=t;break;}
}
assert(Number.isInteger(replay.impact));
console.log('First deviation from independent evolution:',replay.impact);

if(process.argv[2]){
  const template=await readFile(new URL('./incoming-glider-view.html',import.meta.url),'utf8');
  await writeFile(process.argv[2],template.replace('/* REPLAY_DATA */null',()=>JSON.stringify(replay)));
}
