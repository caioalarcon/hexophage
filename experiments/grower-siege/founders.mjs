// Isolated, funded grower on the actual sphere. A transition can only change
// next tick at a changed site or a neighbor of one, so revisit that frontier.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {writeFileSync} from 'node:fs';
import {CALLAHAN} from '../../src/simulation/rules.js';
import {patchForStamp} from '../../src/patterns/spherical-patch.js';
import {atlasPatterns} from '../../src/patterns/atlas-data.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {sphereSpawns} from '../../src/match/spawns.js';
import {buildSphere} from '../../src/world/sphere.js';
import {eastAt} from '../../src/world/geometry.js';
const seed=decodeRLE(atlasPatterns.find(p=>p.id==='stalk').rle);
export const thresholds=[64,128,256,400];
const horizon=12000;
export function trace(graph, anchor, orientation, verify=false){
  const alive=new Uint8Array(graph.n), seen=new Int32Array(graph.n), born=new Int32Array(graph.n).fill(-1);
  const placed=patchForStamp({graph,cells:alive},anchor,orientation,seed);
  if(!placed || new Set(placed).size!==seed.length)return null;
  let reference=null;
  if(verify){
    reference=createHeadlessMatch(graph,{ conflict: 'legacy',init:1e9,strategies:new Map([2,3,4,5,6].map(i=>[i,()=>{}])),economy:{stableEnergy:0,birthCost:0,combatFee:0}});
    assert(reference.commitStamp(1,placed,false));
  }
  let change=placed,count=seed.length;
  const queues=Array.from({length:401},()=>[]);
  queues[0]=placed;
  for(const id of placed){alive[id]=1;born[id]=0;}
  const mature=thresholds.map(()=>0),rows=[],lastChanges=[];
  for(let g=1;g<=horizon;g++){
    const changed=[],fresh=[];
    const test=id=>{
      if(seen[id]===g)return;
      seen[id]=g;
      const d=graph.deg[id];let mask=0;
      for(let i=0;i<d;i++)mask|=alive[graph.adj[id*6+i]]<<i;
      const table=CALLAHAN.tables[d][alive[id]];
      if(alive[id]!==table[mask])changed.push(id);
    };
    for(const id of change){test(id);for(let i=0;i<graph.deg[id];i++)test(graph.adj[id*6+i]);}
    for(const id of changed){
      alive[id]^=1;
      if(alive[id]){born[id]=g;fresh.push(id);count++;}
      else{for(let i=0;i<thresholds.length;i++)if(g-born[id]>=thresholds[i])mature[i]--;born[id]=-1;count--;}
    }
    for(let i=0;i<thresholds.length;i++){
      const birth=g-thresholds[i]+1;
      if(birth>=0)for(const id of queues[birth%401])if(born[id]===birth)mature[i]++;
    }
    queues[g%401]=fresh;change=changed;
    if(g>horizon-240)lastChanges.push(changed);
    rows.push([fresh.length,...mature,count]);
    if(reference && g<=1200){
      reference.nextTick();
      const actual=reference.world.ownerCells[1];
      assert.equal(count,actual.length);
      assert.equal(fresh.length,reference.game.players[0].lastBirths);
      assert(actual.every(id=>alive[id]));
      for(let i=0;i<thresholds.length;i++)assert.equal(mature[i],actual.filter(id=>reference.world.cellAges[id]>=thresholds[i]).length);
    }
  }
  // Exact equality of occupied sets, then check the repeated age/birth stream.
  let tailPeriod=null;const odd=new Set();
  for(let i=1;i<=lastChanges.length;i++){
    for(const id of lastChanges.at(-i))if(!odd.delete(id))odd.add(id);
    if(!odd.size && rows.slice(-i).every((r,j)=>r.every((v,k)=>v===rows[rows.length-2*i+j][k]))){
      tailPeriod=i;break;
    }
  }
  return {rows,tailPeriod};
}
export const profiles=[
 {r:.01,k:600,a:128},{r:.025,k:600,a:128},{r:.025,k:600,a:256},
 {r:.02,k:1500,a:128},{r:.02,k:1500,a:256},{r:.025,k:1200,a:128},
 {r:.05,k:400,a:400},{r:.025,k:1e12,a:128},
];
function calculate(rows,p){
  const width=24;
  const i=thresholds.indexOf(p.a)+1;
  let cum=0,gross=0,burn=0,low=0,lowAt=0,profitable=null,switched=null,block=0;
  const ticks={},paid={};
  const costs=[3000,5000,10000];
  const netAt=g=>{const [births]=rows[g-1],s=rows[g-1][i];return p.r*s/(1+s/p.k)-births;};
  for(let g=1;g<=rows.length;g++){
    const [births]=rows[g-1],s=rows[g-1][i],income=p.r*s/(1+s/p.k);
    gross+=income;burn+=births;
    const f=netAt(g);cum+=f;block+=f;
    if(cum<low){low=cum;lowAt=g;}
    if(g%width===0){if(block>0)profitable??=g;else profitable=null;block=0;}
    if(cum>=0 && g>p.a)switched??=g;
    if([1200,6000,12000].includes(g))ticks[g]={cash:Math.round(cum),income:gross/g,burn:burn/g,s};
    for(const c of costs)for(const n of [6,36,52])if(cum>=c*n)paid[c+'x'+n]??=g;
  }
  const last=rows.slice(-240),mean=f=>last.reduce((a,r)=>a+f(r),0)/last.length;
  const tail=mean(r=>p.r*r[i]/(1+r[i]/p.k)-r[0]);
  return {working:Math.ceil(-low),lowAt,sustainedProfit:profitable,operatingPayback:switched,
    tail:Number(tail.toFixed(4)),lastCells:rows.at(-1).at(-1),paid,ticks};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
const results=[];
for(const f of (process.argv[2]?.split(',').map(Number)??[20,48,96,320])){
  const graph=buildSphere(f);
  const sites=sphereSpawns(graph);
  for(const [s,anchor] of sites.entries()){
    for(const angle of new Set([0,eastAt(graph,anchor)])){
      const rows=trace(graph,anchor,angle,s===0 && angle===0);
      results.push({f,s,anchor,angle,period:rows?.tailPeriod,profiles:rows?profiles.map(p=>calculate(rows.rows,p)):null});
    }
  }
  console.error('f'+f+' done');
}
writeFileSync(process.argv[3]??new URL('./founders.json',import.meta.url),JSON.stringify({thresholds,profiles,horizon,results})+'\n');
}
