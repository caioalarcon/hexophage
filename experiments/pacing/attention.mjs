// Independent per-generation validation using the laboratory ledger.
// Pass base cell price, recent orders per doubling, half-life in real seconds,
// and the exponent increment. A paid order increments pressure by exactly 1.
import fs from 'node:fs/promises';
import {simulate,RATE,HORIZON} from '../economy/simulator.js';
import {loadMacroProfiles} from '../economy/macro-profiles.js';
import {policies} from '../economy/scenarios.js';

const args=process.argv.slice(2);
let rule, output;
if (args[0] === '--rule') {
  rule = JSON.parse(args[1]); output = args[2];
} else {
  const [price,d,t,beta]=args;
  if (![price,d,t,beta].every(x=>Number.isFinite(+x))) throw Error('Expected p d halfLifeSeconds beta output.json');
  rule={id:'validated',price:+price,orderPressureDoubling:+d,pressureHalfLife:+t*RATE,sizePower:+beta};
  output=args[4];
}
if (!output) throw Error('No output path supplied');
const profiles=await loadMacroProfiles();
const minutes=n=>Math.round(n*60*RATE);
const quantile=(xs,p)=>xs.length?xs[Math.floor((xs.length-1)*p)]:null;
function run(policy, options={}) {
  const events=[];
  const r=simulate(profiles,rule,policy,{...options,onOrder:(g,pattern)=>events.push([g,pattern])});
  const end=r.stop??r.firstInsolvent??(options.horizon??HORIZON);
  const x=r.checkpoints.find(v=>v.g===end);
  const groups=[...new Set(events.map(e=>e[0]))];
  const intervals=groups.slice(1).map((g,i)=>(g-groups[i])/RATE).sort((a,b)=>a-b);
  const windows = [0,5,15,30,60,90,120];
  const segments=windows.slice(1).map((to,i)=>events.filter(([g])=>g>=minutes(windows[i])&&g<minutes(to)).length/(to-windows[i]));
  const ret=options.wipeAt==null?null:events.find(([g])=>g>=options.wipeAt)?.[0]??null;
  return {policy:policy.id,secondsPerReview:(options.reviewEvery??1)/RATE,shipLife:options.shipLife??12000,
    horizon:(options.horizon??HORIZON),buyThrough:options.buyThrough??options.horizon??HORIZON,wipeAt:options.wipeAt??null,
    firstAfterWipe:ret,marks:r.marks,at:r.byType,segments,epochs:groups.length,gaps:{p50:quantile(intervals,.5),p90:quantile(intervals,.9),longest:intervals.at(-1)??null},last:x,
    largestBatch:r.largestBatch,firstDeficit:r.firstInsolvent,limit:r.stop,area:r.breachedMap,checkpoints:r.checkpoints};
}
const mixed=policies.find(p=>p.id==='mixed'), gun=policies.find(p=>p.id==='gun');
const trials=[];
for(const p of [...policies,{id:'opening-reactor',start:['p2','p4f','p8f','p2','p2','p4f'],repeat:['glider','gun42','p4f','glider','p2'],fundGun:true}]) {
  for (const shipLife of [1200,12000,120000]) trials.push(run(p,{shipLife}));
}
const attention=[];
for(const p of [mixed,gun]){
  for(const cadence of [.005,5,15,30,60,300,900]){
    attention.push(run(p,{reviewEvery:Math.max(1,Math.round(cadence*RATE))}));
  }
  const overnight=minutes(30+8*60);
  attention.push(run(p,{horizon:overnight,buyThrough:minutes(30)}));
  attention.push(run(p,{horizon:overnight,reviewEvery:30*RATE}));
  attention.push(run(p,{horizon:overnight,buyThrough:0}));
}
const bursts=[];
for(const p of [mixed,gun,policies[0]]) for(const seconds of [15,60,300,600])
  bursts.push(run(p,{buyThrough:HORIZON-seconds*RATE}));
const recovery=[];
for(const p of [mixed,gun]) for(const minute of [25,30,45,60,75]) recovery.push(run(p,{wipeAt:minutes(minute)}));
const catalog=[];
for(const [id,p] of profiles) {
  const r=run({id,start:['p2'],repeat:[id],fundGun:true});
  catalog.push({id,group:p.group,orders:r.last.orders,limit:r.limit,firstDeficit:r.firstDeficit,area:r.area,second:r.marks[2]??null});
}
await fs.writeFile(output,JSON.stringify({rule,trials,attention,bursts,recovery,catalog}));
