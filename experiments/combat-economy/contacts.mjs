// Fund the board completely so that attribution sees only natural Callahan deaths.
// Node experiments/combat-economy/contacts.mjs [named|sweep|all] [output.json]
import {writeFileSync, renameSync} from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {atlasPatterns} from '../../src/patterns/atlas-data.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {buildSphere} from '../../src/world/sphere.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {combatDeaths} from './causality.mjs';

const idle=new Map([2,3,4,5,6].map(id=>[id,()=>{}]));
const rotate=([q,r])=>[-r,q+r];
function oriented(points,k){for(let i=0;i<k;i++) points=points.map(rotate);return points;}
const move=(points,q,r)=>points.map(([u,v])=>[u+q,v+r]);
const seeds=new Map(atlasPatterns.map(p=>[p.id,decodeRLE(p.rle)]));
const mirrored=oriented(seeds.get('p42').map(([q,r])=>[q,-q-r]),4);
seeds.set('mirror42',move(mirrored,-Math.min(...mirrored.map(p=>p[0])),-Math.min(...mirrored.map(p=>p[1]))));
const make=graph=>createHeadlessMatch(graph,{init:1e9,economy:{birthEnergy:0,upkeep:0},strategies:idle});
function stamp(match,owner,points){
  const patch=match.patchForStamp(match.world.graph.farthest,0,points);
  return patch && match.commitStamp(owner,patch,false);
}
const baselineCache=new WeakMap();
function baseline(graph,target,horizon){
  if(!baselineCache.has(graph)) baselineCache.set(graph,new Map());
  const cache=baselineCache.get(graph), current=cache.get(target);
  if(current && current.length>horizon) return current;
  const m=make(graph);
  if(target)assert(stamp(m,2,seeds.get(target)));
  const snap=()=>new Set(m.world.ownerCells[2]);
  const frames=[snap()];
  for(let g=1;g<=horizon;g++){m.nextTick();frames.push(snap());}
  cache.set(target,frames);
  return frames;
}
const same=(items,expected)=>items.length===expected.size && items.every(id=>expected.has(id));
const shipCache=new WeakMap();
function isolatedShot(graph,shot,orientation,q,r,horizon){
  if(!shipCache.has(graph))shipCache.set(graph,new Map());
  const cache=shipCache.get(graph),key=[shot,orientation,q,r].join(','),cached=cache.get(key);
  if(cached && cached.length>horizon)return cached;
  const m=make(graph),points=move(oriented(seeds.get(shot),orientation),q,r);
  assert(stamp(m,1,points));
  const frames=[new Set(m.world.ownerCells[1])];
  for(let g=1;g<=horizon;g++){m.nextTick();frames.push(new Set(m.world.ownerCells[1]));}
  cache.set(key,frames);return frames;
}
export function replay(graph,spec,detail=false,observer){
  const {name,target,shot='glider',q=0,r=0,orientation=0,shotAt=0,horizon=96,shotOwner=1}=spec;
  const m=make(graph), w=m.world;
  if(target)assert(stamp(m,2,seeds.get(target)));
  const control=baseline(graph,target,horizon),frames=[];
  const controlShot=shot && shotOwner===1 ? isolatedShot(graph,shot,orientation,q,r,horizon-shotAt) : null;
  const paid=new Set(w.ownerCells[2]);
  const directStamped=[0,0], direct=[0,0],adjacent=[0,0],deaths=[0,0],births=[0,0],seedCells=[0,target?seeds.get(target).length:0];
  let altered=null,shotAltered=null,neutralBorn=0,firstDirect=null,endOverlap=0;
  // At a delayed launch measure flow first and stamp afterward, as the UI would.
  for(let g=0;g<=horizon;g++){
    const ds=[0,0],dir=[0,0],adj=[0,0],d=[0,0],b=[0,0],s=[0,0],l=[0,0,0];
    if(g){
      m.nextTick();
      observer?.(w,g);
      for(const event of combatDeaths(w)){
        const i=event.victim-1;
        if (i>1)continue;
        adj[i]++;
        if(event.attackers.length){dir[i]++;if(paid.has(event.id))ds[i]++;}
      }
      for(const id of paid)if(!w.cells[id])paid.delete(id);
      if(dir[0]+dir[1])firstDirect??=g;
      for(let i=0;i<2;i++){
        const p=m.game.players[i];
        d[i]=p.lastDeaths;b[i]=p.lastBirths;s[i]=p.stable;
        directStamped[i]+=ds[i];direct[i]+=dir[i];adjacent[i]+=adj[i];deaths[i]+=d[i];births[i]+=b[i];
      }
      for(const id of w.ownerCells[7])if(!w.next[id])neutralBorn++;
    }
    if(shot && g===shotAt){
      const points=move(oriented(seeds.get(shot),orientation),q,r);
      const before=w.ownerCells[shotOwner].length;
      const fresh=(m.patchForStamp(graph.farthest,0,points)??[]).filter(id=>!w.cells[id]);
      if(!stamp(m,shotOwner,points))return null;
      seedCells[shotOwner-1]+=w.ownerCells[shotOwner].length-before;
      for(const id of fresh)paid.add(id);
    }
    [1,2,7].forEach((o,i)=>{l[i]=w.ownerCells[o].length;});
    if(!same(w.ownerCells[2],control[g]))altered??=g;
    if(controlShot && g>=shotAt && !same(w.ownerCells[1],controlShot[g-shotAt]))shotAltered??=g;
    if(detail)frames.push({g,direct:dir,directStamped:ds,adjacent:adj,deaths:d,births:b,stable:s,live:l});
  }
  endOverlap=w.ownerCells[2].filter(id=>control[horizon].has(id)).length;
  const live=[1,2,7].map(o=>w.ownerCells[o].length), controlLive=control[horizon].size;
  return {name,target,shot,shotOwner,orientation,q,r,shotAt,horizon,seedCells,direct,directStamped,adjacent,deaths,births,
    live,controlLive,endOverlap,altered,controlShotLive:controlShot?.at(horizon-shotAt)?.size??null,shotAltered,firstDirect,neutralBorn,...(detail?{attacker:1,defender:2,frames}:{})};
}
function matchedNamed(){
  const g=buildSphere(256), base={target:'stalk',q:-11,r:22,orientation:5,horizon:256};
  const entries=[
    {name:'stalk-hit',...base},
    {name:'stalk-hit-delayed',...base,shotAt:16},
    {name:'stalk-miss',...base,q:-17,r:-12,orientation:0},
    {name:'stalk-same-owner',...base,shotOwner:2},
    {name:'stalk-alone',...base,shot:null},
    {name:'p4-alone',target:null},
    {name:'p2-alone',target:'p2',shot:null},
    {name:'gun20-alone',target:'gun20',shot:null},
    {name:'reflector-alone',target:'mirror42',shot:null},
    {name:'reflector-hit',target:'mirror42',q:-12,r:-1},
    {name:'reflector-same-owner',target:'mirror42',q:-12,r:-1,shotOwner:2},
  ];
  const records=entries.map(c=>replay(g,{horizon:256,...c},true));
  assert(records.every(Boolean));
  assert.deepEqual(records[0].live[1],36);
  assert.deepEqual(records[2].live[1],228);
  assert.equal(records[2].altered,null);
  return records;
}
function sweep(){
  const g=buildSphere(48), results=[], illegal={};
  // A grid of firing corridors, not a probability distribution over matches.
  for(const target of ['p2','mirror42','stalk','gun20','glider']){
    for(const shotAt of [0,1,7,16])for(let k=0;k<6;k++)for(let lane=-12;lane<=12;lane+=2){
      const [[q,r]]=oriented([[-17,lane]],k);
      const spec={target,orientation:k,q,r:r+(target==='stalk'?5:target==='gun20'?6:2),shotAt,horizon:96};
      const result=replay(g,spec);
      if(result)results.push(result);
      else illegal[target]=(illegal[target]??0)+1;
    }
  }
  return {results,illegal};
}
const mode=process.argv[2]||'all';
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const named=mode==='sweep'?[]:matchedNamed();
  const survey=mode==='named'?{results:[],illegal:{}}:sweep();
  const extra=[];
  if(survey.results.length){
    const g=buildSphere(256);
    for(const target of ['p2','gun20','glider']){
      const selected=survey.results.filter(r=>r.target===target && r.altered!==null).sort((a,b)=>b.direct[1]-a.direct[1]||b.direct[0]-a.direct[0])[0];
      if(selected)extra.push(replay(g,{...selected,name:target+'-hit',horizon:256},true));
    }
    const ghost=survey.results.filter(r=>r.target!=='glider'&&r.direct[1]===0&&r.altered!==null&&r.controlLive>0).sort((a,b)=>(b.controlLive-b.endOverlap)-(a.controlLive-a.endOverlap))[0];
    if(ghost)extra.push(replay(g,{...ghost,name:'disruption-without-target-direct-death',horizon:96},true));
  }
  const path=process.argv[3]||fileURLToPath(new URL('contacts.json',import.meta.url));
  writeFileSync(path+'.tmp',JSON.stringify({spheres:{named:256,sweep:48},named:[...named,...extra],sweep:survey.results,illegal:survey.illegal})+'\n');
  renameSync(path+'.tmp',path);
}
