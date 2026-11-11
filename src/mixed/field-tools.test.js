import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSphere} from '../world/sphere.js';
import {patchForStamp} from '../patterns/spherical-patch.js';
import {footprint} from '../../experiments/typed-world/catalog.mjs';
import {createTypedWorld} from '../../experiments/typed-world/engine.mjs';
import {brushAngularRadius,circularSites,capturePattern,nearestPatternSite,normalizeToolSettings} from './field-tools.js';

const graph=buildSphere(32),home=graph.farthest;
const free={stampCost:0,birthCost:0,blastBirthCost:0,eraseCost:0,stableEnergy:0,birthEnergy:0,deathEnergy:0};
const sorted=xs=>[...xs].sort((a,b)=>a-b);
const points=offsets=>offsets.map(p=>p.join(',')).sort();
const view=m=>[...m.cells].sort(([a],[b])=>a-b).map(([id,c])=>[id,c.owner,c.rule,c.resolver,c.ballot,c.sense,c.wave,c.age]);
function angular(a,b){
  const p=graph.coords.subarray(3*a,3*a+3),q=graph.coords.subarray(3*b,3*b+3);
  return Math.acos(Math.min(1,Math.max(-1,(p[0]*q[0]+p[1]*q[1]+p[2]*q[2])/(Math.hypot(...p)*Math.hypot(...q)))));
}

test('brush is a spherical circle, including defect neighborhoods, rather than a graph-distance hexagon',()=>{
  for(const center of [home,graph.pents[0]]){
    const radius=7,limit=brushAngularRadius(graph,center,radius);
    const expected=Array.from({length:graph.n},(_,id)=>id).filter(id=>angular(center,id)<=limit+1e-7);
    assert.deepEqual(sorted(circularSites(graph,center,radius)),expected);
  }
  const hex=new Set([home]),queue=[{id:home,d:0}];
  for(const {id,d} of queue)if(d<7)for(let k=0;k<graph.deg[id];k++){
    const next=graph.adj[6*id+k];if(!hex.has(next)){hex.add(next);queue.push({id:next,d:d+1});}
  }
  assert(circularSites(graph,home,7).some(id=>!hex.has(id)));
  assert.deepEqual(circularSites(graph,home,0),[home]);
  assert.deepEqual(circularSites(graph,-1,3),[]);
});

test('cashless erasing removes only own cells and pays no death reward, salvage or combat tribute',()=>{
  const m=createTypedWorld(graph,{wallets:[0,0],economy:{...free,stableAfter:1,deathEnergy:11}});
  const own=patchForStamp({graph},home,0,[[0,0],[0,1]]),other=patchForStamp({graph},home,0,[[4,0]]);
  assert(m.stamp(1,'bays','contact',own));assert(m.stamp(2,'bays','contact',other));
  const before={...m.players[1]},rev=m.actionRevision;
  assert.deepEqual(sorted(m.erasePreview(1,home,8)),sorted(own));
  assert.equal(m.erase(1,home,8),2);
  assert.equal(m.cells.get(other[0]).owner,2);
  const after=m.players[1];
  for(const key of ['reserve','income','birthIncome','deathIncome','salvageIncome','births','deaths','eroded','eraseSpent','erased','lost'])assert.equal(after[key],before[key],key);
  assert.equal(after.field,0);assert.equal(after.conventional,0);assert.equal(after.mature,0);
  assert.equal(after.toolErased,2);assert.equal(after.eraseActions,1);assert.equal(m.actionRevision,rev+1);
  m.step();assert.equal(m.players[1].deathIncome,0);assert.equal(m.players[1].deaths,0);
  assert.equal(m.erase(1,other[0],1),0);assert(m.cells.get(other[0])===undefined||m.cells.get(other[0]).owner===2);
});

test('erase handles waves, immediate counters, inactive players, bounds and forked domains',()=>{
  const m=createTypedWorld(graph,{economy:free});
  const own=footprint(graph,'hex-b2s245/farm-4-12',home);
  assert(m.stamp(1,'hex-b2s245','contact',own));
  for(let i=0;i<16;i++)m.step();
  const site=[...m.cells.keys()][0],c=m.cells.get(site);
  m.cells.set(site,Object.freeze({...c,wave:true,type:Object.freeze({...c.type,wave:true})}));m.players[1].conventional--;
  const before=m.players[1].field,clone=m.fork(new Set([site]));
  assert.equal(clone.erase(1,site,0),1);
  assert.equal(clone.players[1].field,before-1);
  assert.equal(clone.players[1].conventional,m.players[1].conventional);
  assert.equal(clone.players[1].mature,m.players[1].mature-1);
  assert.equal(m.cells.get(site).wave,true);
  assert.equal(clone.erase(1,home,12),0);
  assert.equal(m.erase(1,site,13),0);assert.equal(m.erase(1,site,.5),0);
  assert.equal(m.erase(0,site,1),0);assert.equal(m.erase(99,site,1),0);
  m.players[1].out=true;assert.equal(m.erase(1,site,0),0);assert.equal(m.players[1].out,true);
});

