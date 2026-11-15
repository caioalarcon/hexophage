import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSphere} from '../../src/world/sphere.js';
import {createTypedWorld} from './engine.mjs';
import {footprint} from './catalog.mjs';
import {graphBall,normalizeSpatial} from './spatial.mjs';

const graph=buildSphere(24),site=graph.farthest;
const farm=footprint(graph,'hex-b2s245/farm-4-12',site);
const remoteSite=Array.from({length:graph.n},(_,i)=>i).find(i=>!graphBall(graph,farm,18).has(i)&&footprint(graph,'hex-b2s245/farm-4-12',i));
function world(overrides={}){
  return createTypedWorld(graph,{wallets:[640,640],seed:8,...overrides,spatial:{enabled:true,safeStampGap:0,...overrides.spatial}});
}
function start(overrides={}){
  const m=world(overrides);assert(m.bootstrapStamp(1,'hex-b2s245','contact',farm));return m;
}
const balance=m=>[...m.cells.values()].filter(c=>c.owner===1).reduce((sum,c)=>sum+c.energy,0);
function conserved(m,opening=640){
  const p=m.players[1],spent=p.stampSpent+p.birthSpent+p.eraseSpent+p.friendlyEraseSpent;
  assert(Math.abs(p.reserve-balance(m))<1e-7,'aggregate is exactly the sum of cell stores');
  assert(Math.abs(opening+p.income-p.reserve-spent-p.energyLost)<1e-7,'energy is conserved after fees and loss');
  for(const c of m.cells.values())assert(c.energy>=-1e-9&&Number.isFinite(c.energy));
}

test('spatial bootstrap is a one-time gen-zero setup and carimbo requires current light',()=>{
  const m=world();
  assert.equal(m.stampRejection(1,'hex-b2s245','contact',farm),'darkness');
  assert(m.bootstrapStamp(1,'hex-b2s245','contact',farm));
  assert.equal(m.bootstrapStamp(1,'hex-b2s245','contact',[0]),false);
  assert(m.visibility(1).visible.size>farm.length);
  const dark=Array.from({length:graph.n},(_,i)=>i).find(i=>!m.canSee(1,i));
  assert.equal(m.stampRejection(1,'callahan','contact',[dark]),'darkness');
  const lit=[...m.visibility(1).visible].find(i=>!m.cells.has(i));
  assert.equal(m.canStamp(1,'callahan','contact',[lit,dark]),false);
  m.step();assert.equal(m.bootstrapStamp(2,'callahan','contact',[0]),false);
});

test('fog keeps explored memory when light is lost',()=>{
  const m=start(),lit=[...m.visibility(1).visible].find(i=>!m.cells.has(i));
  for(const id of farm)assert.equal(m.erase(1,id,0),1);
  assert.equal(m.visibility(1).visible.size,0);
  assert(m.visibility(1).explored.has(lit));
  assert.equal(m.stampRejection(1,'callahan','contact',[lit]),'local-energy');
  conserved(m);
});

test('placement transfers initial fuel and burns only its construction tariff, atomically',()=>{
  const m=start(),lit=[...m.visibility(1).visible].find(i=>!m.cells.has(i));
  const quote=m.stampQuote('callahan','contact',[lit]);
  assert.deepEqual([quote.cost,quote.fuel,quote.total],[8,32,40]);
  const before=m.players[1].reserve;
  assert(m.stamp(1,'callahan','contact',[lit]));
  assert.equal(m.cells.get(lit).energy,32);
  assert(Math.abs(m.players[1].reserve-(before-8))<1e-8);
  conserved(m);
  const poor=start({wallets:[36,640]}),target=[...poor.visibility(1).visible].find(i=>!poor.cells.has(i));
  const snapshot=[...poor.cells],account={...poor.players[1]};
  assert.equal(poor.stampRejection(1,'callahan','contact',[target]),'local-energy');
  assert.equal(poor.stamp(1,'callahan','contact',[target]),false);
  assert.deepEqual([...poor.cells],snapshot);assert.deepEqual(poor.players[1],account);
});

test('an artificial global wallet cannot finance a local purchase',()=>{
  const m=start({wallets:[32,640]}),target=[...m.visibility(1).visible].find(i=>!m.cells.has(i));
  m.players[1].reserve=1e9;
  assert.equal(m.localReserve(1,[target]),0);
  assert.equal(m.canStamp(1,'callahan','contact',[target]),false);
});

