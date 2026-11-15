// Deterministic actual-match, multi-agent strategic endurance study.
// node experiments/frontier-resources/long-game.mjs 4096 7,41,109 6 32
import assert from 'node:assert/strict';
import {buildSphere} from '../../src/world/sphere.js';
import {patchForStamp} from '../../src/patterns/spherical-patch.js';
import {createGameMatch} from '../typed-world/game/match.mjs';
import {createGameBots} from '../typed-world/game/bots.mjs';
import {graphBall} from '../typed-world/spatial.mjs';

const horizon=Number(process.argv[2]??4096),seeds=(process.argv[3]??'7,41,109').split(',').map(Number),
  players=Number(process.argv[4]??6),F=Number(process.argv[5]??32);
assert(Number.isSafeInteger(horizon)&&horizon>=1024&&horizon<=20000);
assert(seeds.length>=1&&seeds.every(Number.isSafeInteger));
assert(Number.isSafeInteger(players)&&players>=3&&players<=6);
assert(Number.isSafeInteger(F)&&F>=16&&F<=128);
const rounded=n=>Math.round(n*1000)/1000;
function pseudo(seed){let x=seed>>>0;return n=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return Math.floor(x/4294967296*n);};}
const rows=[];
for(const seed of seeds){
 const graph=buildSphere(F),session=createGameMatch({graph,F,players,seed,progression:{enabled:true}}),m=session.match,p=m.progression;
 const orders=[],humans=[],incidents=[],checkpoints=[],firstContacts=Array(players+1).fill(null);
 let illegal=0,maxWork=0,usedWork=0;
 const bots=createGameBots(m,{seed,owners:Array.from({length:players-1},(_,i)=>i+2),budget:4,horizon:16,
   beforeOrder:o=>{if(o.tool==='stamp' && (!p.getQuote(o.owner,o.contract,o.ids).ok || o.ids.some(id=>!m.canBuild(o.owner,id))))illegal++;},
   onOrder:o=>{orders.push({gen:m.gen,owner:o.owner,contract:o.contract,role:o.role,tool:o.tool,research:o.research??false});}});
 const pick=pseudo(seed^0xc01da7),plan=p.planFor(1),nodeById=new Map(plan.nodes.map(n=>[n.id,n]));
 function humanTurn(){
   if(session.outcome!==null||!session.alive[1])return;
   const seen=m.visibility(1).explored,available=p.legalCards(1),counts=new Map();
   for(const c of m.cells.values())if(c.owner===1&&c.contract)counts.set(c.contract,(counts.get(c.contract)??0)+1);
   const priorities=['relay','battery','scout','pulse','base'].filter(id=>available.some(c=>c.contract===id));
   if(!priorities.length)return;
   const sorted=priorities.sort((a,b)=>{
     const countA=counts.get(a)??0,countB=counts.get(b)??0;
     return (countA===0?0:countA<6?1:2)-(countB===0?0:countB<6?1:2);
   });
   const candidates=[...seen].filter(id=>graph.deg[id]===6&&!m.cells.has(id));
   if(!candidates.length)return;
   for(const id of sorted){
     const card=available.find(c=>c.contract===id),traits=nodeById.get(id);
     for(let i=0;i<Math.min(44,candidates.length);i++){
       const center=candidates[(pick(candidates.length)+i)%candidates.length],rotation=pick(6);
       const ids=patchForStamp({graph},center,rotation,card.offsets);
       if(!ids||!m.canStamp(1,card.rule,card.resolver,ids,card.ballot,card.sense,{contract:card.contract}))continue;
       const near=graphBall(graph,[center],Math.min(8,traits.vision));
       const frontier=[...near].filter(x=>!seen.has(x)).length;
       if(id==='base' && frontier===0 && (counts.get(id)??0)>24)continue;
       const before=m.players[1].reserve;
       if(m.stamp(1,card.rule,card.resolver,ids,card.ballot,card.sense,{contract:card.contract})){
         humans.push({gen:m.gen,contract:id,center,rotation,area:ids.length,frontier,energyBefore:rounded(before),
           energyAfter:rounded(m.players[1].reserve)});
         return;
       }
     }
   }
 }
 let firstVisible=null;
 for(let i=0;i<horizon && session.outcome===null;i++){
   session.step();
   if(session.outcome===null){
     bots.turn();
     if(m.gen%48===0)humanTurn();
   }
   if(m.gen%16===0){
     for(let owner=1;owner<=players;owner++){
       if(firstContacts[owner]!==null)continue;
       for(const [site,c] of m.cells)if(c.owner!==owner&&m.canSee(owner,site)){firstContacts[owner]=m.gen;break;}
     }
   }
   const work=bots.stats.reduce((sum,s)=>sum+s.work,0);maxWork=Math.max(maxWork,work-usedWork);usedWork=work;
   if(m.gen%256===0||session.outcome!==null){
     const seats=m.players.slice(1).map((s,j)=>({
       owner:j+1,cells:s.conventional,energy:rounded(s.reserve),income:rounded(s.income),
       explored:m.visibility(j+1).explored.size,root:p.objective(j+1).rootCells,
       hits:s.erased,losses:s.lost,harvest:rounded(p.stats(j+1).harvested.reduce((a,b)=>a+b,0))
     }));
     checkpoints.push({generation:m.gen,seats});
     for(let owner=1;owner<=players;owner++)if(p.objective(owner).defeated&&!incidents.some(v=>v.owner===owner))incidents.push({owner,gen:m.gen});
   }
 }
 bots.destroy();
 assert.equal(illegal,0,'every committed bot order must be legal in the real game');
 assert(maxWork<=4,'global forecast work budget is honored');
 const seats=m.players.slice(1).map((player,j)=>{
   const owner=j+1,st=p.stats(owner),root=p.objective(owner);
   const balance=Math.max(...st.initial.map((v,k)=>Math.abs(v+st.harvested[k]-st.spent[k]-st.inventory[k])));
   assert(balance<1e-7,'material balance must be conserved over the entire match');
   return {owner,root:root.rootCells,baseContract:root.base,field:player.conventional,energy:rounded(player.reserve),
     produced:rounded(player.income),explored:m.visibility(owner).explored.size,harvest:rounded(st.harvested.reduce((a,b)=>a+b,0)),
     destroyed:player.erased,lost:player.lost,materialError:balance,orders:bots.stats[owner].orders,
     researched:bots.stats[owner].researchOrders,raids:bots.stats[owner].raids};
 });
 rows.push({seed,F,players,expectedGenerations:horizon,actualGenerations:m.gen,winner:session.outcome,
   humanActions:humans,firstContacts,incidents,illegal,maxWork,totalWork:usedWork,
   botOrders:orders,raids:orders.filter(o=>o.role==='raid').length,
   botGliders:orders.filter(o=>o.contract?.includes('scout')).length,
   uniqueRecipes:[...new Set(orders.map(o=>o.contract).filter(Boolean))],
   checkpoints,seats});
 console.error('LONG MATCH',JSON.stringify({seed,gens:m.gen,winner:session.outcome,humanActions:humans.length,
   orders:orders.length,raids:orders.filter(o=>o.role==='raid').length,botGliders:orders.filter(o=>o.contract?.includes('scout')).length,
   firstContacts,illegal,roots:seats.map(x=>x.root)}));
}
console.log(JSON.stringify({version:1,horizon,F,players,seeds,mode:'full deterministic engine, real bot purchases and scripted player build decisions',rows},null,2));
