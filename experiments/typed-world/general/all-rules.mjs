// Observational census of nine CA in a single sphere. No orders after the opening.
// Outputs are deterministic; each row is one whole match or a measured interaction.
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSphere} from '../../../src/world/sphere.js';
import {allRulesOrders,prepareAllRules,ruleIds} from './scene.mjs';

const out=process.argv[2]??fileURLToPath(new URL('.',import.meta.url));
mkdirSync(out,{recursive:true});
const horizon=192,graph=buildSphere(16),rows=[],history=[],examples=[],flows=[];
const rid=new Map(ruleIds.map((r,i)=>[r,i])),n=ruleIds.length,from=i=>Math.floor(i/n),to=i=>i%n;
const cases=[
  {policy:'legacy',arbitration:'legacy',eligibility:'legacy',friendlyFire:false},
  {policy:'support',arbitration:'support',eligibility:'contest',friendlyFire:true},
  {policy:'majority',arbitration:'majority',eligibility:'contest',friendlyFire:true},
  {policy:'ballot',arbitration:'ballot',eligibility:'contest',friendlyFire:true},
];
const counts=()=>new Float64Array(n*n);
const measures=['edgesAllied','edgesHostile','claimsAllied','claimsHostile','settledAllied','settledHostile'];
const aggregate=new Map(),totals=()=>Object.fromEntries(measures.map(k=>[k,counts()]));
function pair(matrix,a,b){
  matrix[a*n+b]++;
  if(a!==b)matrix[b*n+a]++;
}
function connectedRules(match){
  const seen=new Set();let max=0;
  for(const [start] of match.cells){
    if(seen.has(start))continue;
    const queue=[start],rules=new Set();seen.add(start);
    for(let i=0;i<queue.length;i++){
      const id=queue[i];rules.add(match.cells.get(id).rule);
      for(let j=0;j<graph.deg[id];j++){
        const k=graph.adj[6*id+j];if(!seen.has(k)&&match.cells.has(k)){queue.push(k);seen.add(k);}
      }
    }
    max=Math.max(max,rules.size);
  }
  return max;
}
function run(seed,rotation,bank,owners,mode,opening){
  const options={seed,rotation,bank,owners,policy:mode.policy},id=[seed,rotation,bank,owners,mode.policy].join('-');
  const orders=owners===1?opening.map(o=>({...o,owner:1})):opening;
  const {match}=prepareAllRules(graph,{seed,owners,orders,bank:owners===1?3*bank:bank,...mode});
  const matrix=totals(),siteContests=new Map();
  let ancestry=new Map(orders.flatMap((o,i)=>o.ids.map(id=>[id,i+1])));
  let edgeTicks9=0,contestTicks9=0,allNineUntil=0,ancestralNineUntil=0,peakComponent=0;
  let peakRules=0,peakFounders=0,paidBirths=0,contests=0,crossRule=0,multiRule=0,
    cycles=0,siteWithFundingChange=0,firstContest=null,peakExample=null;
  const activePair=new Set(),wonPair=new Set();
  const lastAlive=new Map();
  for(let g=0;g<=horizon;g++){
    const contacts=new Set(),population=Array(n).fill(0),waveSources=new Set(),founders=new Set(),ancestralRules=new Set();
    for(const [id,c] of match.cells){
      const i=rid.get(c.rule),label=ancestry.get(id);assert(label,'a live site must have a founder');
      const source=orders[label-1];
      assert(source.owner===c.owner && (source.rule===c.rule || c.wave),'physical descent');
      founders.add(label);ancestralRules.add(source.rule);
      if(!c.wave)population[i]++;
      else waveSources.add(source.rule);
      for(let j=0;j<graph.deg[id];j++){
        const k=graph.adj[6*id+j];if(k<=id)continue;
        const b=match.cells.get(k);if(!b||c.type===b.type)continue;
        const h=rid.get(b.rule);pair(c.owner===b.owner?matrix.edgesAllied:matrix.edgesHostile,i,h);
        if(i!==h){contacts.add(i);contacts.add(h);activePair.add(Math.min(i,h)*n+Math.max(i,h));}
      }
    }
    if(contacts.size===n)edgeTicks9++;
    const current=population.filter(Boolean).length;
    if(current===n && g<=allNineUntil+1)allNineUntil=g;
    if(ancestralRules.size===n && g<=ancestralNineUntil+1)ancestralNineUntil=g;
    for(const [i,v] of population.entries()){
      if(v)lastAlive.set(i,g);
    }
    if(peakComponent<n)peakComponent=Math.max(peakComponent,connectedRules(match));
    if([0,1,8,32,64,128,horizon].includes(g)){
      history.push({id,g,conventional:current,founders:founders.size,ancestralRules:ancestralRules.size,
        waveCells:match.cells.size-population.reduce((a,b)=>a+b,0),waveSourceRules:[...waveSources].sort().join('|'),
        touching:contacts.size,census:population.join('|'),wallets:match.players.slice(1).map(p=>p.reserve.toFixed(2)).join('|')});
    }
    if(g===horizon)break;
    const births=new Map(),disputed=new Set();
    const identity=x=>[x.owner,x.rule,x.resolver,x.kind,x.parent].join('/');
    match.step({
      onBirth(e){
        const label=ancestry.get(e.parent);assert(label,'accepted parent must exist at previous tick');
        births.set(e.site,label);paidBirths++;
      },
      onContest(e){
        contests++;
        const types=new Set(e.claims.map(c=>c.rule));
        for(let i=0;i<e.claims.length;i++)for(let j=i+1;j<e.claims.length;j++){
          const a=e.claims[i],b=e.claims[j];pair(a.owner===b.owner?matrix.claimsAllied:matrix.claimsHostile,rid.get(a.rule),rid.get(b.rule));
        }
        if(e.winner)for(const c of e.claims){
          if(identity(c)===identity(e.winner))continue;
          const i=rid.get(e.winner.rule),j=rid.get(c.rule);
          matrix[e.winner.owner===c.owner?'settledAllied':'settledHostile'][i*n+j]++;
          if(i!==j)wonPair.add(Math.min(i,j)*n+Math.max(i,j));
        }
        if(types.size<2)return;
        crossRule++;if(firstContest===null)firstContest=e.gen;
        for(const r of types)disputed.add(r);
        if(e.anyCycle)cycles++;
        if(e.preferred && e.winner && identity(e.preferred)!==identity(e.winner))siteWithFundingChange++;
        siteContests.set(e.site,1+(siteContests.get(e.site)??0));
        const stem=c=>ancestry.get(c.kind==='survival'?e.site:c.parent);
        const ancestors=new Set(e.claims.map(stem));
        assert(!ancestors.has(undefined),'all proposals are descended from placed cards');
        if(types.size>=3)multiRule++;
        peakRules=Math.max(peakRules,types.size);peakFounders=Math.max(peakFounders,ancestors.size);
        const detail=c=>c?{o:c.owner,r:c.rule,k:c.kind,b:c.ballot,from:stem(c)}:null;
        if(!peakExample || types.size>peakExample.rules || types.size===peakExample.rules && ancestors.size>peakExample.founders){
          peakExample={id,gen:e.gen,site:e.site,rules:types.size,founders:ancestors.size,
            claims:e.claims.map(detail),preferred:detail(e.preferred),winner:detail(e.winner)};
        }

      }
    });
    if(disputed.size===n)contestTicks9++;
    const next=new Map();
    for(const [id,c] of match.cells){
      const label=c.age===1?births.get(id):ancestry.get(id);assert(label,'every accepted newborn or survivor needs its exact parent');
      next.set(id,label);
    }
    ancestry=next;
  }
  assert.equal(paidBirths,match.players.slice(1).reduce((v,p)=>v+p.births,0),'hook covers every paid birth');
  if(peakExample)examples.push(peakExample);
  for(const p of match.players.slice(1)){
    const openingCash=owners===1?3*bank:bank;
    assert(Math.abs(openingCash+p.income+p.salvageIncome-p.reserve-p.birthSpent-p.stampSpent-p.eraseSpent-p.friendlyEraseSpent)<1e-5,'wallet ledger');
  }
  const sum=k=>match.players.slice(1).reduce((v,p)=>v+p[k],0);
  rows.push({id,...options,openingCards:orders.length,allNineUntil,ancestralNineUntil,
    nConventionalAtEnd:ruleIds.filter((_,i)=>lastAlive.get(i)===horizon).length,
    foundersAtEnd:new Set(ancestry.values()).size,firstCrossRuleContest:firstContest,crossRuleEdgeTicksAll9:edgeTicks9,
    crossRuleContestTicksAll9:contestTicks9,contactPairs:activePair.size,settledPairs:wonPair.size,
    peakPhysicalComponentRules:peakComponent,contests,crossRule,multiRule,peakRules,peakFounders,
    peakContestsOneSite:Math.max(0,...siteContests.values()),cycles,siteWithFundingChange,
    foundedBirths:paidBirths,refused:sum('refused'),sold:sum('eroded'),cuts:sum('erased'),friendlyCuts:sum('friendlyErased'),out:sum('out')});
  if(!aggregate.has(mode.policy+'/'+owners))aggregate.set(mode.policy+'/'+owners,totals());
  const acc=aggregate.get(mode.policy+'/'+owners);
  for(const k of measures)for(let i=0;i<n*n;i++)acc[k][i]+=matrix[k][i];
}
for(const seed of [1,43,211])for(const rotation of [0,3]){
  const orders=allRulesOrders(graph,{seed,rotation,owners:3});
  for(const owners of [1,3])for(const bank of [1600,16000])for(const mode of cases)run(seed,rotation,bank,owners,mode,orders);
}
for(const [group,m] of aggregate)for(let i=0;i<n*n;i++)
  flows.push({group,rule:ruleIds[from(i)],other:ruleIds[to(i)],...Object.fromEntries(measures.map(k=>[k,m[k][i]]))});
function csv(name,data){
  const keys=Object.keys(data[0]);writeFileSync(resolve(out,name),keys.join(',')+'\n'+data.map(d=>keys.map(k=>d[k]??'').join(',')).join('\n')+'\n');
}
csv('all-rules.csv',rows);csv('all-rules-history.csv',history);csv('all-rules-matrix.csv',flows);
writeFileSync(resolve(out,'all-rules-hotspots.jsonl'),examples.map(x=>JSON.stringify(x)).join('\n')+'\n');
