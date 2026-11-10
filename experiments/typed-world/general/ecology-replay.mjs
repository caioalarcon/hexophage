import {createTypedWorld} from '../engine.mjs';
import {footprint} from '../catalog.mjs';
import {portfolio,ruleIds,spreadSites} from './scene.mjs';

// Nine lawful atlas placements near the encounter. All belong to player 1.
// [generation before placement, centre, atlas stamp, rotation, resolver]
export const ecologyOrders=[
  [0, 221, 'highhex/scan-012b5a', 3, 'guard'],
  [0, 274, 'hex-b2s245/scan-b1cf68', 0, 'guard'],
  [1, 360, 'andreen/bagley-half-c-p4', 5, 'phase'],
  [1, 293, 'highhex/scan-ab387f', 0, 'contact'],
  [1, 197, 'andreen/bagley-toggle-pair', 1, 'contact'],
  [2, 342, 'highhex/poly-15d07950', 1, 'contact'],
  [4, 361, 'ashley15/scan-0aa91d', 4, 'guard'],
  [5, 337, 'bays245/bagley-snake-p4', 2, 'guard'],
  [6, 250, 'bays245/poly-35061ccf', 2, 'contact'],
];
export function prepareEcologyWitness(graph,{bank=16000,seed=632,economy={},...engineOptions}={}){
  if(graph.n!==10242)throw Error('Este encontro usa a esfera F32.');
  const match=createTypedWorld(graph,{arbitration:'ecology',eligibility:'contest',friendlyFire:true,
    ...engineOptions,seed,wallets:[bank],economy});
  const sites=spreadSites(graph,10).slice(1),orders=[];
  function plant(site,key,rotation,resolver){
    const rule=key.split('/')[0],ids=footprint(graph,key,site,rotation);
    if(!match.stamp(1,rule,resolver,ids))throw Error('Abertura inviável nesta configuração.');
    orders.push({gen:match.gen,site,key,rotation,resolver,owner:1,ids});
  }
  for(const [i,rule] of ruleIds.entries())plant(sites[i],rule+'/'+portfolio[rule][0],0,'contact');
  for(let g=0;g<10;g++){
    for(const [time,site,key,rot,resolver] of ecologyOrders)if(time===g)plant(site,key,rot,resolver);
    match.step();
  }
  return {match,graph,orders,anchor:246,remote:sites[0]};
}
