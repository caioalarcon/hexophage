// From the repository root: node experiments/economy/stability-atlas.mjs > experiments/economy/stability-atlas.csv
// Sample at least two complete cycles, ending on or after generation 1200.
// Each isolated seed is funded: workingCapital is the largest deficit after
// purchase over the full observation. Blank paybackGen means no observed return.
import { DEFAULT_ECONOMY } from '../../src/match/constructive-economy.js';
import { atlasPatterns } from '../../src/patterns/atlas-data.js';
import { analyzePatternCycles, cycleWindow } from '../../src/patterns/cycle-economy.js';

const header = ['id', 'family', 'cells', 'stampCost', 'workingCapital', 'paybackGen',
  'firstTo', 'firstNetPerGen', 'near200To', 'near200NetPerGen',
  'lastFrom', 'lastTo', 'lastIncomePerGen', 'lastDrainPerGen',
  'lastNetPerGen', 'balanceAfterStamp'];
console.log(header.join(','));
for (const pattern of atlasPatterns) {
  const { length } = cycleWindow(pattern);
  const cycles = Math.max(2, Math.ceil(1200 / length));
  const { rows, initialCost, workingCapital, paybackGeneration } =
    await analyzePatternCycles(pattern, DEFAULT_ECONOMY, { cycles });
  const first = rows[0], near200 = rows.find(row => row.to >= 200), last = rows.at(-1);
  const perGen = total => Number((total / length).toFixed(4));
  console.log([pattern.id, pattern.group, pattern.cells, initialCost, workingCapital,
    paybackGeneration, first.to, perGen(first.net), near200.to, perGen(near200.net),
    last.from, last.to, perGen(last.income),
    perGen(last.upkeep), perGen(last.net), last.cumulative].join(','));
}
