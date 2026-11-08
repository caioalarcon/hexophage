import { world } from '../../browser/world-state.js';
import { navigatorView } from './surface.js';
import { $ } from '../../layout/elements.js';

function openFullGlobe(open) {
  const overlay = $('br-globe-overlay'),
    target = $('br-globe-target');
  navigatorView.expanded = !!open;
  if (open) {
    overlay.hidden = false;
    $('br-full-slot').append(target);
    world.globeZoom = 1;
    $('br-globe-close').focus({ preventScroll: true });
  } else {
    $('br-mini-slot').append(target);
    overlay.hidden = true;
    world.globeZoom = 1;
  }
  navigatorView.dirty = true;
  world.needsDraw = true;
  $('br-globe-zoom-reset').textContent = '100%';
}

export { openFullGlobe };
