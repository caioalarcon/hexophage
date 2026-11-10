// A fixture holds the starting geometry, tariffication, cash, site tie-break and
// seat order fixed while changing the resolver printed on every card of a side.
import assert from 'node:assert/strict';
import {buildSphere} from '../../../src/world/sphere.js';
import {createTypedWorld} from '../engine.mjs';
import {allRulesOrders} from './scene.mjs';
import {explainContest} from '../arbitration.mjs';

export const policies=['contact','guard','phase','antimatter'];
const triangular=policies.slice(0,3);
const ballots=['support','age','geometry','robustness'];
const modes=['support','majority','ecology','cycle','dominant','ballot'];
export const groups={discovery:[7,41,109,1549,811,3083,5653,14591],holdout:[577,1723,4733,8221,733,2447,6277,16411],replication:[991,1933,3011,4289,6151,7877,9601,17431]};
const H=128;
const combinations=items=>items.flatMap((a,i)=>items.slice(i+1).map(b=>[a,b]));
const permutations=(items,n=items.length)=>!n?[[]]:items.flatMap(a=>permutations(items.filter(b=>b!==a),n-1).map(l=>[a,...l]));
const rounded=n=>+n.toFixed(6);
const unique=items=>new Set(items).size;

// Count only absolute majorities of the original electorate. The production
// arbiter can additionally break tied ballots by parent vertex, audited separately.
function majorityCircuit(claims,edges,absolute){
  const c=claims;
  const beats=(a,b)=>edges.some(e=>e.winner===a && e.loser===b &&
    (absolute?e.for>e.against+e.abstain:e.for>e.against));
  function search(path){
    const last=path.at(-1);
    for(let j=path[0];j<c.length;j++)if(beats(last,j)){
      if(j===path[0] && path.length>2)return path;
      if(!path.includes(j)){
        const loop=search([...path,j]);if(loop)return loop;
      }
    }
  }
  for(let i=0;i<c.length;i++){const loop=search([i]);if(loop)return loop;}
  return null;
}

