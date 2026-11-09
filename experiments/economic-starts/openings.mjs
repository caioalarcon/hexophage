// Quote the actual first 1,024 isolated generations. A negative bank marks a
// seed whose trajectory would require funding beyond the initial reserve.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolveRuleProfile} from '../../src/match/rule-profiles.js';
import {advancePattern,seedPatternAges} from '../../src/patterns/planar-simulation.js';
import {generationEnergy,initialEnergy} from '../../src/match/constructive-economy.js';
import {getCandidate,rules} from './candidates.mjs';

const selection = new Map(readFileSync(new URL('./selection.csv', import.meta.url), 'utf8')
  .trim().split('\n').slice(1).map(row => row.split(',')));
const records=['rule,candidate,stamp,cells,cost,affordable,firstDeficit,payback,lateFlow,netAt1024,live'];
for(const rule of rules){
  const {gameplay,physics,economy}=resolveRuleProfile(rule);
  assert.deepEqual({...economy, emptyFieldUpkeep:false}, getCandidate(rule, selection.get(rule)));
  for(const p of gameplay.atlas??gameplay.patterns) {
    const scenarios=[['original',getCandidate(rule,'original')],['selected',economy]].map(([key,e])=>{
      const cost=p.cells*e.stampCost, initial=initialEnergy(e);
      return {key,e,cost,initial,net:-cost,deficit:cost>initial?0:null,payback:null,late:0};
    });
    let state=seedPatternAges(p);
    for(let g=1;g<=1024;g++){
      const turn=advancePattern(state,256,physics);
      state=turn.next;
      for(const s of scenarios){
        let mature=0;
        for(const a of state.values())if(a>=s.e.stableAfter)mature++;
        const {income,upkeep}=generationEnergy(turn.births,mature,s.e), flow=income-upkeep;
        s.net+=flow;
        if(s.deficit===null && s.initial+s.net < -1e-8)s.deficit=g;
        if(s.payback===null&&s.net>=0)s.payback=g;
        if(g>896)s.late+=flow;
      }
    }
    for(const s of scenarios)
      records.push([rule,s.key,p.id,p.cells,s.cost,Number(s.cost<=s.initial),s.deficit??'',s.payback??'',
        (s.late/128).toFixed(4),s.net.toFixed(2),state.size].join(','));
  }
}
writeFileSync(new URL('openings.csv',import.meta.url),records.join('\n')+'\n');
