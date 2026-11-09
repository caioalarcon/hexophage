import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {buildSphere} from '../../../src/world/sphere.js';
import {ruleIds,prepareAllRules,allRulesOrders} from './scene.mjs';
import {explainContest} from '../arbitration.mjs';

const graph=buildSphere(16), samples=[];
for(const matrixName of ['forward','reverse','circular']){
  let bits='';
  for(let i=0;i<9;i++)for(let j=i+1;j<9;j++)
    bits+=matrixName==='forward' || matrixName==='circular' && j-i<=4?'1':'0';
  const policy={mode:'matrix',by:'rule',order:ruleIds,matrix:bits};
  let example;
  const counts={crossRule:0,tripleTopCycles:0,championPresent:0,championPreferred:0,championFunded:0};
  for(let seed=1;seed<=12;seed++){
    const orders=allRulesOrders(graph,{seed});
    const {match}=prepareAllRules(graph,{seed,orders,arbitration:policy,eligibility:'contest',friendlyFire:true,onContest:e=>{
      const possible=new Set(e.claims.map(c=>c.rule));if(possible.size<2)return;
      counts.crossRule++;
      if(e.cycle){
        counts.tripleTopCycles++;
        if(!example && possible.size>=3)example={seed,gen:e.gen,site:e.site,claims:e.claims,
          winner:e.winner,round:explainContest(policy,e).rounds[0]};
      }
      const champion=matrixName==='forward'?ruleIds[0]:matrixName==='reverse'?ruleIds.at(-1):null;
      if(champion && possible.has(champion)){
        counts.championPresent++;counts.championPreferred+=Number(e.preferred.rule===champion);
        counts.championFunded+=Number(e.winner?.rule===champion);
      }
    }});
    assert.equal(new Set([...match.cells.values()].map(c=>c.rule)).size,9);
    for(let g=0;g<64;g++)match.step();
  }
  assert.equal(counts.championPreferred,counts.championPresent);
  samples.push({matrixName,bits,order:ruleIds,worlds:12,horizon:64,counts,example});
}
writeFileSync(new URL('matrix-audit.json',import.meta.url),JSON.stringify(samples,null,2)+'\n');
console.log(samples.map(s=>[s.matrixName,s.bits,s.counts]));
