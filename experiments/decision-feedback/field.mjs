// A directed calibration experiment. An incoming third-party glider starts
// outside the mind's copied radius. Use real action/hold worlds as an external
// test oracle, invisible to the bot's feedback tracker.
import assert from 'node:assert/strict';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {buildSphere} from '../../src/world/sphere.js';
import {advanceGeneration} from '../../src/simulation/generation.js';
import {gameEconomyTick} from '../../src/match/biomass.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {beginLocalTrial} from '../../src/bots/brain/local-world.js';
import {createForecastFeedback} from '../../src/bots/brain/feedback.js';
import {brainNamespace,createBrainArchive} from '../../src/bots/brain/memory.js';
import {signature} from '../../src/bots/brain/proposals.js';
import {phaseAt} from '../../src/bots/brain/scout.js';
const graph=buildSphere(32), horizon=64;
const settings={rule:'bays',economy:{emptyFieldUpkeep:false,policy:'activity',birthCost:1,stableEnergy:0,stampCost:20,
  initialCells:1000,combatFee:0},conflict:'lineage',growth:'classic'};
const storage=new Map(), store={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
const archive=createBrainArchive(store);
const rotate=([q,r])=>[-r,q+r];
function play(group,site,rotation,train,hidden) {
  const action=createHeadlessMatch(graph,settings), hold=createHeadlessMatch(graph,settings);
  const ship=action.game.gameplay.patterns.find(p=>p.id==='glider');
  const cloud=decodeRLE(ship.rle);
  const center=[0,1].map(k=>Math.round(cloud.reduce((s,p)=>s+p[k],0)/cloud.length));
  const path=cloud.map(([q,r])=>{
    let v=[q-center[0]-2,r-center[1]+9];
    for(let i=0;i<5;i++)v=rotate(v);
    return v;
  });
  const patch=offsets=>action.patchForStamp(site,rotation,offsets);
  const target=patch([[0,0],[1,0]]), shot=patch([[-3,0],[-2,0]]);
  for(const m of [action,hold]) {
    assert(m.commitStamp(3,target,false));
    if(hidden)assert(m.commitStamp(4,patch(path),false));
  }
  const account=train?archive:createBrainArchive(store);
  const memory=account.open(brainNamespace(action.world,action.game));
  let observation;
  const meter=createForecastFeedback(action.world,action.game,memory,{},event=>observation=event);
  const p=action.game.players[1],spot={kind:'rival',target:site,direction:rotation};
  const trial={player:p,rivalId:3,spot,context:signature(action.world,p.id,spot),phase:phaseAt(action.world,spot),
    action:{stamp:{id:'osc2'},key:'osc2@0/3'},brain:{rivalWeight:1,payback:12000},position:{center:site}};
  const raw=beginLocalTrial(action.world,action.game,p.id,site,shot,{radius:5,horizon,rival:3,audit:true}).step(horizon);
  assert(raw.forecast && !raw.boundary);
  const calibrated=meter.correct(trial,raw);
  trial.rawResult=raw;trial.result=calibrated;
  assert(action.commitStamp(p.id,shot,false));
  meter.watch(p,trial,trial.position);
  let own=0,targetFlow=0,actualOwnOperating=0,actualTargetOperating=0;
  for(let i=1;i<=horizon;i++){
    for(const m of [action,hold]) {
      advanceGeneration(m.world);
      gameEconomyTick(m.world,m.game,m.removeLive,()=>{});
    }
    meter.observe(2048);
    function localBirths(m,id){
      return raw.forecast.ids.reduce((n,cell)=>n+Number(m.world.owners[cell]===id&&
        !m.world.next[cell]&&m.world.cellAges[cell]===1),0);
    }
    const a=localBirths(action,2)-localBirths(hold,2), b=localBirths(action,3)-localBirths(hold,3);
    actualOwnOperating+=a;actualTargetOperating+=b;
    if(i>horizon-8){own+=a/8;targetFlow+=b/8;}
  }
  assert(observation && observation.own.tailSamples===8);
  if(train)memory.finish(); // holdouts independently reopen the same frozen training.
  const predicted=raw.ownFlow-raw.rivalFlow, adjusted=calibrated.ownFlow-calibrated.rivalFlow;
  return [group,site,rotation,hidden,predicted,adjusted,observation.relativeObserved,own-targetFlow,
    observation.own.actualOperating-observation.target.actualOperating,actualOwnOperating-actualTargetOperating];
}
console.log('group,site,rotation,externalShip,rawRelativeFlow,calibratedRelativeFlow,observedVsMentalHold,realActionVsRealHold,observedRelativeOperating,realRelativeOperating');
const anchor=graph.farthest;
for(let i=0;i<6;i++)console.log(play('train',anchor,0,true,true).join(','));
for(let rot=0;rot<6;rot++){
  const site=graph.adj[anchor*6+rot];
  console.log(play('unseenPose',site,rot,false,true).join(','));
}
// Also check the very same geometry with the incoming glider removed. A
// learned prior can hurt accurate forecasts when hidden conditions change.
console.log(play('shiftedDistribution',anchor,0,false,false).join(','));
