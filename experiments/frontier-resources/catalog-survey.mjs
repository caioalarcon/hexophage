// Whole-catalogue launch autonomy on the actual spatial CA.
// node experiments/frontier-resources/catalog-survey.mjs > experiments/frontier-resources/catalog-survey.json
import {performance} from 'node:perf_hooks';
import {buildSphere} from '../../src/world/sphere.js';
import {patchForStamp} from '../../src/patterns/spherical-patch.js';
import {createTypedWorld} from '../typed-world/engine.mjs';
import {atlasCards} from '../typed-world/game/atlas-model.mjs';
import {gameEconomies} from '../typed-world/game/match.mjs';

const settings={F:32,seed:1,rotation:0,horizon:64,stampCost:8,stampEnergy:32,maxCells:5000,maxDurationMs:180000};
const graph=buildSphere(settings.F),started=performance.now(),rows=[];
const rounded=n=>Math.round(n*1e8)/1e8;
let timedOut=false;
for(const card of atlasCards){
  const base={key:card.key,name:card.name,rule:card.rule,group:card.group,initialCells:card.offsets.length,
    resolver:card.resolver??'contact',externalSupport:0,capital:card.offsets.length*(settings.stampCost+settings.stampEnergy),
    intendedLaunchEnergy:card.offsets.length*settings.stampEnergy};
  if(timedOut||performance.now()-started>=settings.maxDurationMs){timedOut=true;rows.push({...base,status:'not-run-time-limit'});continue;}
  const ids=patchForStamp({graph},graph.farthest,settings.rotation,card.offsets);
  if(!ids||new Set(ids).size!==card.offsets.length){
    rows.push({...base,status:'projection-unavailable',projectionSupported:false,uniqueSites:ids?new Set(ids).size:null});continue;
  }
  const match=createTypedWorld(graph,{seed:settings.seed,wallets:[base.capital],economy:{...gameEconomies.stability,stampCost:settings.stampCost},
    spatial:{enabled:true,stampEnergy:settings.stampEnergy},arbitration:'ballot',eligibility:'contest',existence:'majority',passage:'literal'});
  if(!match.bootstrapStamp(1,card.rule,base.resolver,ids,card.ballot??'support',card.sense??'native')){
    rows.push({...base,status:'opening-rejected',projectionSupported:true,uniqueSites:ids.length});continue;
  }
  let status='completed',extinctAt=null,peakCells=match.cells.size;
  while(match.gen<settings.horizon){
    if(performance.now()-started>=settings.maxDurationMs){timedOut=true;status='aborted-time-limit';break;}
    match.step();peakCells=Math.max(peakCells,match.cells.size);
    if(match.cells.size>settings.maxCells){status='aborted-cell-limit';break;}
    if(!match.cells.size){extinctAt=match.gen;break;}
  }
  const p=match.players[1],view=match.visibility(1),finalQualifiedCells=[...match.cells.values()].filter(c=>c.stableAge>=match.spatial.stableAfter).length;
  // income already excludes production rejected by a full store; overflow is
  // an opportunity counter, not a second loss of money that entered the world.
  const balanceError=base.capital+p.income-p.stampSpent-p.birthSpent-p.eraseSpent-p.friendlyEraseSpent-p.energyLost-p.reserve;
  rows.push({...base,status,projectionSupported:true,uniqueSites:ids.length,generations:match.gen,
    survived:match.cells.size>0&&match.gen===settings.horizon,extinctAt,finalCells:p.conventional,peakCells,finalQualifiedCells,
    income:rounded(p.income),finalEnergy:rounded(p.reserve),births:p.births,birthCost:rounded(p.birthSpent),stampMaterialCost:rounded(p.stampSpent),
    refusedBirths:p.refused,energyLost:rounded(p.energyLost),energyOverflow:rounded(p.energyOverflow),
    visibleSites:view.visible.size,exploredSites:view.explored.size,energyBalanceError:balanceError});
}
const summaries=[...new Set(atlasCards.map(c=>c.rule))].map(rule=>{
  const selected=rows.filter(r=>r.rule===rule),completed=selected.filter(r=>r.status==='completed'),live=completed.filter(r=>r.survived);
  const mean=key=>completed.length?rounded(completed.reduce((n,r)=>n+r[key],0)/completed.length):null;
  return {rule,total:selected.length,projectable:selected.filter(r=>r.projectionSupported).length,completed:completed.length,
    projectionUnavailable:selected.filter(r=>r.status==='projection-unavailable').length,
    aborted:selected.filter(r=>r.status?.startsWith('aborted')).length,notRun:selected.filter(r=>r.status?.startsWith('not-run')).length,
    survivingAt64:live.length,extinct:completed.filter(r=>!r.survived).length,
    earnedIncome:completed.filter(r=>r.income>0).length,survivingAndEarnedIncome:live.filter(r=>r.income>0).length,
    activeProducerAt64:live.filter(r=>r.finalQualifiedCells>0).length,
    meanIncome:mean('income'),meanFinalEnergy:mean('finalEnergy'),meanBirths:mean('births'),meanFinalCells:mean('finalCells'),meanExploredSites:mean('exploredSites'),
    maxEnergyBalanceError:completed.length?Math.max(...completed.map(r=>Math.abs(r.energyBalanceError))):null};
});
console.log(JSON.stringify({version:1,settings:{...settings,anchor:graph.farthest,sites:graph.n},catalogueSize:atlasCards.length,
  elapsedMs:Math.round(performance.now()-started),timedOut,
  notes:[
    'Launch-equivalent isolated state: gross capital40 per initial cell pays material8 and leaves fuel32 in each seeded cell.',
    'The normal playable match starts with640 gross capital distributed across its selected founder; this survey measures an isolated paid placement.',
    'No other farms, no external fuel, no competing players and no terrain-resource layer are present. Every sample uses the same spatial production rate1.',
    'Projection-unavailable means the footprint cannot be mapped at this fixed spherical anchor/rotation. It is not a CA extinction result.',
    'A 5000-cell or 180-second limit stops observation explicitly without modifying the CA. Early extinction is a completed sample with extinctAt.',
    'Income may be transient. survivingAndEarnedIncome and activeProducerAt64 distinguish persistence and current local maturity.',
  ],summaries,rows},null,2));
