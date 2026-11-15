// Sparse, simultaneous proposals on the production sphere and positional CA tables.
// Genotype, ownership and age belong to a site; the treasury belongs to its owner.
import {ruleProfiles} from '../../src/match/rule-profiles.js';
import {ballots,configureArbitration,material,rankProposals,resolvers} from './arbitration.mjs';
import {existenceModes,passageModes,senses,sensorMask,voteOnExistence} from './existence.mjs';
import {circularSites,normalizeToolSettings} from '../../src/mixed/field-tools.js';
import {normalizeSpatial,typeTraits,graphBall,illuminated,sameNeighborhood} from './spatial.mjs';
import {fundLocalRequests} from './spatial-funding.mjs';

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
    requested:0, requestedCost:0, unfundedCost:0, salvageIncome:0, toolErased:0, eraseActions:0, lastFieldAt:0, out:false,
    energyLost:0,energyOverflow:0};
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

export function createTypedWorld(graph, {wallets=[10000,10000], seed=1, economy:overrides={},spatial:spatialOptions={},
  arbitration='legacy',eligibility='legacy',friendlyFire=false,existence='legacy',passage='legacy',toolSettings={},onContest,onBirth,onExistence}={}) {
  const policy=configureArbitration(arbitration);
  if(!['legacy','contest'].includes(eligibility) || typeof friendlyFire!=='boolean' ||
      !existenceModes.includes(existence) || !passageModes.includes(passage))
    throw RangeError('Invalid claim eligibility');
  const economy = Object.freeze({...defaultEconomy,...overrides});
  const spatial=normalizeSpatial(spatialOptions);
  if (!wallets.length || wallets.some(v=>!Number.isFinite(v) || v<0) ||
      Object.values(economy).some(v=>!Number.isFinite(v) || v<0) || !Number.isSafeInteger(economy.protectedMature))
    throw new RangeError('Expected finite, nonnegative wallets and tariffs');
  if (economy.phasePriority!==0 && economy.phasePriority!==1)
    throw new RangeError('phasePriority must be 0 or 1');
  const rules = new Map(Object.entries(ruleProfiles).filter(([,p])=>p.physics && !p.physics.birthsFromVacuum));
  const types = new Map();
  function genotype(owner, rule, resolver, ballot='support', sense='native',wave=false,contract='') {
    const key = owner+'/'+rule+'/'+resolver+'/'+ballot+'/'+sense+'/'+Number(wave)+'/'+contract;
    if (!types.has(key)) types.set(key, Object.freeze({owner,rule,resolver,ballot,sense,wave,
      ...(contract?{contract}:{}),
      tables:rules.get(rule).physics.tables,robust:robustTables(rules.get(rule).physics.tables)}));
    return types.get(key);
  }
  const cell = (type, age,energy=0,stableAge=1) => Object.freeze({owner:type.owner,rule:type.rule,resolver:type.resolver,ballot:type.ballot,
    sense:type.sense,wave:type.wave,age,type,...(type.contract?{contract:type.contract}:{}),...(spatial.enabled?{energy,stableAge}:{})});
  const isMature=c=>spatial.enabled?!c.wave&&c.stableAge>=typeTraits(spatial,c.type).stableAfter:c.age>=economy.stableAfter;

  function instance(cells, players, gen, lastIgnitions=[], domain=null, outside=null,observe=false,limits=normalizeToolSettings(toolSettings),actionRevision=0,exploration=null) {
    const {adj,deg}=graph;
    const explored=players.map((p,i)=>p?new Set(exploration?.[i]??[]):null),vision=new Map();
    function visibility(owner){
      if(!players[owner])return {visible:new Set(),explored:new Set()};
      if(!spatial.enabled)return {visible:null,explored:null};
      if(!vision.has(owner)){
        const visible=illuminated(graph,cells,owner,spatial,domain);
        for(const id of visible)explored[owner].add(id);
        vision.set(owner,{visible,explored:explored[owner]});
      }
      return vision.get(owner);
    }
    const canSee=(owner,id)=>!spatial.enabled||spatial.fullMap||visibility(owner).visible?.has(id)===true;
    const canBuild=(owner,id)=>!spatial.enabled||visibility(owner).explored?.has(id)===true;
    function refreshVision(){
      if(!spatial.enabled)return;
      vision.clear();for(let owner=1;owner<players.length;owner++)visibility(owner);
    }
    function syncEnergy(){
      if(!spatial.enabled)return;
      for(let owner=1;owner<players.length;owner++)if(players[owner].stamps)
        players[owner].reserve=outside?.[owner]?.energy??0;
      for(const c of cells.values())players[c.owner].reserve+=c.energy;
    }
    function patchEnergy(site,energy){
      const c=cells.get(site);cells.set(site,cell(c.type,c.age,Math.max(0,energy),c.stableAge));
    }
    function resetNearbyMaturity(ids){
      if(!spatial.enabled)return;
      for(const site of graphBall(graph,ids,1,domain)){
        const c=cells.get(site);
        if(c){
          if(isMature(c)&&typeTraits(spatial,c.type).stableAfter>1)players[c.owner].mature--;
          cells.set(site,cell(c.type,c.age,c.energy,1));
        }
      }
    }
    // Subscribers belong to this instance; forecasts never notify the live bot.
    const actionListeners=new Set();
    function subscribeActions(listener){
      if(typeof listener!=='function')throw TypeError('Expected an action listener');
      actionListeners.add(listener);return ()=>actionListeners.delete(listener);
    }
    function changed(kind,owner,ids=[]){
      refreshVision();
      actionRevision++;
      if(!actionListeners.size)return;
      const event=Object.freeze({kind,owner,ids:Object.freeze([...ids]),gen,revision:actionRevision});
      for(const listener of actionListeners)listener(event);
    }
    const stampPrice=resolver=>economy.stampCost+(resolver==='guard'?economy.guardStampExtra:0);
    function stampQuote(rule,resolver,ids,metadata={}){
      const traits=typeTraits(spatial,{rule,resolver,contract:metadata.contract??'',wave:false});
      const count=typeof ids==='number'?ids:ids?.length??0;
      const cost=count*stampPrice(resolver),fuel=spatial.enabled?count*traits.stampEnergy:0;
      return {cost,fuel,total:cost+fuel,perCell:stampPrice(resolver)+(spatial.enabled?traits.stampEnergy:0),traits};
    }
    function donorsNear(owner,id,range,variable=false){
      const donors=[],queue=[[id,0]],seen=new Set([id]);
      for(let i=0;i<queue.length;i++){
        const [site,distance]=queue[i],c=cells.get(site);
        if(c?.owner===owner && (!variable||!c.wave&&typeTraits(spatial,c.type).visionRadius>=distance))donors.push(site);
        if(distance>=range)continue;
        for(let k=0;k<deg[site];k++){
          const next=adj[6*site+k];if(seen.has(next)||(domain&&!domain.has(next)))continue;
          seen.add(next);queue.push([next,distance+1]);
        }
      }
      return donors.sort((a,b)=>a-b);
    }
    const maxVision=Math.max(spatial.visionRadius,...Object.values(spatial.types).map(t=>t.visionRadius??0));
    function localReserve(owner,ids){
      if(!spatial.enabled)return players[owner]?.reserve??0;
      const donors=new Set();for(const id of ids??[])for(const site of donorsNear(owner,id,maxVision,true))donors.add(site);
      return [...donors].reduce((sum,id)=>sum+(cells.get(id)?.energy??0),0);
    }
    function stampFunding(owner,ids,price,deposit){
      const requests=Array.from(ids,id=>({id,donors:donorsNear(owner,id,maxVision,true)}));
      const balances=new Map();
      for(const request of requests)for(const donor of request.donors)if(!balances.has(donor))balances.set(donor,cells.get(donor).energy);
      const local=fundLocalRequests(requests,balances,price+deposit);
      if(local||spatial.constructionFunding==='local')return local;
      // A discovered territory can be resupplied from the surviving cellular
      // treasury. Natural births still use strictly local parental fuel.
      const total=ids.length*(price+deposit);
      const donors=[...cells].filter(([,c])=>c.owner===owner&&!c.wave&&c.energy>EPS)
        .sort(([a],[b])=>a-b);
      let remaining=total;const remote=new Map();
      for(const [site,c] of donors){
        const taken=Math.min(c.energy,remaining);
        if(taken>EPS){remote.set(site,taken);remaining-=taken;}
        if(remaining<=EPS)break;
      }
      return remaining<=EPS?remote:null;
    }
    function stampRejection(owner, rule, resolver, ids, ballot='support',sense='native',metadata={},bootstrap=false) {
      if (!Number.isInteger(owner) || owner<1 || owner>=players.length) return 'owner';
      const p=players[owner];
      if (!p || p.out || !rules.has(rule) || !resolvers.includes(resolver) || !ballots.includes(ballot) || !senses.includes(sense) || !ids?.length ||
          ids.length>limits.maxStampCells || new Set(ids).size!==ids.length ||
          !metadata||typeof metadata!=='object'||
          metadata.contract!==undefined&&(typeof metadata.contract!=='string'||metadata.contract.length>128)) return 'invalid';
      for (const id of ids) {
        if (!Number.isSafeInteger(id) || id<0 || id>=graph.n || (domain && !domain.has(id)))return 'invalid';
        if(spatial.enabled&&!bootstrap&&!canBuild(owner,id))return 'darkness';
        if(cells.has(id))return 'occupied';
        for (let k=0;k<deg[id];k++) {
          const neighbor=cells.get(adj[id*6+k]);
          if (neighbor && neighbor.owner!==owner) return 'enemy';
        }
      }
      // Default construction spacing protects independently designed cellular machines.
      // Zero restores free combinatorial construction, including deliberate collisions.
      if(spatial.enabled&&!bootstrap&&spatial.safeStampGap>0){
        for(const site of graphBall(graph,ids,spatial.safeStampGap,domain))
          if(cells.get(site)?.owner===owner)return 'near-own';
      }
      if(spatial.enabled&&!bootstrap){
        const type=genotype(owner,rule,resolver,ballot,sense,false,metadata.contract??''),traits=typeTraits(spatial,type);
        if(!stampFunding(owner,ids,stampPrice(resolver),traits.stampEnergy))return 'local-energy';
      }else if(p.reserve+EPS<ids.length*stampPrice(resolver))return 'energy';
      return null;
    }
    function canStamp(owner,rule,resolver,ids,ballot='support',sense='native',metadata={}){
      return stampRejection(owner,rule,resolver,ids,ballot,sense,metadata)===null;
    }
    function placeStamp(owner,rule,resolver,ids,ballot,sense,metadata,bootstrap){
      if(stampRejection(owner,rule,resolver,ids,ballot,sense,metadata,bootstrap))return false;
      const p=players[owner];
      const type=genotype(owner,rule,resolver,ballot,sense,false,metadata.contract??''),traits=typeTraits(spatial,type);
      let deposit=0;
      if(spatial.enabled){
        if(bootstrap){
          const available=p.reserve-ids.length*stampPrice(resolver);
          deposit=Math.min(traits.cellCapacity,available/ids.length);
          p.energyLost+=Math.max(0,available-deposit*ids.length);
        }else{
          deposit=traits.stampEnergy;
          const plan=stampFunding(owner,ids,stampPrice(resolver),deposit);
          for(const [site,spent] of plan)patchEnergy(site,cells.get(site).energy-spent);
        }
      }
      p.field+=ids.length;p.conventional+=ids.length;
      p.stamps++;p.stampedCells+=ids.length;
      if((spatial.enabled?traits.stableAfter:economy.stableAfter)<=1)p.mature+=ids.length;
      p.stampSpent+=ids.length*stampPrice(resolver);
      if(!spatial.enabled)p.reserve=Math.max(0,p.reserve-ids.length*stampPrice(resolver));
      p.lastFieldAt=gen;
      for(const site of ids) cells.set(site,cell(type,1,deposit,1));
      resetNearbyMaturity(ids);syncEnergy();
      changed('stamp',owner,ids);
      return true;
    }
    function stamp(owner,rule,resolver,ids,ballot='support',sense='native',metadata={}){
      return placeStamp(owner,rule,resolver,ids,ballot,sense,metadata,false);
    }
    function bootstrapStamp(owner,rule,resolver,ids,ballot='support',sense='native',metadata={}){
      if(!spatial.enabled)return stamp(owner,rule,resolver,ids,ballot,sense,metadata);
      if(gen!==0||!players[owner]||players[owner].stamps!==0||[...cells.values()].some(c=>c.owner===owner))return false;
      return placeStamp(owner,rule,resolver,ids,ballot,sense,metadata,true);
    }
    function setToolSettings(values){
      const next=normalizeToolSettings(values,limits);
      const differs=Object.keys(next).some(key=>next[key]!==limits[key]);
      limits=next;if(differs)changed('settings',0);return limits;
    }
    function erasePreview(owner,center,radius){
      if(!Number.isInteger(owner)||owner<1||owner>=players.length||players[owner].out ||
          !Number.isSafeInteger(radius)||radius<0||radius>limits.maxEraseRadius)return [];
      return circularSites(graph,center,radius).filter(site=>(!domain||domain.has(site))&&cells.get(site)?.owner===owner);
    }
    function erase(owner,center,radius){
      const ids=erasePreview(owner,center,radius);
      if(!ids.length)return 0;
      const p=players[owner];
      for(const site of ids){
        const c=cells.get(site);cells.delete(site);p.field--;
        if(spatial.enabled)p.energyLost+=c.energy;
        if(!c.wave)p.conventional--;
        if(isMature(c))p.mature--;
      }
      resetNearbyMaturity(ids);syncEnergy();
      p.toolErased+=ids.length;p.eraseActions++;changed('erase',owner,ids);
      // No event revenue, salvage, combat credit or immediate resurrection.
      // The usual match settlement decides elimination on its next step.
      return ids.length;
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
      const balances=spatial.enabled?new Map([...cells].map(([id,c])=>[id,c.energy])):null;
      const newbornStores=new Map();
      const fuses=[], spent=new Set(), ignitionClaims=new Map();
      for (const [id,c] of cells) {
        priorField[c.owner]++;
        candidates.add(id);
        for (let k=0;k<deg[id];k++) {
          const n=adj[id*6+k];
          if(!domain || domain.has(n))candidates.add(n);
        }
        if (isMature(c)) mature[c.owner]++;
        if (!c.wave && c.resolver==='antimatter') fuses.push(id);
      }
      // Coupon from mature cells at the opening snapshot, including remote farms.
      // A newborn cannot fund its own appearance in this generation.
      for (let id=1;!spatial.enabled&&id<players.length;id++) {
        const p=players[id], n=mature[id]+(outside?.[id].mature??0);
        const income=economy.stableEnergy*(economy.productionScale
          ? n/(1+n/economy.productionScale) : n);
        p.reserve+=income; p.income+=income;p.matureIncome+=income;
      }
      if(spatial.enabled)for(const [id,c] of cells){
        const traits=typeTraits(spatial,c.type),p=players[c.owner];
        if(c.wave||c.stableAge<traits.stableAfter)continue;
        const income=Math.min(traits.stableEnergy,Math.max(0,traits.cellCapacity-balances.get(id)));
        balances.set(id,balances.get(id)+income);p.income+=income;p.matureIncome+=income;
        p.energyOverflow+=traits.stableEnergy-income;
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
        const wave=genotype(t.owner,'hex-b2s245','antimatter',t.ballot,t.sense,true,t.contract??'');
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
          if(spatial.enabled){
            const traits=typeTraits(spatial,type),donors=donorsNear(type.owner,id,traits.birthRadius);
            const available=donors.reduce((sum,site)=>sum+balances.get(site),0),required=cost+traits.newbornEnergy;
            p.requested++;p.requestedCost+=cost;
            if(available+EPS<required){p.refused++;p.unfundedCost+=cost;continue;}
            let remaining=required;
            // Equal sharing avoids making the lowest-index parent the permanent
            // fuel source. The complete cost is checked before any debit.
            let active=donors.filter(site=>balances.get(site)>EPS);
            while(remaining>EPS&&active.length){
              const portion=remaining/active.length;let paid=0;
              for(const site of active){const debit=Math.min(portion,balances.get(site));balances.set(site,balances.get(site)-debit);paid+=debit;}
              remaining-=paid;active=active.filter(site=>balances.get(site)>EPS);
            }
            p.births++;births[type.owner]++;p.birthSpent+=birth;
            if(type.wave)p.waveBirths++;
            if(enemy){p.eraseSpent+=fee;p.erased++;players[incumbent.owner].lost++;if(type.wave)p.waveErased++;}
            if(friendly){p.friendlyEraseSpent+=fee;p.friendlyErased++;p.ownLost++;}
            next.set(id,cell(type,1,traits.newbornEnergy));newbornStores.set(id,traits.newbornEnergy);winner=claim;
            if(birthEvent)birthEvent({gen:gen+1,site:id,...describe(claim,rank)});
            break;
          }
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
      if(spatial.enabled){
        for(const [id,c] of next){
          const old=cells.get(id),survivor=!newbornStores.has(id)&&old?.type===c.type;
          const energy=survivor?balances.get(id):newbornStores.get(id)??0;
          const stableAge=survivor&&sameNeighborhood(graph,cells,next,id)?old.stableAge+1:1;
          next.set(id,cell(c.type,c.age,energy,stableAge));
        }
        for(const [id,c] of [...cells].sort(([a],[b])=>a-b)){
          if(next.get(id)?.type===c.type&&!newbornStores.has(id))continue;
          // A moving automaton carries its conserved fuel through local lineage.
          // Closing inheritance cannot pay for births rejected earlier this tick.
          let remaining=balances.get(id);
          let heirs=[...graphBall(graph,[id],typeTraits(spatial,c.type).inheritanceRadius,domain)].filter(site=>next.get(site)?.type===c.type);
          while(remaining>EPS&&heirs.length){
            const portion=remaining/heirs.length;let moved=0;
            for(const site of heirs){
              const heir=next.get(site),capacity=typeTraits(spatial,heir.type).cellCapacity;
              const received=Math.min(portion,Math.max(0,capacity-heir.energy));moved+=received;
              next.set(site,cell(heir.type,heir.age,heir.energy+received,heir.stableAge));
            }
            remaining-=moved;heirs=heirs.filter(site=>next.get(site).energy+EPS<typeTraits(spatial,next.get(site).type).cellCapacity);
          }
          players[c.owner].energyLost+=Math.max(0,remaining);
        }
      }
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
        if(isMature(c))players[c.owner].mature++;
      }
      for(let id=1;id<players.length;id++) {
        const p=players[id];
        // Registered changes of identity count as a birth for the new owner
        // and a death for the old one. Stamp placement and asset liquidation
        // have separate ledgers. Closing revenue cannot fund its own event.
        const deaths=priorField[id]+births[id]-(p.field-(outside?.[id].field??0))-sales[id];
        const born=spatial.enabled?0:births[id]*economy.birthEnergy, dead=spatial.enabled?0:deaths*economy.deathEnergy;
        p.deaths+=deaths;p.birthIncome+=born;p.deathIncome+=dead;
        p.income+=born+dead;p.reserve+=born+dead;
        p.lastBirths=births[id];p.lastDeaths=deaths;
        if(p.field)p.lastFieldAt=gen;
        else if(p.reserve+EPS<economy.stampCost)p.out=true;
      }
      syncEnergy();refreshVision();
      if(spatial.enabled)for(let owner=1;owner<players.length;owner++)if(!players[owner].field&&players[owner].stamps)players[owner].out=true;
    }
    // A bounded fork keeps off-disk income frozen at its current value.
    // Only assets within its field of view can be liquidated in the forecast.
    function fork(sites) {
      const accounts=players.map(p=>p&&{...p});
      if(!sites)return instance(new Map(cells),accounts,gen,lastIgnitions.map(e=>({...e,sites:[...e.sites]})),domain,outside?.map(p=>p&&{...p}),false,limits,actionRevision,explored);
      const cut=new Set(domain ? [...sites].filter(id=>domain.has(id)) : sites), snapshot=new Map();
      const remote=players.map(p=>p&&{field:p.field,mature:p.mature,conventional:p.conventional,energy:spatial.enabled?p.reserve:0});
      for(const id of cut){
        const c=cells.get(id);
        if(!c)continue;
        snapshot.set(id,c);
        remote[c.owner].field--;
        if(isMature(c))remote[c.owner].mature--;
        if(!c.wave)remote[c.owner].conventional--;
        if(spatial.enabled)remote[c.owner].energy-=c.energy;
      }
      return instance(snapshot,accounts,gen,[],cut,remote,false,limits,actionRevision,explored);
    }
    function forkObserved(owner,sites){
      if(!spatial.enabled)return fork(sites);
      const view=visibility(owner),cut=sites?new Set(domain?[...sites].filter(id=>domain.has(id)):sites):domain;
      const snapshot=new Map(),accounts=players.map((p,id)=>p&&(id===owner?{...p}:account(0)));
      const remote=players.map(p=>p&&{field:0,mature:0,conventional:0,energy:0});
      for(const [id,c] of cells){
        if(c.owner!==owner&&!canSee(owner,id))continue;
        if(c.owner!==owner){const p=accounts[c.owner];p.field++;if(!c.wave)p.conventional++;if(isMature(c))p.mature++;p.reserve+=c.energy;p.stamps=1;}
        if(!cut||cut.has(id))snapshot.set(id,c);
        else {const r=remote[c.owner];r.field++;if(!c.wave)r.conventional++;if(isMature(c))r.mature++;r.energy+=c.energy;}
      }
      const knowledge=explored.map((v,id)=>v&&(id===owner?new Set(v):new Set()));
      return instance(snapshot,accounts,gen,[],cut,remote,false,limits,actionRevision,knowledge);
    }
    return {graph,economy,spatial,arbitration:policy,eligibility,friendlyFire,existence,passage,players,stampPrice,stampQuote,stamp,canStamp,stampRejection,bootstrapStamp,
      visibility,canSee,canBuild,localReserve,erase,erasePreview,setToolSettings,subscribeActions,step,fork,forkObserved,get cells(){return cells;},get gen(){return gen;},
      get toolSettings(){return limits;},get actionRevision(){return actionRevision;},
      get lastIgnitions(){return lastIgnitions;}};
  }
  return instance(new Map(),[null,...wallets.map(account)],0,[],null,null,true);
}

function observedCell({owner,rule,resolver,ballot,sense,wave,age,contract,energy,stableAge}){
  return {owner,rule,resolver,ballot,sense,wave,age,...(contract?{contract}:{}),...(energy===undefined?{}:{energy,stableAge})};
}
function describe({type:{owner,rule,resolver,ballot,sense,wave,contract},support,age,robustness,parent,kind},rank) {
  return {owner,rule,resolver,ballot,sense,wave,support,age,robustness,parent,geometry:rank(parent),kind,...(contract?{contract}:{})};
}
