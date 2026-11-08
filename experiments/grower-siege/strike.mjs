// Compare the P4's proven interception with a miss and with holding fire.
// Each side buys the seed once. The attacker's cash deliberately funds one
// P4 in addition to its operating budget; this tests a raid, not the opening.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {buildSphere} from '../../src/world/sphere.js';
import {atlasPatterns} from '../../src/patterns/atlas-data.js';
import {decodeRLE} from '../../src/patterns/rle.js';
const graph=buildSphere(256);
const seed=id=>decodeRLE(atlasPatterns.find(p=>p.id===id).rle);
const idle=new Map([2,3,4,5,6].map(i=>[i,()=>{}]));
function run(name,turn,q,r){
  const m=createHeadlessMatch(graph,{strategies:idle});
  const place=(owner,points)=>m.commitStamp(owner,m.patchForStamp(graph.farthest,0,points),false);
  assert(place(2,seed('stalk')));
  if(name!=='hold'){
    let pts=seed('glider');for(let t=0;t<turn;t++)pts=pts.map(([q,r])=>[-r,q+r]);
    assert(place(1,pts.map(([a,b])=>[a+q,b+r])));
  }
  const rows=[];
  for(let g=1;g<=6000;g++){
    m.nextTick();if([256,720,2000,6000].includes(g)){
      rows.push({g,field:m.game.players.slice(0,2).map(p=>({live:m.world.ownerCells[p.id].length,cash:Math.round(p.reserve),
        received:p.tributeReceived,paid:p.tributePaid,eroded:p.eroded}))});
    }
  }
  return {name,rows};
}
const result=[run('hold',0,0,0),run('hit',5,-11,22),run('miss',0,-17,-12)];
writeFileSync(new URL('./strike.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
