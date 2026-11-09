// Paired local forecasts. The real wallet is shared by all types of each owner.
import {footprint} from './catalog.mjs';
import {card} from './duels-fixtures.mjs';
import {patchForStamp} from '../../src/patterns/spherical-patch.js';

const ships=[['bays','glider'],['hex-b2s245','db-151'],['ashley','scan-5ab33f']];
const investments=[['hex-b2s245','farm-4-12'],['bays','poly-3fdc3dd6'],['callahan','stalk']];
const actions=['contact','phase','guard','antimatter'];
const radius=12;
export function disk(graph,center) {
  const list=[center], seen=new Set(list);
  let outer=0;
  for(let i=0,start=0;i<radius;i++){
    outer=list.length;
    const limit=list.length;
    for(;start<limit;start++)for(let k=0;k<graph.deg[list[start]];k++){
      const v=graph.adj[6*list[start]+k];if(!seen.has(v)){seen.add(v);list.push(v);}
    }
  }
  return {sites:seen,edge:list.slice(outer)};
}
// All rates come from actual wallet entries, including whole-colony mature
// saturation. Selling one's own cells is cash, but not recurring income.
export function cashForecast(m,owner,other,raid,{inspect}={}) {
  const horizon=raid?48:32, tail=8, lookahead=96;
  const operating=p=>p.income-p.birthSpent-p.eraseSpent-p.friendlyEraseSpent;
  const own=m.players[owner], rival=m.players[other], refused=own.refused;
  let ownStart,rivalStart;
  for(let t=0;t<=horizon;t++){
    const censored=inspect?.(t,own,rival,refused);
    if(censored)return censored;
    if(t===horizon)break;
    if(t===horizon-tail){ownStart=operating(own);rivalStart=operating(rival);}
    m.step();
  }
  const ownFlow=(operating(own)-ownStart)/tail, rivalFlow=(operating(rival)-rivalStart)/tail;
  const enemy=rival.reserve+lookahead*rivalFlow;
  return {value:own.reserve+lookahead*ownFlow-enemy,enemy,
    risky:own.out || own.refused>refused || own.reserve+32*Math.min(0,ownFlow)<0};
}

export function createPilot(seed=1, forecast=cashForecast) {
  let x=seed>>>0;
  const pick=n=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return Math.floor(x/4294967296*n);};
  return (m,owner)=>{
    const opponents=m.players.map((p,id)=>p&&!p.out&&id!==owner?id:0).filter(Boolean);
    if(!opponents.length)return null;
    const other=opponents.length===1?opponents[0]:opponents[pick(opponents.length)], rivals=[];
    // One sparse census per purchasing turn. The forecasts copy only one disk.
    for(const [site,c] of m.cells)if(c.owner===other&&!c.wave)rivals.push(site);
    const offers=[];
    for(let j=0;j<2;j++) {
      const [rule,id]=investments[pick(investments.length)], site=pick(m.graph.n);
      offers.push({site,rule,id,resolver:j?'guard':'contact',ids:footprint(m.graph,rule+'/'+id,site,pick(6))});
    }
    if(rivals.length){
      const site=rivals[pick(rivals.length)], [rule,id]=ships[pick(ships.length)];
      const s=card(rule,id), gap=Math.ceil((4+pick(3))/Math.max(...s.delta.map(Math.abs)));
      const turn=pick(6), lane=pick(3)-1;
      const shape=s.shape.map(([q,r])=>[q-gap*s.delta[0]+lane,r-gap*s.delta[1]]);
      const ids=patchForStamp({graph:m.graph},site,turn,shape);
      for(const resolver of actions)offers.push({site,rule,id,resolver,ids,target:other});
    }
    let best=null, bestGain=0;
    const baselines=new Map();
    for(const offer of offers){
      if(!offer.ids || !m.canStamp(owner,offer.rule,offer.resolver,offer.ids))continue;
      const key=offer.site+'/'+Number(!!offer.target);
      if(!baselines.has(key)){
        const {sites,edge}=disk(m.graph,offer.site),copy=m.fork(sites),hold=copy.fork();
        baselines.set(key,{copy,edge,score:forecast(hold,owner,other,!!offer.target,{edge})});
      }
      const {copy,score,edge}=baselines.get(key), play=copy.fork();
      if(!play.stamp(owner,offer.rule,offer.resolver,offer.ids))continue;
      const result=forecast(play,owner,other,!!offer.target,{edge,compare:score}), hold=result.baseline??score;
      if(result.risky || offer.target && result.enemy>=hold.enemy)continue;
      const gain=result.value-hold.value;
      if(gain>bestGain){best=offer;bestGain=gain;}
    }
    if(best&&m.stamp(owner,best.rule,best.resolver,best.ids))return {...best,expected:bestGain};
    return null;
  };
}
