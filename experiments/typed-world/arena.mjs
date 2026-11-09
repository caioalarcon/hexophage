import {buildSphere} from '../../src/world/sphere.js';
import {createTypedWorld} from './engine.mjs';
import {blastScene} from './blast-scene.mjs';
import {orbitScene,openOrbit} from './duels-orbit-scene.mjs';
import {footprint} from './catalog.mjs';
import {poses} from './duels-fixtures.mjs';

export const sceneNames={blast:'Antimatéria × fazenda',engulf:'O último a ser engolido',recovery:'Financiar e reconstruir',orbit:'Patrulha orbital',cross:'Glider × crescedor',portfolio:'Uma carteira, duas físicas',arena:'Duelo de carteiras',blank:'Mundo vazio'};

export function defaultsFor(scene){
  return {F:scene==='engulf'?16:scene==='orbit'?24:32,bank:({engulf:1e6,orbit:240,portfolio:160,cross:16384})[scene]??3200,
    finish:['blast','engulf','recovery','orbit','portfolio','blank'].includes(scene)?'observe':'field',
    drive:scene==='arena'?'both':'manual',protectedMature:scene==='recovery'?12:0,phasePriority:['orbit','cross'].includes(scene)?1:0};
}
export function prepareArena({scene='blast',F=defaultsFor(scene).F,bank=defaultsFor(scene).bank,seed=scene==='orbit'?23:1,economy={},farm=true}={}) {
  const graph=buildSphere(F), plan=blastScene(graph);
  const wallets=scene==='engulf'?[bank,10000,10000]:['blast','recovery'].includes(scene)?[bank,10000]:scene==='orbit'?[bank,24000]:[bank,bank];
  const match=createTypedWorld(graph,{seed,wallets,economy:{phasePriority:defaultsFor(scene).phasePriority,protectedMature:defaultsFor(scene).protectedMature,...economy}});
  if(scene==='orbit'){
    const lane=orbitScene(graph), restock=openOrbit(match,lane,farm);
    return {match,graph,anchor:lane.launchSite,remote:lane.sponsorSite,period:lane.period,restock};
  }
  const buy=(owner,rule,resolver,ids)=>{
    if (!ids || !match.stamp(owner,rule,resolver,ids)) throw Error('A reserva ou o espaço não comporta a abertura.');
  };
  if (['blast','engulf','recovery'].includes(scene)) {
    buy(2,'bays','contact',plan.targetBays);
    if (farm) buy(1,'hex-b2s245','contact',scene==='engulf'?plan.middleFarm:plan.smallFarm);
    if (scene==='engulf') buy(3,'hex-b2s245','contact',plan.smallFarm);
    for(let i=0;i<16;i++)match.step();
    if(scene==='recovery' && farm){
      buy(1,'bays','contact',plan.middleBays);
      for(let i=0;i<16;i++)match.step();
    }
    buy(1,'hex-b2s245','antimatter',plan.launch(3));
  } else if (scene==='cross'){
    const pose=poses(graph,'glider-grower',0,0,0);
    buy(2,'callahan','contact',pose.base);
    const shot=pose.layouts.find(l=>match.stamp(1,'bays','phase',l.shot));
    if (!shot)throw Error('Não há um corredor de lançamento válido nesta esfera.');
  } else if(scene==='portfolio'){
    buy(1,'hex-b2s245','guard',plan.targetFarm);
    buy(1,'bays','phase',footprint(graph,'bays/osc2',plan.remote));
  } else if(scene==='arena'){
    buy(1,'hex-b2s245','guard',plan.smallFarm);
    buy(2,'hex-b2s245','guard',plan.targetFarm);
  }
  return {match,graph,anchor:plan.anchor,remote:plan.remote};
}
