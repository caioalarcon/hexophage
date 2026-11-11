import { world } from '../../browser/world-state.js';
import { rotateGlobeFromDrag } from '../../globe/camera/drag.js';
import { closestVisibleCell } from '../../globe/camera/picking.js';
import { zoomGlobe } from '../../globe/camera/zoom.js';
import { toast } from '../../layout/announcements.js';
import { cv } from '../../layout/elements.js';
import { atlasPan, syncLocalFromAtlas } from '../atlas/camera.js';
import { atlasMetrics } from '../atlas/viewport.js';
import { toggleView } from './orientation.js';
import { moveCenterTo, panBy } from './pan.js';
import { chooseEast } from './world-point.js';
import { zoom } from './zoom.js';
import { hit } from '../hit-test.js';
import { placementGesture, placementPreview, stampAt } from '../../patterns/placement/plant.js';
import { DX } from '../local/hex-metrics.js';
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
  let pinch = null, touchPaint = null;
  world.painting = false;
  function clearTouchPaint() {
    if(touchPaint!==null)clearTimeout(touchPaint);
    touchPaint=null;
  }
  function cancelGesture() {
    clearTouchPaint();
    touches.clear();pinch=null;
    world.drag=null;world.painting=false;world.hover=null;
    cv.style.cursor='';world.needsDraw=true;
  }
  function paintPoint(x,y) {
    const anchor=hit(x,y);
    world.hover=anchor;
    if(anchor)stampAt(anchor);
    world.needsDraw=true;
  }
  function startPaint(p) {
    clearTouchPaint();
    if(world.drag!==p || pinch || world.graph!==p.graph || world.view!=='flat' || placementGesture()!=='paint')return;
    p.mode='paint';world.painting=true;cv.style.cursor='crosshair';
    paintPoint(p.x,p.y);
  }
  function paintLine(p,x,y) {
    const fromX=p.x,fromY=p.y,anchor=hit(fromX,fromY),preview=anchor&&placementPreview(anchor);
    const pitch=world.chart?DX*world.zoom:atlasMetrics.pitch;
    // Successive circles overlap; radius-zero brushes sample below one cell.
    const spacing=Math.max(.5,pitch*Math.max(.4,(preview?.radius??0)*.5));
    const steps=Math.max(1,Math.ceil(Math.hypot(x-fromX,y-fromY)/spacing));
    let previous=null;
    for(let i=1;i<=steps;i++){
      const at=hit(fromX+(x-fromX)*i/steps,fromY+(y-fromY)*i/steps);
      const key=at&&(at.id??at.q+','+at.r);
      world.hover=at;
      if(at&&key!==previous)stampAt(at);
      previous=key;
    }
    p.x=x;p.y=y;world.needsDraw=true;
  }
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
    if (e.button !== 0 && e.button !== 1) return;
    const panOnly=e.button===1 || e.shiftKey;
    if(panOnly)e.preventDefault();
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cv.setPointerCapture(e.pointerId);
      if (touches.size >= 2) {
        clearTouchPaint();world.painting=false;
        pinch = touchPair();
        world.drag = null;
        world.hover = null;
        cv.style.cursor='';
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
      panOnly,
      graph:world.graph,
      mode:!panOnly&&world.view==='flat'&&placementGesture()==='paint'?'pending-paint':'stamp',
    };
    if(world.drag.mode==='pending-paint'){
      const p=world.drag;
      world.hover=hit(e.clientX,e.clientY);world.needsDraw=true;
      // Give a second finger time to claim a pinch before touching the field.
      if(e.pointerType==='touch')touchPaint=setTimeout(()=>startPaint(p),180);
      else startPaint(p);
    }
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
      if(p.mode==='pending-paint'&&Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>4)startPaint(p);
      if(p.mode==='paint'){
        paintLine(p,e.clientX,e.clientY);
        return;
      }
      if(p.mode==='pending-paint'){
        p.x=e.clientX;p.y=e.clientY;
        return;
      }
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
    clearTouchPaint();
    if(p.mode==='paint')paintLine(p,e.clientX,e.clientY);
    else if(p.mode==='pending-paint')paintPoint(e.clientX,e.clientY);
    else if (!p.moved && !p.panOnly) {
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
    world.painting=false;
    cv.style.cursor = '';
    world.hover =
      world.view === 'flat' && e.pointerType !== 'touch' ? hit(e.clientX, e.clientY) : null;
    world.needsDraw = true;
  });
  cv.addEventListener('lostpointercapture', (e) => {
    touches.delete(e.pointerId);
    if (!touches.size) pinch = null;
    if (world.drag?.id === e.pointerId) {
      clearTouchPaint();world.painting=false;
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
    clearTouchPaint();world.painting=false;
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
      if(world.painting||world.drag?.mode==='pending-paint')cancelGesture();
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
  window.addEventListener('blur',cancelGesture);
  window.addEventListener('hexophage:toolchange',cancelGesture);
}

export { bindMapGestures, flushWheel, queuedWheel };
