import { world } from '../../browser/world-state.js';
import { cv, ev } from '../../layout/elements.js';
import { hit, within } from '../../map/hit-test.js';
import { editorHit } from './canvas.js';
import { markEdited } from './selection.js';
import { countStamp } from './stamp-grid.js';
import { stampAt } from '../placement/plant.js';

function bindEditorGestures() {
  ev.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const pos = editorHit(e.clientX, e.clientY);
    if (!pos) return;
    ev.setPointerCapture(e.pointerId);
    world.editorDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, start: pos, moved: false };
  });
  ev.addEventListener('pointermove', (e) => {
    const p = world.editorDrag;
    if (!p || p.id !== e.pointerId) return;
    if (Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y) > 8) p.moved = true;
    const r = cv.getBoundingClientRect();
    if (within(r, e.clientX, e.clientY) && world.view === 'flat') {
      world.hover = hit(e.clientX, e.clientY);
      world.needsDraw = true;
    } else if (p.moved) {
      world.hover = null;
      world.needsDraw = true;
    }
  });
  ev.addEventListener('pointerup', (e) => {
    const p = world.editorDrag;
    if (!p || p.id !== e.pointerId) return;
    if (
      p.moved &&
      world.view === 'flat' &&
      within(cv.getBoundingClientRect(), e.clientX, e.clientY)
    ) {
      const anchor = hit(e.clientX, e.clientY);
      if (anchor) stampAt(anchor);
      world.hover = null;
    } else if (!p.moved && within(ev.getBoundingClientRect(), e.clientX, e.clientY)) {
      const pos = editorHit(e.clientX, e.clientY);
      if (pos) {
        const i = pos.r * world.stampN + pos.c;
        world.stamp[i] ^= 1;
        countStamp();
        markEdited();
        world.needsEditor = true;
      }
    }
    world.editorDrag = null;
    world.needsDraw = true;
  });
  ev.addEventListener('pointercancel', () => {
    world.editorDrag = null;
    world.hover = null;
  });
}

export { bindEditorGestures };
