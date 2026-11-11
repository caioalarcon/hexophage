// Reproduce the insolvent farm + growing cloud and compare the same starting
// snapshot with waiting. Run: node experiments/typed-world/game/tool-recovery.mjs
import {pathToFileURL} from 'node:url';
import {buildSphere} from '../../../src/world/sphere.js';
import {patchForStamp} from '../../../src/patterns/spherical-patch.js';
import {createTypedWorld} from '../engine.mjs';
import {blastScene} from '../blast-scene.mjs';
import {gameEconomies} from './match.mjs';
import {createGameBots} from './bots.mjs';

export function insolventScene({graph=buildSphere(32),seed=43,radius=12}={}){
  const scene=blastScene(graph),match=createTypedWorld(graph,{wallets:[640],seed,economy:gameEconomies.stability,
    arbitration:'ballot',eligibility:'contest',existence:'majority',passage:'literal',toolSettings:{maxEraseRadius:radius}});
  match.stamp(1,'hex-b2s245','contact',scene.largeFarm);
  while(match.gen<16)match.step();
  const farm=[...match.cells.keys()];
  match.stamp(1,'hex-b2s245','contact',patchForStamp({graph},scene.anchor,0,[[0,0],[1,0],[1,-1]]));
  while(match.gen<256)match.step();
  return {match,scene,farm};
}

export function recoveryTrial({graph,seed=43,radius=12,ticks=128,budget=4}={}){
  const {match,farm}=insolventScene({graph,seed,radius}),control=match.fork(),orders=[];
  const startingReserve=match.players[1].reserve;
  const bots=createGameBots(match,{seed,owners:[1],cards:[],budget,onOrder:o=>orders.push(o)});
  let priorWork=0,maximumWork=0;
  for(let t=0;t<ticks;t++){
    match.step();bots.turn();control.step();
    const work=bots.stats[1].work;maximumWork=Math.max(maximumWork,work-priorWork);priorWork=work;
  }
  const p=match.players[1],erases=orders.filter(o=>o.tool==='eraser');
  return {seed,radius,startingReserve,generation:match.gen,reserve:p.reserve,controlReserve:control.players[1].reserve,
    mature:p.mature,cells:p.conventional,births:p.lastBirths,farmPreserved:farm.every(id=>match.cells.has(id)),
    erasures:erases.length,firstErase:erases[0]?.gen??null,lastErase:erases.at(-1)?.gen??null,
    removed:bots.stats[1].erasedCells,maximumWork,orders,stats:bots.stats[1]};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const graph=buildSphere(32);
  for(const seed of [1,43,211])for(const radius of [3,12]){
    const {orders,stats,...result}=recoveryTrial({graph,seed,radius});console.log(JSON.stringify(result));
  }
}
