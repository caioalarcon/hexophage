// A local counterfactual for ONE physical generation. An owner contributes
// all its cells in this neighborhood together. Neutral neighbors stay present.
const bitCount = Uint8Array.from({length:64}, (_, n) => {
  let count=0;
  while(n){n &= n-1; count++;}
  return count;
});
function survives(world, degree, mask) {
  if(world.rule==='callahan') return (degree===5 ? world.callSurv5 : world.callSurv6)[mask];
  return world.survival[bitCount[mask]];
}

// Deaths of owned cells in contact with another player. Call after the physical
// buffer swap, preferably before erosion and manual orders. Erosion cannot
// earn a kill: the factual neighborhood must also predict a natural death.
export function combatDeaths(world) {
  const before=world.nextOwners, {adj,deg}=world.graph, events=[];
  const byOwner=new Uint8Array(8);
  for(let i=0;i<world.nextActiveCount;i++){
    const id=world.nextActive[i], victim=before[id];
    if(world.cells[id] || victim<1 || victim>6) continue;
    byOwner.fill(0);
    let actual=0, background=0, hostileOwners=0;
    for(let k=0;k<deg[id];k++){
      const owner=before[adj[6*id+k]];
      if(!owner) continue;
      const bit=1<<k;
      actual |= bit;
      if(owner===victim || owner===7) background |= bit;
      else { byOwner[owner] |= bit; hostileOwners |= 1<<owner; }
    }
    if(!hostileOwners || survives(world,deg[id],actual)) continue;
    const adjacent=[];
    for(let owner=1;owner<=6;owner++) if(byOwner[owner]) adjacent.push(owner);
    const event={id,victim,adjacent,attackers:[],coalitions:[]};
    if(survives(world,deg[id],background)){
      if(adjacent.length===1){
        event.attackers=adjacent;
        event.coalitions=[adjacent];
      }else{
        // Restore subsets atop the same baseline, by increasing mask. A
        // superset of any already lethal subset cannot be inclusion-minimal.
        const minimal=[];
        const contributors=new Set();
        for(let subset=1;subset<(1<<adjacent.length);subset++){
          if(minimal.some(prior=>(subset & prior)===prior)) continue;
          let mask=background;
          const group=[];
          for(let k=0;k<adjacent.length;k++) if(subset & (1<<k)){
            mask |= byOwner[adjacent[k]]; group.push(adjacent[k]);
          }
          if(survives(world,deg[id],mask)) continue;
          minimal.push(subset); event.coalitions.push(group);
          for(const owner of group) contributors.add(owner);
        }
        event.attackers=adjacent.filter(owner=>contributors.has(owner));
      }
    }
    events.push(event);
  }
  return events;
}
