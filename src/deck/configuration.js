import { $ } from '../layout/elements.js';
import { openAtlasBrowser } from '../patterns/atlas-browser.js';
import { selectedSlot } from './slots.js';
export function buildDeckConfig() {
  $('br-open-atlas').onclick=()=>openAtlasBrowser(selectedSlot);
}
export function syncDeckConfig() {
  // Loadout changes are allowed during the match. Only the world size is locked.
}
