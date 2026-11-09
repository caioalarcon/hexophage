import assert from 'node:assert/strict';
import test from 'node:test';
import {configureArbitration,explainContest,rankProposals,ruleIds} from './arbitration.mjs';
import {createTypedWorld} from './engine.mjs';
import {buildSphere} from '../../src/world/sphere.js';

const graph=buildSphere(14), mid=graph.farthest;
const n=(k)=>graph.adj[6*mid+k];
const free={birthCost:0,blastBirthCost:0,eraseCost:0,salvage:0,stableEnergy:0,stampCost:0};
function arrange(world,groups){
  // The public stamp command enforces enemy clearance at planting time.
  // Move issued cells to an exact synthetic instant of contact for a unit test.
  const issued=[];
  for(const {ids,owner,rule,resolver,ballot} of groups){
    assert(world.stamp(owner,rule,resolver,[0],ballot));
    const cell=world.cells.get(0);
    issued.push(...ids.map(id=>[id,cell]));world.cells.delete(0);
  }
  for(const [id,cell] of issued){assert(!world.cells.has(id));world.cells.set(id,cell);}
}
function settle(mode,pool) {
  const claims=[...pool];
  const flags=rankProposals(configureArbitration(mode),claims,x=>x,true,0);
  return {...flags,order:claims.map(c=>c.type.rule)};
}
const proposal=(rule,ballot,support,age,parent)=>({type:{rule,resolver:'contact',ballot},support,age,parent});
const triple=[proposal('callahan','support',3,1,2),proposal('bays','age',2,3,1),proposal('ashley','geometry',1,2,3)];
const forced={mode:'cycle',by:'rule',order:['callahan','bays','ashley']};

test('three policy families force transitive dominance or a local cycle with no dependence on input order',()=>{
  for(let i=0;i<3;i++) {
    const a=triple[i],b=triple[(i+1)%3];
    assert.equal(settle(forced,[a,b]).order[0],a.type.rule);
    assert.equal(settle(forced,[b,a]).order[0],a.type.rule);
  }
  for(const mode of [forced,'majority','ballot']){
    const result=settle(mode,triple);
    assert(result.cycle && result.anyCycle);
    assert.deepEqual(result.order,['ashley','callahan','bays']);
    assert.deepEqual(settle(mode,[triple[1],triple[2],triple[0]]),result);
  }
  const fourth=proposal('andreen','support',9,9,99);
  const partial=settle(forced,[fourth,...triple]);
  assert.equal(partial.order[0],'ashley');assert.equal(partial.order[3],'andreen');
  for(const mode of ['fixed','dominant']) {
    const leader={mode,by:'rule',order:['bays',...ruleIds.filter(x=>x!=='bays')]};
    assert.equal(settle(leader,[fourth,...triple]).order[0],'bays');
    assert(!settle(leader,triple).cycle);
  }
  assert.throws(()=>configureArbitration({...forced,order:['bays','bays','ashley']}),RangeError);
});

test('ballots are inherited preferences, distinct from a universal three-criterion majority',()=>{
  for(const [ballot,winner] of [['support','callahan'],['age','bays'],['geometry','ashley']]) {
    const all=triple.map(c=>({...c,type:{...c.type,ballot}}));
    assert.equal(settle('ballot',all).order[0],winner);
    assert.equal(settle('ballot',all).cycle,false);
    assert(settle('majority',all).cycle);
  }
});

test('a material survivor and two distinct birth tables vote at the same physical spherical site',()=>{
  // The material guard survives with support two. Each spectral birth
  // separately sees just its two parents under its own rule.
  const setup=[
    {owner:1,rule:'hex-b2s245',resolver:'guard',ids:[mid,n(0),n(1)],ballot:'age'},
    {owner:2,rule:'bays',resolver:'phase',ids:[n(2),n(3)],ballot:'geometry'},
    {owner:3,rule:'hex-b2s34',resolver:'phase',ids:[n(4),n(5)],ballot:'support'},
  ];
  const order=setup.map(x=>x.rule);
  function run(reverse) {
    const events=[],w=createTypedWorld(graph,{eligibility:'contest',arbitration:{mode:'cycle',by:'rule',order},
      wallets:[100,100,100],economy:{...free,eraseCost:7},onContest:e=>events.push(e)});
    arrange(w,reverse?[...setup].reverse():setup);
    w.step();
    const e=events.find(x=>x.site===mid);
    assert(e.cycle && e.anyCycle && e.survives);assert.equal(e.claims.length,3);
    assert.deepEqual(new Set(e.claims.map(c=>c.ballot)),new Set(['support','age','geometry']));
    return e;
  }
  const a=run(false),b=run(true);
  assert.deepEqual(a,b);
  assert.equal(a.preferred.rule,a.winner.rule);
  assert.equal(a.incumbent.rule,order[0]);
});

