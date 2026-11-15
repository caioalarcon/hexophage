import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSphere} from '../../../src/world/sphere.js';
import {patchForStamp} from '../../../src/patterns/spherical-patch.js';
import {createTypedWorld} from '../engine.mjs';
import {blastScene} from '../blast-scene.mjs';
import {createGameBots} from './bots.mjs';
import {defaultProgressionPlan,attachProgression,progressionSpatialTypes,normalizeProgressionPlan} from './progression.mjs';

test('resource bots use their custom plan, physical parent, local energy and four resource balances',()=>{
  const graph=buildSphere(16),scene=blastScene(graph),rawPlan=defaultProgressionPlan();
  // Every recipe has a custom name/key and keeps explicit editable geometry.
  for(const n of rawPlan.nodes)n.cardKey=null;
  const plan=normalizeProgressionPlan(rawPlan);
  const m=createTypedWorld(graph,{wallets:[1600,1600],spatial:{enabled:true,types:progressionSpatialTypes(plan)},
    arbitration:'ballot',eligibility:'contest',existence:'majority',passage:'literal'});
  const p=attachProgression(m,{plan,seed:41,initialResources:[96,96,96,96]}),base=plan.nodes.find(n=>n.id===plan.base);
  assert(p.bootstrap(1,plan.base,patchForStamp({graph},scene.anchor,0,base.offsets)));
  assert(p.bootstrap(2,plan.base,patchForStamp({graph},scene.remote,0,base.offsets)));
  const orders=[],receipts=[];
  const bots=createGameBots(m,{seed:41,owners:[2],cards:[],budget:2,horizon:16,fieldTools:false,
    beforeOrder:o=>{
      assert(o.contract&&o.ids.every(id=>m.canSee(2,id)));
      const q=p.getQuote(2,o.contract,o.ids);assert(q.ok);
      if(o.research){assert(o.expected<=0);assert(-o.expected<=o.researchCharge);assert(o.researchCharge<=o.researchBudget);assert(o.researchBudget<=.15*m.players[2].income+1e-8);}
      receipts.push({before:p.inventory(2),cost:q.cost});
    },onOrder:o=>{
      const receipt=receipts.at(-1),after=p.inventory(2);
      for(let k=0;k<4;k++)assert(Math.abs(receipt.before[k]-receipt.cost[k]-after[k])<1e-8);
      orders.push(o);
    }});
  for(let i=0;i<256;i++){m.step();bots.turn();}
  bots.destroy();
  assert(orders.length>0,'the custom fabrication plan must be usable by the bot');
  assert(orders.some(o=>o.contract!=='base'),'the bot must test a new live capability');
  assert(orders.some(o=>plan.nodes.find(n=>n.id===o.contract).depth>=2),'an affordable second-level recipe must be tried');
  const research=orders.filter(o=>o.research);
  assert.equal(new Set(research.map(o=>o.contract)).size,research.length,'a contract gets at most one subsidized field experiment');
  assert(bots.stats[2].researchSpent<=.15*m.players[2].income+1e-8);
  for(const o of orders){assert(plan.nodes.some(n=>n.id===o.contract));assert(o.key.startsWith('custom/'));}
  const stat=p.stats(2);
  for(let k=0;k<4;k++)assert(Math.abs(stat.initial[k]+stat.harvested[k]-stat.spent[k]-stat.inventory[k])<1e-7);
});
