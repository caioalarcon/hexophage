// Two-hour policy stress test, using the same generation-by-generation laboratory.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {atlasPatterns} from '../../src/patterns/atlas-data.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {fitStampPoints} from '../../src/patterns/editor/fit-pattern.js';
import {buildSphere} from '../../src/world/sphere.js';
import {loadMacroProfiles} from '../economy/macro-profiles.js';
import {simulate,energyQuote,RATE,HORIZON} from '../economy/simulator.js';

const profiles=await loadMacroProfiles(), base=profiles.get('p2'), sizes=[1,2,4,8];
const p2=decodeRLE(atlasPatterns.find(p=>p.id==='p2').rle);
const graph=buildSphere(64), idle=new Map([2,3,4,5,6].map(id=>[id,()=>{}]));
const packs=new Map([['p2',1]]);
for(const n of sizes.slice(1)){
  // Leave space between copies so independent oscillations fit in one stamp.
  const points=Array.from({length:n},(_,i)=>p2.map(([q,r])=>[q+(i%4)*7,r+Math.floor(i/4)*7])).flat();
  assert(fitStampPoints(points),'Pack must fit the game editor');
  const match=createHeadlessMatch(graph,{init:10000,strategies:idle});
  assert(match.commitStamp(1,match.patchForStamp(graph.farthest,0,points),false));
  const origin=new Set(match.world.ownerCells[1]), bank=match.game.players[0].reserve;
  for(let t=0;t<8;t++)match.nextTick();
  assert.deepEqual(new Set(match.world.ownerCells[1]),origin);
  assert.equal(match.game.players[0].reserve-bank,8*n);
  const id='pack'+n;
  profiles.set(id,{...base,id,cells:base.cells*n,meanLive:base.meanLive*n,net:base.net*n,core:base.core*n});
  packs.set(id,n);
}
const ps=[];
const add=(id,start,repeat,fundGun=true)=>ps.push({id,start,repeat,fundGun});
for(const id of ['p2','pack2','pack4','pack8','p4f','censo-oscillator-8-p4-1','glider','p48','gun20','gun42','stalk'])
  add('repeat-'+id,['p2'],[id]);
for(const n of sizes) {
  const id=n===1?'p2':'pack'+n;
  add('mixed-pack-'+n,['p2'],[id,'glider',id,'p4f','gun20']);
  add('40-farms-then-guns-'+n,['p2',...Array(40/n).fill(id)],['gun20']);
}
let seed=328771;
const rng=n=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return Math.floor(seed/2**32*n);};
const menus=[
  ['p2','pack4','p4f','p8f','censo-oscillator-8-p4-1','censo-oscillator-11-p4-2'],
  ['p2','p4f','glider','gun20','gun42','gun43','gun200','gun210'],
  ['p2','pack2','p4f','glider','glider','p15','p48','p42rot'],
  ['p2','pack8','p4f','glider','gun20','reflect42_demo','stalk']
];
for(let i=0;i<88;i++){
  const menu=menus[i%menus.length];
  const pick=()=>menu[rng(menu.length)], opening=['p2',...Array.from({length:rng(10)},()=>rng(4)?'p2':'p4f')];
  add('portfolio-'+String(i).padStart(2,'0'),opening,Array.from({length:2+rng(6)},pick),i%3!==0);
}
for(const p of ps)for(const id of [...p.start,...p.repeat])assert(profiles.has(id),id);
const rules=process.argv[3]?JSON.parse(process.argv[3]):[
  {id:'exp350',price:350,massPressureDoubling:2,pressureHalfLife:300*RATE},
  {id:'exp1500',price:1500,massPressureDoubling:3,pressureHalfLife:165*RATE},
  {id:'poly-long-relaxed',price:2500,massPressureScale:14,massPressurePower:2,pressureHalfLife:4800*RATE},
  {id:'poly-short',price:1750,massPressureScale:3,massPressurePower:2,pressureHalfLife:120*RATE}
];
const output={seed:328771,rate:RATE,horizon:HORIZON,shipLife:12000,policies:ps,rules:[]};
for(const rule of rules){
  // Same instant, same copy count. Different purchase dates may legitimately differ.
  for(const h of [0,2.5,10,30])for(const n of sizes){
    const all=energyQuote(rule,h,3*n),one=Array.from({length:n},(_,j)=>energyQuote(rule,h+j,3)).reduce((a,b)=>a+b,0);
    assert(Math.abs(all-one)<=1e-10*all);
  }
  const runs=ps.map(p=>{
    let equivalents=0, lateEquivalents=0, otherOrders=0, lateOther=0, lateOrders=0, cellsPaid=0;
    const sim=simulate(profiles,rule,p,{onOrder:(g,id)=>{
      const eq=packs.get(id)??1;
      equivalents+=eq; cellsPaid+=profiles.get(id).cells;
      if(!packs.has(id))otherOrders++;
      if(g>HORIZON/2){lateEquivalents+=eq; lateOrders++; if(!packs.has(id))lateOther++;}
    }});
    const end=sim.checkpoints.at(-1);
    return {id:p.id,orders:sim.orders,equivalents,cellsPaid,otherOrders,lateOrders,lateEquivalents,lateOther,
      field:end.field,net:end.energyFlow,firstDeficit:sim.firstInsolvent,breached:sim.breachedMap,
      checkpoints:sim.checkpoints.filter(x=>[5,30,60,120].includes(x.g/(60*RATE))).map(x=>[x.g/(60*RATE),x.orders,Math.round(x.field),Math.round(x.energyFlow)])};
  });
  output.rules.push({rule,runs});
}
writeFileSync(process.argv[2],JSON.stringify(output));