test('ineligible funds withdraw a cyclic winner and the new head-to-head is settled',()=>{
  const order=['hex-b2s245','bays','hex-b2s34'];
  const groups=[
    {owner:1,rule:order[0],resolver:'guard',ids:[mid,n(0),n(1)]},
    {owner:2,rule:order[1],resolver:'phase',ids:[n(2),n(3)]},
    {owner:3,rule:order[2],resolver:'phase',ids:[n(4),n(5)]},
  ];
  function run(seed,poor=0){
    const events=[],w=createTypedWorld(graph,{wallets:[100,100,100],seed,arbitration:{mode:'cycle',by:'rule',order},
      eligibility:'contest',economy:{...free,eraseCost:7}});
    arrange(w,groups);if(poor)w.players[poor].reserve=0;
    w.step({onContest:e=>{if(e.site===mid)events.push(e);}});
    return events[0];
  }
  let tested=0;
  for(let seed=1;seed<=12;seed++){
    const rich=run(seed),preferred=rich.preferred;
    if(preferred.kind==='survival')continue;
    const poor=run(seed,preferred.owner);
    assert.equal(poor.preferred.rule,preferred.rule);
    assert.equal(poor.winner.rule,order[(order.indexOf(preferred.rule)+1)%3]);
    const {rounds}=explainContest({mode:'cycle',by:'rule',order},poor);
    assert.equal(rounds[0].top.length,3);assert.equal(rounds[0].accepted,false);
    assert.equal(rounds[1].top.length,1);assert(rounds[1].accepted);
    assert.equal(poor.claims[rounds[1].preferred].parent,poor.winner.parent);
    tested++;
  }
  assert(tested>0);
});

test('friendly material replacement is opt in, charged once and inherits its voter',()=>{
  const groups=[
    {owner:1,rule:'hex-b2s245',resolver:'contact',ballot:'support',ids:[mid,n(0),n(1)]},
    {owner:1,rule:'hex-b2s34',resolver:'phase',ballot:'age',ids:[n(2),n(3)]},
  ];
  function hit(friendlyFire) {
    let event;
    const w=createTypedWorld(graph,{friendlyFire,eligibility:'contest',arbitration:{mode:'dominant',by:'rule',order:['hex-b2s34']},
      wallets:[100],economy:{...free,eraseCost:5}});
    arrange(w,groups);w.step({onBirth:e=>{if(e.site===mid)event=e;}});
    return {w,event};
  }
  const off=hit(false),on=hit(true);
  assert(!off.event);assert.equal(off.w.cells.get(mid).age,2);
  assert.equal(on.w.cells.get(mid).ballot,'age');assert.equal(on.event.ballot,'age');
  const p=on.w.players[1];assert(p.friendlyErased>0);
  assert.equal(p.friendlyEraseSpent,5*p.friendlyErased);assert.equal(p.erased,0);
});

test('a mental fork inherits the policy and lineage; only explicitly subscribed steps notify observers',()=>{
  let birth=0, contests=0, local=0;
  const w=createTypedWorld(graph,{arbitration:'ballot',onBirth:()=>birth++,onContest:()=>contests++,economy:free});
  assert(!w.stamp(1,'bays','phase',[mid],'unknown'));
  assert(w.stamp(1,'bays','phase',[n(2),n(3)],'geometry'));
  const copy=w.fork();
  assert.deepEqual(copy.arbitration,w.arbitration);
  copy.step({onBirth:()=>local++});
  assert(local>0);assert.equal(birth,0);
  assert.equal(copy.cells.get(mid).ballot,'geometry');
  w.step();assert.equal(birth,local);assert.equal(contests,0);
});

test('inspection reports each raw ballot, distinguishing true majorities from completed ties',()=>{
  function event(proposals){
    const claims=proposals.map(c=>({...c.type,support:c.support,age:c.age,parent:c.parent,geometry:c.parent,kind:'birth'}));
    return {claims,incumbent:null,eligibility:'contest',winner:claims.at(-1)};
  }
  const e=event(triple);
  for(const mode of ['majority','ballot']){
    const {rounds:[round]}=explainContest(mode,e);
    assert.equal(round.top.length,3);
    assert.equal(round.preferred,2);
    assert(round.accepted);
    assert(round.edges.every(edge=>edge.for===2 && edge.against===1 && edge.abstain===0 && edge.reason===mode));
  }
  const tied=event([proposal('bays','support',2,1,1),proposal('ashley','age',2,2,0)]);
  const {rounds:[round]}=explainContest('majority',tied);
  assert.deepEqual([round.preferred,round.edges[0].for,round.edges[0].against,round.edges[0].abstain,round.edges[0].reason],
    [0,1,1,1,'geometry']);
  assert.equal(round.edges[0].votes.filter(v=>v.choice===null).length,1);
});

