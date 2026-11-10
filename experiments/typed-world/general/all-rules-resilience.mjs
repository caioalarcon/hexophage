// Matched ablation: same paid geometry, reserve, ages, ballots and priorities.
// Only the arming of each carrier and/or its collateral floor changes.
import assert from 'node:assert/strict';
import {buildSphere} from '../../../src/world/sphere.js';
import {allRulesOrders,prepareAllRules,ruleIds} from './scene.mjs';

const graph=buildSphere(16),rows=[];
for(const seed of [1,43,211])for(const rotation of [0,3]){
  const orders=allRulesOrders(graph,{seed,rotation,owners:3});
  for(const bank of [1600,16000,160000])for(const armed of [true,false])for(const floor of [0,12]){
    const deck=armed?orders:orders.map(o=>o.resolver==='antimatter'?{...o,resolver:'phase'}:o);
    const {match}=prepareAllRules(graph,{seed,owners:3,orders:deck,bank,arbitration:'ballot',eligibility:'contest',
      friendlyFire:true,economy:{protectedMature:floor}});
    let until=0,cross=0,late=0,events9=0,end,lastCross=0;
    for(let g=0;g<=384;g++){
      const conventional=new Set([...match.cells.values()].filter(c=>!c.wave).map(c=>c.rule));
      if(conventional.size===9 && until===g-1)until=g;
      if(g===384){end=conventional.size;break;}
      const bids=new Set();
      match.step({onContest(e){
        const rules=new Set(e.claims.map(c=>c.rule));
        if(rules.size<=1)return;
        cross++;lastCross=g+1;
        if(g+1>192)late++;
        for(const r of rules)bids.add(r);
      }});
      if(bids.size===ruleIds.length)events9++;
    }
    const sum=k=>match.players.slice(1).reduce((v,p)=>v+p[k],0);
    assert(armed || !sum('detonations'));
    rows.push({seed,rotation,bank,armed:Number(armed),floor,until9:until,rulesG384:end,
      distinctFoundingRules:ruleIds.length,crossRule:cross,contestsAfter192:late,lastCross,ticksAllBid:events9,
      ignition:sum('detonations'),sales:sum('eroded'),fundingRefusals:sum('refused'),livingWallets:3-sum('out')});
  }
}
const keys=Object.keys(rows[0]);console.log(keys.join(','));for(const row of rows)console.log(keys.map(k=>row[k]).join(','));
