import { energyCost, generationEnergy, initialEnergy } from '../match/constructive-economy.js';
import { advancePattern, seedPatternAges } from './planar-simulation.js';

export { advancePattern, patternOffset, seedPatternAges } from './planar-simulation.js';

export function cycleWindow(pattern) {
  if (pattern.period > 0) return { length: pattern.period, kind: 'period' };
  if (pattern.emissionWindow) return { length: pattern.emissionWindow, kind: 'emission' };
  return { length: 20, kind: 'window' };
}

export class AnalysisLimit extends Error {}

// Fund the seed through the full observation so its intrinsic costs remain
// comparable. Separately report when the game's initial reserve would first
// fail, before any erosion could perturb the measured trajectory.
export async function analyzePatternCycles(pattern, economy, { cycles, signal, physics } = {}) {
  const { length, kind } = cycleWindow(pattern);
  // A grower first has to establish a long mature trail before it can
  // amortize its births. Ordinary periodic patterns need a shorter horizon.
  const defaultCycles = Math.max(24, Math.ceil((pattern.analysisHorizon ?? 160) / length));
  const maxGenerations = cycles == null ? 8400 : 25200;
  const observedCycles = Math.max(1, Math.min(Math.floor(cycles ?? defaultCycles), Math.floor(maxGenerations / length)));
  // Keep one coherent quote even if a slider changes while this pass yields.
  economy = { ...economy };
  const { stableAfter } = economy;
  let ages = seedPatternAges(pattern);
  const initialCost = energyCost(ages.size, economy);
  const startingReserve = initialEnergy(economy);
  const rows = [];
  const unitIncome = new Float64Array(length + 1);
  const unitUpkeep = new Float64Array(length + 1);
  let operatingBalance = 0, workingCapital = 0;
  let firstPositiveCycle = null, profitableFromCycle = null;
  let paybackGeneration = initialCost === 0 ? 0 : null;
  let firstErosionGeneration = startingReserve < initialCost ? 0 : null;
  let work = 0;
  let lastYield = performance.now();
  signal?.throwIfAborted();

  for (let cycle = 1; cycle <= observedCycles; cycle++) {
    const from = (cycle - 1) * length + 1, to = cycle * length;
    let births = 0, stableCellTurns = 0, income = 0, upkeep = 0;
    for (let generation = from; generation <= to; generation++) {
      work += ages.size;
      if (ages.size > 20000 || work > 20000000)
        throw new AnalysisLimit('Análise interrompida na geração ' + (generation - 1) +
          ' (' + ages.size.toLocaleString('pt-BR') + ' células vivas). Limite de simulação do atlas.');
      const turn = advancePattern(ages, stableAfter, physics);
      ages = turn.next;
      births += turn.births;
      stableCellTurns += turn.mature;
      const flow = generationEnergy(turn.births, turn.mature, economy);
      income += flow.income;
      upkeep += flow.upkeep;
      const step = generation - from + 1;
      // Attribute the effect of mature cells while holding actual births fixed.
      const birthsOnly = generationEnergy(turn.births, 0, economy);
      unitIncome[step] = unitIncome[step - 1] + (turn.mature ? (flow.income - birthsOnly.income) / turn.mature : 0);
      unitUpkeep[step] = unitUpkeep[step - 1] + (turn.mature ? (flow.upkeep - birthsOnly.upkeep) / turn.mature : 0);
      operatingBalance += flow.income - flow.upkeep;
      workingCapital = Math.max(workingCapital, -operatingBalance);
      if (paybackGeneration === null && operatingBalance >= initialCost) paybackGeneration = generation;
      if (firstErosionGeneration === null && startingReserve - initialCost + operatingBalance < -1e-9) {
        firstErosionGeneration = generation;
      }
      if (performance.now() - lastYield >= 10) {
        await new Promise(resolve => setTimeout(resolve, 0));
        signal?.throwIfAborted();
        lastYield = performance.now();
      }
    }
    // End age > window length means this exact position never died in the
    // window, including at its starting boundary. During warm-up, only the
    // generations after it reaches the selected age earn income.
    let owned = 0, fixedCore = 0, fixedIncome = 0, fixedUpkeep = 0;
    for (const age of ages.values()) {
      if (age > 0) owned++;
      if (age <= length) continue;
      fixedCore++;
      const productiveTurns = Math.min(length, Math.max(0, age - Math.max(1, stableAfter) + 1));
      fixedIncome += unitIncome[length] - unitIncome[length - productiveTurns];
      fixedUpkeep += unitUpkeep[length] - unitUpkeep[length - productiveTurns];
    }
    const net = income - upkeep;
    if (net > 0) {
      firstPositiveCycle ??= cycle;
      profitableFromCycle ??= cycle;
    } else profitableFromCycle = null;
    rows.push({ cycle, from, to, births, stableCellTurns, income, upkeep, fixedCore, fixedIncome, fixedUpkeep,
      net, cumulative: operatingBalance - initialCost, live: owned });
  }
  return { cycleLength: length, kind, generations: observedCycles * length, initialCost, workingCapital,
    firstPositiveCycle, profitableFromCycle, paybackGeneration, firstErosionGeneration, rows };
}
