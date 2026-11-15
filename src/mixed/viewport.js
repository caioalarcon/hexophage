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
  world.fog=match.spatial?.enabled&&!match.spatial.fullMap?match.visibility(1):null;
  world.rememberedCells??=new Map();world.rememberedResources??=new Map();
  world.resourceDeposits=new Map();
  if(match.progression){
    // Keep the last observed terrain until it is revisited, like AoE's explored map.
    const deposits=world.fog?[...world.fog.visible].map(id=>match.progression.resourceAt(id,1)).filter(Boolean):
      match.progression.visibleDeposits(1);
    if(world.fog)for(const id of world.fog.visible)world.rememberedResources.delete(id);
    for(const deposit of deposits){
      if(world.fog&&!world.fog.visible.has(deposit.site))continue;
      const resource=match.progression.resources[deposit.kind],remaining=Math.max(0,deposit.remaining);
      if(!resource)continue;
      const level=Math.round(4*Math.min(1,remaining/32)),depleted=remaining<=0;
      const color=depleted?'#91a0a6':resource.color,alpha=Math.round(255*(depleted ? .065 : .16+.28*level/4));
      const mark={kind:deposit.kind,remaining,color:resource.color,
        fill:color+alpha.toString(16).padStart(2,'0'),edge:color+(depleted?'24':'80'),depleted};
      world.resourceDeposits.set(deposit.site,mark);
      if(world.fog)world.rememberedResources.set(deposit.site,mark);
    }
  }
  if(world.fog)for(const [id,mark] of world.rememberedResources)if(!world.fog.visible.has(id)&&world.fog.explored.has(id))
    world.resourceDeposits.set(id,{...mark,remembered:true,fill:mark.color+'25',edge:mark.color+'35'});
  if(!world.fog){world.rememberedCells.clear();world.rememberedResources.clear();}
  else{
    for(const id of world.fog.visible)world.rememberedCells.delete(id);
    for(const [id,c] of match.cells)if(c.owner!==1&&world.fog.visible.has(id))world.rememberedCells.set(id,{owner:c.owner,seenAt:match.gen});
  }
  for(let i=0;i<world.activeCount;i++){
    const id=world.active[i];world.cells[id]=0;world.owners[id]=0;
  }
  world.active=fitIndexBuffer(world.active,match.cells.size,world.graph.n);
  world.activeCount=0;
  for(const group of world.ownerCells)group.length=0;
  for(const [id,c] of match.cells){
    if(world.fog&&c.owner!==1&&!world.fog.visible.has(id))continue;
    world.cells[id]=1;world.owners[id]=c.owner;
    world.active[world.activeCount++]=id;world.ownerCells[c.owner].push(id);
  }
  bumpPopulationRevision();
  navigatorView.dirty=world.needsDraw=true;
}

export function loadViewport(session,storage){
  newWorld(session.graph.f,session.graph,storage);
  world.rememberedCells=new Map();world.rememberedResources=new Map();world.selectedFactory=null;
  world.rule='mixed';world.physics=null;
  syncField(session.match);
  centerOnPlayer(session.starts[1]);
}
export function paintViewport(time){
  if(queuedWheel)flushWheel();
  if(world.needsGrid)drawGrid();
  if(world.needsDraw){measure(cv);if(world.chart)drawFlat();else drawAtlas();}
  drawMiniGlobe(time);
}
