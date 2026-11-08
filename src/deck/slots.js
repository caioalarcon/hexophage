// Fifteen configurable slots, persistent while a match runs. IDs resolve through
// the Callahan atlas; slot zero always starts with the three-cell P2 flipper.
export const SLOT_COUNT=15;
export const slotIds=[
  'p2','censo-oscillator-5-p2-1','p4f','censo-oscillator-6-p2-1',
  'censo-oscillator-6-p2-2','p8f','glider','censo-oscillator-7-p2-1',
  'censo-oscillator-8-p2-1','p48','p42rot','p42','p14','gun20','gun42',
];
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
