import {nearestGlobeVertex} from '../globe/camera/nearest-vertex.js';

// Cells whose one-ring neighborhoods overlap belong to the same colony.
// This includes the empty gaps inside ships and farms. Center the nearest
// colony's spherical centroid, independently of simulation iteration order.
export function nearestColony(graph,cells,owner,look){
  const {coords,adj,deg}=graph;
  let nearest=null,best=-Infinity;
  for(const [site,cell] of cells){
    if(cell.owner!==owner)continue;
    const dot=coords[site*3]*look[0]+coords[site*3+1]*look[1]+coords[site*3+2]*look[2];
    if(dot>best || dot===best && site<nearest){nearest=site;best=dot;}
  }
  if(nearest===null)return null;
  const group=[nearest],seen=new Set(group),explored=new Set(),center=[0,0,0];
  function include(site){
    if(!seen.has(site) && cells.get(site)?.owner===owner){seen.add(site);group.push(site);}
  }
  for(let index=0;index<group.length;index++){
    const site=group[index];
    for(let axis=0;axis<3;axis++)center[axis]+=coords[site*3+axis];
    for(let edge=0;edge<deg[site];edge++){
      const neighbor=adj[site*6+edge];
      include(neighbor);
      if(explored.has(neighbor))continue;
      explored.add(neighbor);
      for(let next=0;next<deg[neighbor];next++)include(adj[neighbor*6+next]);
    }
  }
  return Math.hypot(...center)<1e-9?nearest:nearestGlobeVertex(graph,center,nearest);
}
