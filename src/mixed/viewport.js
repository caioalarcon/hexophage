import {world} from '../browser/world-state.js';
import {bindMapGestures,flushWheel,queuedWheel} from '../map/camera/pointer.js';
import {bindMapControls} from '../map/camera/controls.js';
import {centerOnPlayer} from '../map/camera/player-sector.js';
import {drawAtlas} from '../map/atlas/draw.js';
import {drawFlat} from '../map/local/draw.js';
import {drawGrid} from '../map/local/grid.js';
import {measure} from '../map/canvas-size.js';
import {cv} from '../layout/elements.js';
import {observeCanvasSizes} from '../layout/resize.js';
import {newWorld} from '../world/load-planet.js';
import {fitIndexBuffer} from '../simulation/population.js';
import {bumpPopulationRevision} from '../map/population/tile-index.js';
import {mountGlobeNavigator} from '../globe/navigator/controls.js';
import {setupMiniGlobeEvents} from '../globe/navigator/gestures.js';
import {drawMiniGlobe} from '../globe/navigator/draw.js';
import {navigatorView} from '../globe/navigator/surface.js';
import {openFullGlobe} from '../globe/navigator/fullscreen.js';

export function bindMixedViewport(){
  bindMapGestures();
  bindMapControls();
  setupMiniGlobeEvents(mountGlobeNavigator());
  observeCanvasSizes();
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&navigatorView.expanded)openFullGlobe(false);});
}

// The camera and both renderers read the original sparse buffers. Update them
// once per displayed frame, including when many generations were simulated.
export function syncField(match){
  world.gen=match.gen;
  for(let i=0;i<world.activeCount;i++){
    const id=world.active[i];world.cells[id]=0;world.owners[id]=0;
  }
  world.active=fitIndexBuffer(world.active,match.cells.size,world.graph.n);
  world.activeCount=0;
  for(const group of world.ownerCells)group.length=0;
  for(const [id,c] of match.cells){
    world.cells[id]=1;world.owners[id]=c.owner;
    world.active[world.activeCount++]=id;world.ownerCells[c.owner].push(id);
  }
  bumpPopulationRevision();
  navigatorView.dirty=world.needsDraw=true;
}

export function loadViewport(session,storage){
  newWorld(session.graph.f,session.graph,storage);
  syncField(session.match);
  centerOnPlayer(session.starts[1]);
}
export function paintViewport(time){
  if(queuedWheel)flushWheel();
  if(world.needsGrid)drawGrid();
  if(world.needsDraw){measure(cv);if(world.chart)drawFlat();else drawAtlas();}
  drawMiniGlobe(time);
}
