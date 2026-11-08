import { writeFile } from 'node:fs/promises';
import { generateProfiles } from './profiles.js';
import { macroProfiles } from './macro-profiles.js';
import { RATE, HORIZON, ORDER_LIMIT, simulate } from './simulator.js';

import { rules, policies } from './scenarios.js';

const all = await generateProfiles();
const profiles = macroProfiles(all);
for (const p of policies) for(const id of [...p.start,...p.repeat]) {
  if (!profiles.has(id)) throw Error('Missing validated profile for '+id);
}

const runs = [];
for (const rule of rules) {
  for (const policy of policies) {
    for(const buyThrough of [HORIZON, HORIZON-10*60*RATE]) {
      runs.push(simulate(profiles,rule,policy,{buyThrough}));
    }
  }
  runs.push(simulate(profiles,rule,policies[0],{buyThrough:0}));
}

// One-variable sensitivities at the mixed policy; finite-life assumptions
// are stress scenarios, not a claim about collision probabilities.
const sensitivities = [];
for (const lifetime of [1200,12000,120000,Infinity]){
  for (const rule of rules.filter(r=>['current','mana-gems','field-mana','field-mana-decay'].includes(r.id))) {
    for(const policy of policies.filter(p=>['glider','gun','mixed'].includes(p.id)))
      sensitivities.push(simulate(profiles,rule,policy,{shipLife:lifetime}));
  }
}
const primary=rules.find(r=>r.id==='field-mana');
for(const [parameter,candidates] of Object.entries({fieldDoubling:[6,12,48,96],manaInterval:[300,1200,12000,30000],price:[30,100,1000]})) {
  for(const val of candidates) for(const policy of policies.filter(p=>['flipper','mixed','gun'].includes(p.id))) {
    sensitivities.push({...simulate(profiles,{...primary,[parameter]:val},policy),parameter,value:val});
  }
}
for (const price of [100/3,100,1000]) {
  const rule = {...rules[0], price};
  sensitivities.push({...simulate(profiles,rule,policies[0]),parameter:'linear-price',value:price});
}
const out=process.argv[2] || 'balance-results.json';
await writeFile(out, JSON.stringify({rate:RATE,horizon:HORIZON,limit:ORDER_LIMIT,rules,policies,runs,sensitivities,
  calibration:all},null,2));
console.log(out, runs.length+' runs, '+sensitivities.length+' sensitivities, '+all.length+' catalog profiles');
