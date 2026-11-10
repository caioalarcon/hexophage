import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSphere} from '../../src/world/sphere.js';
import {createTypedWorld} from './engine.mjs';
import {census} from './general/local-space.mjs';

const graph=buildSphere(8);
const archived=JSON.parse(readFileSync(new URL('./general/local-space.json',import.meta.url)));
for(const degree of [5,6]){
  test('material proposal census and all distinct sets on real degree '+degree+' vertices',()=>{
    const {ids,examples,summary}=census(degree);
    assert.deepEqual(summary,archived.filter(r=>r.degree===degree));
    const site=graph.deg.indexOf(degree);
    for(const {set,center,encoded} of examples.values()){
      let contest=null;
      const w=createTypedWorld(graph,{wallets:[1e6],eligibility:'contest',friendlyFire:true,
        arbitration:{mode:'fixed',by:'rule',order:ids},onContest:e=>{if(e.site===site)contest=e;}});
      if(center>=0)assert(w.stamp(1,ids[center],'contact',[site]));
      for(let k=0;k<degree;k++){
        const digit=Math.floor(encoded/10**k)%10;
        if(digit)assert(w.stamp(1,ids[digit-1],'contact',[graph.adj[6*site+k]]));
      }
      const nominated=ids.filter((_,i)=>set&(1<<i));
      w.step();
      assert.equal(w.cells.get(site)?.rule,nominated[0]);
      if(nominated.length>=2)
        assert.deepEqual(contest.claims.map(c=>c.rule).sort(),nominated.sort());
      else assert.equal(contest,null);
    }
  });
}
