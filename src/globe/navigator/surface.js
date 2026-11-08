import { $, cv } from '../../layout/elements.js';

// The 3D world is now a navigator, not an alternative main-game view.
const globeTarget = {
  getBoundingClientRect: () =>
    $('br-globe-target')?.getBoundingClientRect() || cv.getBoundingClientRect(),
}; // Current miniature or maximized 3D surface.
const navigatorView = { dirty: true, lastDraw: 0, expanded: false, pointer: null };
const fallbackMini = document.createElement('canvas');
fallbackMini.id = 'br-mini-fallback';
fallbackMini.setAttribute('aria-hidden', 'true');

export { fallbackMini, globeTarget, navigatorView };
