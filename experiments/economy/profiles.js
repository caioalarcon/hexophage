import { CALLAHAN } from '../../src/simulation/rules.js';
import { atlasPatterns } from '../../src/patterns/atlas-data.js';
import { analyzePatternCycles, cycleWindow } from '../../src/patterns/cycle-economy.js';
import { studyEconomy } from './study-baseline.js';

// Rates describe an isolated, funded lineage. A live cell is either a newborn
// or a survivor charged at the study's age threshold of two.
function sample(row, length) {
  const births = row.births / length, upkeep = row.stableCellTurns / length;
  return [births, upkeep, row.fixedCore, births + upkeep];
}

function average(rows) {
  return rows[0].map((_, j) => rows.reduce((sum, values) => sum + values[j], 0) / rows.length);
}

// Train on the first half, then require agreement on every held-out block.
// Blocks combine phases when an atlas window is shorter than a full repeat.
function project(rows, length) {
  for (const skip of [0, 1]) {
    for (const block of [1, 2, 3, 4, 6, 12, 21]) {
      const windows = [];
      for (let i = skip; i + block <= rows.length; i += block) windows.push(average(rows.slice(i, i + block)));
      if (windows.length < 4) continue;
      const train = Math.floor(windows.length / 2), interval = block * length;
      const slope = windows[0].map((first,j) => (windows[train - 1][j] - first) / ((train - 1) * interval));
      if (!windows.every((values, i) => values.every((v,j) => Math.abs(v - windows[0][j] - i * interval * slope[j]) < 1e-7))) continue;
      // Mean at window start. For a multi-window block, undo the shift of the
      // average within that block. A skipped initial transient is documented.
      const base = windows[0].map((v,j) => v - (skip + (block - 1) / 2) * length * slope[j]);
      return { base, slope, block, skip };
    }
  }
}

export async function generateProfiles() {
  const profiles = [];
  for (const pattern of atlasPatterns) {
    const { id, name, group, period, cells } = pattern;
    const window = cycleWindow(pattern).length;
    const cycles = period ? 8 : group === 'interação' || id === 'stalk' ? 128 : 24;
    const { rows, workingCapital, paybackGeneration } = await analyzePatternCycles(pattern, studyEconomy, { cycles, physics: CALLAHAN });
    const observations = rows.map(r => sample(r, window));
    const fit = project(observations, window);
    const [births, upkeep, windowCore, live] = fit?.base ?? average(observations);
    const [birthsSlope, upkeepSlope, coreSlope, liveSlope] = fit?.slope ?? [0,0,0,0];
    // A translating ship can overlap its footprint for one short window
    // (P15 has two such coordinates), but none travels with a fixed mint.
    const core = group === 'nave' ? 0 : windowCore;
    const reliability = !fit ? 'observation-only' : fit.slope.some(v => v !== 0) ? 'observed-affine' : 'observed-period-average';
    profiles.push({ id,name,group,cells,period,window,births,upkeep,core,live,meanLive:live,net:births-upkeep,
      runway:workingCapital,paybackGeneration,emitter:group === 'gerador' && birthsSlope > 0, mobile:group === 'nave',
      birthsSlope,upkeepSlope,coreSlope,liveSlope,netSlope:birthsSlope-upkeepSlope,
      usable:Boolean(fit),reliability,cycles:rows.length,fitBlock:fit?.block ?? null,skip:fit?.skip ?? null });
  }
  return profiles;
}
