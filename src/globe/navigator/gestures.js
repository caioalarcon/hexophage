import { world } from '../../browser/world-state.js';
import { rotateGlobeFromDrag } from '../camera/drag.js';
import { closestVisibleCell } from '../camera/picking.js';
import { zoomGlobe } from '../camera/zoom.js';
import { openFullGlobe } from './fullscreen.js';
import { navigatorView } from './surface.js';
import { toast } from '../../layout/announcements.js';
import { moveCenterTo } from '../../map/camera/pan.js';
import { chooseEast } from '../../map/camera/world-point.js';

function setupMiniGlobeEvents(target) {
  let drag = null,
    pinch = null;
  const touches = new Map();
  const two = () => {
    const [a, b] = touches.values();
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
    };
  };
  target.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    target.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch') touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) {
      pinch = navigatorView.expanded ? two() : null;
      drag = null;
      navigatorView.pointer = null;
      return;
    }
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      arcball: null,
    };
    navigatorView.pointer = drag;
  });
  target.addEventListener('pointermove', (e) => {
    if (touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && navigatorView.expanded && touches.size === 2) {
        const now = two();
        zoomGlobe(now.d / pinch.d, now.x, now.y, pinch.x, pinch.y);
        pinch = now;
        navigatorView.dirty = true;
        return;
      }
    }
    if (!drag || drag.id !== e.pointerId) return;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (!drag.moved && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > 5)
      drag.moved = true;
    if (drag.moved) {
      rotateGlobeFromDrag(drag);
      navigatorView.dirty = true;
    }
  });
  target.addEventListener('pointerup', (e) => {
    touches.delete(e.pointerId);
    if (pinch) {
      if (touches.size < 2) pinch = null;
      drag = null;
      navigatorView.pointer = null;
      return;
    }
    if (drag?.id === e.pointerId && !drag.moved) {
      const id = closestVisibleCell(e.clientX, e.clientY);
      if (id !== null) {
        const g = world.graph,
          selected = g.deg[id] === 5 ? g.adj[id * 6] : id;
        if (moveCenterTo(selected, chooseEast(selected))) {
          if (navigatorView.expanded) openFullGlobe(false);
          toast('Região selecionada no mini-mundo.');
        }
      }
    }
    drag = null;
    navigatorView.pointer = null;
    navigatorView.dirty = true;
  });
  target.addEventListener('pointercancel', (e) => {
    touches.delete(e.pointerId);
    pinch = null;
    drag = null;
    navigatorView.pointer = null;
  });
  target.addEventListener(
    'wheel',
    (e) => {
      if (!navigatorView.expanded) return;
      e.preventDefault();
      zoomGlobe(Math.exp(-e.deltaY * 0.0012), e.clientX, e.clientY);
      navigatorView.dirty = true;
    },
    { passive: false },
  );
}

export { setupMiniGlobeEvents };
