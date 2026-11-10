// Verify the exact moving footprint, against the real full-sphere solo twin,
// before, through and after a paid passage. Count all six angles in each lane.
import assert from 'node:assert/strict';
import {buildSphere} from '../../src/world/sphere.js';
import {createTypedWorld} from './engine.mjs';
import {poses} from './duels-fixtures.mjs';
import {resolveRuleProfile} from '../../src/match/rule-profiles.js';

const graph=buildSphere(48), horizon=96;
const equal=(cells,ref)=>{
  let n=0;
  for(const [id,c] of cells)if(c.owner===1){
    n++;if(ref.get(id)?.owner!==1)return false;
  }
  return n===ref.size;
};
const count=(w,id)=>{let n=0;for(const c of w.cells.values())if(c.owner===id)n++;return n;};
let header=false;
const playable=process.argv.includes('--playable');
for(const name of playable?['glider-grower']:['glider-grower','slider-farm','glider-ship','ship-oscillator']){
  for(let angle=0;angle<6;angle++)for(const lane of [-1,0,1]){
    const warm=name==='glider-ship'?2:9;
    const f=poses(graph,name,angle,lane,warm);
    const g=resolveRuleProfile(f.raider.rule).gameplay;
    const period=(g.atlas??g.patterns).find(p=>p.id===f.raider.id).period;
    for(const bank of [240,16384])for(const priority of [0,1])for(const dp of ['contact','guard']){
      const options={wallets:[bank,16384],seed:18457,economy:{phasePriority:priority,guardStampExtra:0,eraseCost:24}};
      if(playable){
        Object.assign(options,{existence:'majority',eligibility:'contest',arbitration:'ballot',passage:priority?'literal':'legacy'});
        options.economy.phasePriority=0;
      }
      const hit=createTypedWorld(graph,options), solo=createTypedWorld(graph,options);
      assert(hit.stamp(2,f.target.rule,dp,f.base));
      for(let t=0;t<warm;t++){hit.step();solo.step();}
      let launch;
      for(const {shot} of f.layouts){if(hit.stamp(1,f.raider.rule,'phase',shot)){launch=shot;break;}}
      assert(solo.stamp(1,f.raider.rule,'phase',launch));
      let firstPaid=-1, firstDifference=-1, cutAt=-1, survived=true, identical=true, close=-1;
      for(let t=1;t<=horizon;t++){
        if(close<0)for(const [site,c] of hit.cells)if(c.owner===1){
          for(let k=0;k<graph.deg[site];k++)if(hit.cells.get(graph.adj[6*site+k])?.owner===2)close=t-1;
        }
        hit.step();solo.step();
        const same=equal(hit.cells,solo.cells);
        if(!same && firstDifference<0)firstDifference=t;
        if(hit.players[1].erased && firstPaid<0){firstPaid=t;cutAt=t+2*period;}
        if(firstPaid>0 && t<=cutAt){
          identical&&=same;
          survived&&=count(solo,1)>0 && count(hit,1)>0;
        }
      }
      const p=hit.players[1];
      const row={name,angle,lane,bank,...(playable?{passage:options.passage}:{phasePriority:priority}),defender:dp,close,firstPaid,firstDifference,
        period,erased:p.erased,paid:p.eraseSpent,refused:p.refused,shotPop:count(hit,1),soloPop:count(solo,1),
        wholePath:Number(firstDifference<0 && count(solo,1)>0),
        twoPeriods:firstPaid>0 && cutAt<=horizon?Number(identical&&survived):''};
      if(!header){console.log(Object.keys(row).join(','));header=true;}
      console.log(Object.values(row).join(','));
    }
  }
}
