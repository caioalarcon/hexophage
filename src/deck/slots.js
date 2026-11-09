import { DEFAULT_RULE, resolveRuleProfile } from '../match/rule-profiles.js';
import { DEFAULT_ECONOMY } from '../match/constructive-economy.js';
import { estimateEconomicReturn, rankEconomicPatterns } from '../patterns/economic-ranking.js';

function defaultSlots(gameplay, ruleId, economy) {
  const curated = gameplay.initialSlots ?? Object.keys(gameplay.kit);
  const count = curated.length;
  const ranked = rankEconomicPatterns(gameplay.patterns, ruleId, economy);
  const selected = new Set(curated);
  // The economic shortlist changes the order of the hand, but must not remove
  // indispensable starter cards (e.g. Bays's glider and flipper). Reserve up
  // to four slots for new positive-return discoveries while retaining breadth.
  if (ruleId !== 'callahan') {
    const pinned = new Set(gameplay.patterns.slice(0, 2).map(p => p.id));
    const profitable = ranked.filter(pattern => {
      const estimate = estimateEconomicReturn(ruleId, pattern, economy);
      return estimate?.feasible && estimate.flow > 0;
    }).slice(0, Math.min(4, count));
    for (const pattern of profitable) {
      if (selected.has(pattern.id)) continue;
      const worst = [...ranked].reverse().find(p => selected.has(p.id) && !pinned.has(p.id));
      if (!worst) break;
      selected.delete(worst.id);
      selected.add(pattern.id);
    }
  }
  return ranked.filter(pattern => selected.has(pattern.id))
    .slice(0, count).map(pattern => pattern.id);
}

const openingProfile = resolveRuleProfile();
export const slotIds = defaultSlots(openingProfile.gameplay, DEFAULT_RULE, openingProfile.economy);
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
