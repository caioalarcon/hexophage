// Six real paid starts, native erosion/ownership/tribute, before new orders.
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {plantFounder} from '../../src/match/founding.js';
import {buildSphere} from '../../src/world/sphere.js';

const ignoreBots=new Map([2,3,4,5,6].map(id=>[id,()=>{}]));
const data=[];
for(const frequency of [20,96,320]){
  const run=createHeadlessMatch(buildSphere(frequency),{strategies:ignoreBots});
  const planted=run.game.players.map(p=>plantFounder(run.world,run.game,p,run.commitStamp));
  const milestones=[];
  const waiting=run.game.players.map(()=>null);
  for(let g=1;g<=6000;g++){
    run.nextTick();
    if(run.game.ended)break;
    for(const [i,p] of run.game.players.entries()){
      if(p.reserve>=60000 && waiting[i]===null)waiting[i]=g;
    }
    if([256,720,1525,3600,6000].includes(g)){
      milestones.push({g,players:run.game.players.map(p=>({id:p.id,live:run.world.ownerCells[p.id].length,
        mature:p.stable,cash:Math.round(p.reserve),eroded:p.eroded,tribute:p.tributePaid,flow:Number(p.flowAverage.toFixed(3))}))});
    }
  }
  assert(planted.every(Boolean),'No legal founding placement for F'+frequency);
  data.push({frequency,planted,firstAffordableP4:waiting,through:run.world.gen,
    remaining:run.game.players.filter(p=>!p.out).map(p=>p.id),milestones});
}
writeFileSync(new URL('./match-opening.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