test('the default opening settles into producers and local accounting conserves energy',()=>{
  const m=start({economy:{birthEnergy:999,deathEnergy:999}});
  for(let i=0;i<96;i++){m.step();conserved(m);}
  assert.equal(m.players[1].field,12);
  assert(m.players[1].matureIncome>0);
  assert.equal(m.players[1].birthIncome,0);assert.equal(m.players[1].deathIncome,0);
  assert.equal(m.players[1].salvageIncome,0);
  assert([...m.cells.values()].every(c=>c.stableAge>=12));
});

test('a finite-fuel moving pattern carries parental energy without birth or death income',()=>{
  const ids=footprint(graph,'callahan/glider',site),m=world({wallets:[1200,640],spatial:{stableEnergy:0}});
  assert(m.bootstrapStamp(1,'callahan','contact',ids));
  for(let i=0;i<24;i++){m.step();conserved(m,1200);}
  assert(m.players[1].field>0,'the moving pattern survives with carried fuel');
  assert(m.players[1].births>0);
  assert.equal(m.players[1].income,0);
  assert(m.players[1].reserve<1200-m.players[1].stampSpent);
});

test('generation-wide cap and remote colony counts do not affect a local producer',()=>{
  const isolated=start({spatial:{stableAfter:1,cellCapacity:4000}}),paired=isolated.fork();
  const other=footprint(graph,'hex-b2s245/farm-4-12',remoteSite);
  assert(paired.bootstrapStamp(2,'hex-b2s245','contact',other));
  for(let i=0;i<30;i++){isolated.step();paired.step();}
  const own=m=>[...m.cells].filter(([,c])=>c.owner===1).sort(([a],[b])=>a-b);
  assert.deepEqual(own(paired),own(isolated));assert.equal(paired.players[1].reserve,isolated.players[1].reserve);
});

test('custom contracts inherit through births and type traits set illumination and capacity',()=>{
  const m=world({spatial:{types:{'hex-b2s245/contact/base':{visionRadius:2,cellCapacity:200,stableEnergy:2}}}});
  assert(m.bootstrapStamp(1,'hex-b2s245','contact',farm,'support','native',{contract:'base'}));
  assert.deepEqual(m.visibility(1).visible,graphBall(graph,farm,2));
  for(let i=0;i<24;i++)m.step();
  assert([...m.cells.values()].every(c=>c.contract==='base'&&c.type.contract==='base'&&c.energy<=200));
  assert(m.players[1].births>0);conserved(m);
});

test('a full fork preserves fog, energy, contracts and exact subsequent dynamics',()=>{
  const original=start();for(let i=0;i<17;i++)original.step();
  const fork=original.fork(),oldBalance=original.players[1].reserve;
  fork.step();assert.equal(original.players[1].reserve,oldBalance);
  original.step();
  assert.deepEqual([...fork.cells],[...original.cells]);assert.deepEqual(fork.players,original.players);
  assert.deepEqual(fork.visibility(1),original.visibility(1));
  fork.erase(1,[...fork.cells.keys()][0],0);
  assert.notEqual(fork.cells.size,original.cells.size);
});

test('observed forecasts omit unseen enemies, enemy treasuries and enemy fog knowledge',()=>{
  const m=start(),far=footprint(graph,'hex-b2s245/farm-4-12',remoteSite);
  assert(m.bootstrapStamp(2,'hex-b2s245','contact',far));
  assert(far.every(id=>!m.canSee(1,id)));
  const observed=m.forkObserved(1);
  assert([...observed.cells.values()].every(c=>c.owner===1));
  assert.equal(observed.players[2].reserve,0);assert.equal(observed.players[2].field,0);
  assert.equal(observed.players[2].stampedCells,0);assert.equal(observed.visibility(2).explored.size,0);
  assert.equal(observed.players[1].reserve,m.players[1].reserve);
  const before=m.players[1].reserve;observed.step();assert.equal(m.players[1].reserve,before);
});

test('bounded forecasts cannot spend remote cellular energy or increase their spatial domain',()=>{
  const m=start(),cut=new Set([remoteSite]);
  const forecast=m.fork(cut);
  assert.equal(forecast.localReserve(1,[remoteSite]),0);
  assert.equal(forecast.canStamp(1,'callahan','contact',[remoteSite]),false);
  const nested=forecast.fork(new Set([...farm,site]));
  assert([...nested.cells.keys()].every(id=>cut.has(id)));
  forecast.step();assert.equal(forecast.players[1].reserve,m.players[1].reserve);
});