test('whole-world forecast and intervention reproduce deterministic generations and preserve isolated tool settings',()=>{
  const m=createTypedWorld(graph,{seed:43,economy:free});
  assert(m.stamp(1,'hex-b2s245','contact',patchForStamp({graph},home,0,[[0,0],[1,0],[1,-1]])));
  for(let i=0;i<12;i++)m.step();
  const f=m.fork(),revision=m.actionRevision;
  assert.equal(f.actionRevision,revision);assert.equal(f.erase(1,home,1),m.erase(1,home,1));
  for(let i=0;i<32;i++){m.step();f.step();assert.deepEqual(view(m),view(f));assert.deepEqual(m.players,f.players);}
  assert.equal(m.actionRevision,revision+1);
  m.setToolSettings({maxEraseRadius:30,maxStampCells:3});
  assert.equal(f.toolSettings.maxEraseRadius,12);assert.equal(f.toolSettings.maxStampCells,1024);
  const capped=createTypedWorld(graph,{economy:free,toolSettings:{maxStampCells:3}}),candidate=footprint(graph,'callahan/glider',home);
  assert.equal(candidate.length,6);assert(!capped.canStamp(2,'callahan','contact',candidate));
  assert(!capped.stamp(2,'callahan','contact',candidate));assert.equal(capped.actionRevision,0);
  assert.throws(()=>m.setToolSettings({maxEraseRadius:0}),/inteiros positivos/);
  assert.throws(()=>normalizeToolSettings({maxStampCells:Infinity}),/inteiros positivos/);
});

test('picker captures the detached spark of a rotated Callahan glider, preserving owner-independent reusable traits',()=>{
  for(const rotation of [0,1,4]){
    const m=createTypedWorld(graph,{economy:free}),ids=footprint(graph,'callahan/glider',home,rotation);
    assert(m.stamp(2,'callahan','guard',ids,'robustness','kin'));
    const capture=capturePattern(m,ids[0]);assert(capture.ok);
    assert.equal(capture.ids.length,6);assert.deepEqual(sorted(capture.ids),sorted(ids));assert.equal(capture.connectivity,3);
    assert.equal(capture.sourceOwner,2);assert.equal(capture.card.rule,'callahan');assert.equal(capture.card.resolver,'guard');
    assert.equal(capture.card.ballot,'robustness');assert.equal(capture.card.sense,'kin');
    const shape=capture.card.offsets,replica=createTypedWorld(graph,{economy:free});
    const placed=patchForStamp({graph},home,0,shape);
    assert(replica.stamp(1,capture.card.rule,capture.card.resolver,placed,capture.card.ballot,capture.card.sense));
    const recaptured=capturePattern(replica,placed[0]);assert(recaptured.ok);
    assert.deepEqual(points(recaptured.card.offsets),points(shape));
  }
});

test('picker respects view rotation/mirror, maximum size, nearest component and exact defect failures',()=>{
  const m=createTypedWorld(graph,{economy:free}),ids=footprint(graph,'callahan/glider',home);
  assert(m.stamp(1,'callahan','contact',ids));
  const nearest=nearestPatternSite(m,home);assert(ids.includes(nearest));
  const original=capturePattern(m,nearest),mirrored=capturePattern(m,nearest,{side:-1}),turned=capturePattern(m,nearest,{orientation:1});
  assert(original.ok&&mirrored.ok&&turned.ok);assert.notDeepEqual(points(original.card.offsets),points(mirrored.card.offsets));assert.notDeepEqual(points(original.card.offsets),points(turned.card.offsets));
  const capped=capturePattern(m,home,{maxCells:5});assert.equal(capped.ok,false);assert.equal(capped.reason,'too-large');assert(capped.atLeast>5);
  assert.equal(capturePattern(createTypedWorld(graph),home).reason,'empty');
  const pent=createTypedWorld(graph,{economy:free});assert(pent.stamp(1,'callahan','contact',[graph.pents[0]]));
  assert.equal(capturePattern(pent,graph.pents[0]).reason,'geometry');
  for(const id of ids){const c=m.cells.get(id);m.cells.set(id,{...c,wave:true,resolver:'antimatter'});}
  const wave=capturePattern(m,ids[0]);assert(wave.ok);assert.equal(wave.sourceWave,true);assert.equal(wave.card.resolver,'antimatter');
  for(const transient of ['owner','age','wave'])assert(!Object.hasOwn(wave.card,transient));
});
