import {patchForStamp} from '../../src/patterns/spherical-patch.js';
import {createTypedWorld} from './engine.mjs';
import {card} from './duels-fixtures.mjs';

// Map the native ship's full circuit before placing targets. The flight is
// independently rechecked by duels-orbit.mjs in all experimental conditions.
export function orbitScene(graph) {
  const launchSite=graph.farthest;
  const slider=card('ashley','scan-5ab33f'), farm=card('hex-b2s245','farm-4-12');
  const cut=(center,points)=>patchForStamp({graph},center,0,points);
  const gun=cut(launchSite,slider.shape), native=createTypedWorld(graph,{wallets:[1e7],seed:23});
  if(!gun || !native.stamp(1,slider.rule,'phase',gun))throw Error('No orbital launch site');
  const frames=[new Set(gun)], footprint=new Set(gun);
  let period=0, maxAngle=0;
  const {coords:v}=graph;
  for(let t=1;t<=2000;t++){
    native.step();
    const points=new Set(native.cells.keys());
    for(const i of points){
      footprint.add(i);
      const dot=v[3*i]*v[3*launchSite]+v[3*i+1]*v[3*launchSite+1]+v[3*i+2]*v[3*launchSite+2];
      maxAngle=Math.max(maxAngle,Math.acos(Math.max(-1,Math.min(1,dot)))*180/Math.PI);
    }
    if(points.size===gun.length && gun.every(i=>points.has(i))){period=t;break;}
    frames.push(points);
  }
  if(!period || maxAngle<150)throw Error('No closed orbit found');
  const freeCenters=[.1,.3,.5,.7].map(f=>Math.floor(f*period)).map(t=>[...frames[t]].sort((a,b)=>a-b).find(id=>cut(id,farm.shape)));
  const crops=freeCenters.map(id=>cut(id,farm.shape));
  const q=[...footprint], distance=new Int16Array(graph.n).fill(-1);
  for(const id of q)distance[id]=0;
  for(let i=0;i<q.length;i++)for(let k=0;k<graph.deg[q[i]];k++){
    const id=graph.adj[6*q[i]+k];
    if(distance[id]>=0)continue;
    distance[id]=1+distance[q[i]];q.push(id);
  }
  let sponsor, sponsorSite;
  for(let i=q.length-1;i>=0 && !sponsor;i--){
    const id=q[i];
    if(distance[id]>10){sponsor=cut(id,farm.shape);if(sponsor)sponsorSite=id;}
  }
  if(!sponsor || crops.some(c=>!c))throw Error('No farm site away from pentagons');
  return {period,maxAngle,launchSite,frames,slider,farm,gun,crops,sponsor,sponsorSite,freeCenters};
}

// Use the supplied match and its settings. The empirical preset used wallets
// [240, 24000], seed 23, F24, phasePriority 1, eraseCost 24 and income from a
// remote farm. Calling restock() after a step is optional and pays per success.
export function openOrbit(match, scene, withFarm=true) {
  const {crops,farm,slider,sponsor,gun,period}=scene;
  for(const ids of crops)if(!match.stamp(2,farm.rule,'contact',ids))throw Error('Não foi possível financiar as fazendas no percurso.');
  if(withFarm && !match.stamp(1,farm.rule,'contact',sponsor))throw Error('A reserva não cobre a fazenda patrocinadora.');
  for(let t=0;t<24;t++)match.step();
  if(!match.stamp(1,slider.rule,'phase',gun))throw Error('A reserva não cobre o lançamento.');
  const started=match.gen;
  let lastAttempt=started;
  return function restock(){
    if(match.gen===lastAttempt || (match.gen-started)%period)return 0;
    lastAttempt=match.gen;
    let added=0;
    for(const ids of crops)if(match.stamp(2,farm.rule,'contact',ids))added++;
    return added;
  };
}
