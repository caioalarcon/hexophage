// Sparse, simultaneous proposals on the production sphere and positional CA tables.
// Genotype, ownership and age belong to a site; the treasury belongs to its owner.
import {ruleProfiles} from '../../src/match/rule-profiles.js';
import {ballots,configureArbitration,material,rankProposals,resolvers} from './arbitration.mjs';
import {existenceModes,passageModes,senses,sensorMask,voteOnExistence} from './existence.mjs';

export {resolvers};
export {existenceModes,passageModes,senses};
export const defaultEconomy = Object.freeze({
  stampCost:8, birthCost:1, eraseCost:24, stableEnergy:1,birthEnergy:0,deathEnergy:0,
  stableAfter:12, productionScale:60, salvage:8, protectedMature:0, blastBirthCost:4, guardMultiplier:2, guardStampExtra:0, phasePriority:0,
});
const bitCount = Array.from({length:64}, (_, i)=>i.toString(2).replaceAll('0','').length);
function mix(x) {
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}
function account(reserve) {
  return {reserve, income:0, matureIncome:0,birthIncome:0,deathIncome:0,deaths:0,conventional:0,
    births:0, stamps:0, stampedCells:0, stampSpent:0, birthSpent:0, eraseSpent:0,
    erased:0, lost:0, friendlyErased:0, ownLost:0, friendlyEraseSpent:0, field:0, mature:0, refused:0, eroded:0, detonations:0, waveBirths:0, waveErased:0,
    requested:0, requestedCost:0, unfundedCost:0, salvageIncome:0, lastFieldAt:0, out:false};
}
const EPS = 1e-9;
const robustnessCache=new WeakMap();
// Count the one-neighbour perturbations accepted by the same physical table.
// Births use their actual sensor mask, survivors use the incumbent's mask.
function robustTables(tables) {
  if(!robustnessCache.has(tables)){
    const robust=[];
    for(const d of [5,6])robust[d]=tables[d].map(table=>Uint8Array.from(table,(_,mask)=>{
      let accepted=0;
      for(let k=0;k<d;k++)accepted+=table[mask^(1<<k)];
      return accepted;
    }));
    robustnessCache.set(tables,robust);
  }
  return robustnessCache.get(tables);
}

