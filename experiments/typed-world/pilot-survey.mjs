// Sensors/atlas/starting positions are identical for each matched seed. Swap
// controllers between seats to cancel a persistent opening or position advantage.
// Rebuild: node experiments/typed-world/pilot-survey.mjs all 4 > experiments/typed-world/pilots.csv
// Twelve seeds, two frequencies and two arbitration settings. The four seeds
// within a block are its independent samples; seats, fees and sizes are paired.
// conventionalWinner counts the last non-shock field; an empty entry is an
// open game at G512. For the first purchased raid, both counterfactuals use
// the full sphere, simultaneous economics and no subsequent orders through G+96.
// auditRaidsGain is (owner cash - target cash) under the raid minus under wait.
import {prepareArena} from './arena.mjs';
import {cashForecast,createPilot} from './pilots.mjs';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
// inventory reproduces the first lab pilot. bounded is a rejected treatment
// that drops extrapolation as soon as the paid and waiting boundary differ.
function inventory(m,owner,other) {
  for(let t=0;t<16;t++)m.step();
  let field=0;
  for(const c of m.cells.values()){
    if(c.owner!==owner && c.owner!==other)continue;
    const quality=m.economy.stampCost*(c.wave ? .25 : 1)+(c.age>=m.economy.stableAfter?48*m.economy.stableEnergy:0);
    field+=quality*(c.owner===owner?1:-1);
  }
  return {value:m.players[owner].reserve-m.players[other].reserve+field};
}
function bounded(m,owner,other,raid,{edge,compare}) {
  const edges=[],snapshots=[];
  const result=cashForecast(m,owner,other,raid,{inspect:(t,own,rival,refused)=>{
    const state={value:own.reserve-rival.reserve,enemy:rival.reserve,risky:own.out || own.refused>refused};
    const signature=edge.map(id=>{
      const c=m.cells.get(id);
      return c?c.owner+'/'+c.rule+'/'+c.resolver+'/'+Number(c.wave)+'/'+c.age:'';
    }).join('|');
    if(compare && signature!==compare.edges[t])return {...state,baseline:compare.snapshots[t]};
    if(!compare){snapshots.push(state);edges[t]=signature;}
  }});
  return {...result,edges,snapshots};
}
const agents={inventory,flow:cashForecast,bounded};
const headers='stage seed F phasePriority jade copper generation paidOrders raids typesJade typesCopper peakTypesJade peakTypesCopper cuts detonations conventionalWinner decidedAt fieldJade fieldCopper cashJade cashCopper cutsJade cutsCopper refusedJade refusedCopper auditOwner auditRaidsGain auditRivalDelta'.split(' ');
function game([stage,seed,F,phasePriority,jade,copper]){
  const {match:m}=prepareArena({scene:'arena',F,seed,bank:2400,economy:{phasePriority}});
  const bot=[null,createPilot(seed+17,agents[jade]),createPilot(seed+43,agents[copper])];
  const peaks=[0,0,0], types=[null,new Set(['hex-b2s245']),new Set(['hex-b2s245'])];
  let orders=0,raids=0,win='',decided=0,audit;
  while(m.gen<512&&!decided){
    m.step();
    const fields=[null,new Set(),new Set()];
    for(const c of m.cells.values())if(!c.wave)fields[c.owner].add(c.rule);
    for(const id of [1,2])peaks[id]=Math.max(peaks[id],fields[id].size);
    if(!fields[1].size||!fields[2].size){win=fields[1].size?1:fields[2].size?2:0;decided=m.gen;break;}
    if(m.gen%32)continue;
    for(const id of (m.gen%64?[1,2]:[2,1])){
      const before=audit?null:m.fork(), o=bot[id](m,id);if(!o)continue;
      types[id].add(o.rule);orders++;if(o.target)raids++;
      if(o.target && !audit){
        const hit=m.fork();
        for(let t=0;t<96;t++){before.step();hit.step();}
        const delta=i=>hit.players[i].reserve-before.players[i].reserve;
        audit=[id,(delta(id)-delta(o.target)).toFixed(2),delta(o.target).toFixed(2)];
      }
    }
  }
  const [a,b]=m.players.slice(1);
  return [stage,seed,F,phasePriority,jade,copper,m.gen,orders,raids,types[1].size,types[2].size,peaks[1],peaks[2],
    a.erased+b.erased,a.detonations+b.detonations,win,decided,a.field,b.field,a.reserve.toFixed(2),b.reserve.toFixed(2),
    a.erased,b.erased,a.refused,b.refused,...(audit??['','',''])].join(',');
}
if(!isMainThread) {
  for(const i of workerData)parentPort.postMessage(game(i));
} else {
  const stage=process.argv[2]??'all', jobs=[];
  const settings={exploration:[7,41,109,1549],confirmation:[953,2933,6389,10487],holdout:[577,1723,4733,8221]};
  for(const [group,seeds] of Object.entries(settings))if(stage==='all'||stage===group){
    for(const F of [16,32])for(const phase of [0,1])for(const seed of seeds)
      for(const [a,b] of [['inventory','inventory'],['flow','flow'],['inventory','flow'],['flow','inventory'],['bounded','bounded'],['inventory','bounded'],['bounded','inventory']])
        jobs.push([group,seed,F,phase,a,b]);
  }
  const n=Math.min(jobs.length,Number(process.argv[3]??3));
  const rows=[];
  await Promise.all(Array.from({length:n},(_,i)=>new Promise((resolve,reject)=>{
    const worker=new Worker(new URL(import.meta.url),{workerData:jobs.filter((_,k)=>k%n===i)});
    worker.on('message',row=>rows.push(row));worker.on('error',reject);worker.on('exit',code=>code?reject(Error('Worker '+code)):resolve());
  })));
  console.log([headers.join(','),...rows.sort()].join('\n'));
}
