import {ruleProfiles} from '../../src/match/rule-profiles.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {patchForStamp} from '../../src/patterns/spherical-patch.js';

export const rules=Object.fromEntries(Object.entries(ruleProfiles).filter(([,p])=>p.physics));
export const resolverNames={contact:'Contato',phase:'Travessia',guard:'Guarda',antimatter:'Antimatéria'};
export const cards=new Map();
for(const [source,profile] of Object.entries(rules)){
  for(const p of profile.gameplay.atlas??profile.gameplay.patterns){
    const raw=decodeRLE(p.rle);
    const center=[0,1].map(k=>Math.round(raw.reduce((sum,a)=>sum+a[k],0)/raw.length));
    const offsets=raw.map(([x,y])=>[x-center[0],y-center[1]]);
    cards.set(source+'/'+p.id,{source,id:p.id,name:p.name,offsets});
  }
}

export function footprint(graph,key,site,rotation=0) {
  return patchForStamp({graph},site,rotation,cards.get(key).offsets);
}
