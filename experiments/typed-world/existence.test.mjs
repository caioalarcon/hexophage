import assert from 'node:assert/strict';
import test from 'node:test';
import {buildSphere} from '../../src/world/sphere.js';
import {ruleIds,explainContest} from './arbitration.mjs';
import {createTypedWorld} from './engine.mjs';

const graph=buildSphere(14),site=graph.farthest,n=k=>graph.adj[site*6+k];
const free={stampCost:0,stableEnergy:0,birthCost:0,eraseCost:0,salvage:0,blastBirthCost:0};
function fixture(groups,options={}){
  const {economy,...other}=options;
  const w=createTypedWorld(graph,{wallets:[100,100],...other,economy:{...free,...economy}});
  // Stamp in isolation to obtain authentic genotypes. Set their IDs to a
  // precise prior-generation contact snapshot; public orders require clearance.
  const snapshot=[];
  for(const [owner,rule,resolver,ids,sense='native'] of groups){
    assert(w.stamp(owner,rule,resolver,[0],'support',sense));
    const c=w.cells.get(0);w.cells.delete(0);
    snapshot.push(...ids.map(id=>[id,c]));
  }
  for(const [id,c] of snapshot){assert(!w.cells.has(id));w.cells.set(id,c);}
  return w;
}
function inspect(w){
  let ballot,contest;
  w.step({onExistence:e=>{if(e.site===site)ballot=e;},onContest:e=>{if(e.site===site)contest=e;}});
  return {ballot,contest,c:w.cells.get(site)};
}

test('a material NO is a vote, not an absent claim; weighted support is a separate existence policy',()=>{
  const scene=[[1,'andreen','contact',[n(0),n(1)]],[2,'bays','contact',[n(2)]]];
  for(const [mode,expected] of [['any',true],['majority',false],['unanimous',false],['support',true]]){
    const w=fixture(scene,{existence:mode}),{ballot,c}=inspect(w);
    assert.equal(ballot.aliveBefore,false);
    assert.deepEqual([ballot.yes,ballot.no,ballot.weightYes,ballot.weightNo],[1,1,2,1]);
    assert.equal(ballot.approved,expected);
    assert.equal(c?.rule,expected?'andreen':undefined);
  }
  const w=fixture([[1,'andreen','contact',[n(0),n(1)],'kin'],scene[1]],{existence:'support'});
  const {ballot}=inspect(w);
  assert.equal(ballot.votes.find(v=>v.rule==='andreen').observed,3);
  assert.equal(ballot.votes.find(v=>v.rule==='bays').observed,7);
});

test('every material rule uses S on an occupied body; a NO incumbent can be succeeded by an allied YES',()=>{
  const groups=[[1,'bays','contact',[site]],[1,'hex-b2s245','contact',[n(0),n(3)]]];
  const w=fixture(groups,{existence:'support',economy:{eraseCost:5,deathEnergy:2,birthEnergy:1}});
  const {c,ballot}=inspect(w);
  assert.deepEqual([ballot.aliveBefore,ballot.yes,ballot.no,ballot.weightYes,ballot.weightNo],[true,1,1,2,1]);
  assert.equal(ballot.incumbent.rule,'bays');
  assert.equal(ballot.votes.find(v=>v.rule==='bays').alive,false);
  assert.equal(c.owner,1);assert.equal(c.rule,'hex-b2s245');assert.equal(c.age,1);
  assert.equal(w.players[1].friendlyErased,1);assert.equal(w.players[1].friendlyEraseSpent,5);
  assert.equal(w.players[1].deathIncome,2*w.players[1].deaths);
  assert.equal(w.players[1].birthIncome,w.players[1].births);
  const poor=fixture(groups,{wallets:[0,0],existence:'support',economy:{eraseCost:5,deathEnergy:2}});
  const miss=inspect(poor);
  assert(miss.ballot.approved);assert.equal(miss.ballot.winner,null);
  assert.equal(poor.players[1].friendlyErased,0);assert.equal(poor.players[1].friendlyEraseSpent,0);
  assert(poor.players[1].deathIncome>0);
});

