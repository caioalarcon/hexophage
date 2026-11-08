import { world } from '../browser/world-state.js';
import { mountGlobeNavigator } from '../globe/navigator/controls.js';
import { openFullGlobe } from '../globe/navigator/fullscreen.js';
import { setupMiniGlobeEvents } from '../globe/navigator/gestures.js';
import { navigatorView } from '../globe/navigator/surface.js';
import { $ } from './elements.js';
import { bindRankingControls } from '../match/hud/ranking.js';

function setupRealLayout() {
  const rail = $('br-rail'),
    top = document.querySelector('.br-top'),
    controls = document.querySelector('.hl-controls');
  $('br-rail-controls').append(controls);
  $('br-rail-rank-slot').append(document.querySelector('.br-scoreboard'));

  const target = mountGlobeNavigator();
  bindRankingControls();
  const portrait = matchMedia('(orientation:portrait)');
  // The portrait HUD has no room for a permanent slider. Move the same live
  // speed control into the settings menu; never duplicate its simulation state.
  const speedControl = $('hl-speed').closest('.br-speed-knob');
  const liveTuning = document.querySelector('.br-live-tuning');
  const advanced = $('br-advanced-tuning');
  const placeSpeedControl = () => {
    if (portrait.matches) advanced.prepend(speedControl);
    else liveTuning.append(speedControl);
  };
  placeSpeedControl();
  portrait.addEventListener('change', placeSpeedControl);
  const applyPortrait = () => {
    if (portrait.matches) {
      $('br-mini-panel').classList.add('collapsed');
      $('br-mini-toggle').textContent = '🌐';
      $('br-mini-toggle').setAttribute('aria-expanded', 'false');
    } else {
      $('br-mini-panel').classList.remove('collapsed');
      $('br-mini-toggle').textContent = '−';
      $('br-mini-toggle').setAttribute('aria-expanded', 'true');
    }
    navigatorView.dirty = true;
  };
  applyPortrait();
  portrait.addEventListener('change', applyPortrait);
  const observer = new ResizeObserver(() => {
    navigatorView.dirty = true;
    world.needsDraw = true;
  });
  observer.observe(rail);
  observer.observe($('br-mini-slot'));
  observer.observe($('br-full-slot'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navigatorView.expanded) openFullGlobe(false);
  });
  setupMiniGlobeEvents(target);
  // There is no alternating main viewport; retain the original map viewport at all times.
  world.view = 'flat';
}

export { setupRealLayout };
