// Declarative fabrication contracts and a finite terrain layer. Contracts are
// inherited cell metadata; no recognizer or catalogue of building silhouettes
// participates in production, resource extraction or victory.
import {cards as catalogue} from '../catalog.mjs';
import {ruleProfiles} from '../../../src/match/rule-profiles.js';
import {graphBall} from '../spatial.mjs';

export const resourceKinds=Object.freeze([
  Object.freeze({id:'substrate',name:'Substrato',symbol:'S',color:'#71c49b',use:'Corpo: quantidade de células fabricadas.'}),
  Object.freeze({id:'conductor',name:'Condutor',symbol:'C',color:'#77b9f5',use:'Alcance: visão e raio de fabricação da linhagem.'}),
  Object.freeze({id:'accumulator',name:'Acumulador',symbol:'A',color:'#e2bd62',use:'Carga: capacidade de energia em cada célula.'}),
  Object.freeze({id:'catalyst',name:'Catalisador',symbol:'K',color:'#bf8ee6',use:'Circuito: contrato e profundidade da cadeia de fabricação.'}),
]);
export const progressionDesignLimits=Object.freeze({totalPoints:64,childPoints:28});
const EPS=1e-9;
const knownResolvers=['contact','phase','guard','antimatter'];
const knownBallots=['support','age','geometry','robustness'];
const knownSenses=['native','kin'];
function mix(x){x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return (x^(x>>>16))>>>0;}
function integer(value,min,max,label){if(!Number.isSafeInteger(value)||value<min||value>max)throw RangeError(label);return value;}
function vector(value,label){
  if(!Array.isArray(value)||value.length!==4||value.some(x=>!Number.isFinite(x)||x<0))throw RangeError(label);
  return value.slice();
}
const copyRows=rows=>rows.map(row=>row&&row.slice());

function resolveCard(value){
  const cardKey=value.cardKey??value.key;
  const source=cardKey&&catalogue.get(cardKey);
  const rule=value.rule??source?.source;
  const offsets=value.offsets??source?.offsets;
  if(!ruleProfiles[rule]?.physics||ruleProfiles[rule].physics.birthsFromVacuum)throw RangeError('Regra inválida no plano: '+rule);
  if(!Array.isArray(offsets)||offsets.length<1||offsets.length>1024||offsets.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isSafeInteger(n)||Math.abs(n)>512))||
      new Set(offsets.map(p=>p.join(','))).size!==offsets.length)throw RangeError('Carimbo inválido no plano.');
  const resolver=value.resolver??'contact',ballot=value.ballot??'support',sense=value.sense??'native';
  if(!knownResolvers.includes(resolver)||!knownBallots.includes(ballot)||!knownSenses.includes(sense))throw RangeError('Física inválida no plano.');
  return {cardKey:cardKey??null,rule,offsets:offsets.map(p=>p.slice()),resolver,ballot,sense};
}

