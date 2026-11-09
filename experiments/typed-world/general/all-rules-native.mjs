// Independent single-rule reference from the production spherical engine.
// Compare every occupied vertex and the uninterrupted age at that vertex.
import assert from 'node:assert/strict';
import {buildSphere} from '../../../src/world/sphere.js';
import {createHeadlessMatch} from '../../../src/match/headless.js';
import {advanceGeneration} from '../../../src/simulation/generation.js';
import {createTypedWorld} from '../engine.mjs';
import {footprint} from '../catalog.mjs';
import {portfolio,ruleIds,spreadSites} from './scene.mjs';

const graph=buildSphere(32),free={stampCost:0,birthCost:0,stableEnergy:0,eraseCost:0,salvage:0,blastBirthCost:0};
const sites=spreadSites(graph,ruleIds.length);
for(const role of ['base','shot'])for(const rotation of [0,3]){
  const mixed=createTypedWorld(graph,{wallets:[16000],economy:free});
  const refs=ruleIds.map((rule,i)=>{
    const key=rule+'/'+portfolio[rule][role==='base'?0:1];
    const ids=footprint(graph,key,sites[i],rotation);assert(ids,key);
    const native=createHeadlessMatch(graph,{rule,growth:'classic'});
    const solo=createTypedWorld(graph,{wallets:[16000],economy:free});
    for(const id of ids)native.addLive(id,1);
    assert(solo.stamp(1,rule,'contact',ids));assert(mixed.stamp(1,rule,'contact',ids));
    return {rule,key,ids,native,solo,ages:new Map(ids.map(id=>[id,1])),firstDivergence:null,firstContact:null};
  });
  for(let gen=0;gen<=128;gen++){
    const byRule=new Map(ruleIds.map(r=>[r,new Map()]));
    for(const [site,c] of mixed.cells){
      byRule.get(c.rule).set(site,c.age);
      const r=refs.find(r=>r.rule===c.rule);
      if(r.firstContact===null)for(let k=0;k<graph.deg[site];k++){
        const other=mixed.cells.get(graph.adj[6*site+k]); if(other && c.rule!==other.rule){r.firstContact=gen;break;}
      }
    }
    for(const r of refs){
      assert.equal(r.solo.cells.size,r.ages.size,r.key+' size at '+gen);
      for(const [id,age] of r.ages)assert.equal(r.solo.cells.get(id)?.age,age,r.key+' native parity at '+gen);
      if(r.firstDivergence===null){
        const m=byRule.get(r.rule);
        if(m.size!==r.ages.size || [...r.ages].some(([id,age])=>m.get(id)!==age))r.firstDivergence=gen;
      }
      if(gen===128)continue;
      r.solo.step();advanceGeneration(r.native.world);
      const w=r.native.world,next=new Map();
      for(const id of w.active.subarray(0,w.activeCount))next.set(id,(r.ages.get(id)??0)+1);
      r.ages=next;
    }
    if(gen<128)mixed.step();
  }
  for(const r of refs)console.log(JSON.stringify({role,rotation,rule:r.rule,card:r.key,
    nativeVerifiedThrough:128,mixedFirstDivergence:r.firstDivergence,mixedFirstAdjacency:r.firstContact,
    nativeFinal:r.ages.size,mixedConventionalFinal:[...mixed.cells.values()].filter(c=>c.rule===r.rule && !c.wave).length}));
}