test('spatial settings reject invalid fuel, radii and unknown type traits',()=>{
  assert.throws(()=>normalizeSpatial({enabled:true,visionRadius:1.5}));
  assert.throws(()=>normalizeSpatial({enabled:true,cellCapacity:1,newbornEnergy:2}));
  assert.throws(()=>normalizeSpatial({enabled:true,types:{callahan:{stableEnergy:-1}}}));
  assert.throws(()=>normalizeSpatial({enabled:true,types:{callahan:{globalMoney:10}}}));
});

test('manual construction gets enough transferred fuel to become a new productive colony',()=>{
  const m=start();for(let i=0;i<24;i++)m.step();
  const occupied=new Set(m.cells.keys()),buffer=graphBall(graph,occupied,2);
  let target;
  for(const center of m.visibility(1).visible){
    const ids=footprint(graph,'hex-b2s245/farm-4-12',center);
    if(ids&&ids.every(id=>!buffer.has(id))&&m.canStamp(1,'hex-b2s245','contact',ids)){target=ids;break;}
  }
  assert(target,'there is space outside the base body inside its initial vision');
  const region=graphBall(graph,target,3),before=m.players[1].income;
  assert(m.stamp(1,'hex-b2s245','contact',target));
  for(let i=0;i<64;i++){m.step();conserved(m);}
  assert([...m.cells].some(([id,c])=>region.has(id)&&c.stableAge>=12),'new site became a producer');
  assert(m.players[1].income>before);
});

test('a local burst cannot consume the stores or income of a separate colony of the same owner',()=>{
  const near=farm,far=footprint(graph,'hex-b2s245/farm-4-12',remoteSite);
  const base=world({wallets:[1280,640]});
  assert(base.bootstrapStamp(1,'hex-b2s245','contact',[...near,...far]));
  for(let i=0;i<24;i++)base.step();
  const attack=base.fork(),healthyRegion=graphBall(graph,far,5),buffer=graphBall(graph,far,14);
  const target=[...attack.visibility(1).visible].find(id=>!buffer.has(id)&&!attack.cells.has(id)&&attack.canStamp(1,'callahan','phase',[id]));
  assert.notEqual(target,undefined);
  assert(attack.stamp(1,'callahan','phase',[target]));
  for(let i=0;i<40;i++){base.step();attack.step();conserved(attack,1280);}
  const healthy=m=>[...m.cells].filter(([id])=>healthyRegion.has(id)).sort(([a],[b])=>a-b);
  assert.deepEqual(healthy(attack),healthy(base));
});

test('phase cells illuminate independently and antimatter waves never create vision or production',()=>{
  const m=world();assert(m.bootstrapStamp(1,'hex-b2s245','phase',farm));
  assert(m.visibility(1).visible.size>farm.length);
  const ghost=m.fork();
  for(const [id,c] of ghost.cells){
    const type=Object.freeze({...c.type,wave:true,resolver:'antimatter'});
    ghost.cells.set(id,Object.freeze({...c,type,wave:true,resolver:'antimatter',stableAge:100}));
  }
  const wave=ghost.fork();
  assert.equal(wave.visibility(1).visible.size,0);
  wave.step();assert.equal(wave.players[1].income,0);
});

test('overlapping illumination reallocates local funds when an early greedy choice would block a legal stamp',()=>{
  const g=buildSphere(8),m=createTypedWorld(g,{wallets:[6],economy:{stampCost:1},
    spatial:{enabled:true,visionRadius:2,cellCapacity:1,newbornEnergy:0,stampEnergy:0}});
  assert(m.bootstrapStamp(1,'hex-b2s245','contact',[46,47,96]));
  const targets=[60,81,82],before=new Map(m.cells);
  // 60 can receive from 46 or 47. Both 81 and 82 need 46 or 96. Taking
  // 47 for 60 leaves exactly enough for the other two cells.
  assert.equal(m.localReserve(1,targets),3);
  assert(m.canStamp(1,'hex-b2s245','contact',targets));
  assert.deepEqual(m.cells,before,'a quotation does not reserve or debit energy');
  assert(m.stamp(1,'hex-b2s245','contact',targets));
  assert.equal(m.players[1].reserve,0);
  assert.equal(m.players[1].stampSpent,6);
  assert(targets.every(site=>m.cells.has(site)));
});

