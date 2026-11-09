// Emit coverage and a descriptive error comparison for executed natural orders.
// No experimental orders are imposed. Each seed receives a fresh learner bank.
import {createHeadlessMatch} from '../../src/match/headless.js';
import {buildSphere} from '../../src/world/sphere.js';
const [rule='ashley15', policy='activity', f='32', limit='16384', s='4751']=process.argv.slice(2);
const F=Number(f), horizon=Number(limit), seed=Number(s), records=[];
const m=createHeadlessMatch(buildSphere(F),{rule,botMode:'learn',conflict:'lineage',growth:'contained',
  economy:{emptyFieldUpkeep:false,policy,birthCost:1,stampCost:300,combatFee:.25,stableEnergy:.02,stableAfter:256,productionScale:8000,initialCells:82},
  brain:{seed,onOutcome:r=>records.push(r)}});
m.game.players[0].out=true;
while(m.world.gen<horizon&&!m.game.ended)m.nextTick();
const metrics=m.game.brainMetrics, sum=fn=>records.reduce((s,r)=>s+fn(r),0), abs=Math.abs;
const raw=sum(r=>abs(r.relativePredicted-r.relativeObserved)),cal=sum(r=>abs(r.relativeCalibrated-r.relativeObserved));
const row=[rule,policy,F,seed,m.world.gen,metrics.actions,metrics.tactical,metrics.forecasts,metrics.forecastLedgers,
  metrics.forecastsCensored,sum(r=>Number(r.rival!==null)),metrics.calibratedForecasts,
  raw.toFixed(4),cal.toFixed(4),metrics.forecastVisits,metrics.visits];
console.log(row.join(','));
