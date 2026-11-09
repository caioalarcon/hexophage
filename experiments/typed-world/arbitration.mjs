// Physical transitions decide who can propose. This module only ranks the
// candidates supplied by the engine, before any treasury is debited.
import {ruleProfiles} from '../../src/match/rule-profiles.js';

export const resolvers = Object.freeze(['contact','phase','guard','antimatter']);
export const ruleIds = Object.freeze(Object.keys(ruleProfiles).filter(id=>ruleProfiles[id].physics && !ruleProfiles[id].physics.birthsFromVacuum));
export const arbitrationModes = Object.freeze(['legacy','support','phase','fixed','majority','dominant','cycle','ballot','ecology','matrix']);
const majorityCriteria = Object.freeze(['support','age','geometry']);
const ecologyCriteria = Object.freeze(['support','age','robustness']);
export const ballots = Object.freeze([...majorityCriteria,'robustness']);
export const material = type => type?.resolver==='contact' || type?.resolver==='guard';

export function configureArbitration(input='legacy') {
  const {mode,by='resolver',order,matrix}=typeof input==='string'?{mode:input}:input;
  if(!arbitrationModes.includes(mode) || !['rule','resolver'].includes(by))throw RangeError('Invalid arbitration policy');
  const families=by==='rule'?ruleIds:resolvers;
  const defaults=by==='rule'?ruleIds:['contact','guard','phase','antimatter'];
  const selected=order??(mode==='cycle'?defaults.slice(0,3):defaults);
  if(!Array.isArray(selected) || !selected.length || new Set(selected).size!==selected.length ||
     !selected.every(x=>families.includes(x)) || mode==='cycle' && selected.length!==3)throw RangeError('Invalid family order');
  const configured={mode,by,order:Object.freeze([...selected])};
  if(mode==='matrix'){
    const size=families.length*(families.length-1)/2;
    const bits=matrix===undefined?'1'.repeat(size):matrix;
    if(selected.length!==families.length || typeof bits!=='string' || bits.length!==size || /[^01]/.test(bits))
      throw RangeError('Matrix needs all families and one bit for every unordered pair');
    configured.matrix=bits;
  }
  return Object.freeze(configured);
}

function criterion(key,a,b,rank) {
  return key==='geometry' ? Math.sign(rank(a.parent)-rank(b.parent)) : Math.sign(a[key]-b[key]);
}
function strength(a,b,rank) {
  return a.support-b.support || rank(a.parent)-rank(b.parent);
}

function pairPreference(policy,a,b,electorate,rank) {
  const {mode,by,order}=policy;
  if(mode==='majority' || mode==='ballot' || mode==='ecology') {
    let votes=0;
    for(const key of electorate)votes+=criterion(key,a,b,rank);
    return votes || rank(a.parent)-rank(b.parent);
  }
  const i=order.indexOf(a.type[by]), j=order.indexOf(b.type[by]);
  if(i!==j){
    if(mode==='matrix'){
      const lo=Math.min(i,j), hi=Math.max(i,j);
      const offset=lo*(2*order.length-lo-1)/2+hi-lo-1;
      return (policy.matrix[offset]==='1')===(i===lo)?1:-1;
    }
    if(mode==='fixed')return (j<0?order.length:j)-(i<0?order.length:i);
    if(mode==='dominant' && (i===0 || j===0))return i===0?1:-1;
    if(mode==='cycle') {
      if(i<0 || j<0)return i<0?-1:1;
      return (i+1)%3===j?1:-1;
    }
  }
  return strength(a,b,rank);
}

function phasePasses(policy,claims,empty,flag) {
  return empty && (policy.mode==='phase' || policy.mode==='legacy' && flag) && claims.some(c=>material(c.type));
}

function physicalPriority(a,b,rank,phaseFirst) {
  return (phaseFirst && (Number(a.type.resolver==='phase')-Number(b.type.resolver==='phase'))) || strength(a,b,rank);
}

