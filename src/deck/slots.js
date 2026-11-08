import { fieldKit } from './field-kit.js';

export const slotIds = Object.keys(fieldKit);
export const SLOT_COUNT = slotIds.length;
export let selectedSlot=0;
export function selectSlot(index) {
  if (!Number.isInteger(index)||index<0||index>=SLOT_COUNT) return false;
  selectedSlot=index;return true;
}
export function assignSlot(index,patternId,allPatterns) {
  if (!Number.isInteger(index)||index<0||index>=SLOT_COUNT ||
      !allPatterns.some(p=>p.id===patternId)) return false;
  slotIds[index]=patternId;return true;
}

let slotPicker = () => {};
export function registerSlotPicker(open) { slotPicker = open; }
export function requestSlotPicker(slot) { slotPicker(slot); }
