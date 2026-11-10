import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSphere} from '../world/sphere.js';
import {pointOnSphere} from '../world/geometry.js';
import {nearestColony} from './colony.js';
import {footprint} from '../../experiments/typed-world/catalog.mjs';

const graph=buildSphere(16),home=graph.farthest;
const ring=site=>Array.from({length:graph.deg[site]},(_,edge)=>graph.adj[site*6+edge]);
const look=pointOnSphere(graph,home);
let far=0;
for(let site=1;site<graph.n;site++){
  const dot=id=>pointOnSphere(graph,id).reduce((sum,value,axis)=>sum+value*look[axis],0);
  if(dot(site)<dot(far))far=site;
}

test('player navigation centers the closest occupied component regardless of insertion order',()=>{
  const near=ring(home),distant=ring(far);
  const cells=new Map([...distant,...near].map(site=>[site,{owner:2}]));
  assert.equal(nearestColony(graph,cells,2,look),home);
  assert.equal(nearestColony(graph,new Map([...cells].reverse()),2,look),home);
  assert.equal(nearestColony(graph,cells,2,pointOnSphere(graph,far)),far);
});

test('navigation follows actual ownership including waves and handles empty players',()=>{
  const cells=new Map([[home,{owner:3}],[far,{owner:2,wave:true}]]);
  assert.equal(nearestColony(graph,cells,2,look),far);
  assert.equal(nearestColony(graph,cells,3,look),home);
  assert.equal(nearestColony(graph,cells,1,look),null);
});

test('empty gaps inside a farm do not split the group followed by the camera',()=>{
  const sites=footprint(graph,'hex-b2s245/farm-4-12',home,0);
  const cells=new Map(sites.map(site=>[site,{owner:1}]));
  const sum=[0,0,0];
  for(const site of sites)pointOnSphere(graph,site).forEach((value,axis)=>sum[axis]+=value);
  let expected=0,best=-Infinity;
  for(let site=0;site<graph.n;site++){
    const dot=pointOnSphere(graph,site).reduce((total,value,axis)=>total+value*sum[axis],0);
    if(dot>best){expected=site;best=dot;}
  }
  for(const site of sites)assert.equal(nearestColony(graph,cells,1,pointOnSphere(graph,site)),expected);
});
