// Paid spherical contact between an armed B2/S245 P6, a Bays nucleus and distant farms.
// CLI: node experiments/typed-world/blast.mjs F treasury farm mode rotation horizon [targetResolver] [salvage]
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {buildSphere} from '../../src/world/sphere.js';
import {createTypedWorld} from './engine.mjs';
import {blastScene} from './blast-scene.mjs';

const spheres=new Map();
function distances(g, origin) {
  const d=new Int16Array(g.n).fill(-1),queue=new Uint32Array(g.n);
  d[origin]=0;queue[0]=origin;
  for(let i=0,n=1;i<n;i++){
    const site=queue[i];
    for(let k=0;k<g.deg[site];k++){
      const next=g.adj[site*6+k];
      if(d[next]>=0)continue;
      d[next]=d[site]+1;queue[n++]=next;
    }
  }
  return d;
}

export const blastEconomy={stampCost:8,birthCost:1,eraseCost:24,stableEnergy:1,stableAfter:12,
  productionScale:60,salvage:8,blastBirthCost:4};
export function simulateBlast({F=32,treasury=3200,farm='small',mode='armed',rotation=0,horizon=384,
  defense='contact',salvage=8,observer=false, carrier='p6', tariff={}, seed=1, trace}, capture) {
  if (!spheres.has(F)) spheres.set(F,buildSphere(F));
  const graph=spheres.get(F), lane=-2;
  const scene=blastScene(graph,rotation,lane);
  const world=createTypedWorld(graph,{wallets:[treasury,10000,...(observer?[10000]:[])],seed,
    economy:{...blastEconomy,salvage,...tariff}});
  if (farm!=='none') {
    const seeds= observer ? scene.middleFarm : farm==='large'?scene.largeFarm:scene.smallFarm;
    assert(seeds && world.stamp(1,'hex-b2s245','contact',seeds),'paid remote farm');
  }
  if (observer) {
    assert(world.stamp(3,'hex-b2s245','contact',scene.smallFarm),'paid witness farm');
  }
  if(mode!=='cold')assert(world.stamp(2,'bays',defense,scene.targetBays),'paid Bays nucleus');
  for(let i=0;i<16;i++)world.step();
  if(farm==='portfolio'){
    assert(world.stamp(1,'bays','contact',scene.middleBays),'paid younger Bays nucleus');
    for(let i=0;i<16;i++)world.step();
  }
  const farmSites=[...world.cells].filter(([,s])=>s.owner===1).map(([id])=>id);
  const targetSites=[...world.cells].filter(([,s])=>s.owner===2).map(([id])=>id);
  const ship=carrier==='p6'?scene.launch(3):scene.launchAndreen(4);
  if(mode!=='hold')assert(ship && world.stamp(1,carrier==='p6'?'hex-b2s245':'andreen',mode==='contact'?'contact':'antimatter',ship),'paid P6');
  const [p,d]=[world.players[1],world.players[2]];
  const launchReserve=p.reserve, launchIncome=p.income;
  let detonation=0, extinction=0, lastWave=0, emptyTarget=0, emptyThird=0, peakWave=0, peakGeneration=0, reach=0;
  let firstLiquidation=0, firstRecovery=0, lowCash=Infinity, distance, terminal;
  const touched=new Set(), samples=[], lastBody=Array(observer?3:2).fill(-1);
  let firstSoleOwner=0,firstSoleAt=0;
  let firstAllyHit=0;
  for(let g=0;g<=horizon;g++){
    if(g)world.step();
    if(!detonation && world.lastIgnitions?.length){
      detonation=g;
      distance=distances(graph,world.lastIgnitions[0].target);
    }
    let wave=0,own=0,target=0,third=0, survivingFarm=0, survivingTarget=0;
    for(const [id,s] of world.cells){
      if(!s.wave)lastBody[s.owner-1]=g;
      if(s.owner===1)own++;
      if(s.owner===2)target++;
      if(s.owner===3)third++;
      if (s.wave && s.owner===1) {
        wave++;touched.add(id);
        if(distance)reach=Math.max(reach,distance[id]);
      }
    }
    if(!firstAllyHit && p.friendlyErased)firstAllyHit=g;
    if (!target && !emptyTarget && mode!=='cold' && g)emptyTarget=g;
    if (observer && !third && !emptyThird && g)emptyThird=g;
    if (wave>peakWave) {peakWave=wave;peakGeneration=g;}
    if (wave)lastWave=g;
    else if(detonation && !extinction)extinction=g;
    if (p.eroded && !firstLiquidation) firstLiquidation=g;
    if (firstLiquidation) {
      if (p.reserve<lowCash)lowCash=p.reserve;
      if (!firstRecovery && p.reserve>=lowCash+8*9 && !wave) firstRecovery=g;
    }
    for(const id of farmSites){const s=world.cells.get(id);if(s?.owner===1 && !s.wave)survivingFarm++;}
    for(const id of targetSites)if(world.cells.get(id)?.owner===2)survivingTarget++;
    if(!firstSoleAt && g && mode!=='cold' && mode!=='hold'){
      const alive=[own,target,...(observer?[third]:[])];
      if(alive.filter(Boolean).length<=1){firstSoleAt=g;firstSoleOwner=alive.findIndex(Boolean)+1;}
    }
    terminal={own,target,third,wave,survivingFarm,survivingTarget};
    if(trace?.includes(g))samples.push({g,...terminal,reserve:p.reserve});
    capture?.(g,world,graph,scene,terminal);
  }
  assert(Math.abs(treasury+p.income+p.salvageIncome-p.reserve-p.stampSpent-p.birthSpent-p.eraseSpent-p.friendlyEraseSpent)<.0001,'finite wallet');
  const clean=v=>Math.round(v*100)/100;
  return {F,treasury,farm,mode,carrier,rotation,defense,salvage,seed,observer:Number(observer),horizon,
    launchReserve:clean(launchReserve),farmAtLaunch:farmSites.length,targetAtLaunch:targetSites.length,
    firstDetonation:detonation,ignitions:p.detonations,firstLiquidation,firstRecovery,firstWaveExtinction:extinction,lastWave,
    peakWave,peakGeneration,everWave:touched.size,maxRadius:reach,firstTargetEmpty:emptyTarget,firstThirdEmpty:emptyThird,
    ...terminal,attackerReserve:clean(p.reserve),defenderReserve:clean(d.reserve),attackerIncome:clean(p.income-launchIncome),
    stampCost:p.stampSpent,birthCost:clean(p.birthSpent),eraseCost:clean(p.eraseSpent),waveErase:p.waveErased,
    refused:p.refused,eroded:p.eroded,friendlyErased:p.friendlyErased??0,salvaged:clean(p.salvageIncome),waveBirths:p.waveBirths,
    sponsorOut:Number(p.out),targetOut:Number(d.out),lastSponsorBody:lastBody[0],lastTargetBody:lastBody[1],lastThirdBody:lastBody[2]??null,firstSoleOwner,firstSoleAt,firstAllyHit,friendlyEraseCost:clean(p.friendlyEraseSpent),...(trace?{samples}:{})};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const [f='32',bank='3200',farm='small',mode='armed',rot='0',end='384',defense='contact',salvage='8',observer='0',carrier='p6']=process.argv.slice(2);
  console.log(JSON.stringify(simulateBlast({F:+f,treasury:+bank,farm,mode,rotation:+rot,horizon:+end,defense,salvage:+salvage,observer:!!+observer,carrier})));
}
