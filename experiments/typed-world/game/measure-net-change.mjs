// Same observation window as the existing per-rule age histograms. Net change
// of the field is enough to recover exact mean deaths from births and balance.
import {writeFileSync} from 'node:fs';
import {ruleProfiles} from '../../../src/match/rule-profiles.js';
import {advancePattern,seedPatternAges} from '../../../src/patterns/planar-simulation.js';
import {physicalYields} from '../../../src/patterns/physical-yields.js';

const deltas={};
for(const [rule,p] of Object.entries(ruleProfiles))if(p.physics){
  for(const card of p.gameplay.atlas??p.gameplay.patterns){
    let frame=seedPatternAges(card),initial=0,births=0,deaths=0;
    for(let g=1;g<=1024;g++){
      const before=frame.size,step=advancePattern(frame,1,p.physics);frame=step.next;
      if(g===896)initial=frame.size;
      if(g>896){births+=step.births;deaths+=before+step.births-frame.size;}
    }
    if(births/128!==physicalYields[rule][card.id][1] || births-deaths!==frame.size-initial)
      throw Error('Native reference disagrees for '+rule+'/'+card.id);
    const delta=frame.size-initial;
    if(delta)deltas[rule+'/'+card.id]=delta;
  }
}
const output='// G1024 minus G896 measured by measure-net-change.mjs. Unlisted native cards have zero net change.\nexport const netChange='+JSON.stringify(deltas)+';\n';
writeFileSync(new URL('./net-change.mjs',import.meta.url),output);
