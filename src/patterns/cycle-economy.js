import { energyCost, generationEnergy, initialEnergy } from '../match/constructive-economy.js';
import { initRuleTables } from '../simulation/rules.js';
import { createSimulationState } from '../simulation/state.js';
import { DIR } from '../world/geometry.js';
import { decodeRLE } from './rle.js';

// An emitter repeats its mechanism while its descendants keep moving. The P43/86
// mechanism has a two-pulse, 86-generation window.
const emissionWindows = new Map([
  ['gun20', 20], ['gun42', 42], ['gun43', 86],
  ['gun200', 200], ['gun210', 210], ['gun840', 840],
]);

export function cycleWindow(pattern) {
  if (pattern.period > 0) return { length: pattern.period, kind: 'period' };
  if (emissionWindows.has(pattern.id)) return { length: emissionWindows.get(pattern.id), kind: 'emission' };
  return { length: 20, kind: 'window' };
}

// With at most 25,200 steps, even cells moving one position every generation
// have disjoint keys on different axial columns. There are no wrapping edges.
const stride = 65536;
const adjacent = DIR.map(([q, r]) => q * stride + r);
const rules = createSimulationState();
initRuleTables(rules);

export function patternOffset(id) {
  const q = Math.round(id / stride);
  return [q, id - q * stride];
}

export function seedPatternAges(pattern) {
  return new Map(decodeRLE(pattern.rle).map(([q, r]) => [q * stride + r, 1]));
}

export function advancePattern(ages, threshold) {
  const masks = new Map();
  for (const id of ages.keys()) {
    for (let k = 0; k < adjacent.length; k++) {
      const target = id - adjacent[k];
      masks.set(target, (masks.get(target) || 0) | (1 << k));
    }
  }
  const next = new Map();
  let births = 0, mature = 0;
  for (const [id, mask] of masks) {
    const age = ages.get(id) || 0;
    if (!(age ? rules.callSurv6 : rules.callBirth6)[mask]) continue;
    next.set(id, age + 1);
    if (age === 0) births++;
    if (age + 1 >= threshold) mature++;
  }
  return { next, births, mature };
}

// Fund the seed through the full observation so its intrinsic costs remain
// comparable. Separately report when the game's initial reserve would first
// fail, before any erosion could perturb the measured trajectory.
export async function analyzePatternCycles(pattern, economy, { cycles, signal } = {}) {
  const { length, kind } = cycleWindow(pattern);
  const defaultCycles = Math.max(24, Math.ceil(160 / length));
  const maxGenerations = cycles == null ? 8400 : 25200;
  const observedCycles = Math.max(1, Math.min(Math.floor(cycles ?? defaultCycles), Math.floor(maxGenerations / length)));
  // Keep one coherent quote even if a slider changes while this pass yields.
  economy = { ...economy };
  const { stableAfter } = economy;
  let ages = seedPatternAges(pattern);
  const initialCost = energyCost(ages.size, economy);
  const startingReserve = initialEnergy(economy);
  const rows = [];
  let operatingBalance = 0, workingCapital = 0;
  let firstPositiveCycle = null, profitableFromCycle = null;
  let paybackGeneration = initialCost === 0 ? 0 : null;
  let firstErosionGeneration = startingReserve < initialCost ? 0 : null;
  let lastYield = performance.now();
  signal?.throwIfAborted();

  for (let cycle = 1; cycle <= observedCycles; cycle++) {
    const from = (cycle - 1) * length + 1, to = cycle * length;
    let births = 0, stableCellTurns = 0;
    for (let generation = from; generation <= to; generation++) {
      const turn = advancePattern(ages, stableAfter);
      ages = turn.next;
      births += turn.births;
      stableCellTurns += turn.mature;
      const flow = generationEnergy(turn.births, turn.mature, economy);
      operatingBalance += flow.income - flow.upkeep;
      workingCapital = Math.max(workingCapital, -operatingBalance);
      if (paybackGeneration === null && operatingBalance >= initialCost) paybackGeneration = generation;
      if (firstErosionGeneration === null && startingReserve - initialCost + operatingBalance < 0) {
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
    let fixedCore = 0, fixedIncome = 0;
    for (const age of ages.values()) {
      if (age <= length) continue;
      fixedCore++;
      const productiveTurns = Math.min(length, Math.max(0, age - Math.max(1, stableAfter) + 1));
      fixedIncome += generationEnergy(0, productiveTurns, economy).income;
    }
    const { income, upkeep } = generationEnergy(births, stableCellTurns, economy);
    const net = income - upkeep;
    if (net > 0) {
      firstPositiveCycle ??= cycle;
      profitableFromCycle ??= cycle;
    } else profitableFromCycle = null;
    rows.push({ cycle, from, to, births, stableCellTurns, income, upkeep, fixedCore, fixedIncome,
      net, cumulative: operatingBalance - initialCost, live: ages.size });
  }
  return { cycleLength: length, kind, generations: observedCycles * length, initialCost, workingCapital,
    firstPositiveCycle, profitableFromCycle, paybackGeneration, firstErosionGeneration, rows };
}