export function createTypedWorld(graph, {wallets=[10000,10000], seed=1, economy:overrides={},
  arbitration='legacy',eligibility='legacy',friendlyFire=false,existence='legacy',passage='legacy',onContest,onBirth,onExistence}={}) {
  const policy=configureArbitration(arbitration);
  if(!['legacy','contest'].includes(eligibility) || typeof friendlyFire!=='boolean' ||
      !existenceModes.includes(existence) || !passageModes.includes(passage))
    throw RangeError('Invalid claim eligibility');
  const economy = Object.freeze({...defaultEconomy,...overrides});
  if (!wallets.length || wallets.some(v=>!Number.isFinite(v) || v<0) ||
      Object.values(economy).some(v=>!Number.isFinite(v) || v<0) || !Number.isSafeInteger(economy.protectedMature))
    throw new RangeError('Expected finite, nonnegative wallets and tariffs');
  if (economy.phasePriority!==0 && economy.phasePriority!==1)
    throw new RangeError('phasePriority must be 0 or 1');
  const rules = new Map(Object.entries(ruleProfiles).filter(([,p])=>p.physics && !p.physics.birthsFromVacuum));
  const types = new Map();
  function genotype(owner, rule, resolver, ballot='support', sense='native',wave=false) {
    const key = owner+'/'+rule+'/'+resolver+'/'+ballot+'/'+sense+'/'+Number(wave);
    if (!types.has(key)) types.set(key, Object.freeze({owner,rule,resolver,ballot,sense,wave,
      tables:rules.get(rule).physics.tables,robust:robustTables(rules.get(rule).physics.tables)}));
    return types.get(key);
  }
  const cell = (type, age) => Object.freeze({owner:type.owner,rule:type.rule,resolver:type.resolver,ballot:type.ballot,
    sense:type.sense,wave:type.wave,age,type});

  function instance(cells, players, gen, lastIgnitions=[], domain=null, outside=null,observe=false) {
    const {adj,deg}=graph;
    const stampPrice=resolver=>economy.stampCost+(resolver==='guard'?economy.guardStampExtra:0);
    function canStamp(owner, rule, resolver, ids, ballot='support',sense='native') {
      if (!Number.isInteger(owner) || owner<1 || owner>=players.length) return false;
      const p=players[owner];
      if (!p || p.out || !rules.has(rule) || !resolvers.includes(resolver) || !ballots.includes(ballot) || !senses.includes(sense) || !ids?.length ||
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
    function stamp(owner,rule,resolver,ids,ballot='support',sense='native') {
      if(!canStamp(owner,rule,resolver,ids,ballot,sense))return false;
      const p=players[owner];
      p.field+=ids.length;p.conventional+=ids.length;
      p.stamps++;p.stampedCells+=ids.length;
      if(economy.stableAfter<=1)p.mature+=ids.length;
      p.stampSpent+=ids.length*stampPrice(resolver);
      p.reserve=Math.max(0,p.reserve-ids.length*stampPrice(resolver));
      p.lastFieldAt=gen;
      for(const site of ids) cells.set(site,cell(genotype(owner,rule,resolver,ballot,sense),1));
      return true;
    }
    function step(hooks) {
      const contestEvent=hooks?.onContest??(observe && onContest);
      const birthEvent=hooks?.onBirth??(observe && onBirth);
      const existenceEvent=hooks?.onExistence??(observe && onExistence);
      const decisions=existenceEvent && existence!=='legacy'?new Map():null;
      const births=new Uint32Array(players.length),priorField=new Uint32Array(players.length),sales=new Uint32Array(players.length);
      const salt=mix(seed ^ mix(gen+1));
      const rank=id=>mix(id ^ salt);
      const next=new Map(), candidates=new Set(), mature=new Uint32Array(players.length);
      const fuses=[], spent=new Set(), ignitionClaims=new Map();
      for (const [id,c] of cells) {
        priorField[c.owner]++;
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
        p.reserve+=income; p.income+=income;p.matureIncome+=income;
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
        const wave=genotype(t.owner,'hex-b2s245','antimatter',t.ballot,t.sense,true);
        for(const id of group)spent.add(id);
        for(const id of sites) {
          if(!ignitionClaims.has(id))ignitionClaims.set(id,[]);
          ignitionClaims.get(id).push({type:wave,support:0,age:cells.get(site).age,robustness:0,parent:site,kind:'ignition'});
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
        const decision=existence==='legacy'?null:voteOnExistence(existence,degree,materialMask,masks,oldType);
        if(decisions && decision.votes.size)decisions.set(id,decision);
        const oldMask=oldType?sensorMask(oldType,materialMask,masks.get(oldType)??0):0;
        const survives=incumbent && !spent.has(id) && oldType.tables[degree][1][oldMask] &&
          (!decision || !material(oldType) || decision.approve);
        const guarded=survives && oldType.resolver==='guard' && bitCount[masks.get(oldType)??0]>=2;
        const claims=[];
        for(const [type,mask] of masks) {
          const voted=decision && material(type);
          const observed=sensorMask(type,materialMask,mask);
          // On an occupied material site the explicit ballot tests S for every
          // potential successor. Its YES is an identity claim if life passes.
          const state=voted && material(oldType)?1:0;
          if(voted && !decision.approve || !type.tables[degree][state][observed])continue;
          if(incumbent){
            if(incumbent.type===type)continue;
            if(voted && material(oldType)){
              if(survives && !friendlyFire && incumbent.owner===type.owner)continue;
            }else {
              if(eligibility==='legacy' && (material(type) || !type.wave && (incumbent.owner===type.owner || guarded)))continue;
              if(eligibility==='contest' && !friendlyFire && !type.wave && incumbent.owner===type.owner)continue;
            }
            if(passage==='literal' && type.resolver==='phase' && guarded)continue;
          }
          let parent,age=0;
          for(let k=0;k<degree;k++)if(mask&(1<<k)) {
            const n=adj[6*id+k];
            if(parent===undefined || rank(n)>rank(parent))parent=n;
            age=Math.max(age,cells.get(n).age);
          }
          claims.push({type,support:bitCount[mask],age,robustness:type.robust[degree][state][observed],parent,kind:'birth'});
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
        // Under the old admission rule survival is a fallback after bids. In a
        // contest the physically viable incumbent also casts a ballot and bids.
        const resident=survives?{type:oldType,support:bitCount[masks.get(oldType)??0],age:incumbent.age,
          robustness:oldType.robust[degree][1][oldMask],parent:id,kind:'survival'}:null;
        const passive=resident && eligibility==='legacy' && !(decision && material(oldType)) &&
          !(passage==='literal' && oldType.resolver==='phase');
        if(resident && !passive)claims.push(resident);
        const {cycle,anyCycle}=rankProposals(policy,claims,rank,!incumbent,economy.phasePriority,passage);
        if(passive)claims.push(resident);
        bySite.set(id,{incumbent,guarded,claims,cycle,anyCycle,resident,passive:!!passive});
      }
      // A player can sell unchallenged non-wave survivors for a shock only.
      // Reject an unaffordable cut before killing anything or liquidating assets.
      const sortedCollateral=new Set();
      for (const id of [...bySite.keys()].sort((a,b)=>rank(a)-rank(b))) {
        const {incumbent,guarded,claims,cycle,anyCycle,resident,passive}=bySite.get(id);
        let winner=null;
        for(const claim of claims) {
          const {type,kind}=claim;
          if(kind==='survival') {
            next.set(id,cell(type,incumbent.age+1));winner=claim;break;
          }
          const p=players[type.owner], enemy=incumbent && incumbent.owner!==type.owner;
          const birth=type.wave?economy.blastBirthCost:economy.birthCost;
          // Turning the spent carrier into the ignition nucleus is a conversion.
          // Occupied non-carrier allies pay the same cutting fee as enemies.
          const friendly=incumbent && !enemy && !(kind==='ignition' && spent.has(id));
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
            seized.add(pile.pop());p.eroded++;sales[type.owner]++;
            p.reserve+=economy.salvage;p.salvageIncome+=economy.salvage;
          }
          p.reserve=Math.max(0,p.reserve-cost);p.births++;births[type.owner]++;p.birthSpent+=birth;
          if(type.wave)p.waveBirths++;
          if(enemy){p.eraseSpent+=fee;p.erased++;players[incumbent.owner].lost++;if(type.wave)p.waveErased++;}
          if(friendly){p.friendlyEraseSpent+=fee;p.friendlyErased++;p.ownLost++;}
          next.set(id,cell(type,1));winner=claim;
          if(birthEvent)birthEvent({gen:gen+1,site:id,...describe(claim,rank)});
          break;
        }
        if(contestEvent && claims.length>=2){
          // Emit only the observed state, never the shared transition tables.
          const observed=incumbent && observedCell(incumbent);
          const ordered=claims.map(c=>describe(c,rank));
          contestEvent({gen:gen+1,site:id,incumbent:observed??null,eligibility,passage,passiveResident:passive,phasePriority:economy.phasePriority,
            survives:!!resident,claims:ordered,preferred:ordered[0],winner:winner?ordered[claims.indexOf(winner)]:null,cycle,anyCycle});
        }
      }
      for(const id of seized)next.delete(id);
      if(decisions)for(const [site,d] of decisions){
        const votes=[...d.votes].map(([type,v])=>({owner:type.owner,rule:type.rule,resolver:type.resolver,ballot:type.ballot,sense:type.sense,...v}));
        const old=cells.get(site),winner=next.get(site);
        existenceEvent({gen:gen+1,site,policy:existence,aliveBefore:d.aliveBefore,approved:d.approve,yes:d.yes,no:d.no,
          weightYes:d.weightYes,weightNo:d.weightNo,votes,incumbent:old?observedCell(old):null,winner:winner?observedCell(winner):null});
      }
      gen++; cells=next;
      for(let id=1;id<players.length;id++) {
        players[id].field=outside?.[id].field??0;
        players[id].mature=outside?.[id].mature??0;
        players[id].conventional=outside?.[id].conventional??0;
      }
      for(const c of next.values()){
        players[c.owner].field++;
        if(!c.wave)players[c.owner].conventional++;
        if(c.age>=economy.stableAfter)players[c.owner].mature++;
      }
      for(let id=1;id<players.length;id++) {
        const p=players[id];
        // Registered changes of identity count as a birth for the new owner
        // and a death for the old one. Stamp placement and asset liquidation
        // have separate ledgers. Closing revenue cannot fund its own event.
        const deaths=priorField[id]+births[id]-(p.field-(outside?.[id].field??0))-sales[id];
        const born=births[id]*economy.birthEnergy, dead=deaths*economy.deathEnergy;
        p.deaths+=deaths;p.birthIncome+=born;p.deathIncome+=dead;
        p.income+=born+dead;p.reserve+=born+dead;
        p.lastBirths=births[id];p.lastDeaths=deaths;
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
      const remote=players.map(p=>p&&{field:p.field,mature:p.mature,conventional:p.conventional});
      for(const id of cut){
        const c=cells.get(id);
        if(!c)continue;
        snapshot.set(id,c);
        remote[c.owner].field--;
        if(c.age>=economy.stableAfter)remote[c.owner].mature--;
        if(!c.wave)remote[c.owner].conventional--;
      }
      return instance(snapshot,accounts,gen,[],cut,remote);
    }
    return {graph,economy,arbitration:policy,eligibility,friendlyFire,existence,passage,players,stampPrice,stamp,canStamp,step,fork,get cells(){return cells;},get gen(){return gen;},
      get lastIgnitions(){return lastIgnitions;}};
  }
  return instance(new Map(),[null,...wallets.map(account)],0,[],null,null,true);
}

function observedCell({owner,rule,resolver,ballot,sense,wave,age}){
  return {owner,rule,resolver,ballot,sense,wave,age};
}
function describe({type:{owner,rule,resolver,ballot,sense,wave},support,age,robustness,parent,kind},rank) {
  return {owner,rule,resolver,ballot,sense,wave,support,age,robustness,parent,geometry:rank(parent),kind};
}
