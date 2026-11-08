// Pilot: a cell earns once on reaching age A; each natural birth costs energy.
// Cells that die and regrow must mature again. The board is used only for calibration.
import {writeFile} from 'node:fs/promises';
import {atlasPatterns} from '../../../src/patterns/atlas-data.js';
import {analyzePatternCycles, cycleWindow} from '../../../src/patterns/cycle-economy.js';
import {DEFAULT_ECONOMY} from '../../../src/match/constructive-economy.js';

const maturity=64, reward=8;
const result=[];
for (const pattern of atlasPatterns) {
  const w=cycleWindow(pattern).length;
  const cycles=Math.max(8, Math.ceil(480/w));
  // At the very same physical step, #{age>=A} - #{age>=A+1} = #{age==A}.
  const run=age=>analyzePatternCycles(pattern,{...DEFAULT_ECONOMY,stableAfter:age},{cycles});
  const a=await run(maturity), b=await run(maturity+1);
  // With stamped age one, only original cells have age 64 at generation 63.
  const seedProbe={...pattern,period:1};
  const at63=async age=>(await analyzePatternCycles(seedProbe,{...DEFAULT_ECONOMY,stableAfter:age},{cycles:63})).rows.at(-1).maintenanceCellTurns;
  const stampedAt63=await at63(64)-await at63(65);
  const blocks=a.rows.map((row,i)=>{
    const matured=row.maintenanceCellTurns-b.rows[i].maintenanceCellTurns;
    return {start:row.from,end:row.to,matured,births:row.births,net:reward*matured-row.births};
  });
  const late=blocks.slice(-Math.floor(blocks.length/2));
  const generations=late.length*w;
  const sum=k=>late.reduce((n,row)=>n+row[k],0);
  // Include the cost of the initial stamp. Positive net at a block boundary
  // can expose a transient subsidy even when the steady flow is negative.
  const peakAfterStamp={};
  for(const k of [8,12,32,129,384]){
    let balance=-10*pattern.cells, peak=balance, generation=0;
    for(const block of blocks){
      const manual=block.start<=63 && block.end>=63 ? stampedAt63 : 0;
      balance+=k*(block.matured-manual)-block.births;
      if(balance>peak){peak=balance;generation=block.end;}
    }
    peakAfterStamp[k]={energy:peak,generation};
  }
  result.push({id:pattern.id,name:pattern.name,group:pattern.group,window:w,generations:a.generations,
    lateFrom:late[0].start,lateCreditsPerG:sum('matured')/generations,
    lateBirthsPerG:sum('births')/generations,lateNet:sum('net')/generations,
    stampedAt63,peakAfterStamp,earlyNet:blocks.slice(0,Math.ceil(64/w)).reduce((n,row)=>n+row.net,0),
    ...(new Set(['stalk','p2','glider','gun20']).has(pattern.id)?{blocks}:{}),
  });
}
await writeFile(process.argv[2]??'maturation.json',JSON.stringify({maturity,reward,patterns:result},null,1)+'\n');
