// Every paid catalog pattern, including the 3-cell flipper, is ranked on the
// same footing. Operating cash excludes the stamp, and all formations are
// isolated and fully funded. This is a financial ranking, not a PvP rating.
import { CALLAHAN } from '../../src/simulation/rules.js';
import {writeFileSync} from 'node:fs';
import {atlasPatterns} from '../../src/patterns/atlas-data.js';
import {advancePattern, cycleWindow, seedPatternAges} from '../../src/patterns/cycle-economy.js';
import {DEFAULT_ECONOMY,generationEnergy} from '../../src/match/constructive-economy.js';
const horizon=1200;
export function catalogTrace(p, turns, threshold) {
  let live=seedPatternAges(p);const result=[];
  for(let g=1;g<=turns;g++){
    const row=advancePattern(live,threshold,CALLAHAN);live=row.next;result.push([row.births,row.mature]);
  }
  return result;
}
function summarize(pattern) {
  const w=cycleWindow(pattern).length, end=Math.max(2,Math.ceil(horizon/w))*w;
  const series=catalogTrace(pattern,end,DEFAULT_ECONOMY.stableAfter);
  let cash=0,minimum=0,lateIncome=0,lateBurn=0,first=null,zero=null;
  let current=0, beginning=null;
  for(let i=0;i<series.length;i++){
    const [b,s]=series[i];
    const {income,upkeep}=generationEnergy(b,s,DEFAULT_ECONOMY);
    cash+=income-upkeep;current+=income-upkeep;minimum=Math.min(minimum,cash);
    if(i<w)beginning=(beginning??0)+income-upkeep;
    if((i+1)%w===0){if(current>0)first??=i+1;else first=null;current=0;}
    if(cash>=0 && i>0)zero??=i+1;
    if(i>=end-w){lateIncome+=income;lateBurn+=upkeep;}
  }
  return {id:pattern.id,name:pattern.name,group:pattern.group,cells:pattern.cells,cost:pattern.cells*DEFAULT_ECONOMY.stampCost,
    window:w,end,initialFlow:beginning/w,lateIncome:lateIncome/w,lateBirthCost:lateBurn/w,lateFlow:(lateIncome-lateBurn)/w,
    workingCapital:Math.ceil(-minimum),positiveWindowsFrom:first,operatingPayback:zero};
}
if(process.argv[1]&&import.meta.url===new URL('file:'+process.argv[1]).href){
  const ranking=atlasPatterns.map(summarize).sort((a,b)=>b.lateFlow-a.lateFlow || a.cost-b.cost);
  const relic=new URL('./ranking.json',import.meta.url);
  writeFileSync(relic,JSON.stringify({settings:DEFAULT_ECONOMY,ranking},null,2)+'\n');
}
