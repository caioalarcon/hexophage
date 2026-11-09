// Sparse, simultaneous proposals on the production sphere and positional CA tables.
// Genotype, ownership and age belong to a site; the treasury belongs to its owner.
import {ruleProfiles} from '../../src/match/rule-profiles.js';

export const resolvers = Object.freeze(['contact', 'phase', 'guard', 'antimatter']);
export const defaultEconomy = Object.freeze({
  stampCost:8, birthCost:1, eraseCost:24, stableEnergy:1,
  stableAfter:12, productionScale:60, salvage:8, protectedMature:0, blastBirthCost:4, guardMultiplier:2, guardStampExtra:0, phasePriority:0,
});
const material = type => type?.resolver === 'contact' || type?.resolver === 'guard';
const bitCount = Array.from({length:64}, (_, i)=>i.toString(2).replaceAll('0','').length);
function mix(x) {
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}
function account(reserve) {
  return {reserve, income:0, births:0, stampSpent:0, birthSpent:0, eraseSpent:0,
    erased:0, lost:0, friendlyErased:0, ownLost:0, friendlyEraseSpent:0, field:0, mature:0, refused:0, eroded:0, detonations:0, waveBirths:0, waveErased:0,
    requested:0, requestedCost:0, unfundedCost:0, salvageIncome:0, lastFieldAt:0, out:false};
}
const EPS = 1e-9;

