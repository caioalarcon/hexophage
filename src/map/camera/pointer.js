import { world } from '../../browser/world-state.js';
import { rotateGlobeFromDrag } from '../../globe/camera/drag.js';
import { closestVisibleCell } from '../../globe/camera/picking.js';
import { zoomGlobe } from '../../globe/camera/zoom.js';
import { toast } from '../../layout/announcements.js';
import { cv } from '../../layout/elements.js';
import { atlasPan, syncLocalFromAtlas } from '../atlas/camera.js';
import { toggleView } from './orientation.js';
import { moveCenterTo, panBy } from './pan.js';
import { chooseEast } from './world-point.js';
import { zoom } from './zoom.js';
import { hit } from '../hit-test.js';
import { stampAt } from '../../patterns/placement/plant.js';
import { clamp } from '../../world/geometry.js';

// Trackpads can send several wheel events between two paints. Apply their
// combined scale once to keep graph construction off the input event path.
let queuedWheel = null;
function flushWheel() {
  const move = queuedWheel;
  queuedWheel = null;
  if (!move || move.graph !== world.graph || move.view !== world.view) return;
  zoom(Math.exp(clamp(move.logScale, -30, 30)), move.x, move.y);
  if (!move.hover) world.hover = null;
}

function bindMapGestures() {
  let cursorX = NaN,
    cursorY = NaN;
  const touches = new Map();
  let pinch = null;
  function touchPair() {
    const [a, b] = touches.values();
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      d: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
    };
  }
  cv.addEventListener('pointerdown', (e) => {
    flushWheel();
    if (e.button !== 0) return;
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cv.setPointerCapture(e.pointerId);
      if (touches.size >= 2) {
        pinch = touchPair();
        world.drag = null;
        world.hover = null;
        world.needsDraw = true;
        return;
      }
    }
    if (world.drag) return;
    cv.setPointerCapture(e.pointerId);
    world.drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  });
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') {
      cursorX = e.clientX;
      cursorY = e.clientY;
    }
    if (touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch) {
        if (touches.size >= 2) {
          const next = touchPair();
          const factor = next.d / pinch.d;
          if (world.view === 'globe') zoomGlobe(factor, next.x, next.y, pinch.x, pinch.y);
          else {
            if (!world.chart) atlasPan(pinch.x, pinch.y, next.x, next.y);
            else panBy(next.x - pinch.x, next.y - pinch.y);
            zoom(factor, next.x, next.y);
          }
          pinch = next;
          world.hover = null;
          world.needsDraw = true;
        }
        return;
      }
    }
    const p = world.drag;
    if (p && p.id === e.pointerId) {
      let dx = e.clientX - p.x,
        dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (!p.moved && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 4) {
        dx = e.clientX - p.startX;
        dy = e.clientY - p.startY;
        p.moved = true;
        cv.style.cursor = 'grabbing';
      }
      if (p.moved) {
        if (world.view === 'globe') rotateGlobeFromDrag(p);
        else if (world.chart) panBy(dx, dy);
        else {
          atlasPan(p.x - dx, p.y - dy, p.x, p.y);
          world.needsDraw = true;
        }
      }
    }
    if (world.view === 'flat') {
      world.hover = !p?.moved ? hit(e.clientX, e.clientY) : null;
      world.needsDraw = true;
    }
  });
  cv.addEventListener('pointerup', (e) => {
    touches.delete(e.pointerId);
    if (pinch) {
      if (!touches.size) {
        pinch = null;
        if (world.view === 'flat' && !world.chart) syncLocalFromAtlas();
      }
      return;
    }
    const p = world.drag;
    if (!p || p.id !== e.pointerId) return;
    if (!p.moved) {
      if (world.view === 'flat') {
        const anchor = hit(e.clientX, e.clientY);
        if (anchor) stampAt(anchor);
      } else {
        const dest = closestVisibleCell(e.clientX, e.clientY);
        if (dest !== null) {
          if (world.graph.deg[dest] === 5) {
            toast('Pentágono: região proibida para a janela.');
          } else {
            toggleView();
            moveCenterTo(dest, chooseEast(dest));
          }
        }
      }
    }
    if (p.moved && world.view === 'globe') world.needsGlobeBase = true;
    if (p.moved && world.view === 'flat' && !world.chart) syncLocalFromAtlas();
    world.drag = null;
    cv.style.cursor = '';
    world.hover =
      world.view === 'flat' && e.pointerType !== 'touch' ? hit(e.clientX, e.clientY) : null;
    world.needsDraw = true;
  });
  cv.addEventListener('lostpointercapture', (e) => {
    touches.delete(e.pointerId);
    if (!touches.size) pinch = null;
    if (world.drag?.id === e.pointerId) {
      world.drag = null;
      world.hover = null;
      cv.style.cursor = '';
      world.needsDraw = true;
    }
  });
  cv.addEventListener('pointercancel', (e) => {
    touches.delete(e.pointerId);
    if (!touches.size) pinch = null;
    world.drag = null;
    world.needsGlobeBase = true;
    world.hover = null;
    cv.style.cursor = '';
    world.needsDraw = true;
  });
  cv.addEventListener('pointerleave', () => {
    cursorX = cursorY = NaN;
    if (queuedWheel) queuedWheel.hover = false;
    if (!world.drag) {
      world.hover = null;
      world.needsDraw = true;
    }
  });
  cv.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const units = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? cv.clientHeight : 1;
      if (!queuedWheel) queuedWheel = { logScale: 0, graph: world.graph, view: world.view };
      queuedWheel.logScale -= e.deltaY * units * 0.0012;
      // Wheel coordinates may be rounded while pointer events retain fractional CSS pixels.
      const same = Math.abs(cursorX - e.clientX) < 1 && Math.abs(cursorY - e.clientY) < 1;
      queuedWheel.x = same ? cursorX : e.clientX;
      queuedWheel.y = same ? cursorY : e.clientY;
      queuedWheel.hover = true;
    },
    { passive: false },
  );
}

export { bindMapGestures, flushWheel, queuedWheel };
