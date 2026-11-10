// One of the three players disperses a second copy of its nine native bases.
// The other 54 cards remain in exactly the same frontiers in paired replays.
import assert from 'node:assert/strict';
import {buildSphere} from '../../../src/world/sphere.js';
import {footprint} from '../catalog.mjs';
import {allRulesOrders,prepareAllRules,ruleIds,portfolio} from './scene.mjs';

const graph=buildSphere(32),rows=[];
function reserveBases(orders,rotation){
  const used=new Set(orders.flatMap(o=>o.ids)),extra=[];
  for(const [i,rule] of ruleIds.entries()){
    const d=new Int16Array(graph.n).fill(-1),q=[...used];
    for(const a of q)d[a]=0;
    for(let j=0;j<q.length;j++)for(let k=0;k<graph.deg[q[j]];k++){
      const a=graph.adj[6*q[j]+k];if(d[a]<0){d[a]=1+d[q[j]];q.push(a);}
    }
    const card=portfolio[rule][0],byGap=Array.from({length:graph.n},(_,i)=>i).sort((a,b)=>d[b]-d[a]||a-b);
    let ids,site;
    for(const a of byGap){
      if(graph.distance[a]<4)continue;
      ids=footprint(graph,rule+'/'+card,a,rotation);
      if(ids && ids.every(x=>d[x]>=5)){site=a;break;}
    }
    assert(site!==undefined,'need a separate refuge');
    extra.push({rule,card,site,ids,rotation,owner:1,role:'base',resolver:'guard',ballot:['age','geometry','support'][i%3]});
    for(const a of ids)used.add(a);
  }
  return extra;
}
for(const seed of [1,43,211])for(const rotation of [0,3]){
  const front=allRulesOrders(graph,{seed,rotation,owners:3});
  const reserve=reserveBases(front,rotation);
  for(const bank of [16000,160000])for(const withRefuge of [false,true])for(const floor of [0,40]){
    const orders=withRefuge?[...front,...reserve]:front;
    const {match}=prepareAllRules(graph,{seed,owners:3,orders,bank,arbitration:'ballot',eligibility:'contest',friendlyFire:true,economy:{protectedMature:floor}});
    let fronts=new Map(orders.flatMap((o,i)=>o.ids.map(s=>[s,i]))),until=0,lastCross=0,
      originalAtEnd,backupAtEnd,remainingAtEnd,sponsorAtEnd,mixedHits=0,late=0;
    for(let g=0;g<=384;g++){
      const live=new Set(),sponsor=new Set(),fromFront=new Set(),fromRefuge=new Set();
      for(const [s,c] of match.cells)if(!c.wave){
        live.add(c.rule);if(c.owner===1)sponsor.add(c.rule);
        (fronts.get(s)<front.length?fromFront:fromRefuge).add(c.rule);
      }
      if(g===until+1 && sponsor.size===9)until=g;
      if(g===384){remainingAtEnd=live.size;originalAtEnd=fromFront.size;backupAtEnd=fromRefuge.size;sponsorAtEnd=sponsor.size;break;}
      const next=new Map();
      match.step({onBirth(e){assert(fronts.has(e.parent));next.set(e.site,fronts.get(e.parent));},onContest(e){
        if(new Set(e.claims.map(c=>c.rule)).size>=2){mixedHits++;lastCross=g+1;if(g+1>192)late++;}
      }});
      for(const [s,c] of match.cells)if(c.age>1)next.set(s,fronts.get(s));
      fronts=next;
    }
    rows.push({seed,rotation,bank,withRefuge:+withRefuge,floor,untilSponsor9:until,sponsorRulesG384:sponsorAtEnd,
      rulesG384:remainingAtEnd,originalRulesG384:originalAtEnd,backupRulesG384:backupAtEnd,mixedHits,lastCross,after192:late,
      sponsorCash:+match.players[1].reserve.toFixed(2),sponsorOut:+match.players[1].out});
  }
}
const keys=Object.keys(rows[0]);console.log(keys.join(','));for(const row of rows)console.log(keys.map(k=>row[k]).join(','));
