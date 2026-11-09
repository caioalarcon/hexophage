// Each player pays for two native cards from each of the nine rule families.
// Physical layouts can be replayed under different rules of arbitration and cash.
import {createTypedWorld} from '../engine.mjs';
import {footprint} from '../catalog.mjs';

export const portfolio={
  callahan:['p4f','glider'], bays:['poly-3fdc3dd6','glider'],
  'hex-b2s34':['bagley-111-p4','db-1'], 'hex-b2s245':['farm-4-12','db-151'],
  bays245:['bagley-divvy-p6','bagley-glider-c-5-p10'], andreen:['bagley-toggle-pair','bagley-sym-glider'],
  highhex:['scan-633388','db-1'], ashley15:['rotor126','scan-acba7e'], ashley:['scan-b1cf68','scan-5ab33f'],
};
export const ruleIds=Object.keys(portfolio);

export function allRulesOrders(graph,{seed=1,rotation=0,owners=3}={}){
  let rng=seed>>>0;
  const pick=n=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return Math.floor(rng*n/4294967296);};
  const schedule=[];
  for(let owner=1;owner<=owners;owner++)for(const [i,rule] of ruleIds.entries()){
    for(const [j,card] of portfolio[rule].entries()){
      const roles=['contact','guard','phase','antimatter'];
      schedule.push({owner,rule,card,role:j?'shot':'base',ballot:['support','age','geometry'][(i+owner+j)%3],resolver:j?roles[(i+owner)%4]:roles[(i+owner)%3]});
    }
  }
  for(let i=schedule.length-1;i>0;i--){const j=pick(i+1);[schedule[i],schedule[j]]=[schedule[j],schedule[i]];}
  // Distances to the nearest occupied cell, truncated at 3. A gap of at
  // least one empty vertex makes every opening legal even when owners swap.
  const dist=new Uint8Array(graph.n).fill(3);
  function occupy(ids){
    for(const site of ids){
      dist[site]=0;
      for(let k=0;k<graph.deg[site];k++){
        const n=graph.adj[6*site+k];if(dist[n]>1)dist[n]=1;
        for(let j=0;j<graph.deg[n];j++){
          const nn=graph.adj[6*n+j];if(dist[nn]>2)dist[nn]=2;
        }
      }
    }
  }
  for(const [index,o] of schedule.entries()){
    const orientation=(pick(6)+rotation)%6,key=o.rule+'/'+o.card;
    let best=-1,choice=null;
    // Prefer a legal site two edges from earlier cards. Make no use of
    // owner, outcomes or automaton dynamics when locating these frontiers.
    for(let attempt=0;attempt<graph.n*3;attempt++){
      const site=index===0 && attempt===0?graph.farthest:pick(graph.n);
      if(dist[site]<1 || graph.distance[site]<2)continue;
      const ids=footprint(graph,key,site,orientation);
      if(!ids || ids.some(id=>dist[id]<2))continue;
      const score=ids.some(id=>dist[id]===2)?1:0;
      if(score>best){best=score;choice={site,ids};}
      if(score || index===0 || (choice && attempt>=80))break;
    }
    if(!choice)throw Error('Cannot place '+key+' on this sphere.');
    Object.assign(o,choice,{rotation:orientation});occupy(o.ids);
  }
  return schedule;
}
export function prepareAllRules(graph,{seed=1,rotation=0,owners=3,orders,bank=16000,wallets,
  economy={},resolverByOwner,...engineOptions}={}){
  orders??=allRulesOrders(graph,{seed,rotation,owners});
  const match=createTypedWorld(graph,{...engineOptions,seed,wallets:wallets??Array(owners).fill(bank),economy});
  for(const o of orders){
    const resolver=resolverByOwner?.[o.owner]??o.resolver;
    if(!match.stamp(o.owner,o.rule,resolver,o.ids,o.ballot))throw Error('Insufficient funds or illegal site for '+o.rule+'/'+o.card);
  }
  return {match,graph,orders,anchor:orders[0].site,remote:orders[orders.length-1].site};
}

function distanceFrom(graph,site) {
  const d=new Int16Array(graph.n).fill(-1),queue=[site]; d[site]=0;
  for(let j=0;j<queue.length;j++)for(let k=0;k<graph.deg[queue[j]];k++){
    const n=graph.adj[6*queue[j]+k];if(d[n]<0){d[n]=d[queue[j]]+1;queue.push(n);}
  }
  return d;
}
export function spreadSites(graph,count){
  const far=new Int16Array(graph.n).fill(32767),sites=[];
  for(let j=0;j<count;j++){
    let site=graph.farthest;
    for(let i=0;i<graph.n;i++)if(graph.distance[i]>=5 && far[i]>far[site])site=i;
    sites.push(site);
    const d=distanceFrom(graph,site);
    for(let i=0;i<graph.n;i++)far[i]=Math.min(far[i],d[i]);
  }
  return sites;
}

export function prepareNineFarms(graph,{bank=1600,extras=8,rotation=0,seed=1,economy={},...engineOptions}={}){
  const sites=spreadSites(graph,ruleIds.length+extras);
  const match=createTypedWorld(graph,{arbitration:'ballot',eligibility:'contest',friendlyFire:true,
    ...engineOptions,wallets:[bank],economy,seed});
  const orders=sites.map((site,i)=>{
    const rule=i<ruleIds.length?ruleIds[i]:'hex-b2s245',card=portfolio[rule][0];
    const ids=footprint(graph,rule+'/'+card,site,rotation),ballot=['support','age','geometry'][i%3];
    if(!match.stamp(1,rule,'contact',ids,ballot))throw Error('Reserva ou espaço insuficiente para '+rule+'/'+card);
    return {owner:1,rule,card,site,ids,rotation,ballot,resolver:'contact',role:'base'};
  });
  return {match,graph,orders,anchor:sites[0],remote:sites[1]};
}
