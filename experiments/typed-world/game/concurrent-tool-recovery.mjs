// Stress a cleaning forecast with another treasury acting every two generations.
import {pathToFileURL} from 'node:url';
import {buildSphere} from '../../../src/world/sphere.js';
import {createTypedWorld} from '../engine.mjs';
import {gameEconomies} from './match.mjs';
import {createGameBots} from './bots.mjs';
import {blastScene} from '../blast-scene.mjs';
import {patchForStamp} from '../../../src/patterns/spherical-patch.js';
import {circularSites} from '../../../src/mixed/field-tools.js';
export function concurrentRecovery({seed=43,interfere=true,budget=1,ticks=160,graph=buildSphere(48),seats=1}={}){
 const scene=blastScene(graph);
 const match=createTypedWorld(graph,{wallets:[640,100000,...Array(seats-1).fill(640)],seed,economy:gameEconomies.stability,
  arbitration:'ballot',eligibility:'contest',existence:'majority',passage:'literal',toolSettings:{maxEraseRadius:12}});
 match.stamp(1,'hex-b2s245','contact',scene.largeFarm);
 while(match.gen<16)match.step();
 const farm=[...match.cells.keys()];
 match.stamp(1,'hex-b2s245','contact',patchForStamp({graph},scene.anchor,0,[[0,0],[1,0],[1,-1]]));
 while(match.gen<256)match.step();
 const excluded=new Set([...circularSites(graph,scene.anchor,64),...circularSites(graph,scene.remote,20)]);
 let remote=-1;for(let i=0;i<graph.n;i++)if(graph.deg[i]===6&&!excluded.has(i)){remote=i;break;}
 if(remote<0)throw Error('no remote test site');
 for(const id of circularSites(graph,remote,12))excluded.add(id);
 const owners=[1,...Array.from({length:seats-1},(_,i)=>i+3)];
 for(const owner of owners.slice(1)){
  let planted=false;
  for(let site=0;site<graph.n;site++){
   if(excluded.has(site)||graph.deg[site]!==6||site===remote)continue;
   const ids=patchForStamp({graph},site,0,[[0,0],[1,0],[0,1],[-1,1]]);
   if(ids&&match.stamp(owner,'hex-b2s245','contact',ids)){
    for(const id of circularSites(graph,site,12))excluded.add(id);
    planted=true;break;
   }
  }
  if(!planted)throw Error('No room for competing bot farm');
 }
 const orders=[],bots=createGameBots(match,{owners,cards:[],budget,onOrder:o=>orders.push(o)});
 let work=0,maximumWork=0;
 for(let t=0;t<ticks;t++){
  match.step();
  if(interfere&&t%2===0&&!match.stamp(2,'callahan','contact',[remote]))throw Error('remote stamp refused');
  bots.turn();
  const next=bots.stats.reduce((sum,s)=>sum+s.work,0);maximumWork=Math.max(maximumWork,next-work);work=next;
 }
 const p=match.players[1];bots.destroy?.();return {seed,interfere,seats,F:graph.f,maximumWork,reserve:p.reserve,mature:p.mature,cells:p.conventional,births:p.lastBirths,
 farmPreserved:farm.every(id=>match.cells.has(id)),firstErase:orders.find(o=>o.tool==='eraser'&&o.owner===1)?.gen,stats:bots.stats[1]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const graph=buildSphere(48);
 for(const seed of [1,43,211])for(const interfere of [false,true])console.log(JSON.stringify(concurrentRecovery({graph,seed,interfere})));
 const large=buildSphere(128);
 console.log(JSON.stringify(concurrentRecovery({graph:large,seats:5,budget:4,ticks:256})));
}