test('literal passage wins over material priority only with funds, cannot pierce supported guard, and bypasses a NO vote',()=>{
  const material=[2,'hex-b2s245','contact',[site,n(3),n(4)]],phase=[1,'bays','phase',[n(0),n(1)]];
  const options={existence:'unanimous',eligibility:'contest',passage:'literal',
    arbitration:{mode:'fixed',by:'resolver',order:['guard','contact','phase','antimatter']},economy:{eraseCost:24}};
  const hit=fixture([material,phase],options);
  const outcome=inspect(hit);
  assert.equal(outcome.c.owner,1);assert.equal(outcome.c.age,1);assert.equal(hit.players[1].erased,hit.players[2].lost);
  assert.equal(hit.players[1].eraseSpent,24*hit.players[1].erased);
  const {rounds}=explainContest(hit.arbitration,outcome.contest);
  assert.equal(outcome.contest.claims[rounds[0].preferred].resolver,'phase');
  const missed=fixture([material,phase],{...options,wallets:[0,100]});
  const fallback=inspect(missed);
  assert.equal(fallback.c.owner,2);assert.equal(fallback.c.age,2);
  assert.equal(missed.players[1].eraseSpent,0);assert.equal(missed.players[2].lost,0);
  assert.deepEqual(explainContest(missed.arbitration,fallback.contest).rounds.map(r=>r.accepted),[false,true]);
  const shield=fixture([[2,material[1],'guard',material[3]],phase],options);
  assert.equal(inspect(shield).c.owner,2);
  const old=fixture([material,phase],{...options,passage:'legacy'});
  assert.equal(inspect(old).c.owner,2);
  const lone=fixture([[2,'callahan','contact',[n(2),n(5)]],phase],options);
  const bypass=inspect(lone);
  assert.equal(bypass.ballot.approved,false);assert.equal(bypass.c.resolver,'phase');
});

test('birth and death coupons settle after funding and stamps produce no activity coupons',()=>{
  const w=createTypedWorld(graph,{wallets:[0],economy:{...free,birthCost:1,birthEnergy:5,deathEnergy:4}});
  assert(w.stamp(1,'bays','contact',[n(0),n(1)]));
  assert.deepEqual([w.players[1].births,w.players[1].birthIncome,w.players[1].deaths,w.players[1].conventional],[0,0,0,2]);
  w.step();
  const p=w.players[1];
  assert(p.refused>0);
  assert.deepEqual([p.births,p.deaths,p.birthIncome,p.deathIncome,p.reserve,p.conventional],[0,2,0,8,8,0]);
  w.step();
  assert.equal(p.reserve,8);
});

test('owner ledgers exclude collateral from mortuary income and track conventional field independently of the wave',()=>{
  const w=fixture([[1,'bays','antimatter',[site]],[2,'bays','phase',[n(0)]],
    [1,'hex-b2s245','contact',[0,graph.adj[0],graph.adj[1]]]],
    {existence:'majority',wallets:[0,0],economy:{salvage:3,blastBirthCost:2,birthEnergy:4,deathEnergy:3}});
  const initial=[null,4,1];w.step();
  assert(w.players[1].eroded>0);assert(w.players[1].waveBirths>0);
  for(let t=0;t<12;t++){
    for(const id of [1,2]){
      const p=w.players[id];
      assert.equal(p.deaths,initial[id]+p.births-p.field-p.eroded);
      assert.equal(p.income,p.birthIncome+p.deathIncome+p.matureIncome);
      assert.equal(p.reserve,p.income+p.salvageIncome-p.birthSpent-p.eraseSpent-p.friendlyEraseSpent-p.stampSpent);
      assert.equal(p.conventional,[...w.cells.values()].filter(c=>c.owner===id && !c.wave).length);
      assert.equal(w.fork([site]).players[id].conventional,p.conventional);
    }
    w.step();
  }
});

test('each isolated rule follows its historical native occupancy with every explicit aggregation',()=>{
  const seed=[0,graph.adj[0],graph.adj[1],graph.adj[3]];
  for(const rule of ruleIds){
    const worlds=['legacy','any','majority','support','unanimous'].map(existence=>{
      const w=createTypedWorld(graph,{existence,economy:free});
      assert(w.stamp(1,rule,'contact',seed));return w;
    });
    for(let t=1;t<=12;t++){
      for(const w of worlds)w.step();
      const expected=[...worlds[0].cells.keys()].sort((a,b)=>a-b);
      for(const w of worlds.slice(1))assert.deepEqual([...w.cells.keys()].sort((a,b)=>a-b),expected,rule);
    }
  }
});