function sourceComponent(reach) {
  const n=reach.length;
  for(let k=0;k<n;k++)for(let i=0;i<n;i++)if(reach[i][k])
    for(let j=0;j<n;j++)if(reach[k][j])reach[i][j]=1;
  return reach.map((row,i)=>row.every(Boolean)?i:-1).filter(i=>i>=0);
}

// The source SCC of a tournament reaches every candidate. If it contains a
// cycle, use the same physical parent tie-break inside it. At most the six
// neighbour types, the incumbent and local ignitions can take part.
function election(policy,pool,rank) {
  const voters=policy.mode==='ballot'
    ? [...new Set(pool.map(c=>c.type))].map(type=>type.ballot)
    : policy.mode==='ecology'?ecologyCriteria:majorityCriteria;
  if(pool.length===2) {
    const preferred=pairPreference(policy,pool[0],pool[1],voters,rank);
    return {winner:pool[preferred>0?0:1],cycle:false,anyCycle:false};
  }
  const n=pool.length, reach=Array.from({length:n},(_,i)=>Uint8Array.from({length:n},(_,j)=>Number(j===i)));
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
    const preference=pairPreference(policy,pool[i],pool[j],voters,rank);
    if(preference>0)reach[i][j]=1;
    else reach[j][i]=1;
  }
  const top=sourceComponent(reach).map(i=>pool[i]);
  const winner=top.reduce((a,b)=>rank(a.parent)>rank(b.parent)?a:b);
  const anyCycle=reach.some((row,i)=>row.some((yes,j)=>j<i && yes && reach[j][i]));
  return {winner,cycle:top.length>1,anyCycle};
}

function literalCrossing(claims,passage){
  return passage==='literal' && claims.some(c=>c.type.resolver==='phase') && claims.some(c=>material(c.type));
}

export function rankProposals(policy,claims,rank,empty,phasePriority,passage='legacy') {
  let cycle=false,anyCycle=false;
  if(literalCrossing(claims,passage)){
    // In literal passage, conventional matter cannot preempt a funded phase.
    // Other spectral proposals still compete with it. Material is the second
    // tier when every spectral claimant fails, including for lack of funds.
    const spectral=claims.filter(c=>!material(c.type)), ordinary=claims.filter(c=>material(c.type));
    const a=rankProposals(policy,spectral,rank,empty,phasePriority);
    const b=rankProposals(policy,ordinary,rank,empty,phasePriority);
    claims.splice(0,claims.length,...spectral,...ordinary);
    return {cycle:a.cycle,anyCycle:a.anyCycle || b.anyCycle};
  }
  if(claims.length>1) {
    if(['legacy','phase','support'].includes(policy.mode)){
      const phaseFirst=phasePasses(policy,claims,empty,phasePriority);
      claims.sort((a,b)=>physicalPriority(b,a,rank,phaseFirst));
    }else{
      // If the first proposal cannot pay, its withdrawal can break the cycle
      // or even change the electorate. Recompute, instead of sorting a cycle.
      const remaining=[...claims];
      for(let i=0;remaining.length>1;i++){
        const result=election(policy,remaining,rank);
        if(i===0)({cycle,anyCycle}=result);
        claims[i]=result.winner;
        remaining.splice(remaining.indexOf(result.winner),1);
      }
      claims[claims.length-1]=remaining[0];
    }
  }
  return {cycle,anyCycle};
}

