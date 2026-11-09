// An isolated phase ship flies down the same prepared corridor in every arm.
// The twin with no targets distinguishes natural navigation/birth expense from
// the financial and physical cost of flying through five mature enemy farms.
import assert from 'node:assert/strict';
import {buildSphere} from '../../src/world/sphere.js';
import {patchForStamp} from '../../src/patterns/spherical-patch.js';
import {createTypedWorld} from './engine.mjs';
import {card} from './duels-fixtures.mjs';

const graph=buildSphere(64), anchor=graph.farthest;
const farm=card('hex-b2s245','farm-4-12'), ship=card('ashley','scan-5ab33f');
assert.deepEqual(ship.delta,[-2,0]);
const at=(shape,q,r,center=anchor)=>patchForStamp({graph},center,0,shape.map(([x,y])=>[q+x,r+y]));
let remote=0;
for(let i=0;i<graph.n;i++)if(graph.distance[i]>7 &&
  graph.coords[3*i]*graph.coords[3*anchor]+graph.coords[3*i+1]*graph.coords[3*anchor+1]+graph.coords[3*i+2]*graph.coords[3*anchor+2]<-.7){remote=i;break;}
assert(remote);
const targets=[14,7,0,-7,-14].map(q=>at(farm.shape,q,0)), gun=at(ship.shape,22,0);
const reserveFarm=at(farm.shape,0,0,remote);
function run(bank,fee,targetsOn,financed){
  const w=createTypedWorld(graph,{wallets:[bank,16000],seed:761,
    economy:{stampCost:8,birthCost:1,eraseCost:fee,stableEnergy:1,stableAfter:12,productionScale:60,salvage:8,blastBirthCost:4}});
  if(targetsOn)for(const ids of targets)assert(w.stamp(2,farm.rule,'contact',ids));
  if(financed)assert(w.stamp(1,farm.rule,'contact',reserveFarm));
  for(let t=0;t<24;t++)w.step();
  // Assign each stable target to its original farm by nearest chart center;
  // distinct disks may not overlap.
  const pads=[14,7,0,-7,-14].map(q=>{
    const offsets=[]; for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++)if(Math.abs(a+b)<=3)offsets.push([a,b]);
    return at(offsets,q,0).filter(id=>w.cells.get(id)?.owner===2);
  });
  if(targetsOn)assert(pads.every(ids=>ids.length===12));
  assert(w.stamp(1,ship.rule,'phase',gun));
  const trajectory=[];
  const sample=t=>{
    let living=0;for(const c of w.cells.values())if(c.owner===1 && c.rule===ship.rule)living++;
    const p=w.players[1];
    trajectory.push({time:t,pop:living,balance:+p.reserve.toFixed(2),erased:p.erased,paid:+p.eraseSpent.toFixed(2),
      farmsHit:pads.filter(pad=>pad.some(i=>w.cells.get(i)?.owner!==2)).length,
      intactCells:pads.flat().filter(i=>w.cells.get(i)?.owner===2).length});
  };
  for(let t=1;t<=256;t++){w.step();if([16,32,64,96,128,256].includes(t))sample(t);}
  return trajectory;
}
let header=false;
for (const bank of [240,960,3840])for(const fee of [0,8,24,96])for(const financed of [false,true]){
  const empty=run(bank,fee,false,financed), packed=run(bank,fee,true,financed);
  for(let i=0;i<packed.length;i++){
    const r=packed[i],row={F:64,bank,fee,sponsorFarm:+financed,...r,emptyShipPop:empty[i].pop,emptyFinalCash:empty[i].balance};
    if(!header){console.log(Object.keys(row).join(','));header=true;}
    console.log(Object.values(row).join(','));
  }
}
