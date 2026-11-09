// Actual funded raids on a growing enemy. All attackers have the same treasury
// and buy a single distinct weapon. No acquisition target or firing acts are
// forced after planting; collateral and bankruptcy evolve with the actual CA.
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {atlasPatterns} from '../../src/patterns/atlas-data.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {buildSphere} from '../../src/world/sphere.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
const frequency=96, launch=720, horizon=2400;
const graph=buildSphere(frequency),anchor=graph.farthest;
const seed=id=>decodeRLE(atlasPatterns.find(p=>p.id===id).rle);
const idle=new Map([2,3,4,5,6].map(id=>[id,()=>{}]));
const offers={glider:[-14,-2],gun20:[-3,20],gun42:[-13,20]};
function test(id,zone,direction){
  const m=createHeadlessMatch(graph,{ growth:'classic', conflict: 'legacy',strategies:idle}),w=m.world,players=m.game.players;
  // Defender has the game's opening reserve. Attacker may buy the most
  // expensive selected weapon and retain 60,000 for operation.
  players[0].reserve=700000;
  const stamp=(o,center,d,points)=>{const ids=m.patchForStamp(center,d,points);return ids && m.commitStamp(o,ids,false);};
  assert(stamp(2,anchor,0,seed('stalk')));
  let strikePoint,firstAttackErosion=null;
  for(let g=1;g<=launch+horizon;g++){
    m.nextTick();
    if(id && g===launch){
      const dist=id=>[0,1,2].reduce((s,k)=>s+graph.coords[3*id+k]*graph.coords[3*anchor+k],0);
      // Fresh cells farthest from the seed form the leading tip; the other
      // target is the nearest founding coordinate still alive and matured.
      const ids=w.ownerCells[2].filter(i=>zone==='tip'?w.cellAges[i]===1:w.cellAges[i]>launch);
      assert(ids.length);
      strikePoint=ids.reduce((a,b)=>zone==='tip'?(dist(a)<dist(b)?a:b):(dist(a)>dist(b)?a:b));
      const [q,r]=offers[id],points=seed(id).map(([x,y])=>[x+q,y+r]);
      const sites=m.patchForStamp(strikePoint,direction,points);
      if(!sites || sites.some(s=>w.cells[s]) || !m.commitStamp(1,sites,false))return {id,zone,direction,legal:false};
    }
    if(players[0].eroded && firstAttackErosion===null)firstAttackErosion=g;
  }
  const field=players.slice(0,2).map(p=>({cells:w.ownerCells[p.id].length,mature:p.stable,
    reserve:Math.round(p.reserve),eroded:p.eroded,paidTribute:p.tributePaid,out:p.out}));
  return {id,zone,direction,strikePoint,legal:true,firstAttackErosion,field};
}
const control=test(null);
const trials=[];
for(const id of Object.keys(offers))for(const zone of ['tip','base'])for(let d=0;d<6;d++)trials.push(test(id,zone,d));
const result={frequency,launch,horizon,attackerFunds:700000,control,trials};
writeFileSync(new URL('./armed-raids.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