/** All roots, names and geometries come from the player's document. */
export function normalizeProgressionPlan(input){
  if(!input||input.version!==1||!Array.isArray(input.nodes)||input.nodes.length<1||input.nodes.length>64)throw RangeError('Plano v1 precisa de 1 a 64 receitas.');
  const ids=new Set();
  const nodes=input.nodes.map(value=>{
    if(!value||typeof value.id!=='string'||!/^[\w.-]{1,48}$/.test(value.id)||ids.has(value.id))throw RangeError('Identificador de receita inválido ou repetido.');
    ids.add(value.id);
    const weights=vector(value.weights??[40,20,20,20],'Quatro pesos de recursos são obrigatórios.');
    if(weights.some(x=>!Number.isSafeInteger(x))||weights.reduce((a,b)=>a+b,0)!==100)throw RangeError('Os quatro pesos devem somar 100 pontos inteiros.');
    return {id:value.id,name:String(value.name??value.id).slice(0,100),...resolveCard(value),parent:value.parent??null,weights,
      vision:integer(value.vision??6,1,16,'Visão precisa estar entre 1 e 16.'),
      reach:integer(value.reach??8,1,24,'Fabricação precisa estar entre 1 e 24.'),
      capacity:integer(value.capacity??256,8,512,'Capacidade precisa estar entre 8 e 512.')};
  });
  if(typeof input.base!=='string'||!ids.has(input.base))throw RangeError('Escolha a receita inicial do plano.');
  const byId=new Map(nodes.map(n=>[n.id,n])),visiting=new Set(),depths=new Map();
  function depth(id){
    if(depths.has(id))return depths.get(id);
    if(visiting.has(id))throw RangeError('A cadeia de fabricação contém um ciclo.');
    const n=byId.get(id);visiting.add(id);
    if(id===input.base){if(n.parent!==null)throw RangeError('A base inicial deve ser a raiz.');depths.set(id,0);}
    else {
      if(!byId.has(n.parent))throw RangeError('Toda receita precisa de um pai ligado à base.');
      const d=depth(n.parent)+1;if(d>12)throw RangeError('A cadeia excedeu 12 etapas.');depths.set(id,d);
    }
    visiting.delete(id);return depths.get(id);
  }
  for(const n of nodes){
    n.depth=depth(n.id);n.size=n.offsets.length;n.minimumBuilders=Math.max(1,Math.ceil(n.size/4));n.cost=recipeCost(n);
    n.designPoints=Math.ceil(Math.log2(n.size+1))+Math.ceil(n.vision/4)+Math.ceil(n.reach/6)+Math.ceil(n.capacity/128);
  }
  const designPoints=nodes.reduce((sum,n)=>sum+n.designPoints,0);
  if(designPoints>progressionDesignLimits.totalPoints)throw RangeError('O plano usa '+designPoints+' pontos; o orçamento é '+progressionDesignLimits.totalPoints+'.');
  for(const n of nodes){
    n.childPoints=nodes.filter(child=>child.parent===n.id).reduce((sum,child)=>sum+child.designPoints,0);
    if(n.childPoints>progressionDesignLimits.childPoints)throw RangeError(n.name+' autoriza '+n.childPoints+' pontos; o limite local é '+progressionDesignLimits.childPoints+'. Distribua contratos entre intermediárias.');
  }
  for(const n of nodes){n.weights=Object.freeze(n.weights);n.offsets=Object.freeze(n.offsets.map(Object.freeze));n.cost=Object.freeze(n.cost);Object.freeze(n);}
  return Object.freeze({version:1,base:input.base,designPoints,nodes:Object.freeze(nodes)});
}

/** Resource-specific floors plus a fixed discretionary budget. The user chooses
 * its composition, never the amount. Larger reach/capacity have real costs. */
export function recipeCost(node){
  const n=node.offsets.length,d=node.depth??0;
  const floors=[n,Math.ceil(n*(node.vision+node.reach)/16),Math.ceil(n*node.capacity/128),Math.ceil(n*(d+1)/4)];
  const budget=2*n,exact=node.weights.map(w=>budget*w/100),extra=exact.map(Math.floor);
  const order=exact.map((x,i)=>[x-extra[i],i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]);
  let left=budget-extra.reduce((a,b)=>a+b,0);for(let i=0;i<left;i++)extra[order[i][1]]++;
  return floors.map((x,i)=>x+extra[i]);
}

export function progressionSpatialTypes(plan){
  const normalized=normalizeProgressionPlan(plan);
  return Object.fromEntries(normalized.nodes.map(n=>[n.rule+'/'+n.resolver+'/'+n.id,{visionRadius:n.vision,cellCapacity:n.capacity,stampEnergy:Math.min(32,n.capacity)}]));
}

/** A playable starting document, fully editable before the match. The catalogue
 * is merely sample geometry; custom offsets follow the exact same schema. */
