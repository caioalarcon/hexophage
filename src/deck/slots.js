import { DEFAULT_RULE, resolveRuleProfile } from '../match/rule-profiles.js';
import { DEFAULT_ECONOMY } from '../match/constructive-economy.js';
import { estimateEconomicReturn, rankEconomicPatterns } from '../patterns/economic-ranking.js';

function defaultSlots(gameplay, ruleId, economy) {
  const curated = gameplay.initialSlots ?? Object.keys(gameplay.kit);
  const count = curated.length;
  const eligible = new Set(curated);
  // Preserve Callahan's deliberately curated 15-card combat hand. Other rules
  // add profitable seeds discovered by the census without losing the original
  // family-based mix of offensive, defensive and exploratory cards.
  if (ruleId !== 'callahan')
    for (const pattern of gameplay.patterns) {
      const estimate = estimateEconomicReturn(ruleId, pattern, economy);
      if (estimate?.feasible && estimate.flow > 0) eligible.add(pattern.id);
    }
  return rankEconomicPatterns(gameplay.patterns.filter(p => eligible.has(p.id)), ruleId, economy)
    .slice(0, count).map(pattern => pattern.id);
}

export const slotIds = defaultSlots(resolveRuleProfile().gameplay, DEFAULT_RULE, DEFAULT_ECONOMY);
export let SLOT_COUNT = slotIds.length;
export let selectedSlot = 0;
let scope = DEFAULT_RULE;
const loadouts = new Map(), edited = new Set();

export function useSlots(gameplay, key, ruleId = key, economy = DEFAULT_ECONOMY) {
  const defaults = defaultSlots(gameplay, ruleId, economy);
  if (key === scope) {
    // Tariff changes reprice untouched default hands, not a user's choices.
    if (!edited.has(key)) {
      slotIds.splice(0, slotIds.length, ...defaults);
      SLOT_COUNT = slotIds.length;
      selectedSlot = Math.min(selectedSlot, SLOT_COUNT - 1);
    }
    return;
  }
  loadouts.set(scope, { ids: [...slotIds], selectedSlot });
  scope = key;
  const saved = loadouts.get(key);
  slotIds.splice(0, slotIds.length, ...(saved && edited.has(key) ? saved.ids : defaults));
  SLOT_COUNT = slotIds.length;
  selectedSlot = Math.min(saved?.selectedSlot ?? 0, SLOT_COUNT - 1);
}

export function selectSlot(index) {
  if (!Number.isInteger(index) || index < 0 || index >= SLOT_COUNT) return false;
  selectedSlot = index;
  return true;
}
export function assignSlot(index, patternId, catalog) {
  if (!Number.isInteger(index) || index < 0 || index >= SLOT_COUNT ||
      !catalog.some(p => p.id === patternId)) return false;
  slotIds[index] = patternId;
  edited.add(scope);
  return true;
}

let slotPicker = () => {};
export function registerSlotPicker(open) { slotPicker = open; }
export function requestSlotPicker(slot) { slotPicker(slot); }
