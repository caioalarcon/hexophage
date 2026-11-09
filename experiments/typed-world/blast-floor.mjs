// The same portfolio goes through the same paid shock with different collateral floors.
// Replays fork the actual recovery tick and attempt to buy a new P6 at the old launch site.
import {writeFileSync} from 'node:fs';
import {simulateBlast} from './blast.mjs';

const rows=[];
for(const seed of [1,43,211])for(const rotation of [0,2,4])for(const treasury of [800,3200,16000]){
  for(const floor of [0,11,12,18]){
    let minimum=Infinity,firstRecoveryPurchase=0,firstPaidRestart=0,recoveryReserve=0,loss=0;
    const x=simulateBlast({F:32,treasury,farm:'portfolio',seed,rotation,horizon:384,tariff:{protectedMature:floor}},(g,m,graph,scene,state)=>{
      const p=m.players[1];
      if(!p.eroded)return;
      minimum=Math.min(minimum,p.reserve);
      if(!loss)loss=g;
      if((!firstPaidRestart || (!state.wave && !firstRecoveryPurchase)) && p.reserve>=minimum+72){
        const check=m.fork();
        if(check.stamp(1,'hex-b2s245','antimatter',scene.launch(3))){
          if(!firstPaidRestart)firstPaidRestart=g;
          if(!state.wave && !firstRecoveryPurchase){firstRecoveryPurchase=g;recoveryReserve=p.reserve;}
        }
      }
    });
    rows.push({seed,rotation,treasury,floor,firstLiquidation:loss,eroded:x.eroded,minAfterSale:Number.isFinite(minimum)?minimum.toFixed(2):'',
      firstWaveExtinction:x.firstWaveExtinction,firstPaidRestart,firstRecoveryPurchase,recoveryReserve:firstRecoveryPurchase?recoveryReserve.toFixed(2):'',
      originalFarmSites:x.farmAtLaunch,survivingFarmSites:x.survivingFarm,own:x.own,wave:x.wave,finalReserve:x.attackerReserve,
      lost:x.sponsorOut,peakWave:x.peakWave,everWave:x.everWave});
  }
}
const keys=Object.keys(rows[0]);
writeFileSync(new URL('./blast-floor.csv',import.meta.url),[keys.join(','),...rows.map(row=>keys.map(k=>row[k]).join(','))].join('\n')+'\n');
