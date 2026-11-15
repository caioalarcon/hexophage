import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSphere} from '../../../src/world/sphere.js';
import {patchForStamp} from '../../../src/patterns/spherical-patch.js';
import {createTypedWorld} from '../engine.mjs';
import {blastScene} from '../blast-scene.mjs';
import {atlasCards} from './atlas-model.mjs';
import {createGameBots} from './bots.mjs';
import {createGameMatch} from './match.mjs';

const farm=atlasCards.find(c=>c.key==='hex-b2s245/farm-4-12');
const userCard={...farm,key:'my-investigation/shape-001',name:'User seed',custom:true,source:'user',group:'my-shapes'};
function observationTrial(graph,large){
  const scene=blastScene(graph),m=createTypedWorld(graph,{wallets:[1600,1600],spatial:{enabled:true,safeStampGap:0},
    arbitration:'ballot',eligibility:'contest',existence:'majority',passage:'literal'});
  assert(m.bootstrapStamp(1,farm.rule,'contact',scene.targetFarm));
  assert(m.bootstrapStamp(2,farm.rule,'contact',large?scene.largeFarm:scene.smallFarm));
  for(let t=0;t<32;t++)m.step();
  const orders=[],decisions=[];
  const bots=createGameBots(m,{owners:[1],seed:41,cards:[userCard],horizon:16,budget:2,interval:4,fieldTools:false,
    beforeOrder:o=>{
      assert(o.ids.every(id=>m.canSee(o.owner,id)));
      assert(m.canStamp(o.owner,o.rule,o.resolver,o.ids,o.ballot,o.sense));
    },onOrder:o=>orders.push({gen:o.gen,key:o.key,ids:o.ids,expected:o.expected}),
    onDecision:d=>decisions.push(d)});
  let work=0,hiddenAction=false;
  for(let t=0;t<80;t++){
    m.step();
    if(large&&t===20){
      const ids=patchForStamp({graph},scene.remote,0,[[6,0]]);
      if(ids&&ids.every(id=>!m.canSee(1,id)))hiddenAction=m.stamp(2,'callahan','contact',ids);
    }
    bots.turn();bots.turn();
    assert(bots.stats[1].work-work<=2);work=bots.stats[1].work;
  }
  const own=[...m.cells].filter(([,c])=>c.owner===1).map(([site,c])=>[site,c.rule,c.energy,c.age]);
  const out={orders,decisions,own,stats:bots.stats[1],hiddenAction};bots.destroy();return out;
}
test('spatial choices ignore hidden armies, hidden spending and hidden action notifications',()=>{
  const graph=buildSphere(32),small=observationTrial(graph,false),large=observationTrial(graph,true);
  assert(large.hiddenAction,'the invisible action fixture must execute');
  assert.deepEqual(large.decisions,small.decisions);
  assert.deepEqual(large.orders,small.orders);
  assert.deepEqual(large.own,small.own);
  assert(small.stats.trials>0);
  assert(small.orders.length>0,'custom shapes are considered and purchased without catalogue identity');
  assert(small.orders.every(o=>o.key===userCard.key));
});

test('spatial bots expand through current light with a single bounded work budget',()=>{
  const g=createGameMatch({F:16,seed:7,players:3,bank:1600,spatial:{enabled:true,safeStampGap:0}}),m=g.match,orders=[];
  const explored=m.visibility(2).explored.size;
  const bots=createGameBots(m,{seed:7,budget:4,horizon:16,cards:[farm],fieldTools:false,beforeOrder:o=>{
    assert(o.ids.every(id=>m.canSee(o.owner,id)));
  },onOrder:o=>orders.push(o)});
  let before=0;
  while(m.gen<128&&g.outcome===null){
    g.step();bots.turn();const work=bots.stats.reduce((n,s)=>n+s.work,0);assert(work-before<=4);before=work;
  }
  bots.destroy();
  assert(orders.length>0);assert(orders.every(o=>o.owner>=2));
  assert(m.visibility(2).explored.size>explored);
});
