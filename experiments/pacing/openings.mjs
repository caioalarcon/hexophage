// Fixed build-order timing is not a fundamental tech deadline. Compare legal,
// adequately funded gun openings under the very same tariff & seed.
import {writeFile} from 'node:fs/promises';
import {simulate,RATE} from '../economy/simulator.js';
import {loadMacroProfiles} from '../economy/macro-profiles.js';

const priceRules=[
 {id:'short',price:1500,massPressureDoubling:3,pressureHalfLife:165*RATE},
 {id:'long',price:350,massPressureDoubling:2,pressureHalfLife:300*RATE},
 {id:'polynomial',price:2500,massPressureScale:14,massPressurePower:2,pressureHalfLife:4800*RATE},
];
const profiles=await loadMacroProfiles(),results=[];
for(const rule of priceRules)for(const life of [1200,12000])for(const id of ['p2','p4f','glider','censo-oscillator-8-p4-1','censo-oscillator-11-p4-2'])
 for(const copies of [1,2,4,6,8,12,16,24,32]){
   let prev=0,gap=0,firstGun=null;
   const r=simulate(profiles,rule,{id:'rush',start:['p2',...Array(copies-1).fill(id)],repeat:['gun20'],fundGun:true},{
     shipLife:life,horizon:40*60*RATE,onOrder(g,id){
       if(firstGun==null){gap=Math.max(gap,g-prev);prev=g;if(id==='gun20')firstGun=g}
     }});
   results.push({rule:rule.id,life,id,copies,firstGun,longestGapSeconds:gap/RATE,orders40:r.orders,deficit:r.firstInsolvent,map:r.breachedMap});
 }
await writeFile(process.argv[2] || '/tmp/pacing-openings.json',JSON.stringify(results));
