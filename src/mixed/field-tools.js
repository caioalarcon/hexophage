import {DIR,mod} from '../world/geometry.js';

export const DEFAULT_TOOL_SETTINGS=Object.freeze({maxEraseRadius:12,maxStampCells:1024});

export function normalizeToolSettings(values={},previous=DEFAULT_TOOL_SETTINGS){
  const settings={...previous,...values};
  for(const key of Object.keys(DEFAULT_TOOL_SETTINGS))
    if(!Number.isSafeInteger(settings[key])||settings[key]<1)
      throw new RangeError('Os limites das ferramentas precisam ser inteiros positivos.');
  return Object.freeze(Object.fromEntries(Object.keys(DEFAULT_TOOL_SETTINGS).map(key=>[key,settings[key]])));
}

const validSite=(graph,site)=>Number.isSafeInteger(site)&&site>=0&&site<graph.n;
function angularDistance(graph,a,b){
  const c=graph.coords,i=3*a,j=3*b;
  const cross=Math.hypot(c[i+1]*c[j+2]-c[i+2]*c[j+1],c[i+2]*c[j]-c[i]*c[j+2],c[i]*c[j+1]-c[i+1]*c[j]);
  const dot=c[i]*c[j]+c[i+1]*c[j+1]+c[i+2]*c[j+2];
  return Math.atan2(cross,dot);
}

// Angular radius uses one local edge length as the brush unit. The spherical
// cap remains circular at face boundaries and works on the twelve pentagons.
export function brushAngularRadius(graph,center,radius){
  if(!validSite(graph,center)||!Number.isFinite(radius)||radius<0)return null;
  let spacing=0;
  for(let k=0;k<graph.deg[center];k++)spacing+=angularDistance(graph,center,graph.adj[6*center+k]);
  return Math.min(Math.PI,radius*spacing/graph.deg[center]);
}

export function circularSites(graph,center,radius){
  const limit=brushAngularRadius(graph,center,radius);
  if(limit===null)return [];
  if(limit>=Math.PI)return Array.from({length:graph.n},(_,site)=>site);
  const sites=[center],seen=new Set(sites);
  for(let head=0;head<sites.length;head++){
    const site=sites[head];
    for(let k=0;k<graph.deg[site];k++){
      const next=graph.adj[6*site+k];
      if(seen.has(next))continue;
      seen.add(next);
      if(angularDistance(graph,center,next)<=limit+1e-7)sites.push(next);
    }
  }
  return sites;
}

const sameType=(a,b)=>a&&b&&['owner','rule','resolver','ballot','sense','wave'].every(k=>a[k]===b[k]);

export function nearestPatternSite(match,center){
  const {graph,cells}=match;
  if(!validSite(graph,center))return null;
  if(cells.has(center))return center;
  let nearest=null,best=Infinity;
  for(const [site] of cells){
    const distance=angularDistance(graph,center,site);
    if(distance<best-1e-12 || Math.abs(distance-best)<=1e-12 && (nearest===null||site<nearest)){
      nearest=site;best=distance;
    }
  }
  return nearest;
}

function stepFrame(graph,frame,k,side){
  const d=mod(side*(k-frame.ori),6),id=graph.adj[6*frame.id+k];
  if(graph.deg[id]!==6)return null;
  let back=0;
  while(back<6&&graph.adj[6*id+back]!==frame.id)back++;
  if(back===6)return null;
  return {id,q:frame.q+DIR[d][0],r:frame.r+DIR[d][1],ori:mod(back-side*((d+3)%6),6)};
}

// Capture a complete same-genotype component under distance-three connectivity:
// detached sparks and empty gaps inside common ships/farms stay in their shape. Adjacent
// different owners or rules keep their independent stamp identity.
export function capturePattern(match,center,{maxCells=match.toolSettings?.maxStampCells??DEFAULT_TOOL_SETTINGS.maxStampCells,orientation=0,side=1}={}){
  if(!Number.isSafeInteger(maxCells)||maxCells<1)throw new RangeError('Limite de captura inválido.');
  if(!Number.isInteger(orientation)||![1,-1].includes(side))throw new RangeError('Orientação de captura inválida.');
  const {graph,cells}=match,first=nearestPatternSite(match,center);
  if(first===null)return {ok:false,reason:'empty'};
  const type=cells.get(first),ids=[first],members=new Set(ids),support=new Set(ids);
  for(let head=0;head<ids.length;head++){
    const site=ids[head],near=[{id:site,depth:0}],visited=new Set([site]);
    const include=n=>{
      if(!members.has(n)&&sameType(cells.get(n),type)){members.add(n);ids.push(n);}
    };
    for(let index=0;index<near.length;index++){
      const {id,depth}=near[index];
      include(id);
      if(ids.length>maxCells)return {ok:false,reason:'too-large',center:first,limit:maxCells,atLeast:ids.length};
      if(depth<3){
        support.add(id);
        for(let k=0;k<graph.deg[id];k++){
          const next=graph.adj[6*id+k];
          if(!visited.has(next)){visited.add(next);near.push({id:next,depth:depth+1});}
        }
      }
    }
    if(ids.length>maxCells)return {ok:false,reason:'too-large',center:first,limit:maxCells,atLeast:ids.length};
  }
  if(ids.some(site=>graph.deg[site]!==6))return {ok:false,reason:'geometry',center:first};
  // The component plus its two-ring connects every distance-three pair. Unfold
  // only this sparse support, rejecting conflicting transport around defects.
  const origin={id:first,q:0,r:0,ori:mod(orientation,6)},frames=new Map([[first,origin]]),positions=new Map([['0,0',first]]),queue=[origin];
  for(let head=0;head<queue.length;head++){
    const frame=queue[head];
    for(let k=0;k<6;k++){
      const next=graph.adj[6*frame.id+k];
      if(!support.has(next)||graph.deg[next]!==6)continue;
      const candidate=stepFrame(graph,frame,k,side),old=frames.get(next);
      if(!candidate)return {ok:false,reason:'geometry',center:first};
      if(old){
        if(old.q!==candidate.q||old.r!==candidate.r||old.ori!==candidate.ori)
          return {ok:false,reason:'geometry',center:first};
        continue;
      }
      const key=candidate.q+','+candidate.r;
      if(positions.has(key)&&positions.get(key)!==next)return {ok:false,reason:'geometry',center:first};
      positions.set(key,next);frames.set(next,candidate);queue.push(candidate);
    }
  }
  if(ids.some(site=>!frames.has(site)))return {ok:false,reason:'geometry',center:first};
  const points=ids.map(site=>frames.get(site));
  const q=Math.round(points.reduce((sum,p)=>sum+p.q,0)/points.length),r=Math.round(points.reduce((sum,p)=>sum+p.r,0)/points.length);
  const offsets=points.map(p=>[p.q-q,p.r-r]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
  return {ok:true,ids,center:first,connectivity:3,sourceOwner:type.owner,sourceWave:!!type.wave,
    card:{name:'Captura · '+ids.length+' células',rule:type.rule,resolver:type.resolver,
      ballot:type.ballot??'support',sense:type.sense??'native',offsets,custom:true,group:'capturado'}};
}