test('local funding accepts typed footprints and rejects deficient neighborhoods atomically',()=>{
  const g=buildSphere(8),m=createTypedWorld(g,{wallets:[5],economy:{stampCost:1},
    spatial:{enabled:true,visionRadius:2,cellCapacity:1,newbornEnergy:0,stampEnergy:0}});
  assert(m.bootstrapStamp(1,'hex-b2s245','contact',[46,47,96]));
  const before=new Map(m.cells),balance=m.players[1].reserve;
  assert.equal(m.stamp(1,'hex-b2s245','contact',Uint32Array.from([60,81,82])),false);
  assert.deepEqual(m.cells,before);assert.equal(m.players[1].reserve,balance);
  const funded=createTypedWorld(g,{wallets:[6],economy:{stampCost:1},
    spatial:{enabled:true,visionRadius:2,cellCapacity:1,newbornEnergy:0,stampEnergy:0}});
  assert(funded.bootstrapStamp(1,'hex-b2s245','contact',[46,47,96]));
  assert(funded.stamp(1,'hex-b2s245','contact',Uint32Array.from([60,81,82])));
});

test('local funding agrees with every three-donor assignment graph and conserves fractional supply',async()=>{
  const {fundLocalRequests}=await import('./spatial-funding.mjs');
  const assignments=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  for(let mask=0;mask<512;mask++){
    const requests=Array.from({length:3},(_,i)=>({id:i+10,donors:[0,1,2].filter(j=>mask&(1<<(i*3+j)))}));
    const possible=assignments.some(a=>a.every((donor,i)=>requests[i].donors.includes(donor)));
    const supply=new Map([[0,.5],[1,.5],[2,.5]]),debits=fundLocalRequests(requests,supply,.5);
    assert.equal(debits!==null,possible,'assignment graph '+mask);
    assert.deepEqual([...supply.values()],[.5,.5,.5]);
    if(debits){assert.equal([...debits.values()].reduce((a,b)=>a+b,0),1.5);assert([...debits.values()].every(n=>n<=.5));}
  }
});

test('the discovered map remains buildable after losing live vision when cells elsewhere can fund it',()=>{
  const m=start();
  const explored=new Set(m.visibility(1).explored);
  const outer=[...explored].filter(site=>!m.cells.has(site)).reverse();
  let donor=null,target=null;
  for(const site of outer){
    const neighbor=[...graphBall(graph,[site],1)].find(id=>id!==site&&!m.cells.has(id));
    if(neighbor!==undefined){
      const d=graphBall(graph,[site,neighbor],m.spatial.visionRadius);
      const remembered=outer.find(id=>!d.has(id)&&!m.cells.has(id)&&id!==site);
      if(remembered!==undefined&&m.canStamp(1,'callahan','contact',[site,neighbor])){
        donor=[site,neighbor];target=remembered;break;
      }
    }
  }
  assert(donor&&target!==null,'the tested opening needs a distant visible site');
  assert(m.stamp(1,'callahan','contact',donor));
  for(const id of farm)assert.equal(m.erase(1,id,0),1);
  assert(m.visibility(1).explored.has(target));
  assert.equal(m.canSee(1,target),false);
  assert.equal(m.canBuild(1,target),true);
  assert.equal(m.stampRejection(1,'callahan','contact',[target]),null);
  assert(m.stamp(1,'callahan','contact',[target]));
  conserved(m);
});

test('open-map vision shows remote cells without giving construction rights in unvisited terrain',()=>{
  const m=start({spatial:{fullMap:true}}),dark=Array.from({length:graph.n},(_,i)=>i).find(i=>!m.visibility(1).explored.has(i));
  assert(Number.isInteger(dark));
  assert.equal(m.canSee(1,dark),true);
  assert.equal(m.canBuild(1,dark),false);
  assert.equal(m.stampRejection(1,'callahan','contact',[dark]),'darkness');
});

test('safe spacing blocks accidental adjacent stamping while zero restores free cellular experimentation',()=>{
  const guarded=start({spatial:{safeStampGap:2}}),free=start({spatial:{safeStampGap:0}});
  const adjacent=[...guarded.visibility(1).explored].find(site=>!guarded.cells.has(site)&&graphBall(graph,[site],1).size&&
    [...graphBall(graph,[site],1)].some(neighbor=>guarded.cells.get(neighbor)?.owner===1));
  assert(Number.isInteger(adjacent));
  assert.equal(guarded.stampRejection(1,'callahan','contact',[adjacent]),'near-own');
  assert.equal(free.stampRejection(1,'callahan','contact',[adjacent]),null);
});
