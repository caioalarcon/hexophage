// node experiments/frontier-resources/bots-survey.mjs [generations] [comma-separated-seeds]
import assert from 'node:assert/strict';
import {buildSphere} from '../../src/world/sphere.js';
import {patchForStamp} from '../../src/patterns/spherical-patch.js';
import {createTypedWorld} from '../typed-world/engine.mjs';
import {spreadSites} from '../typed-world/general/scene.mjs';
import {createGameBots} from '../typed-world/game/bots.mjs';
import {attachProgression,defaultProgressionPlan,normalizeProgressionPlan,progressionSpatialTypes} from '../typed-world/game/progression.mjs';

const horizon=Number(process.argv[2]??256),seeds=(process.argv[3]??'7,41,109').split(',').map(Number);
assert(Number.isSafeInteger(horizon)&&horizon>0&&horizon<=4096);assert(seeds.every(Number.isSafeInteger));
const graph=buildSphere(24),plan=normalizeProgressionPlan(defaultProgressionPlan()),base=plan.nodes.find(n=>n.id===plan.base),rows=[];
for(const seed of seeds){
  const match=createTypedWorld(graph,{seed,wallets:[640,640,640],spatial:{enabled:true,types:progressionSpatialTypes(plan)},
    arbitration:'ballot',eligibility:'contest',existence:'majority',passage:'literal'});
  const p=attachProgression(match,{plan,seed}),starts=spreadSites(graph,3);
  for(let owner=1;owner<=3;owner++)assert(p.bootstrap(owner,plan.base,patchForStamp({graph},starts[(seed+owner-1)%3],owner%6,base.offsets)));
  const orders=[],firstContact=[null,null,null,null],firstDefeat=[null,null,null,null];let illegal=0,maxWork=0,work=0;
  const bots=createGameBots(match,{seed,owners:[2,3],cards:[],budget:4,horizon:16,beforeOrder:o=>{
    if((o.tool!=='eraser'&&(!o.contract||!p.getQuote(o.owner,o.contract,o.ids).ok))||o.ids.some(id=>!match.canSee(o.owner,id)))illegal++;
  },onOrder:o=>orders.push({owner:o.owner,gen:o.gen,contract:o.contract,key:o.key,role:o.role,research:o.research,
    ...(o.research?{expected:o.expected,researchBudget:o.researchBudget,researchCharge:o.researchCharge}:{} )})});
  for(let t=0;t<horizon;t++){
    match.step();bots.turn();
    for(let owner=1;owner<=3;owner++)if(firstContact[owner]===null&&[...match.cells].some(([id,c])=>c.owner!==owner&&match.canSee(owner,id)))firstContact[owner]=match.gen;
    for(let owner=1;owner<=3;owner++)if(firstDefeat[owner]===null&&p.objective(owner).defeated)firstDefeat[owner]=match.gen;
    const now=bots.stats.reduce((n,s)=>n+s.work,0);maxWork=Math.max(maxWork,now-work);work=now;
  }
  bots.destroy();assert.equal(illegal,0);assert(maxWork<=4);
  const seats=match.players.slice(1).map((player,i)=>{
    const owner=i+1,s=p.stats(owner);
    const conservationError=Math.max(...s.initial.map((v,k)=>Math.abs(v+s.harvested[k]-s.spent[k]-s.inventory[k])));
    assert(conservationError<1e-7);
    return {owner,field:player.conventional,energy:player.reserve,explored:match.visibility(owner).explored.size,objective:p.objective(owner),
      enemyCellsReplaced:player.erased,ownCellsLostToReplacement:player.lost,
      resources:s,conservationError,trials:bots.stats[owner].trials,orders:bots.stats[owner].orders,
      researchOrders:bots.stats[owner].researchOrders,researchSpent:bots.stats[owner].researchSpent};
  });
  rows.push({seed,F:graph.f,generations:horizon,players:3,budget:4,work,maxWork,illegal,firstContact,firstDefeat,orders,seats});
}
console.log(JSON.stringify({version:1,plan,rows},null,2));