export function createTypedWorld(graph, {wallets=[10000,10000], seed=1, economy:overrides={}}={}) {
  const economy = Object.freeze({...defaultEconomy,...overrides});
  if (!wallets.length || wallets.some(v=>!Number.isFinite(v) || v<0) ||
      Object.values(economy).some(v=>!Number.isFinite(v) || v<0) || !Number.isSafeInteger(economy.protectedMature))
    throw new RangeError('Expected finite, nonnegative wallets and tariffs');
  if (economy.phasePriority!==0 && economy.phasePriority!==1)
    throw new RangeError('phasePriority must be 0 or 1');
  const rules = new Map(Object.entries(ruleProfiles).filter(([,p])=>p.physics && !p.physics.birthsFromVacuum));
  const types = new Map();
  function genotype(owner, rule, resolver, wave=false) {
    const key = owner+'/'+rule+'/'+resolver+'/'+Number(wave);
    if (!types.has(key)) types.set(key, Object.freeze({owner,rule,resolver,wave,
      tables:rules.get(rule).physics.tables}));
    return types.get(key);
  }
  const cell = (type, age) => Object.freeze({owner:type.owner,rule:type.rule,resolver:type.resolver,wave:type.wave,age,type});

  function instance(cells, players, gen, lastIgnitions=[], domain=null, outside=null) {
    const {adj,deg}=graph;
    const stampPrice=resolver=>economy.stampCost+(resolver==='guard'?economy.guardStampExtra:0);
    function canStamp(owner, rule, resolver, ids) {
      if (!Number.isInteger(owner) || owner<1 || owner>=players.length) return false;
      const p=players[owner];
      if (!p || p.out || !rules.has(rule) || !resolvers.includes(resolver) || !ids?.length ||
          new Set(ids).size!==ids.length || p.reserve+EPS<ids.length*stampPrice(resolver)) return false;
      for (const id of ids) {
        if (!Number.isSafeInteger(id) || id<0 || id>=graph.n || (domain && !domain.has(id)) || cells.has(id)) return false;
        for (let k=0;k<deg[id];k++) {
          const neighbor=cells.get(adj[id*6+k]);
          if (neighbor && neighbor.owner!==owner) return false;
        }
      }
      return true;
    }
    function stamp(owner,rule,resolver,ids) {
      if(!canStamp(owner,rule,resolver,ids))return false;
      const p=players[owner];
      p.field+=ids.length;
      if(economy.stableAfter<=1)p.mature+=ids.length;
      p.stampSpent+=ids.length*stampPrice(resolver);
      p.reserve=Math.max(0,p.reserve-ids.length*stampPrice(resolver));
      p.lastFieldAt=gen;
      for(const site of ids) cells.set(site,cell(genotype(owner,rule,resolver),1));
      return true;
    }
    function step() {
      const salt=mix(seed ^ mix(gen+1));
      const rank=id=>mix(id ^ salt);
      const next=new Map(), candidates=new Set(), mature=new Uint32Array(players.length);
      const fuses=[], spent=new Set(), ignitionClaims=new Map();
      for (const [id,c] of cells) {
        candidates.add(id);
        for (let k=0;k<deg[id];k++) {
          const n=adj[id*6+k];
          if(!domain || domain.has(n))candidates.add(n);
        }
        if (c.age>=economy.stableAfter) mature[c.owner]++;
        if (!c.wave && c.resolver==='antimatter') fuses.push(id);
      }
      // Coupon from mature cells at the opening snapshot, including remote farms.
      // A newborn cannot fund its own appearance in this generation.
      for (let id=1;id<players.length;id++) {
        const p=players[id], n=mature[id]+(outside?.[id].mature??0);
        const income=economy.stableEnergy*(economy.productionScale
          ? n/(1+n/economy.productionScale) : n);
        p.reserve+=income; p.income+=income;
      }
      lastIgnitions=[];
      const visited=new Set();
      for(const first of fuses) {
        if(visited.has(first))continue;
        const t=cells.get(first).type, group=[first];
        visited.add(first);
        let site, target, direction;
        for(let i=0;i<group.length;i++) {
          const id=group[i];
          for(let k=0;k<deg[id];k++) {
            const n=adj[6*id+k], other=cells.get(n);
            if(!other)continue;
            if(other.type===t && !visited.has(n)) { visited.add(n); group.push(n); }
            if(other.type!==t && (site===undefined || rank(id)>rank(site) ||
                id===site && rank(n)>rank(target))) {site=id;target=n;direction=k;}
          }
        }
        if(site===undefined)continue;
        const flanks=[1,-1].map(d=>adj[6*site+(deg[site]+direction+d)%deg[site]]);
        const flank=rank(flanks[0])>rank(flanks[1])?flanks[0]:flanks[1];
        // Clipping a forecast must never move its charge to a different vertex.
        const sites=domain && !domain.has(flank)?[site,target]:[site,target,flank];
        const wave=genotype(t.owner,'hex-b2s245','antimatter',true);
        for(const id of group)spent.add(id);
        for(const id of sites) {
          if(!ignitionClaims.has(id))ignitionClaims.set(id,[]);
          ignitionClaims.get(id).push({type:wave,mask:0,parent:site,ignition:true});
        }
        players[t.owner].detonations++;
        lastIgnitions.push({owner:t.owner,site,target,sites});
      }
      lastIgnitions.sort((a,b)=>rank(a.site)-rank(b.site));

      // Each type present in this neighbourhood proposes at most once. Contact
      // reads the material ring; phase and shock read only their own genotype.
      // A spectral neighbour cannot secretly kill a material survivor by crowding.
      const bySite=new Map(), resources=players.map(()=>[]), seized=new Set();
      const masks=new Map();
      for(const id of candidates) {
        masks.clear();
        const degree=deg[id], incumbent=cells.get(id);
        let materialMask=0;
        for(let k=0;k<degree;k++) {
          const parent=adj[6*id+k], c=cells.get(parent);
          if(!c || spent.has(parent))continue;
          if(material(c.type))materialMask|=1<<k;
          masks.set(c.type,(masks.get(c.type)??0)|(1<<k));
        }
        const oldType=incumbent?.type;
        const oldMask=material(oldType)?materialMask:masks.get(oldType)??0;
        const survives=incumbent && !spent.has(id) && oldType.tables[degree][1][oldMask];
        const guarded=survives && oldType.resolver==='guard' && bitCount[masks.get(oldType)??0]>=2;
        const claims=[];
        for(const [type,mask] of masks) {
          if(incumbent && (material(type) || incumbent.type===type ||
              !type.wave && (incumbent.owner===type.owner || guarded)))continue;
          if(!type.tables[degree][0][material(type)?materialMask:mask])continue;
          let parent;
          for(let k=0;k<degree;k++)if(mask&(1<<k)) {
            const n=adj[6*id+k]; if(parent===undefined || rank(n)>rank(parent))parent=n;
          }
          claims.push({type,mask,parent,ignition:false});
        }
        for(const c of ignitionClaims.get(id)??[]) {
          if(incumbent?.type!==c.type)claims.push(c);
        }
        if(!claims.length) {
          if(survives) {
            next.set(id,cell(oldType,incumbent.age+1));
            if(!oldType.wave) resources[oldType.owner].push(id);
          }
          continue;
        }
        // Support is local evidence. On exact ties the physical parent vertex
        // decides, independent of loop order, owner number and registration order.
        // Optional strict passage: a concurrent material birth cannot displace
        // a phase trajectory on previously empty ground. Hostile bodies still
        // require a funded cut, and an established guard retains its defence.
        const phaseFirst=!incumbent && economy.phasePriority && claims.some(c=>material(c.type));
        claims.sort((a,b)=>(phaseFirst && (Number(b.type.resolver==='phase')-Number(a.type.resolver==='phase'))) ||
          bitCount[b.mask]-bitCount[a.mask] || rank(b.parent)-rank(a.parent));
        bySite.set(id,{incumbent,survives,guarded,claims});
      }
      // A player can sell unchallenged non-wave survivors for a shock only.
      // Reject an unaffordable cut before killing anything or liquidating assets.
      const sortedCollateral=new Set();
      for (const id of [...bySite.keys()].sort((a,b)=>rank(a)-rank(b))) {
        const {incumbent,survives,guarded,claims}=bySite.get(id);
        let accepted=false;
        for(const {type,ignition} of claims) {
          const p=players[type.owner], enemy=incumbent && incumbent.owner!==type.owner;
          const birth=type.wave?economy.blastBirthCost:economy.birthCost;
          // Turning the spent carrier into the ignition nucleus is a conversion.
          // Occupied non-carrier allies pay the same cutting fee as enemies.
          const friendly=incumbent && !enemy && !(ignition && spent.has(id));
          const fee=enemy || friendly ? economy.eraseCost*(guarded?economy.guardMultiplier:1) : 0;
          const cost=birth+fee;
          const pile=resources[type.owner], short=Math.max(0,cost-p.reserve);
          const needed=short<=EPS?0:economy.salvage?Math.ceil((short-EPS)/economy.salvage):Infinity;
          p.requested++; p.requestedCost+=cost;
          if(needed && type.wave && !sortedCollateral.has(p)) {
            if(economy.protectedMature && pile.length) {
              // Retain the oldest unchallenged mature producers per treasury.
              // Equal-age ties stay stable across generations. Physical hits still apply.
              const protectedSites=new Set(pile.filter(site=>next.get(site).age>=economy.stableAfter)
                .sort((a,b)=>next.get(b).age-next.get(a).age || mix(a)-mix(b)).slice(0,economy.protectedMature));
              let count=0;
              for(const site of pile)if(!protectedSites.has(site))pile[count++]=site;
              pile.length=count;
            }
            pile.sort((a,b)=>rank(a)-rank(b));
            sortedCollateral.add(p);
          }
          if(needed && (!type.wave || needed>pile.length)) {
            p.refused++; p.unfundedCost+=cost;continue;
          }
          for(let n=0;n<needed;n++) {
            seized.add(pile.pop());p.eroded++;
            p.reserve+=economy.salvage;p.salvageIncome+=economy.salvage;
          }
          p.reserve=Math.max(0,p.reserve-cost);p.births++;p.birthSpent+=birth;
          if(type.wave)p.waveBirths++;
          if(enemy){p.eraseSpent+=fee;p.erased++;players[incumbent.owner].lost++;if(type.wave)p.waveErased++;}
          if(friendly){p.friendlyEraseSpent+=fee;p.friendlyErased++;p.ownLost++;}
          next.set(id,cell(type,1));accepted=true;break;
        }
        if(!accepted && survives)next.set(id,cell(incumbent.type,incumbent.age+1));
      }
      for(const id of seized)next.delete(id);
      gen++; cells=next;
      for(let id=1;id<players.length;id++) {
        players[id].field=outside?.[id].field??0;
        players[id].mature=outside?.[id].mature??0;
      }
      for(const c of next.values()){
        players[c.owner].field++;
        if(c.age>=economy.stableAfter)players[c.owner].mature++;
      }
      for(let id=1;id<players.length;id++) {
        const p=players[id];
        if(p.field)p.lastFieldAt=gen;
        else if(p.reserve+EPS<economy.stampCost)p.out=true;
      }
    }
    // A bounded fork keeps off-disk income frozen at its current value.
    // Only assets within its field of view can be liquidated in the forecast.
    function fork(sites) {
      const accounts=players.map(p=>p&&{...p});
      if(!sites)return instance(new Map(cells),accounts,gen,lastIgnitions.map(e=>({...e,sites:[...e.sites]})),domain,outside);
      const cut=new Set(domain ? [...sites].filter(id=>domain.has(id)) : sites), snapshot=new Map();
      const remote=players.map(p=>p&&{field:p.field,mature:p.mature});
      for(const id of cut){
        const c=cells.get(id);
        if(!c)continue;
        snapshot.set(id,c);
        remote[c.owner].field--;
        if(c.age>=economy.stableAfter)remote[c.owner].mature--;
      }
      return instance(snapshot,accounts,gen,[],cut,remote);
    }
    return {graph,economy,players,stamp,canStamp,step,fork,get cells(){return cells;},get gen(){return gen;},
      get lastIgnitions(){return lastIgnitions;}};
  }
  return instance(new Map(),[null,...wallets.map(account)],0);
}
