// Shadow economics; the funded physical trajectories are identical for all designs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {buildSphere} from '../../src/world/sphere.js';
import {replay} from './contacts.mjs';
import {combatDeaths} from './causality.mjs';
import {wreckage} from './wreckage.mjs';
const source=JSON.parse(readFileSync(new URL('./contacts.json',import.meta.url)));
function trial(graph,spec) {
  const direct=wreckage(), contact=wreckage();
  let actualFee=0;
  const r=replay(graph,spec,false,world=>{
    for(const event of combatDeaths(world)){
      // A paid natural birth or paid seed charged one unit for each cell's
      // current life. Run with the inverted birth tariff and fully funded players.
      contact.deposit(event.id,event.victim,1);
      if(event.attackers.length)direct.deposit(event.id,event.victim,1);
    }
    for(let o=1;o<=2;o++)for(const id of world.ownerCells[o]) {
      if(world.next[id])continue;
      actualFee++;
      // Only an owned natural birth can collect an older site. The physical
      // cell that died this generation cannot also be born in this generation.
      contact.birth(id,o);direct.birth(id,o);
    }
  });
  assert(r);
  const paid=actualFee+r.seedCells[0]+r.seedCells[1];
  const result={target:r.target,altered:r.altered!==null,paid,direct:direct.report(),contact:contact.report()};
  assert(result.contact.deposited<=.5*paid);
  return result;
}
const rows=[], named=[];
for(const [samples,f,table] of [[source.sweep,48,rows],[source.named,256,named]]){
  const graph=buildSphere(f);
  for(const spec of samples)table.push({name:spec.name, ...trial(graph,spec)});
}
function sum(data,gate) {
  const out={deposited:0,claimed:0,returned:0,looted:0,outstanding:0,attacker:0,defender:0,any:0,maxAttacker:0,maxDefender:0};
  for(const r of data){
    for(const k of ['deposited','claimed','returned','looted','outstanding'])out[k]+=r[gate][k];
    out.attacker+=r[gate].byOwner[1]??0;out.defender+=r[gate].byOwner[2]??0;
    out.maxAttacker=Math.max(out.maxAttacker,r[gate].byOwner[1]??0);
    out.maxDefender=Math.max(out.maxDefender,r[gate].byOwner[2]??0);
    if(r[gate].claimed)out.any++;
  }
  return out;
}
writeFileSync(new URL('./salvage-results.json',import.meta.url),JSON.stringify({
  horizon:96,fee:1,recoverable:.5,attempts:rows.length,
  direct:sum(rows,'direct'),contact:sum(rows,'contact'),byTarget:Object.fromEntries([...new Set(rows.map(r=>r.target))].map(id=>[id,sum(rows.filter(r=>r.target===id),'contact')])),named
},null,2)+'\n');
