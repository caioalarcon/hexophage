// Two P20s firing into one another. Coordinates found by scanning offsets
// q=0..13, r=-34..-43 with the second stamp rotated 180 degrees.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {buildSphere} from '../../src/world/sphere.js';
import {atlasPatterns} from '../../src/patterns/atlas-data.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {combatDeaths} from './causality.mjs';
import {wreckage} from './wreckage.mjs';
const offsets=decodeRLE(atlasPatterns.find(p=>p.id==='gun20').rle);
const idle=new Map([2,3,4,5,6].map(o=>[o,()=>{}]));
function run(graph,dx,dy){
  const match=createHeadlessMatch(graph,{init:1e8,strategies:idle,economy:{birthEnergy:0,upkeep:0}});
  const w=match.world,scrap=wreckage();
  const stamp=(owner,points)=>match.commitStamp(owner,match.patchForStamp(graph.farthest,0,points),false);
  assert(stamp(1,offsets));assert(stamp(2,offsets.map(([q,r])=>[-q+dx,-r+dy])));
  const snapshot=()=>[1,2,7].map(o=>[...w.ownerCells[o]].sort((a,b)=>a-b));
  let initial;
  const fundedBirths=[0,0],stable=[0,0],dead=[0,0],adjacent=[0,0],direct=[0,0],neutral={births:0};
  const bankEvidence=[];
  for(let g=1;g<=220;g++) {
    match.nextTick();
    for(const e of combatDeaths(w)){
      scrap.deposit(e.id,e.victim,1);
      if(g>200){adjacent[e.victim-1]++;if(e.attackers.length)direct[e.victim-1]++;}
    }
    for(let o=1;o<=2;o++) {
      for(const id of w.ownerCells[o])if(!w.next[id])scrap.birth(id,o);
      if(g>200){const p=match.game.players[o-1];fundedBirths[o-1]+=p.lastBirths;stable[o-1]+=p.stable;dead[o-1]+=p.lastDeaths;}
    }
    if(g>200)for(const id of w.ownerCells[7])if(!w.next[id])neutral.births++;
    if(g===200){initial=snapshot();bankEvidence.push(scrap.report());}
  }
  const final=snapshot();assert.deepEqual(final,initial);
  bankEvidence.push(scrap.report());
  return {dx,dy,period:20,from:200,through:220,live:final.map(x=>x.length),fundedBirths,stable,dead,adjacent,direct,neutral,scrapAtBounds:bankEvidence};
}
const graph=buildSphere(256);
const mutual=run(graph,3,-36),noDirect=run(graph,5,-36);
assert.deepEqual(mutual.direct,[2,2]);assert.deepEqual(noDirect.direct,[0,0]);
writeFileSync(new URL('./crossfire.json',import.meta.url),JSON.stringify({frequency:256,mutual,noDirect},null,2)+'\n');
