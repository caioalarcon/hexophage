// Empty-site variant for Callahan: remove rival occupancies only, keeping the
// preceding generation unchanged elsewhere. Neutrals never create a claim.
export function suppressedBirths(world) {
  if(world.rule!=='callahan')throw Error('This estimator requires the Callahan birth rule');
  const {adj,deg}=world.graph, before=world.nextOwners;
  const candidates=new Set(), events=[], byOwner=new Uint8Array(7);
  for(let i=0;i<world.nextActiveCount;i++){
    const live=world.nextActive[i];
    if(before[live]===7) continue;
    for(let k=0;k<deg[live];k++){
      const id=adj[live*6+k];
      if(!before[id] && !world.owners[id]) candidates.add(id);
    }
  }
  for(const id of candidates){
    byOwner.fill(0);
    let neutral=false;
    for(let k=0;k<deg[id];k++){
      const owner=before[adj[id*6+k]];
      if(owner===7){neutral=true;break;}
      if(owner)byOwner[owner]|=1<<k;
    }
    if(neutral)continue;
    const groups=[];
    for(let owner=1;owner<=6;owner++)if(byOwner[owner])groups.push(owner);
    if(groups.length<2)continue;
    const births=deg[id]===5?world.callBirth5:world.callBirth6;
    for(const victim of groups)if(births[byOwner[victim]])
      events.push({id,victim,attackers:groups.filter(owner=>owner!==victim)});
  }
  return events;
}
