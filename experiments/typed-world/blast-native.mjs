// Native ignition without any economy or combat resolver. A positive control for the payload.
import assert from 'node:assert/strict';
import {catalogRules} from '../../src/simulation/catalog-rules.js';
import {advancePattern,patternSite} from '../../src/patterns/planar-simulation.js';
import {buildSphere} from '../../src/world/sphere.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {advanceGeneration} from '../../src/simulation/generation.js';
import {blastScene} from './blast-scene.mjs';

const rule='hex-b2s245', F=32, graph=buildSphere(F), scene=blastScene(graph);
for(const shape of [[[0,0],[1,0],[1,-1]],[[0,0],[1,0]]]){
  let planar=new Map(shape.map(x=>[patternSite(...x),1]));
  const m=createHeadlessMatch(graph,{rule,growth:'classic'}), sites=m.patchForStamp(scene.anchor,0,shape);
  for(const i of sites)m.addLive(i,1);
  for(let g=1;g<=64;g++){
    advanceGeneration(m.world);planar=advancePattern(planar,12,catalogRules[rule]).next;
    if([16,32,48,64].includes(g))console.log(JSON.stringify({shape:shape.length,g,plane:planar.size,sphere:m.world.activeCount}));
    if(g<=32) assert.equal(m.world.activeCount,planar.size);
  }
}
for(const target of [true,false]){
  const m=createHeadlessMatch(graph,{rule,growth:'classic',conflict:'lineage'});
  if(target)for(const i of scene.targetFarm)m.addLive(i,2);
  for(let i=0;i<16;i++)advanceGeneration(m.world);
  for(const i of scene.launch(3))m.addLive(i,1);
  for(let g=1;g<=512;g++){
    advanceGeneration(m.world);
    if([16,64,128,256,512].includes(g))
      console.log(JSON.stringify({shape:'native-p6',target,g,sphere:m.world.activeCount,attacker:m.world.ownerCells[1].length,defender:m.world.ownerCells[2].length}));
  }
}
