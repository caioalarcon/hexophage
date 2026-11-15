import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSphere} from '../../src/world/sphere.js';
import {ruleProfiles} from '../../src/match/rule-profiles.js';
import {createTypedWorld,resolvers} from './engine.mjs';
import {existenceModes,senses} from './existence.mjs';
import {rankProposals} from './arbitration.mjs';
import {footprint} from './catalog.mjs';

const graph=buildSphere(14),center=graph.farthest;
const neighbor=(id,k)=>graph.adj[6*id+k];
const seed=[...new Set([center,neighbor(center,0),neighbor(center,1),neighbor(center,3),neighbor(neighbor(center,0),2)])];
const rules=Object.entries(ruleProfiles).filter(([,r])=>r.physics&&!r.physics.birthsFromVacuum).map(([key])=>key);
const free={stampCost:0,birthCost:0,eraseCost:0,blastBirthCost:0,guardStampExtra:0,stableEnergy:0,birthEnergy:0,deathEnergy:0,salvage:0};
const view=m=>[...m.cells].sort(([a],[b])=>a-b).map(([id,c])=>[id,c.owner,c.rule,c.resolver,c.wave,c.age]);
function plainAndSplit(rule,resolver,existence,sense){
  const options={wallets:[0,0],seed:73,economy:free,arbitration:'ballot',eligibility:'contest',existence,passage:'literal'};
  const plain=createTypedWorld(graph,options),split=createTypedWorld(graph,options);
  assert(plain.stamp(1,rule,resolver,seed,'support',sense));
  for(let i=0;i<seed.length;i++)assert(split.stamp(1,rule,resolver,[seed[i]],'support',sense,{contract:'label-'+i}));
  return {plain,split};
}

test('contract labels preserve all nine automata across four interactions, five ballots and both sensors (360 cases)',()=>{
  assert.equal(rules.length,9);
  let cases=0;
  for(const rule of rules)for(const resolver of resolvers)for(const existence of existenceModes)for(const sense of senses){
    const {plain,split}=plainAndSplit(rule,resolver,existence,sense);
    for(let i=0;i<12;i++){
      const events=[[],[]],hook=index=>({onExistence:e=>events[index].push([e.site,e.yes,e.no,e.weightYes,e.weightNo,e.approved])});
      plain.step(hook(0));split.step(hook(1));
      const label=[rule,resolver,existence,sense,i+1].join('/');
      assert.deepEqual(view(split),view(plain),'same physical evolution: '+label);
      assert.deepEqual(events[1].sort(([a],[b])=>a-b),events[0].sort(([a],[b])=>a-b),'same existence electorate: '+label);
      assert.equal(split.players[1].detonations,plain.players[1].detonations,'labels cannot ignite allied carriers');
      assert.equal(split.players[1].births,plain.players[1].births);
      for(const c of split.cells.values())assert(c.contract?.startsWith('label-'),'births inherit a real parent label');
    }
    cases++;
  }
  assert.equal(cases,360);
});

test('splitting an electorate into fabrication contracts does not gain arbitration votes',()=>{
  const m=createTypedWorld(graph,{wallets:[0],economy:free});
  assert(m.stamp(1,'callahan','contact',[center],'support','native',{contract:'a'}));
  assert(m.stamp(1,'callahan','contact',[neighbor(center,0)],'support','native',{contract:'b'}));
  const a=m.cells.get(center).type,b=m.cells.get(neighbor(center,0)).type;
  assert.notEqual(a,b);assert.equal(a.physical,b.physical);
  const enemy={owner:2,rule:'bays',resolver:'contact',ballot:'age',sense:'native',wave:false};
  const parents=new Map([[10,300],[11,200],[12,400]]),rank=id=>parents.get(id);
  const claims=[{type:a,parent:10,support:2,age:1,robustness:0},{type:b,parent:11,support:1,age:1,robustness:0},
    {type:enemy,parent:12,support:0,age:20,robustness:0}];
  const canonical=claims.map(c=>({...c,type:c.type.physical??c.type}));
  rankProposals({mode:'ballot'},claims,rank,true,0);rankProposals({mode:'ballot'},canonical,rank,true,0);
  assert.deepEqual(claims.map(c=>c.parent),canonical.map(c=>c.parent));
  assert.equal(claims[0].parent,12,'the duplicate support label cannot outvote the age ballot');
});

test('spatial fuel and maturity stay equivalent under a pure contract relabeling with equal traits',()=>{
  const ids=footprint(graph,'callahan/glider',center);
  const options={wallets:[1024],economy:{...free,birthCost:1,stampCost:8},spatial:{enabled:true,stableEnergy:0},existence:'majority'};
  const plain=createTypedWorld(graph,options),split=createTypedWorld(graph,options);
  assert(plain.bootstrapStamp(1,'callahan','phase',ids));
  assert(split.bootstrapStamp(1,'callahan','phase',ids,'support','native',{contract:'a'}));
  // Types are canonical within each world, so get the second label from the
  // split world itself with an extra temporary paid cell outside the test body.
  const empty=[...split.visibility(1).visible].find(id=>!split.cells.has(id));
  assert(split.stamp(1,'callahan','phase',[empty],'support','native',{contract:'b'}));
  const b=split.cells.get(empty).type;split.cells.delete(empty);
  for(let i=0;i<ids.length;i++){
    const original=plain.cells.get(ids[i]),type=i%2?b:split.cells.get(ids[i]).type;
    split.cells.set(ids[i],Object.freeze({...original,type,contract:type.contract}));
  }
  Object.assign(split.players[1],plain.players[1]);
  for(let i=0;i<24;i++){
    plain.step();split.step();assert.deepEqual(view(split),view(plain));
    assert(Math.abs(split.players[1].reserve-plain.players[1].reserve)<1e-7);
    for(const [id,c] of plain.cells){assert(Math.abs(split.cells.get(id).energy-c.energy)<1e-7);assert.equal(split.cells.get(id).stableAge,c.stableAge);}
  }
});

test('contract traits continue to change economy and visibility while sharing the physical genotype',()=>{
  const m=createTypedWorld(graph,{wallets:[640],spatial:{enabled:true,types:{
    'hex-b2s245/contact/small':{visionRadius:2,cellCapacity:64,stampEnergy:32},
    'hex-b2s245/contact/wide':{visionRadius:9,cellCapacity:256,stampEnergy:48},
  }}});
  const ids=footprint(graph,'hex-b2s245/farm-4-12',center);
  assert(m.bootstrapStamp(1,'hex-b2s245','contact',ids,'support','native',{contract:'small'}));
  const small=m.stampQuote('hex-b2s245','contact',4,{contract:'small'}),wide=m.stampQuote('hex-b2s245','contact',4,{contract:'wide'});
  assert.equal(small.fuel,128);assert.equal(wide.fuel,192);
  assert.equal(small.traits.visionRadius,2);assert.equal(wide.traits.visionRadius,9);
  for(const c of m.cells.values())assert(c.energy<=64&&c.type.physical.contract===undefined);
});
