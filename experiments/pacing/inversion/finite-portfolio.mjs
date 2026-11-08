// Finite, non-interacting F320 cohorts. Run with node finite-portfolio.mjs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {energyQuote} from '../../economy/simulator.js';

const here=name=>new URL(name,import.meta.url);
const {trials}=JSON.parse(readFileSync(here('sphere-fronts.json')));
const {traces}=JSON.parse(readFileSync(here('physics-traces.json')));
const profiles=trials.filter(t=>t.pattern==='stalk');
const horizon=1440000,rate=200;
const startup=traces.stalk.slice(0,63).map(([b,m,p])=>129*(m-p)-b);
const startupTotal=startup.reduce((a,b)=>a+b,0);
assert.equal(startupTotal,-376);
for(const f of profiles){
  const peak=f.peakCash['129'];
  assert.equal(peak.peakAt,f.lastCreditObserved);
  assert.equal(f.cycleM,0);
}
// Test founder quantiles explicitly. Subsequent purchases cycle through all 32
// classes in a fixed coprime stride. No prescience about an individual placement.
const starts=[profiles.findIndex(f=>f.lastCreditObserved===7680),
  profiles.findIndex(f=>f.lastCreditObserved===1736),profiles.findIndex(f=>f.lastCreditObserved===612)];
const tariffs=[[350,300],[280,300],[100,300],[70,300],[350,60],[70,60]];
const controls=['bank','replace','expand','p4','gun','rush-gun'];

function run(start,price,half,policy,life,step){
  const rule={price,massPressureDoubling:2}, changes=new Float64Array(horizon+2), closes=new Int32Array(horizon+2);
  let flow=0,bank=376,heat=0,fronts=0,open=0,guns=0,ships=0,firstShip=null,firstGun=null;
  let firstPayGun=null,firstPayShip=null,orderAt=[],peak=376,firstDef=null,g=0;
  const gain=Math.pow(2,-step/(half*rate));
  function add(t,d){if(t<=horizon)changes[t]+=d;}
  function span(from,to,d){add(from,d);add(to+1,-d);}
  function front(t){
    const f=profiles[(start+fronts*11)%profiles.length],end=f.lastCreditObserved,last=f.lastMeasured;
    const peakCash=f.peakCash['129'].maximum, measuredNet=129*f.credits-f.totalBirths;
    let prior=0;
    for(let k=0;k<startup.length;k++){add(t+k+1,startup[k]-prior);prior=startup[k];}
    add(t+64,-prior);
    span(t+64,t+end,(peakCash-startupTotal)/(end-63));
    span(t+end+1,t+last,(measuredNet-peakCash)/(last-end));
    add(t+last+1,-f.cycleB);
    if(t+end<=horizon)closes[t+end]++;
    open++;fronts++;
  }
  function buy(kind,t){
    const cells=kind==='front'?36:kind==='p4'?6:52;
    bank-=energyQuote(rule,heat,cells); heat+=cells/3;orderAt.push(t);
    if(kind==='front'){front(t);return;}
    if(kind==='p4'){ships++;firstShip??=t;span(t+1,t+life,-5);return;}
    guns++;firstGun??=t;add(t+1,-20.95);
    for(let age=21;age<=life+1;age+=20)add(t+age,-5);
  }
  front(0);
  for(g=1;g<=horizon;g++){
    flow+=changes[g];bank+=flow;open-=closes[g];
    if(bank< -1e-5){firstDef=g;break;}
    peak=Math.max(peak,bank);
    if(g%step)continue;
    heat*=gain;
    const quote=c=>energyQuote(rule,heat,c);
    if(bank>=quote(6))firstPayShip??=g;
    if(bank>=quote(52))firstPayGun??=g;
    // Replant the productive base first, unless explicitly banking or rushing.
    for(let tries=0;tries<100;tries++){
      if(policy==='bank')break;
      if(policy==='rush-gun'){if(bank>=quote(52)){buy('gun',g);continue;}break;}
      if(policy==='defer'){
        // Buy at the last payable decision, retaining startup costs of old tails.
        const runway=376+70*Math.max(0,-flow);
        if(open===0 && bank>=quote(36)+runway &&
           bank+flow*step < energyQuote(rule,heat*gain,36)+runway){buy('front',g);continue;}
        break;
      }
      if((policy==='expand'||open===0)&&bank>=quote(36)+376){buy('front',g);continue;}
      if(policy!=='p4' && policy!=='gun')break;
      const c=policy==='p4'?6:52;
      // Reserve a replacement front at its worst same-time post-attack price.
      // Fund 1 passage for P4 and 1 minute of equilibrium outgoing gun expenses.
      const futureFront=energyQuote(rule,heat+c/3,36);
      const military=policy==='p4'?5*life:(20.95+5*life/20)*12000;
      if(open>0 && bank>=quote(c)+futureFront+376+military){buy(policy,g);continue;}
      break;
    }
  }
  const end=firstDef??horizon, orders=orderAt.length;
  return {start,openingCredits:profiles[start].credits,price,half,policy,life,step,end,firstDef,peak:Math.round(peak),
    firstPayShip,firstPayGun,firstShip,firstGun,fronts,guns,ships,orders,orders5:orderAt.filter(x=>x<=60000).length,
    orders30:orderAt.filter(x=>x<=360000).length,orders60:orderAt.filter(x=>x<=720000).length,bank:Math.round(bank)};
}
const result=[];
for(const start of starts)for(const [price,half] of tariffs)for(const policy of controls){
  for(const life of (['p4','gun','rush-gun'].includes(policy)?[1000,12000]:[12000]))
    result.push(run(start,price,half,policy,life,200));
}
for(const start of starts)for(const policy of controls)
  for(const life of (['p4','gun','rush-gun'].includes(policy)?[1000,12000]:[12000]))
    result.push(run(start,350,300,policy,life,20));
for(const price of [100,350])for(const half of [3,10,20])
  for(const policy of ['replace','expand','defer','p4','gun','rush-gun'])
    result.push(run(starts[0],price,half,policy,1000,200));
writeFileSync(here('finite-portfolio.json'),JSON.stringify(result)+'\n');
