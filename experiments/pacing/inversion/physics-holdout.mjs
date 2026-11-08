// Spatial holdout on an unbounded planar chart, independent of f256 instrumented
// matches. Aged >=64 less aged >=65 is the count that turned exactly 64.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {atlasPatterns} from '../../../src/patterns/atlas-data.js';
import {analyzePatternCycles,cycleWindow} from '../../../src/patterns/cycle-economy.js';
import {DEFAULT_ECONOMY} from '../../../src/match/constructive-economy.js';

const {traces}=JSON.parse(readFileSync(new URL('./physics-traces.json',import.meta.url)));
const checks=[];
for(const [id,trace] of Object.entries(traces)){
  const pattern=atlasPatterns.find(p=>p.id===id),length=cycleWindow(pattern).length;
  const cycles=Math.floor(4000/length);
  const rows={};
  for(const stableAfter of [64,65]) rows[stableAfter]=(await analyzePatternCycles(pattern,
    {...DEFAULT_ECONOMY,stableAfter},{cycles})).rows;
  let holdoutWindows=0,holdoutBirths=0,holdoutMaturations=0;
  for(const [i,row] of rows[64].entries()){
    if(row.from<=512)continue;
    let totalB=0,totalM=0;
    for(let age=row.from;age<=row.to;age++){
      const g=age-1;
      if(id==='stalk'){
        totalB+=trace[g%24][0];
        totalM+=trace[63+(g-63)%8][1];
      }else if(id==='gun20'){
        totalB+=trace[g%20][0]+Math.floor(g/20)*(g%2===0?6:4);
      }else totalB+=trace[g%2][0];
    }
    const exactM=row.maintenanceCellTurns-rows[65][i].maintenanceCellTurns;
    assert.equal(row.births,totalB,id+' births at '+row.from);
    assert.equal(exactM,totalM,id+' maturation at '+row.from);
    holdoutWindows++;holdoutBirths+=totalB;holdoutMaturations+=totalM;
  }
  checks.push({id,lastGeneration:cycles*length,window:length,holdoutWindows,holdoutBirths,holdoutMaturations});
}
writeFileSync(new URL('./physics-holdout.json',import.meta.url),JSON.stringify(checks));
console.log(checks);
