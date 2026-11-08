import { world } from '../browser/world-state.js';
import { $ } from './elements.js';

function toast(s) {
  world.notify = s;
  world.notifyAt = performance.now();
  $('hl-feedback').textContent = s;
}

export { toast };
