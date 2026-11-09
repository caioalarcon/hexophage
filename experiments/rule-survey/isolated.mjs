// Same 1,024-generation operating ledger for every atlas entry. No opponents
// or erosion; distinguish financing the experiment from affordability in play.
import { writeFileSync } from 'node:fs';
import { resolveRuleProfile, ruleProfiles } from '../../src/match/rule-profiles.js';
import { STABILITY_ECONOMY as economy, generationEnergy, initialEnergy } from '../../src/match/constructive-economy.js';
import { seedPatternAges, advancePattern } from '../../src/patterns/planar-simulation.js';

const horizon = 1024, window = 128, cap = 15000, workCap = 3_000_000;
const rows = [];
const round = n => +n.toFixed(3);
for (const id of Object.keys(ruleProfiles).filter(id=>id!=='custom')) {
  const {gameplay,physics} = resolveRuleProfile(id);
  for (const pattern of gameplay.atlas ?? gameplay.patterns) {
    let ages = seedPatternAges(pattern);
    const cells = ages.size, cost = economy.stampCost*cells;
    let net=0, lateFlow=0, lateBirths=0, lateDeaths=0, lateMature=0;
    let gen=0, peak=cells, emptyAt=null, deficitAt=cost>initialEnergy(economy)?0:null, work=0;
    while (gen<horizon && ages.size<=cap && work<workCap) {
      if (!ages.size) { emptyAt??=gen; gen=horizon; break; }
      work+=ages.size;
      const turn=advancePattern(ages,economy.stableAfter,physics);
      const quote=generationEnergy(turn.births,turn.mature,economy);
      const flow=quote.income-quote.upkeep;
      net+=flow;
      if (gen>=horizon-window) {
        lateFlow+=flow; lateBirths+=turn.births; lateMature+=turn.mature;
        lateDeaths+=ages.size+turn.births-turn.next.size;
      }
      ages=turn.next; gen++; peak=Math.max(peak,ages.size);
      if (deficitAt===null && initialEnergy(economy)-cost+net<0) deficitAt=gen;
    }
    const complete=gen===horizon;
    rows.push({rule:id,id:pattern.id,cells,cost,generations:gen,complete,live:ages.size,peak,emptyAt,deficitAt,
      operating:round(net),netAfterStamp:round(net-cost),lateFlow:complete?round(lateFlow/window):null,
      lateBirths:complete?round(lateBirths/window):null,lateDeaths:complete?round(lateDeaths/window):null,
      lateMature:complete?round(lateMature/window):null});
  }
  console.error(id,rows.filter(r=>r.rule===id).length);
}
const keys=Object.keys(rows[0]);
writeFileSync(new URL('./isolated.csv',import.meta.url),[keys,...rows.map(r=>keys.map(k=>r[k]))].map(a=>a.join(',')).join('\n')+'\n');