export function defaultProgressionPlan(initialCard,availableCards=[]){
  const fallback={cardKey:'hex-b2s245/scan-cf5664',...catalogue.get('hex-b2s245/scan-cf5664')};
  const base={...fallback,...(initialCard??{})};base.rule=initialCard?.rule??initialCard?.source??fallback.source;
  if(initialCard)base.cardKey=initialCard.cardKey??initialCard.key??null;
  const pick=(key,predicate)=>availableCards.find(predicate)??{cardKey:key,...catalogue.get(key)};
  const scout=pick('callahan/glider',c=>c.group==='nave'&&c.offsets.length<=12);
  const pulse=pick('bays/osc2',c=>c.group==='oscilador'&&c.offsets.length<=12);
  const node=(id,name,card,parent,traits={})=>({id,name,cardKey:card.cardKey??card.key??null,rule:card.rule??card.source,
    offsets:card.offsets.map(p=>p.slice()),resolver:card.resolver??'contact',ballot:card.ballot??'support',sense:card.sense??'native',
    parent,weights:[40,20,20,20],vision:6,reach:8,capacity:256,...traits});
  return {version:1,base:'base',nodes:[
    node('base','Centro celular',base,null,{vision:10,reach:10}),
    node('relay','Oficina celular',fallback,'base',{vision:12,reach:12,capacity:128}),
    node('scout','Batedor · glider',scout,'relay',{vision:16,reach:8,capacity:128}),
    node('battery','Torre de alcance',fallback,'base',{vision:16,reach:10,capacity:256}),
    node('pulse','Circuito experimental',pulse,'battery',{vision:6,reach:8,capacity:256}),
  ]};
}

function makeTerrain(graph,seed,stock){
  const kind=new Uint8Array(graph.n),amount=new Float64Array(graph.n);
  // Compact geodesic patches. Deposit generation is independent of live cells.
  const count=Math.max(12,Math.ceil(graph.n/150));
  for(let p=0;p<count;p++){
    const h=mix((seed>>>0)^Math.imul(p+1,0x9e3779b9)),center=h%graph.n,resource=1+(mix(h)%4);
    for(const site of graphBall(graph,[center],2+(h%2)))if(!kind[site]){kind[site]=resource;amount[site]=stock;}
  }
  return {kind,amount};
}

/** Install before seeding. The wrapper enforces contracts for humans, bots and
 * forecasts. All mutation goes through the same paid engine stamp. */
