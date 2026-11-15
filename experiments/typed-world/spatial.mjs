// Spatial economy traits and sparse graph-distance visibility. No pattern names
// or shape recognition participate in either mechanic.
export const spatialDefaults=Object.freeze({enabled:false,visionRadius:12,constructionFunding:'territory',fullMap:false,safeStampGap:2,cellCapacity:256,
  stableAfter:12,stableEnergy:1,stampEnergy:32,newbornEnergy:2,birthRadius:1,inheritanceRadius:2,types:Object.freeze({})});
const numeric=['visionRadius','cellCapacity','stableAfter','stableEnergy','stampEnergy','newbornEnergy','birthRadius','inheritanceRadius'];
function validate(values){
  for(const key of numeric)if(values[key]!==undefined && (!Number.isFinite(values[key])||values[key]<0))
    throw RangeError('Expected finite nonnegative spatial trait: '+key);
  for(const key of ['visionRadius','stableAfter','birthRadius','inheritanceRadius'])if(values[key]!==undefined&&!Number.isSafeInteger(values[key]))
    throw RangeError('Expected integer spatial trait: '+key);
  if(values.visionRadius>24||values.birthRadius>6||values.inheritanceRadius>6)throw RangeError('Spatial radius exceeds the experiment limit.');
  if(values.cellCapacity!==undefined&&values.newbornEnergy!==undefined&&values.newbornEnergy>values.cellCapacity)
    throw RangeError('Newborn energy must fit the cell.');
  if(values.cellCapacity!==undefined&&values.stampEnergy!==undefined&&values.stampEnergy>values.cellCapacity)
    throw RangeError('Stamp energy must fit the cell.');
}
export function normalizeSpatial(value={}){
  if(value===true)value={enabled:true};
  if(value===false||value===null)value={};
  if(typeof value!=='object'||Array.isArray(value))throw TypeError('Expected spatial settings.');
  const settings={...spatialDefaults,...value};
  if(typeof settings.enabled!=='boolean')throw TypeError('Expected spatial enabled boolean.');
  if(!['local','territory'].includes(settings.constructionFunding))throw RangeError('Invalid construction funding mode.');
  if(typeof settings.fullMap!=='boolean')throw TypeError('fullMap must be a boolean.');
  if(!Number.isSafeInteger(settings.safeStampGap)||settings.safeStampGap<0||settings.safeStampGap>6)throw RangeError('safeStampGap must be an integer 0..6.');
  validate(settings);
  const types={};
  for(const [key,traits] of Object.entries(settings.types??{})){
    if(!traits||typeof traits!=='object'||Array.isArray(traits))throw TypeError('Expected spatial type traits.');
    if(Object.keys(traits).some(k=>!numeric.includes(k)))throw RangeError('Unknown spatial type trait.');
    validate({...settings,...traits});types[key]=Object.freeze({...traits});
  }
  settings.types=Object.freeze(types);return Object.freeze(settings);
}
export function typeTraits(spatial,type){
  const explicit=spatial.types[type.rule+'/'+type.resolver+'/'+(type.contract??'')]
    ??spatial.types[type.rule+'/'+type.resolver]??spatial.types[type.rule]??{};
  return {...spatial,...explicit,visionRadius:type.wave?0:(explicit.visionRadius??spatial.visionRadius),
    stableEnergy:type.wave?0:(explicit.stableEnergy??spatial.stableEnergy)};
}
export function graphBall(graph,sites,radius,domain=null){
  const reached=new Set(),queue=[];
  for(const site of sites)if(Number.isSafeInteger(site)&&site>=0&&site<graph.n&&(!domain||domain.has(site))&&!reached.has(site)){
    reached.add(site);queue.push([site,radius]);
  }
  for(let i=0;i<queue.length;i++){
    const [site,left]=queue[i];if(!left)continue;
    for(let k=0;k<graph.deg[site];k++){
      const next=graph.adj[site*6+k];
      if(reached.has(next)||(domain&&!domain.has(next)))continue;
      reached.add(next);queue.push([next,left-1]);
    }
  }
  return reached;
}
export function illuminated(graph,cells,owner,spatial,domain=null){
  const remaining=new Map(),queue=[];
  for(const [site,c] of cells){
    if(c.owner!==owner||c.wave)continue;
    const radius=typeTraits(spatial,c.type).visionRadius;
    if((remaining.get(site)??-1)>=radius)continue;
    remaining.set(site,radius);queue.push([site,radius]);
  }
  for(let i=0;i<queue.length;i++){
    const [site,left]=queue[i];if(!left||remaining.get(site)>left)continue;
    for(let k=0;k<graph.deg[site];k++){
      const next=graph.adj[site*6+k];
      if((domain&&!domain.has(next))||(remaining.get(next)??-1)>=left-1)continue;
      remaining.set(next,left-1);queue.push([next,left-1]);
    }
  }
  return new Set(remaining.keys());
}
export function sameNeighborhood(graph,before,after,id){
  for(let k=0;k<graph.deg[id];k++){
    const n=graph.adj[6*id+k];if(before.get(n)?.type!==after.get(n)?.type)return false;
  }
  return true;
}