// Detached replay inspection. Numerical IDs are indices into event.claims,
// stable even if several proposals carry the same owner or family.
export function explainContest(input,event) {
  const policy=configureArbitration(input),{mode}=policy;
  const claims=event.claims.map((c,index)=>({...c,type:c,index}));
  const geometric=new Map(claims.map(c=>[c.parent,c.geometry]));
  // Each parent vertex holds exactly one genotype. Normal parent masks are
  // disjoint, spent carriers no longer belong to any mask, and the surviving
  // incumbent alone uses the destination as its parent. The physical hash is
  // an injective permutation. A duplicated parent is an invalid transcript.
  if(geometric.size!==claims.length || claims.some(c=>!Number.isInteger(c.geometry)))
    throw Error('Invalid physical parent witness');
  const rank=id=>geometric.get(id),fallback=(event.passiveResident??(event.eligibility==='legacy'))?claims.find(c=>c.kind==='survival'):null;
  const pool=claims.filter(c=>c!==fallback),rounds=[];
  const simple=['legacy','support','phase'].includes(mode);
  const literal=literalCrossing(pool,event.passage);
  const phaseFirst=!literal && phasePasses(policy,pool,!event.incumbent,event.phasePriority);
  const paid=event.winner?claims.find(c=>c.parent===event.winner.parent):null;
  while(pool.length){
    const spectral=literal?pool.filter(c=>!material(c.type)):[];
    const eligible=spectral.length?spectral:pool;
    const edges=[],reach=eligible.map((a,i)=>eligible.map((b,j)=>Number(i===j)));
    const voterTypes=new Map();
    for(const c of eligible){
      const key=[c.owner,c.rule,c.resolver,c.ballot,c.sense,c.wave].join('/');
      if(!voterTypes.has(key))voterTypes.set(key,c);
    }
    const voters=mode==='ballot'?[...voterTypes.values()].map(c=>({key:c.ballot,voter:c.index})):
      ['majority','ecology'].includes(mode)?(mode==='ecology'?ecologyCriteria:majorityCriteria).map(key=>({key,voter:null})):[];
    const criteria=voters.map(v=>v.key);
    for(let i=0;i<eligible.length;i++)for(let j=i+1;j<eligible.length;j++){
      const a=eligible[i],b=eligible[j];
      const p=simple?physicalPriority(a,b,rank,phaseFirst):pairPreference(policy,a,b,criteria,rank);
      const winner=p>0?a:b,loser=p>0?b:a;
      reach[p>0?i:j][p>0?j:i]=1;
      const votes=voters.map(({key,voter})=>{
        const sign=criterion(key,winner,loser,rank);
        return {criterion:key,voter,choice:sign>0?winner.index:sign<0?loser.index:null};
      });
      const yes=votes.filter(v=>v.choice===winner.index).length;
      const no=votes.filter(v=>v.choice===loser.index).length;
      let reason;
      if(votes.length)reason=yes===no?'geometry':mode;
      else if(simple && phaseFirst && (a.resolver==='phase')!==(b.resolver==='phase'))reason='phase';
      else if(!simple && winner[policy.by]!==loser[policy.by] &&
        (mode==='matrix' || mode==='fixed' && [winner,loser].some(c=>policy.order.includes(c[policy.by])) ||
        mode==='cycle' && [winner,loser].some(c=>policy.order.includes(c[policy.by])) ||
        mode==='dominant' && winner[policy.by]===policy.order[0]))reason=mode;
      else reason=a.support===b.support?'geometry':'support';
      edges.push({winner:winner.index,loser:loser.index,for:yes,against:no,abstain:votes.length-yes-no,reason,votes});
    }
    const top=sourceComponent(reach).map(i=>eligible[i]);
    const chosen=top.reduce((a,b)=>a.geometry>b.geometry?a:b);
    rounds.push({eligible:eligible.map(c=>c.index),held:pool.filter(c=>!eligible.includes(c)).map(c=>c.index),
      top:top.map(c=>c.index),preferred:chosen.index,accepted:chosen===paid,edges});
    if(chosen===paid)break;
    pool.splice(pool.indexOf(chosen),1);
  }
  if(fallback && fallback===paid)rounds.push({eligible:[fallback.index],top:[fallback.index],preferred:fallback.index,accepted:true,edges:[]});
  return {mode,rounds,fallback:fallback?.index??null};
}
