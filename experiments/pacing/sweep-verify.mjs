// Cross-check native search outcomes using calibrated catalog + per-generation JS ledger.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simulate, RATE, HORIZON } from '../economy/simulator.js';
import { loadMacroProfiles } from '../economy/macro-profiles.js';
import { policies } from '../economy/scenarios.js';
const picks=JSON.parse(readFileSync(new URL('results-candidates.json',import.meta.url)));
const profiles=await loadMacroProfiles();
for(const {name,rule,expected} of picks){
  const exact={...rule,pressureHalfLife:rule.pressureHalfLife==='inf'?Infinity:rule.pressureHalfLife};
  for(const [policy,key] of [['mixed','mixed120'],['flipper','flipper120'],['gun','gun120'],['glider','glider120']]){
    const plan=policies.find(p=>p.id===policy);
    const s=simulate(profiles,exact,plan);
    assert.equal(s.orders,expected[key],name+': '+key);
    if(policy==='mixed') {
      for(const minute of [5,15,30,60].filter(m=>'mixed'+m in expected)) assert.equal(s.checkpoints.find(q=>q.g===minute*60*RATE).orders,expected['mixed'+minute]);
      assert(Math.abs(s.marks[2]/RATE-expected.second_s)<.001);
      const saving=simulate(profiles,exact,plan,{buyThrough:HORIZON-10*60*RATE}).checkpoints.at(-1);
      assert.equal(saving.burst,expected.burst10,name+': burst');
      assert(Math.abs(saving.bank/expected.savedE-1)<1e-6,name+': saved energy');
    }
    if(policy==='gun')assert(Math.abs(s.byType.gun20/(RATE*60)-expected.guns_first_min)<1e-5,name+': first gun');
  }
  console.log(name+' matched at generation resolution');
}
