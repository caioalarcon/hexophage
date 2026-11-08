// Unit cell/generation shadow accounting on the actual B2/S35 Callahan engine.
// Player 2 owns the asset, player 1 the rival projectile. No economic erosion.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createHeadlessMatch} from '../../../src/match/headless.js';
import {atlasPatterns} from '../../../src/patterns/atlas-data.js';
import {decodeRLE} from '../../../src/patterns/rle.js';
import {buildSphere} from '../../../src/world/sphere.js';

const cellSet = id => decodeRLE(atlasPatterns.find(p=>p.id===id).rle);
const move = (ps,q,r) => ps.map(([u,v])=>[u+q,v+r]);
const turn = ps => ps.map(([u,v])=>[-v,u+v]);
const glider=cellSet('glider'), stalk=cellSet('stalk');
const idle=new Map([2,3,4,5,6].map(id=>[id,()=>{}]));
function trial(graph,{own=[],attack=[],launch=0,generations=256,details=true,events=false}={}){
 const match=createHeadlessMatch(graph,{init:1e9,economy:{birthEnergy:0,upkeep:0,stableAfter:2},strategies:idle});
 const stamp=(p,cells)=>{const ids=match.patchForStamp(graph.farthest,0,cells);return Boolean(ids && match.commitStamp(p,ids,false));};
 if(own.length)assert(stamp(2,own));
 let legal=null;
 const ledger=[1,2].map(()=>({births:0,s2:0,s100:0,total2:0,total100:0,mature64:0,ofWhichStamped:0,naturalOnlyRunway12:0,naturalOnlyRunway384:0,grant12:0,grant384:0,runway12:0,runway384:0,runway2:0,runway100:0}));
 const milestones=[], history=new Map(), byGeneration=[];
 let recurrence=null;
 for(let t=0;t<=generations;t++){
   if(t){
     match.nextTick();
     for(const o of [1,2]){
       const entry=ledger[o-1],p=match.game.players[o-1],ids=match.world.ownerCells[o];
       const b=p.lastBirths, s=p.stable;
       let m=0,n64=0;
       for(const id of ids){
         const age=match.world.cellAges[id];
         if(age>=100)m++;
         if(age===64)n64++;
       }
       entry.mature64+=n64;
       // At launch+63 only that owner's original, uninterrupted stamped cells
       // can be age 64. A birth during the following step reaches 64 one step later.
       const seedMatures=t===(o===1?launch:0)+63 ? n64 : 0;
       entry.ofWhichStamped+=seedMatures;
       if(events && o===2)byGeneration.push([b,n64,seedMatures]);
       entry.grant12+=12*n64-b; entry.grant384+=384*n64-b;
       entry.naturalOnlyRunway12=Math.max(entry.naturalOnlyRunway12,12*entry.ofWhichStamped-entry.grant12);
       entry.naturalOnlyRunway384=Math.max(entry.naturalOnlyRunway384,384*entry.ofWhichStamped-entry.grant384);
       entry.runway12=Math.max(entry.runway12,-entry.grant12);
       entry.runway384=Math.max(entry.runway384,-entry.grant384);
       entry.births+=b;entry.s2+=s;entry.s100+=m;entry.total2+=s-b;entry.total100+=m-b;
       entry.runway2=Math.max(entry.runway2,-entry.total2);
       entry.runway100=Math.max(entry.runway100,-entry.total100);
     }
   }
   if(t===launch&&attack.length){legal=stamp(1,attack);if(!legal)return {legal};}
   if(details && !recurrence && t>=launch){
     const key=[1,2,7].map(o=>match.world.ownerCells[o].slice().sort((a,b)=>a-b).join(',')).join('|');
     if(history.has(key)) recurrence={first:history.get(key),again:t,period:t-history.get(key)};
     else history.set(key,t);
   }
   if(details&&[20,40,80,100,128,160,200,256,384,512].includes(t)){
     const row=ledger.map((e,i)=>({...e,live:match.world.ownerCells[i+1].length}));
     milestones.push({g:t,player1:row[0],player2:row[1],neutral:match.world.ownerCells[7].length});
   }
 }
 return {legal,ledger,live:[1,2,7].map(o=>match.world.ownerCells[o].length),recurrence,milestones,byGeneration:events?byGeneration:undefined};
}
// Signed coefficients produce S-B in the game's existing balance and erosion
// branch. We inspect reserve, erosion and occupancy; HUD counters assume the
// shipping positive-rate economy and are not reused to name income/expenses.
function fundingProbe(graph,id,age,working){
 const cells=cellSet(id), match=createHeadlessMatch(graph,{init:10*cells.length+working,
   economy:{birthEnergy:-1,upkeep:-1,stableAfter:age},strategies:idle});
 assert(match.commitStamp(2,match.patchForStamp(graph.farthest,0,cells),false));
 const p=match.game.players[1];
 let firstErosion=null;
 for(let g=1;g<=512;g++){
   match.nextTick();
   if(firstErosion===null && p.lastEroded)firstErosion=g;
 }
 return {id,age,working,firstErosion,eroded:p.eroded,live:match.world.ownerCells[2].length,bank:p.reserve};
}
if(process.argv.includes('--search')){
 const graph=buildSphere(48),found=[];
 for(const launch of [0,16,32]){
   for(let k=0,oriented=glider;k<6;k++,oriented=turn(oriented)){
     // Rotate the entire approach corridor around the target's central row.
     for(let lateral=-17;lateral<=17;lateral++){
       let position=[[-17,lateral]];for(let t=0;t<k;t++)position=turn(position);
       const [q,r]=position[0], attack=move(oriented,q,r+5);
       const result=trial(graph,{own:stalk,attack,launch,generations:160,details:false});
       if(result.legal)found.push({k,q,r:r+5,launch,live:result.live,net:result.ledger[1].total2});
     }
   }
 }
 found.sort((a,b)=>a.live[1]-b.live[1]||a.net-b.net);
 console.log(JSON.stringify(found.slice(0,15)));
} else {
 const graph=buildSphere(256), assets={};
 const traces={};
 for(const id of ['p2','p4f','p42rot','glider','stalk','gun20']){
   const capture=['glider','stalk','gun20'].includes(id);
   assets[id]=trial(graph,{own:cellSet(id),generations:512,events:capture});
   if(capture){traces[id]=assets[id].byGeneration;delete assets[id].byGeneration;}
 }
 for(let i=0;i<512;i++){
   assert.equal(traces.stalk[i][0],traces.stalk[i%24][0]);
   if(i>=63)assert.equal(traces.stalk[i][1],traces.stalk[63+(i-63)%8][1]);
   assert.equal(traces.glider[i][0],i%2===0?6:4);
   assert.equal(traces.gun20[i][0],traces.gun20[i%20][0]+Math.floor(i/20)*traces.glider[i][0]);
 }
 writeFileSync(new URL('./physics-traces.json',import.meta.url),JSON.stringify({
   firstGeneration:1,columns:['naturalBirths','allMatureAge64','ofWhichStampedAtGeneration0'],traces}));
 const selected=[
   {k:5,q:-11,r:22,launch:0},
   {k:5,q:-11,r:22,launch:16},
   {k:0,q:-17,r:-12,launch:0},
 ];
 const probes=[];
 for(const {k,q,r,launch} of selected){
   let ps=glider;for(let i=0;i<k;i++)ps=turn(ps);
   const attack=move(ps,q,r);
   probes.push({k,q,r,launch,duel:trial(graph,{own:stalk,attack,launch,generations:512}),
     attackerOnly:trial(graph,{attack,launch,generations:512})});
 }
 const [early,late,miss]=probes.map(p=>p.duel);
 assert(early.legal && late.legal && miss.legal);
 assert.equal(miss.ledger[1].total2,assets.stalk.ledger[1].total2);
 assert.equal(assets.stalk.ledger[1].total2,111701);
 assert.equal(early.ledger[1].total2,15104);
 assert.equal(assets.glider.ledger[1].total2,-1792);
 assert(early.recurrence && late.recurrence, 'The complete occupied field must enter a true periodic orbit.');
 const funding=[];
 for(const [id,age,cash] of [
   ['stalk',2,0],['stalk',100,0],['stalk',100,586],['stalk',100,587],
   ['glider',2,0],['glider',2,1000],['glider',2,1792],
   ['gun20',2,0],['gun20',2,14302]
 ]) funding.push(fundingProbe(graph,id,age,cash));
 assert.equal(funding.find(f=>f.id==='stalk' && f.working===587).firstErosion,null);
 assert.notEqual(funding.find(f=>f.id==='stalk' && f.working===586).firstErosion,null);
 writeFileSync(process.argv[2]??'experiments/pacing/inversion/physics-results.json',JSON.stringify({sphere:256,generations:512,assets,probes,funding}));
}
