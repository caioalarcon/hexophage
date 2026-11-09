// Screen every catalog seed after a single founding flipper. No generation of
// the world/CA takes place after loadMacroProfiles has calibrated the inputs.
import { writeFile } from 'node:fs/promises';
import { loadMacroProfiles } from './macro-profiles.js';
import { simulate } from './simulator.js';
import { rules } from './scenarios.js';

const profiles = await loadMacroProfiles();
const rows = [];
for (const id of ['current','battery']) {
  const rule = rules.find(r => r.id === id);
  for (const [pattern,p] of profiles) {
    const policy = {id:pattern,start:['p2'],repeat:[pattern],fundGun:true};
    const r = simulate(profiles,rule,policy);
    const end = r.stop ?? r.firstInsolvent ?? r.checkpoints.at(-1).g;
    const last = r.checkpoints.find(point => point.g === end);
    rows.push({rule:id,pattern,name:p.name,orders:last.orders,secondOrderG:r.marks[2]??null,observedG:end,status:last.status,
      secondHalf:r.firstInsolvent != null || r.stop != null ? null : r.orders - r.atHalf,
      stop:r.stop,deficit:r.firstInsolvent,exceedsF320:r.breachedMap,bank:last.bank,burst:last.burst});
  }
}
await writeFile(process.argv[2] || 'scan-results.json', JSON.stringify(rows));
