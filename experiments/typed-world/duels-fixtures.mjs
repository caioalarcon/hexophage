// Paid launch coordinates on a chart of actual spherical vertices. The atlas
// provides each ship's native oscillator; its displacement is measured first.
import {resolveRuleProfile} from '../../src/match/rule-profiles.js';
import {patchForStamp} from '../../src/patterns/spherical-patch.js';
import {advancePattern, seedPatternAges, patternOffset} from '../../src/patterns/planar-simulation.js';
import {decodeRLE} from '../../src/patterns/rle.js';

const rotate = ([q,r]) => [-r,q+r];
const turns = (p,n) => {for(let i=0;i<n;i++)p=rotate(p);return p;};
const norm = ([q,r]) => Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r));
const dot = ([q,r],[a,b]) => q*a+r*b+(q*b+r*a)/2;
const cache=new Map();

export const cases={
  'glider-grower':['bays','glider','callahan','stalk'],
  'slider-farm':['ashley','scan-5ab33f','hex-b2s245','farm-4-12'],
  'ship-oscillator':['andreen','bagley-sym-glider','bays','osc2'],
  'glider-ship':['bays','glider','ashley','scan-5ab33f'],
};

export function card(rule,id){
  const key=rule+'/'+id;
  if(!cache.has(key)){
    const {physics,gameplay}=resolveRuleProfile(rule);
    const p=(gameplay.atlas??gameplay.patterns).find(p=>p.id===id);
    if (!p) throw Error("Missing pattern "+key);
    const initial=decodeRLE(p.rle), center=[0,1].map(k=>Math.round(initial.reduce((s,a)=>s+a[k],0)/initial.length));
    const shape=initial.map(([x,y])=>[x-center[0],y-center[1]]);
    let delta=null;
    if(p.group==='nave'){
      let ages=seedPatternAges(p);
      for(let g=0;g<p.period;g++)ages=advancePattern(ages,1,physics).next;
      const end=[...ages.keys()].map(patternOffset);
      if (end.length!==initial.length) throw Error("Incomplete period "+key);
      delta=[0,1].map(k=>Math.min(...end.map(a=>a[k]))-Math.min(...initial.map(a=>a[k])));
      if (!norm(delta)) throw Error("Stationary ship "+key);
    }
    cache.set(key,{id,rule,shape,delta});
  }
  return cache.get(key);
}

export function poses(graph,name,rotation,lane,warm) {
  const [a,at,b,bt]=cases[name], raider=card(a,at), target=card(b,bt);
  const v=turns(raider.delta,rotation), left=rotate(v).map(Math.sign);
  let other=0;
  if(target.delta){
    const dots=Array.from({length:6},(_,k)=>dot(v,turns(target.delta,k)));
    other=dots.indexOf(Math.min(...dots));
  }
  const lookup=offsets=>patchForStamp({graph},graph.farthest,0,offsets);
  const base=lookup(target.shape.map(p=>turns(p,other)));
  // All resolvers must face an identical legal launch. Choose the first
  // usable gap before any resolver-vs-resolver trial is run.
  const layouts=[];
  for(let gap=Math.ceil(8/norm(v)); gap*norm(v)<=22;gap++){
    const points=raider.shape.map(p=>{
      const [q,r]=turns(p,rotation);return [q-v[0]*gap+left[0]*lane,r-v[1]*gap+left[1]*lane];
    });
    const shot=lookup(points);
    if(shot)layouts.push({distance:gap*norm(v),shot});
  }
  return {name,rotation,lane,warm,turret:other,raider,target,base,layouts};
}
