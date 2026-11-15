// A construction request needs a fixed amount at every target. Different
// targets can see overlapping sets of finite donor cells. The common greedy
// allocation is fast; its failure is resolved by a capacitated residual flow.
const EPS=1e-9;

export function fundLocalRequests(input,available,unitCost){
  if(!Number.isFinite(unitCost)||unitCost<0)throw RangeError('Invalid local construction cost.');
  const requests=Array.from(input,r=>({id:r.id,donors:[...new Set(r.donors)].sort((a,b)=>a-b)}))
    .sort((a,b)=>a.donors.length-b.donors.length||a.id-b.id);
  if(unitCost===0||requests.length===0)return new Map();
  const donors=[...new Set(requests.flatMap(r=>r.donors))].sort((a,b)=>a-b);
  const supply=new Map(donors.map(id=>[id,available.get(id)??0]));
  for(const amount of supply.values())if(!Number.isFinite(amount)||amount<0)throw RangeError('Invalid donor balance.');
  const total=unitCost*requests.length;
  if([...supply.values()].reduce((sum,n)=>sum+n,0)+EPS<total)return null;
  const remaining=new Map(supply),debits=new Map();
  let feasible=true;
  for(const request of requests){
    let needed=unitCost;
    for(const donor of request.donors){
      const debit=Math.min(remaining.get(donor),needed);
      remaining.set(donor,remaining.get(donor)-debit);
      if(debit)debits.set(donor,(debits.get(donor)??0)+debit);
      needed-=debit;if(needed<=EPS)break;
    }
    if(needed>EPS){feasible=false;break;}
  }
  if(feasible)return debits;

  const donorIndex=new Map(donors.map((id,i)=>[id,i+1]));
  const source=0,firstTarget=donors.length+1,sink=firstTarget+requests.length;
  const edges=Array.from({length:sink+1},()=>[]),sourceEdges=new Map();
  function add(from,to,capacity){
    const forward={to,capacity,reverse:edges[to].length};
    const backward={to:from,capacity:0,reverse:edges[from].length};
    edges[from].push(forward);edges[to].push(backward);return forward;
  }
  for(const donor of donors)sourceEdges.set(donor,add(source,donorIndex.get(donor),supply.get(donor)));
  requests.forEach((request,i)=>{
    const target=firstTarget+i;
    for(const donor of request.donors)add(donorIndex.get(donor),target,unitCost);
    add(target,sink,unitCost);
  });
  const level=new Int32Array(edges.length),cursor=new Int32Array(edges.length);
  function layers(){
    level.fill(-1);level[source]=0;const queue=[source];
    for(let i=0;i<queue.length;i++)for(const edge of edges[queue[i]])if(edge.capacity>EPS&&level[edge.to]===-1){
      level[edge.to]=level[queue[i]]+1;queue.push(edge.to);
    }
    return level[sink]!==-1;
  }
  function push(from,limit){
    if(from===sink)return limit;
    while(cursor[from]<edges[from].length){
      const edge=edges[from][cursor[from]];
      if(edge.capacity>EPS&&level[edge.to]===level[from]+1){
        const sent=push(edge.to,Math.min(limit,edge.capacity));
        if(sent>EPS){edge.capacity-=sent;edges[edge.to][edge.reverse].capacity+=sent;return sent;}
      }
      cursor[from]++;
    }
    return 0;
  }
  let flow=0;
  while(flow+EPS<total&&layers()){
    cursor.fill(0);
    for(let sent;(sent=push(source,total-flow))>EPS;)flow+=sent;
  }
  if(flow+EPS<total)return null;
  return new Map(donors.map(id=>[id,Math.max(0,supply.get(id)-sourceEdges.get(id).capacity)]).filter(([,n])=>n>0));
}