export function attachProgression(match,{plan=defaultProgressionPlan(),seed=1,stock=32,
  initialResources=[48,32,40,24],harvestAfter=12,harvestRate=.2,depositRate=.4,snapshot=null}={}){
  if(match.progression)throw Error('Progressão já instalada.');
  plan=normalizeProgressionPlan(plan);
  if(!Number.isFinite(stock)||stock<=0||!Number.isFinite(harvestRate)||harvestRate<=0||!Number.isFinite(depositRate)||depositRate<=0)
    throw RangeError('Depósitos e taxas devem ser positivos e finitos.');
  integer(harvestAfter,1,4096,'Maturação inválida.');initialResources=vector(initialResources,'Inventário inicial inválido.');
  const graph=match.graph,byId=new Map(plan.nodes.map(n=>[n.id,n]));
  const terrain=snapshot?{kind:Uint8Array.from(snapshot.kind),amount:Float64Array.from(snapshot.amount)}:makeTerrain(graph,seed,stock);
  const inventory=snapshot?copyRows(snapshot.inventory):match.players.map(p=>p&&initialResources.slice());
  const harvested=snapshot?copyRows(snapshot.harvested):match.players.map(p=>p&&[0,0,0,0]);
  const spent=snapshot?copyRows(snapshot.spent):match.players.map(p=>p&&[0,0,0,0]);
  const initial=snapshot?copyRows(snapshot.initial):copyRows(inventory);
  const bootstrapped=new Set(snapshot?.bootstrapped??[]);
  let quiet=new Map(snapshot?.quiet??[]),harvestedGeneration=snapshot?.harvestedGeneration??match.gen;
  const observedOwner=snapshot?.observedOwner??null;
  const raw={stamp:match.stamp.bind(match),canStamp:match.canStamp.bind(match),step:match.step.bind(match),fork:match.fork?.bind(match),
    forkObserved:match.forkObserved?.bind(match),bootstrap:match.bootstrapStamp?.bind(match)};
  const ownerValid=owner=>Number.isInteger(owner)&&owner>0&&owner<match.players.length&&!!match.players[owner];
  function living(owner,id){return [...match.cells].filter(([,c])=>c.owner===owner&&!c.wave&&c.contract===id);}
  function visible(owner,site){return typeof match.canSee!=='function'||match.canSee(owner,site);}
  function card(node){return {key:node.cardKey??'custom/'+node.id,slotKey:'contract/'+node.id,name:node.name,rule:node.rule,source:node.rule,
    offsets:node.offsets.map(p=>p.slice()),resolver:node.resolver,ballot:node.ballot,sense:node.sense,contract:node.id,custom:!node.cardKey};}
  function contractForCard(c){
    if(c?.contract&&byId.has(c.contract))return c.contract;
    const geometry=c?.offsets&&c.offsets.map(p=>p.join(',')).join(';');
    return plan.nodes.find(n=>n.rule===(c?.rule??c?.source)&&n.resolver===(c?.resolver??'contact')&&
      n.offsets.map(p=>p.join(',')).join(';')===geometry)?.id??null;
  }
  function source(node,owner,ids,sourceSite=null){
    const parent=byId.get(node.parent??plan.base),sources=living(owner,parent.id);
    if(sources.length<parent.minimumBuilders)return {ok:false,code:'parent',reason:'A linhagem '+parent.name+' precisa de '+parent.minimumBuilders+' células vivas.',parent:parent.id};
    const sourceIds=new Set(sources.map(([site])=>site));
    if(sourceSite!==null){
      if(!Number.isSafeInteger(sourceSite)||!sourceIds.has(sourceSite))
        return {ok:false,code:'source',reason:'Fonte selecionada indisponível.',parent:parent.id};
      const disk=graphBall(graph,[sourceSite],parent.reach);
      if(ids.some(site=>!disk.has(site)))return {ok:false,code:'range',reason:'Fora do alcance desta estrutura.',parent:parent.id};
      const count=[...disk].filter(site=>sourceIds.has(site)).length;
      if(count<parent.minimumBuilders)return {ok:false,code:'parent',reason:'Estrutura com poucas células vivas.',parent:parent.id};
      return {ok:true,parent:parent.id,source:sourceSite,builders:count};
    }
    // One local cluster must authorize the whole footprint; a distant copy
    // cannot supply the missing builders for a small isolated fragment.
    const near=graphBall(graph,[ids[0]],parent.reach);
    for(const candidate of near){
      if(!sourceIds.has(candidate))continue;
      const disk=graphBall(graph,[candidate],parent.reach);
      if(ids.some(site=>!disk.has(site)))continue;
      let count=0;for(const site of disk)if(sourceIds.has(site))count++;
      if(count>=parent.minimumBuilders)return {ok:true,parent:parent.id,source:candidate,builders:count};
    }
    return {ok:false,code:'range',reason:'O carimbo inteiro precisa do alcance de uma fonte '+parent.name+'.',parent:parent.id};
  }
  function getQuote(owner,id,ids,sourceSite=null){
    const node=byId.get(id);
    if(!ownerValid(owner)||observedOwner!==null&&owner!==observedOwner)return {ok:false,code:'owner',reason:'Jogador inválido.'};
    if(!node)return {ok:false,code:'contract',reason:'Inclua este carimbo no plano antes da partida.'};
    const energy=match.stampQuote?.(node.rule,node.resolver,node.size,{contract:id});
    const quote={contract:id,cost:node.cost.slice(),available:inventory[owner].slice(),energyCost:energy?.total??node.size*match.stampPrice(node.resolver)};
    if(!Array.isArray(ids)||ids.length!==node.size||new Set(ids).size!==ids.length||ids.some(site=>!Number.isSafeInteger(site)||site<0||site>=graph.n))
      return {...quote,ok:false,code:'footprint',reason:'O carimbo precisa corresponder à quantidade de células da receita.'};
    const permission=source(node,owner,ids,sourceSite);if(!permission.ok)return {...quote,...permission};
    const missing=node.cost.map((cost,k)=>Math.max(0,cost-inventory[owner][k]));
    if(missing.some(n=>n>EPS))return {...quote,...permission,ok:false,code:'resources',missing,reason:'Faltam recursos: '+missing.map((n,k)=>n>EPS?resourceKinds[k].symbol+' '+Math.ceil(n):'').filter(Boolean).join(' · ')};
    if(!raw.canStamp(owner,node.rule,node.resolver,ids,node.ballot,node.sense,{contract:id}))
      return {...quote,...permission,ok:false,code:'field',reason:'Verifique área explorada, energia e espaço livre.'};
    return {...quote,...permission,ok:true,code:'ready',reason:'Fabricação disponível.'};
  }
  function matches(node,rule,resolver,ballot,sense){return node&&node.rule===rule&&node.resolver===resolver&&node.ballot===ballot&&node.sense===sense;}
  function canStamp(owner,rule,resolver,ids,ballot='support',sense='native',metadata={}){
    const id=metadata?.contract,node=byId.get(id);return !!matches(node,rule,resolver,ballot,sense)&&getQuote(owner,id,ids,metadata?.sourceSite??null).ok;
  }
  function stamp(owner,rule,resolver,ids,ballot='support',sense='native',metadata={}){
    if(!canStamp(owner,rule,resolver,ids,ballot,sense,metadata))return false;
    const node=byId.get(metadata.contract);
    if(!raw.stamp(owner,rule,resolver,ids,ballot,sense,{contract:node.id}))return false;
    for(let k=0;k<4;k++){inventory[owner][k]=Math.max(0,inventory[owner][k]-node.cost[k]);spent[owner][k]+=node.cost[k];}
    return true;
  }
  function seedDeposits(ids,owner){
    const sites=[...graphBall(graph,ids,1)].sort((a,b)=>mix(a^seed^owner)-mix(b^seed^owner));
    for(let k=0;k<4;k++){
      const site=sites[k];if(site===undefined)continue;
      terrain.kind[site]=k+1;terrain.amount[site]=Math.max(stock*4,terrain.amount[site]);
    }
  }
  function bootstrap(owner,id,ids){
    const node=byId.get(id);
    if(!raw.bootstrap||match.gen!==0||bootstrapped.has(owner)||id!==plan.base||!node||!ownerValid(owner)||ids?.length!==node.size)return false;
    const result=raw.bootstrap(owner,node.rule,node.resolver,ids,node.ballot,node.sense,{contract:id});
    if(!result)return false;
    bootstrapped.add(owner);seedDeposits(ids,owner);return true;
  }
  function signature(site,c){
    const bits=[c.owner,c.rule,c.resolver,c.contract];
    for(let k=0;k<graph.deg[site];k++){
      const n=match.cells.get(graph.adj[site*6+k]);bits.push(n?n.owner+'/'+n.rule+'/'+n.resolver+'/'+n.contract:'');
    }
    return bits.join('|');
  }
  function collect(){
    if(match.gen===harvestedGeneration)return;
    const elapsed=match.gen-harvestedGeneration;
    // Every normal wrapper call advances one generation; jumping does not
    // retroactively pay extraction for unobserved cellular histories.
    harvestedGeneration=match.gen;
    const nextQuiet=new Map(),collectors=new Map(),budgets=new Map();
    for(const [site,c] of match.cells){
      if(c.wave||!ownerValid(c.owner)||observedOwner!==null&&c.owner!==observedOwner)continue;
      const pose=signature(site,c),prior=quiet.get(site),streak=elapsed===1&&prior?.[0]===pose?prior[1]+1:1;
      nextQuiet.set(site,[pose,streak]);
      if(c.age<harvestAfter||streak<harvestAfter)continue;
      budgets.set(site,harvestRate);
      for(const n of [site,...graph.adj.subarray(site*6,site*6+graph.deg[site])]){
        if(!terrain.kind[n]||terrain.amount[n]<=EPS)continue;
        if(!collectors.has(n))collectors.set(n,[]);collectors.get(n).push([site,c.owner]);
      }
    }
    quiet=nextQuiet;
    // Rotate contention deterministically, keeping one budget per source cell
    // and one throughput cap per deposit, irrespective of population size.
    const deposits=[...collectors].sort(([a],[b])=>mix(a^match.gen^seed)-mix(b^match.gen^seed));
    for(const [site,sources] of deposits){
      const kind=terrain.kind[site]-1,share=Math.min(depositRate,terrain.amount[site])/sources.length;
      for(const [source,owner] of sources){
        const amount=Math.min(share,budgets.get(source)??0,terrain.amount[site]);
        if(amount<=0)continue;
        budgets.set(source,(budgets.get(source)??0)-amount);terrain.amount[site]=Math.max(0,terrain.amount[site]-amount);
        inventory[owner][kind]+=amount;harvested[owner][kind]+=amount;
      }
    }
  }
  function takeSnapshot(owner=null){
    const kind=terrain.kind.slice(),amount=terrain.amount.slice();
    if(owner!==null)for(let site=0;site<kind.length;site++)if(!visible(owner,site)){kind[site]=0;amount[site]=0;}
    const visibleRows=rows=>rows.map((row,id)=>row&&(owner===null||id===owner?row.slice():[0,0,0,0]));
    return {kind,amount,inventory:visibleRows(inventory),initial:visibleRows(initial),harvested:visibleRows(harvested),spent:visibleRows(spent),
      bootstrapped:owner===null?[...bootstrapped]:[...bootstrapped].filter(id=>id===owner),
      quiet:[...quiet].filter(([site])=>owner===null||visible(owner,site)).map(([site,row])=>[site,[...row]]),harvestedGeneration,observedOwner:owner};
  }
  const forkOptions={plan,seed,stock,initialResources,harvestAfter,harvestRate,depositRate};
  if(raw.fork)match.fork=(...args)=>attachProgression(raw.fork(...args),{...forkOptions,snapshot:takeSnapshot(observedOwner)}).match;
  if(raw.forkObserved)match.forkObserved=(owner,...args)=>attachProgression(raw.forkObserved(owner,...args),{...forkOptions,snapshot:takeSnapshot(owner)}).match;
  match.canStamp=canStamp;match.stamp=stamp;
  if(raw.bootstrap)match.bootstrapStamp=(owner,rule,resolver,ids,ballot='support',sense='native',metadata={})=>
    matches(byId.get(metadata.contract),rule,resolver,ballot,sense)&&bootstrap(owner,metadata.contract,ids);
  match.step=(...args)=>{const result=raw.step(...args);collect();return result;};
  const api={match,plan,resources:resourceKinds,contractForCard,getQuote,quote:getQuote,canStamp,stamp,bootstrap,
    inventory:owner=>ownerValid(owner)&&(observedOwner===null||owner===observedOwner)?inventory[owner].slice():[0,0,0,0],
    stats:owner=>ownerValid(owner)&&(observedOwner===null||owner===observedOwner)?{initial:initial[owner].slice(),harvested:harvested[owner].slice(),spent:spent[owner].slice(),inventory:inventory[owner].slice()}:null,
    sourceAt:(site,owner)=>{const c=match.cells.get(site);if(!ownerValid(owner)||c?.owner!==owner||c.wave||!c.contract)return null;
      const node=byId.get(c.contract);return node?{site,contract:node.id,name:node.name,reach:node.reach}:null;},
    childrenFor:contract=>plan.nodes.filter(n=>n.parent===contract||n.id===contract&&contract===plan.base).map(card),
    legalCards:owner=>!ownerValid(owner)?[]:plan.nodes.filter(n=>{
      const parent=byId.get(n.parent??plan.base);return living(owner,parent.id).length>=parent.minimumBuilders&&n.cost.every((v,k)=>inventory[owner][k]+EPS>=v);
    }).map(card),
    cards:()=>plan.nodes.map(card),
    resourceAt:(site,owner=null)=>Number.isSafeInteger(site)&&site>=0&&site<graph.n&&(owner===null||visible(owner,site))&&terrain.kind[site]?
      {site,kind:terrain.kind[site]-1,resource:resourceKinds[terrain.kind[site]-1],remaining:terrain.amount[site]}:null,
    visibleDeposits:owner=>{const found=[];for(let site=0;site<graph.n;site++)if(terrain.kind[site]&&visible(owner,site))found.push({site,kind:terrain.kind[site]-1,remaining:terrain.amount[site]});return found;},
    objective:owner=>{const rootCells=living(owner,plan.base).length;return {started:bootstrapped.has(owner),base:plan.base,rootCells,defeated:bootstrapped.has(owner)&&rootCells===0};},
    terrainTotals:()=>{const totals=[0,0,0,0];for(let site=0;site<graph.n;site++)if(terrain.kind[site])totals[terrain.kind[site]-1]+=terrain.amount[site];return totals;},
    snapshot:takeSnapshot,
  };
  match.progression=api;return api;
}