test('ecology reads the accepted perturbations of the actual sensor mask, with no geometric voter',()=>{
  const groups=[
    {owner:1,rule:'hex-b2s245',resolver:'guard',ids:[mid,n(0),n(1)],ballot:'robustness'},
    {owner:2,rule:'bays',resolver:'phase',ids:[n(2),n(3)]},
    {owner:3,rule:'hex-b2s34',resolver:'phase',ids:[n(4),n(5)]},
  ];
  const w=createTypedWorld(graph,{arbitration:'ecology',eligibility:'contest',wallets:[100,100,100],economy:free});
  arrange(w,groups);
  let event;w.step({onContest:e=>{if(e.site===mid)event=e;}});
  // The S245 guard sees its two material neighbours. Flipping one gives one
  // or three, neither survives. Both B2 births likewise reject every flip.
  assert(event.claims.every(c=>c.robustness===0));
  for(const edge of explainContest('ecology',event).rounds[0].edges)
    assert.deepEqual(edge.votes.map(v=>v.criterion),['support','age','robustness']);
  const data=triple.map((c,i)=>({...c,robustness:[2,1,3][i]}));
  assert(settle('ecology',data).cycle);
  assert(!settle('ecology',data.map(c=>({...c,robustness:c.support}))).cycle);
});

test('all 64 resolver matrices reproduce every chosen edge, top cycle and all insertion orders',()=>{
  const families=['guard','antimatter','phase','contact'];
  const proposals=families.map((f,i)=>({type:{rule:ruleIds[i],resolver:f,ballot:'support'},support:3-i,age:i,parent:i+1}));
  const orders=[];
  function permute(prefix,rest) {
    if(!rest.length){orders.push(prefix);return;}
    for(const item of rest)permute([...prefix,item],rest.filter(x=>x!==item));
  }
  permute([],proposals);
  for(let value=0;value<64;value++){
    const matrix=value.toString(2).padStart(6,'0'), wins=families.map(()=>new Set());
    const policy={mode:'matrix',by:'resolver',order:families,matrix};
    let edge=0;
    for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
      const [a,b]=matrix[edge++]==='1'?[i,j]:[j,i];
      wins[a].add(b);
      for(const pair of [[proposals[i],proposals[j]],[proposals[j],proposals[i]]])
        assert.equal(settle(policy,pair).order[0],proposals[a].type.rule);
    }
    // Independent reference: the smallest nonempty subset for which every
    // member beats every outsider is the Smith set of a complete tournament.
    const subsets=[];
    for(let bits=1;bits<16;bits++){
      const members=[0,1,2,3].filter(i=>bits&(1<<i)), other=[0,1,2,3].filter(i=>!(bits&(1<<i)));
      if(members.every(i=>other.every(j=>wins[i].has(j))))subsets.push(members);
    }
    const source=subsets.sort((a,b)=>a.length-b.length)[0];
    const expected=proposals[Math.max(...source)].type.rule;
    for(const perm of orders) {
      const result=settle(policy,perm);
      assert.equal(result.order[0],expected);assert.equal(result.cycle,source.length>1);
    }
  }
});

test('a rule matrix validates complete families and reads all 36 bits in the specified permutation',()=>{
  const order=[...ruleIds].reverse(),matrix='110011010011101001110010100011100010';
  const policy={mode:'matrix',by:'rule',order,matrix};
  let edge=0;
  for(let i=0;i<9;i++)for(let j=i+1;j<9;j++) {
    const a=proposal(order[i],'support',0,1,i),b=proposal(order[j],'support',4,7,j);
    assert.equal(settle(policy,[a,b]).order[0],matrix[edge++]==='1'?order[i]:order[j]);
  }
  for(const invalid of [{order:order.slice(1)},{order:order.map(()=>order[0])},{matrix:'0'},
    {matrix:'a'.repeat(36)},{matrix:Array(36).fill('0')},{matrix:null}]){
    assert.throws(()=>configureArbitration({...policy,...invalid}),RangeError);
  }
  const e={claims:[{rule:order[0],resolver:'guard',support:0,parent:1,geometry:1,kind:'birth'},
    {rule:order[1],resolver:'guard',support:4,parent:2,geometry:2,kind:'birth'}],
    eligibility:'contest',winner:{parent:1}};
  assert.equal(explainContest(policy,e).rounds[0].edges[0].reason,'matrix');
});
