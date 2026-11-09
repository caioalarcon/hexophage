// Counterfactual replay of the same launch with ownership of two identical farms swapped.
// G+0 is launch, after 16 warm-up steps. All verdicts observe the uninterrupted trajectory.
import assert from 'node:assert/strict';
import {simulateBlast} from './blast.mjs';

const horizon=768;
function firstRemaining(counts){
  const remaining=counts.flatMap((n,i)=>n>0?[i+1]:[]);
  return remaining.length>1?null:remaining[0]??0;
}

// Each previously empty wallet gets an independent fork. Rebuild at its own
// original home, pay the complete four-cell card, then let its CA run 64 steps.
function rebuild(world,scene,owner,swapFarms){
  const p=world.players[owner];
  if(p.field)return 'occupied';
  const site=owner===2?scene.targetFarm:((owner===1)===swapFarms?scene.smallFarm:scene.middleFarm);
  const m=world.fork(), buyer=m.players[owner];
  if(!m.stamp(owner,'hex-b2s245','contact',site))return 'rejected';
  const cost=buyer.stampSpent-p.stampSpent,paidBalance=buyer.reserve;
  assert.equal(cost,4*world.economy.stampCost);
  for(let i=0;i<64;i++)m.step();
  return buyer.mature>=12 && buyer.reserve>paidBalance?'productive':'bought';
}

function run(treasury,seed,swapFarms,floor){
  let fieldWinner=null,fieldTick=null,reentry,finalBodies;
  const outcome=simulateBlast({F:16,treasury,seed,farm:'small',observer:true,swapFarms,
    tariff:{protectedMature:floor},horizon},(g,m,graph,scene,s)=>{
    const conventional=[s.own-s.wave,s.target,s.third];
    if(fieldTick===null){
      fieldWinner=firstRemaining(conventional);
      if(fieldWinner!==null)fieldTick=g;
    }
    if(g===horizon){
      finalBodies=conventional;
      reentry=[1,2,3].map(id=>s.wave?'wave':rebuild(m,scene,id,swapFarms));
    }
  });
  return {treasury,seed,sponsor:swapFarms?'far':'middle',floor,covered:outcome.everWave,
    fieldWinner,fieldTick,waveWinner:outcome.firstSoleAt?outcome.firstSoleOwner:null,waveWinnerTick:outcome.firstSoleAt||null,
    firstSale:outcome.firstLiquidation||null,sold:outcome.eroded,firstWaveExtinction:outcome.firstWaveExtinction||null,
    finalWave:outcome.wave,sponsorOut:outcome.sponsorOut,sponsorCash:outcome.attackerReserve,
    body1:finalBodies[0],body2:finalBodies[1],body3:finalBodies[2],
    rebuild1:reentry[0],rebuild2:reentry[1],rebuild3:reentry[2]};
}
let header;
for(const seed of [1,43,211])for(const treasury of [16000,64000,100000,160000,300000,1000000])
  for(const floor of [0,12])for(const swap of [false,true]){
    const row=run(treasury,seed,swap,floor);
    if(!header){header=Object.keys(row);console.log(header.join(','));}
    console.log(header.map(k=>row[k]??'').join(','));
  }