function run({graph,orders,split,seed,rotation,fee,float,arbitration,tags}){
  const owners=tags.length, inherited=arbitration==='ballot';
  const initialByOwner=Array(owners+1).fill(0);
  for(const o of orders)initialByOwner[o.owner]+=o.ids.length*8;
  const bank=Math.max(...initialByOwner)+float;
  let contests=0, mixedRules=0, crossOwner=0, eligibleDominant=0, dominantPreferred=0,
    dominantFunded=0,cycles=0,anyCycles=0,cycleTags=0,strictCycles=0,relativeCycles=0,firstThree,naturalCycle;
  let last=null,first=null,live,activeNine=0,currentRules=0;
  const during={cross:0,cycles:0,relative:0,absolute:0,eligible:0,preferred:0,funded:0,three:0};
  const contestedRules=new Set();
  function audit(e){
    const c=e.claims;
    contests++;
    if(unique(c.map(k=>k.rule))>1)mixedRules++;
    if(unique(c.map(k=>k.owner))<2)return;
    crossOwner++;
    const active=last===null;
    if(active)during.cross++;
    for(const k of c)contestedRules.add(k.rule);
    if(c.some(k=>k.resolver==='contact')&&c.some(k=>k.resolver!=='contact')){
      if(active){during.eligible++;during.preferred+=Number(e.preferred?.resolver==='contact');during.funded+=Number(e.winner?.resolver==='contact');}
      eligibleDominant++;
      dominantPreferred+=Number(e.preferred?.resolver==='contact');
      dominantFunded+=Number(e.winner?.resolver==='contact');
    }
    if(e.cycle)cycles++;
    if(e.anyCycle){
      anyCycles++;if(active)during.cycles++;
      if(arbitration==='majority' || arbitration==='ecology' || inherited){
        assert(c.every(t=>Number.isInteger(t.geometry)));
        const edges=explainContest(arbitration,e).rounds[0].edges;
        const strict=majorityCircuit(c,edges,true), relative=strict??majorityCircuit(c,edges,false);
        if(strict){strictCycles++;if(active)during.absolute++;}
        if(relative){relativeCycles++;if(active)during.relative++;}
        const grade=(strict?4:relative?2:0)+Number(active);
        if(!naturalCycle || grade>naturalCycle.grade){
          naturalCycle={active,worldRules:currentRules,edges,gen:e.gen,site:e.site,preferred:e.preferred,winner:e.winner,claims:c,cycle:e.cycle,strict,relative,grade};
        }
      }
    }
    if(unique(c.map(k=>k.owner))>=3){
      const tagSet=new Set(c.map(k=>inherited?k.ballot:k.resolver));
      const full=(inherited?tags:triangular).every(t=>tagSet.has(t));
      if(full){cycleTags++;if(active)during.three++;}
      if(full && (!firstThree || 2*Number(e.anyCycle)+Number(active)>firstThree.grade)){
        firstThree={grade:2*Number(e.anyCycle)+Number(active),active,worldRules:currentRules,generation:e.gen,site:e.site,preferred:e.preferred,winner:e.winner,cycle:e.cycle,anyCycle:e.anyCycle,claims:c};
      }
    }
  }
  const match=createTypedWorld(graph,{wallets:Array(owners).fill(bank),seed,
    arbitration,eligibility:'contest',economy:{eraseCost:fee,stampCost:8,guardStampExtra:0},onContest:audit});
  for(const o of orders)assert(match.stamp(o.owner,o.rule,inherited?o.resolver:tags[o.owner-1],o.ids,inherited?tags[o.owner-1]:'support'));
  const seen=new Set([...match.cells.values()].map(c=>c.rule));
  assert.equal(seen.size,9);
  for(let owner=1;owner<=owners;owner++)assert.equal(unique([...match.cells.values()].filter(c=>c.owner===owner).map(c=>c.rule)),9);
  const outcome=Array(owners).fill(null);
  function observe(){
    live=Array(owners).fill(0);let rules=new Set();
    for(const c of match.cells.values())if(!c.wave){live[c.owner-1]++;rules.add(c.rule);}
    currentRules=rules.size;
    if(currentRules===9)activeNine++;
    const survivors=[];
    for(let i=0;i<owners;i++){
      if(!live[i] && outcome[i]===null){outcome[i]=match.gen;}
      if(outcome[i]===null)survivors.push(i+1);
    }
    if(survivors.length<=1 && last===null){last=survivors[0]??0;first=match.gen;}
  }
  observe();
  for(let i=0;i<H;i++){match.step();observe();}
  const books=match.players.slice(1);
  return {split,seed,F:graph.f,rotation,fee,float,arbitration,tags,bank,openingCost:initialByOwner.slice(1),
    horizon:H,activeNine,liveDisputes:during.cross,liveCycles:during.cycles,liveRelative:during.relative,liveAbsolute:during.absolute,
    liveEligible:during.eligible,livePreferred:during.preferred,liveFunded:during.funded,liveThree:during.three,contests,mixedRules,crossOwner,contestedRules:contestedRules.size,eligibleDominant,
    dominantPreferred,dominantFunded,cycles,anyCycles,strictCycles,relativeCycles,cycleTags,last,decided:first,outcome,
    field:live,cash:books.map(p=>rounded(p.reserve)),cuts:books.map(p=>p.erased),detonations:books.map(p=>p.detonations),
    refused:books.map(p=>p.refused),firstThree,naturalCycle};
}

const [split='discovery',s='7',kind='both',selected='',hints='']=process.argv.slice(2),seed=Number(s);
const index=groups[split].indexOf(seed);assert(index>=0);
const F={discovery:16,holdout:24,replication:32}[split], graph=buildSphere(F),rotation=(2*index+(split==='holdout'?1:split==='replication'?3:0))%6;
const modesHere=selected?selected.split(','):modes;
for(const owners of kind==='pairs'?[2]:kind==='triple'?[3]:[2,3]){
  const orders=allRulesOrders(graph,{seed,rotation,owners});
  for(const [fee,float] of (hints?[[Number(hints),768]]:owners===2?[[4,768],[24,768],[24,4096]]:[[24,768],[24,4096]])){
    for(const arbitration of modesHere){
      const kinds=arbitration==='ballot'?ballots:policies;
      const tagSets=owners===2?combinations(kinds).flatMap(([a,b])=>[[a,b],[b,a]]):permutations(arbitration==='ballot'?kinds:triangular,3);
      for(const tags of tagSets){
        const row=run({graph,orders,split,seed,rotation,fee,float,arbitration,tags});
        console.log(JSON.stringify(row));
      }
    }
  }
}
