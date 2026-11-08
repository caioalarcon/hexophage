// Economic portfolios built from the funded, single-asset physical traces.
// Matured cells earn only when naturally born. Stamp cells never pay a dividend.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {energyQuote,RATE,HORIZON,MAP_F320} from '../../economy/simulator.js';

const {traces}=JSON.parse(await readFile(new URL('./physics-traces.json',import.meta.url)));
function traceFlow(asset, age, reward, life) {
  if (asset==='gun') {
    const phase=(age-1)%20;
    return -traces.gun20[phase][0]-Math.min(Math.floor((age-1)/20),life/20)*traces.glider[phase%2][0];
  }
  const [births, mature, manual]=traces.stalk[age<=63?age-1:63+(age-64)%24];
  return reward*(mature-manual)-births;
}
for(let g=1;g<=512;g++) {
  const [b,m,planted]=traces.stalk[g-1];
  assert.equal(traceFlow('grower',g,12,12000),12*(m-planted)-b);
  assert.equal(traceFlow('gun',g,12,12000),-traces.gun20[g-1][0]);
}
const tariffs=[
  {id:'linear',price:10},
  {id:'slow',price:350,massPressureDoubling:2,pressureHalfLife:300*RATE},
  {id:'fast',price:1500,massPressureDoubling:3,pressureHalfLife:165*RATE},
];
function simulate(rule,reward,life,policy,prudence) {
  const maturation=new Int32Array(HORIZON+1);
  const phase=new Float64Array(120), startup=new Float64Array(HORIZON+1);
  const odd=new Float64Array(HORIZON+1),even=new Float64Array(HORIZON+1);
  const decay=rule.pressureHalfLife?2**(-1/rule.pressureHalfLife):1;
  let pressure=0,bank=376,fronts=0,guns=0,firstGun=null, projectedFrontField=0;
  let young=0,oddCost=0,evenCost=0,stop='horizon',g=0;
  const milestones={};
  const frontMean=.75*reward-143/24;
  const gunMean=traces.gun20.slice(0,20).reduce((s,r)=>s+r[0],0)/20+5*life/20;
  const record=()=>({fronts,guns,bank,projectedFrontField});
  function plant(asset, t) {
    if(asset==='grower') {
      fronts++; young++; if(t+64<=HORIZON)maturation[t+64]++;
      projectedFrontField+=36;
      for(let age=1;age<=120;age++)phase[(t+age)%120]+=traceFlow(asset,age+120,reward,life);
      for(let age=1;age<=63 && t+age<=HORIZON;age++)
        startup[t+age]+=traceFlow(asset,age,reward,life)-traceFlow(asset,age+120,reward,life);
    }else {
      firstGun??=t;guns++;
      for(let age=1;age<=120;age++)phase[(t+age)%120]-=traces.gun20[(age-1)%20][0];
      // Each additional circulating P4 has birth phases 6/4. Retirement is
      // offset by the next launch once the passage time is at equilibrium.
      for(let age=21;age<=life+1 && t+age<=HORIZON;age+=20) {
        odd[t+age]+=t%2?4:6; even[t+age]+=t%2?6:4;
      }
    }
  }
  plant('grower',0);
  for(g=1;g<=HORIZON;g++) {
    young-=maturation[g];
    oddCost+=odd[g];evenCost+=even[g];
    bank+=phase[g%120]+startup[g]-(g%2?oddCost:evenCost);
    projectedFrontField+=.75*fronts;
    pressure*=decay;
    if(bank < -1e-7){stop='first-deficit';break;}
    if(projectedFrontField>=MAP_F320){stop='fronts-reach-map';break;}
    // One policy expands forever. The other builds a P20 whenever the long-run
    // recurring income can carry its projectiles' assumed passage time.
    while(true) {
      const gun=policy==='funded-offense' && frontMean*fronts>=(guns+1)*gunMean;
      const cells=gun?52:36, price=energyQuote(rule,pressure,cells);
      // Retain the working capital measured for the next grower. Close builds
      // can compete for that buffer and the trial stops if the treasury fails.
      const reserve=prudence ? 376*young + (fronts+1)*(6*reward+24) + (guns+1)*(100+4*life/20) : 0;
      if(bank+1e-8<price+reserve+376*(gun?0:1))break;
      bank-=price;
      if(rule.massPressureDoubling)pressure+=cells/3;
      plant(gun?'gun':'grower',g);
      if(fronts+guns>=10000){stop='10000-funded';break;}
    }
    if(g%(5*60*RATE)===0)milestones[g/(60*RATE)]=record();
    if(stop!=='horizon')break;
  }
  return {tariff:rule.id,reward,shipSeconds:life/RATE,policy,prudence,firstGun,stop,
    end:Math.min(g,HORIZON),...record(),milestones};
}
const results=[];
for(const rule of tariffs)for(const reward of [12,32,129,384])for(const life of [1000,12000])
  for(const policy of ['growers','funded-offense'])for(const prudence of [false,true])
    results.push(simulate(rule,reward,life,policy,prudence));
await writeFile(new URL('./frontier-results.json',import.meta.url),JSON.stringify(results)+'\n');
