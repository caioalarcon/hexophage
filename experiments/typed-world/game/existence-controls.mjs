// A material NO can extinguish the site; it never becomes an identity bid.
// Repeat the same paid atlas orders under all four Boolean aggregators.
import assert from 'node:assert/strict';
import {buildSphere} from '../../../src/world/sphere.js';
import {allRulesOrders,prepareAllRules} from '../general/scene.mjs';

const graph=buildSphere(24), horizon=64;
const seeds=[1,17,33];
console.log('seed,existence,steps,disagreements,approvedDisagreements,conventionalSuccessions,alliedSuccessions,spectralBypasses,firstAllied');
for(const seed of seeds){
  const orders=allRulesOrders(graph,{seed});
  for(const existence of ['any','majority','unanimous','support']){
    const {match}=prepareAllRules(graph,{seed,orders,bank:16000,existence,passage:'literal',eligibility:'contest',arbitration:'ballot'});
    let mixed=0,allowed=0,swaps=0,allied=0,bypassed=0,first='';
    for(let t=0;t<horizon;t++)match.step({onExistence:e=>{
      if(!e.yes || !e.no)return;
      mixed++;if(e.approved)allowed++;
      const w=e.winner,c=e.incumbent;
      if(w && (w.resolver==='phase' || w.resolver==='antimatter')){
        if(!e.approved)bypassed++;return;
      }
      if(!e.approved || !w || !c || c.rule===w.rule || !e.aliveBefore)return;
      const former=e.votes.find(v=>v.owner===c.owner && v.rule===c.rule && v.resolver===c.resolver &&
        v.ballot===c.ballot && v.sense===c.sense);
      assert(former);
      if(former.alive)return;
      swaps++;
      if(c.owner===w.owner){
        allied++;
        first ||= [e.gen,e.site,c.owner,c.rule,w.rule,e.yes,e.no,e.weightYes,e.weightNo].join('/');
      }
    }});
    console.log([seed,existence,horizon,mixed,allowed,swaps,allied,bypassed,first].join(','));
  }
}
