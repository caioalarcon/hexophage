import { world } from '../../browser/world-state.js';
import { zoomGlobe } from '../camera/zoom.js';
import { openFullGlobe } from './fullscreen.js';
import { fallbackMini, navigatorView } from './surface.js';
import { $, gpuCanvas } from '../../layout/elements.js';

function mountGlobeNavigator() {
  const g = $('br-mini-slot'),
    target = document.createElement('div');
  target.className = 'br-globe-slot';
  target.id = 'br-globe-target';
  target.setAttribute(
    'aria-label',
    'Arraste para girar o mundo; clique para centralizar a janela plana',
  );
  target.append(fallbackMini, gpuCanvas);
  g.append(target);
  $('br-mini-toggle').onclick = () => {
    const p = $('br-mini-panel'),
      collapsed = p.classList.toggle('collapsed');
    $('br-mini-toggle').textContent = collapsed ? '+' : '−';
    $('br-mini-toggle').setAttribute('aria-expanded', String(!collapsed));
    navigatorView.dirty = true;
  };
  $('br-mini-max').onclick = () => openFullGlobe(true);
  $('br-globe-close').onclick = () => openFullGlobe(false);
  const controlZoom = (factor) => {
    const r = $('br-globe-target').getBoundingClientRect();
    zoomGlobe(factor, r.left + r.width / 2, r.top + r.height / 2);
    navigatorView.dirty = true;
  };
  $('br-globe-zoom-in').onclick = () => controlZoom(1.4);
  $('br-globe-zoom-out').onclick = () => controlZoom(1 / 1.4);
  $('br-globe-zoom-reset').onclick = () => controlZoom(1 / world.globeZoom);
  return target;
}

export { mountGlobeNavigator };
