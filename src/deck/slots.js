import { DEFAULT_RULE, resolveRuleProfile } from '../match/rule-profiles.js';

export const slotIds = Object.keys(resolveRuleProfile().gameplay.kit);
export let SLOT_COUNT = slotIds.length;
export let selectedSlot = 0;
let scope = DEFAULT_RULE;
const loadouts = new Map();

export function useSlots(gameplay, key) {
  if (key === scope) return;
  loadouts.set(scope, { ids: [...slotIds], selectedSlot });
  scope = key;
  const saved = loadouts.get(key);
  slotIds.splice(0, slotIds.length, ...(saved?.ids ?? gameplay.initialSlots ?? Object.keys(gameplay.kit)));
  SLOT_COUNT = slotIds.length;
  selectedSlot = saved?.selectedSlot ?? 0;
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
  return true;
}

let slotPicker = () => {};
export function registerSlotPicker(open) { slotPicker = open; }
export function requestSlotPicker(slot) { slotPicker(slot); }
