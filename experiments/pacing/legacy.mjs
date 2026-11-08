// Run the prior laboratory's named controls on the same clock as the new rules.
import {writeFile} from 'node:fs/promises';
import {loadMacroProfiles} from '../economy/macro-profiles.js';
import {simulate,RATE} from '../economy/simulator.js';
import {rules,policies} from '../economy/scenarios.js';

const mixed=policies.find(p=>p.id==='mixed');
const profiles=await loadMacroProfiles(), results={};
for (const rule of rules) {
  const windows=[0,0,0,0,0];
  const run=simulate(profiles,rule,mixed,{onOrder(g) {
    const i=Math.floor(g/(5*60*RATE));
    if(i<windows.length) windows[i]++;
  }});
  const final=run.checkpoints.find(c=>c.status==='order-limit' || c.status==='first-deficit') ?? run.checkpoints.at(-1);
  const completed=final.g>=25*60*RATE;
  results[rule.id]={orders:final.orders,seconds:final.g/RATE,status:final.status,
    fiveMinuteRates:completed?windows.map(n=>n/5):null,overflow:final.overflow};
}
await writeFile(process.argv[2]??'legacy-results.json',JSON.stringify(results,null,2)+'\n');
