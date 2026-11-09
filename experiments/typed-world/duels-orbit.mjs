// A verified closed track on the real sphere. Farms may be purchased again at
// the end of each completed period, including when an earlier shot was lost.
import assert from 'node:assert/strict';
import {buildSphere} from '../../src/world/sphere.js';
import {orbitScene,openOrbit} from './duels-orbit-scene.mjs';
import {createTypedWorld} from './engine.mjs';

const F=24, graph=buildSphere(F);
const scene=orbitScene(graph), {period,maxAngle,frames,slider,crops}=scene;
assert.equal(period,240);assert(maxAngle>160);
let header=false;
for(const bank of [240,960,3840,24000])for(const fee of [0,24,96])for(const withFarm of [false,true]){
  const w=createTypedWorld(graph,{wallets:[bank,24000],seed:23,economy:{phasePriority:1,guardStampExtra:0,eraseCost:fee}});
  const restock=openOrbit(w,scene,withFarm);
  let placed=crops.length, firstDivergence=-1, exactLaps=0;
  for(let t=1;t<=period*6;t++){
    w.step();
    const body=[];
    for(const [id,c] of w.cells)if(c.owner===1&&c.rule===slider.rule)body.push(id);
    const reference=frames[t%period];
    if(firstDivergence<0 && (body.length!==reference.size || !body.every(id=>reference.has(id))))firstDivergence=t;
    if(t%period)continue;
    const p=w.players[1];
    if(firstDivergence<0)exactLaps++;
    assert.equal(p.erased*fee,p.eraseSpent);
    const row={F,period,maxDegrees:+maxAngle.toFixed(2),bank,fee,sponsorFarm:+withFarm,lap:t/period,t,
      intactConsecutiveLaps:exactLaps,firstDivergence,shipCells:body.length,targetPlacements:placed,
      erased:p.erased,eraseSpent:p.eraseSpent,birthSpent:p.birthSpent,matureIncome:+p.income.toFixed(2),
      cash:+p.reserve.toFixed(2),refused:p.refused};
    if(!header){console.log(Object.keys(row).join(','));header=true;}
    console.log(Object.values(row).join(','));
    if(t<period*6)placed+=restock();
  }
}
