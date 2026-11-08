// Include the legacy exact fixed order as a control for each 1s planner.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {loadMacroProfiles} from '../economy/macro-profiles.js';
import {HORIZON, MAP_F320, RATE, energyQuote, simulate} from '../economy/simulator.js';

const profiles=await loadMacroProfiles(), results=[];
const rules=[
  {id:'exp350',price:350,massPressureDoubling:2,pressureHalfLife:300*RATE},
  {id:'exp1500',price:1500,massPressureDoubling:3,pressureHalfLife:165*RATE}
];
const farmIds=['p2','p4f','p8f','censo-oscillator-8-p4-1','censo-oscillator-11-p4-2'];
const candidates=[...farmIds,'glider','gun20','gun42'].map(id=>profiles.get(id));
const fixed={start:Array(41).fill('p2'),repeat:['gun20'],fundGun:true};
function projectedEnergy(p,window,life) {
  const m=Math.min(window,life);
  if (p.mobile) return p.net*m;
  if (!p.emitter) return p.net*window;
  return p.net*window+p.netSlope*(m*(m-1)/2+(window-m)*m);
}
for(const rule of rules)for(const lifeSeconds of [6,60,600]){
  const life=lifeSeconds*RATE;
  for(const policy of ['40-farms-then-P20','40-farms-then-P20-1s','greedy','income-to-P20']){
    // One second is how often these players look; there is no cap per visit.
    const reviewEvery=policy==='40-farms-then-P20'?1:RATE;
    const options={shipLife:life,reviewEvery};
    if (policy==='greedy' || policy==='income-to-P20') {
      options.chooseOrder=({t,bank,pressure,orders,energyFlow})=>{
        if (!orders) return 'p2';
        const quote=(p,h=pressure)=>energyQuote(rule,h,p.cells,orders)+(p.emitter?p.runway:0);
        const window=Math.min(600*RATE,HORIZON-t);
        if (!window) return null;
        if (policy==='income-to-P20') {
          // Once existing income and cash could fund a P20 within 90 s without
          // other orders, devote the current balance to that emitter.
          const saveWindow=Math.min(90*RATE,window), p=profiles.get('gun20');
          const cooled=pressure*2**(-saveWindow/rule.pressureHalfLife);
          if (bank+Math.max(0,energyFlow)*saveWindow>=quote(p,cooled)) return 'gun20';
        }
        let best=null,score=0;
        for(const p of candidates){
          if (policy==='income-to-P20' && (p.emitter || p.mobile)) continue;
          const cost=quote(p);
          if (cost>bank+1e-8) continue;
          const ratio=projectedEnergy(p,window,life)/cost;
          if (ratio>score){best=p.id;score=ratio;}
        }
        return best;
      };
    }
    const sim=simulate(profiles,rule,{...fixed,id:policy},options);
    const end=sim.checkpoints.at(-1);
    results.push({rule:rule.id,lifeSeconds,policy,reviewSeconds:reviewEvery/RATE,
      endGeneration:end.g,orders:sim.orders,counts:sim.counts,firstGun:sim.byType.gun20??null,
      firstDeficit:sim.firstInsolvent,firstMapBreach:sim.breachedMap,field:end.field,net:end.energyFlow,
      mapPercent:end.field/MAP_F320*100,projectedBeyondMap:sim.breachedMap!==null,
      checkpoints:sim.checkpoints.filter(p=>[30,60,90,120].includes(p.g/(60*RATE))).map(p=>[p.g/(60*RATE),p.orders,Math.round(p.field)])});
  }
}
const by=(rule,lifeSeconds,policy)=>results.find(p=>p.rule===rule&&p.lifeSeconds===lifeSeconds&&p.policy===policy);
assert.equal(by('exp350',60,'40-farms-then-P20').orders,64);
assert.equal(by('exp350',600,'40-farms-then-P20').firstMapBreach,1436897);
assert.equal(by('exp1500',600,'40-farms-then-P20').firstMapBreach,713649);
assert(results.every(p=>p.orders>0 && p.counts.p2>0));
writeFileSync(process.argv[2]??'experiments/pacing/feedback-results.json',JSON.stringify({rules,rate:RATE,horizon:HORIZON,results}));
