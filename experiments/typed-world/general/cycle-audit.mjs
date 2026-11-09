// Fixed sequence of openings, including quiet ones. A reported strict triangle
// must receive >half of all votes on EVERY edge, with no structural/tie edge.
import {writeFileSync} from 'node:fs';
import {buildSphere} from '../../../src/world/sphere.js';
import {explainContest} from '../arbitration.mjs';
import {allRulesOrders,prepareAllRules} from './scene.mjs';

const graph=buildSphere(16);
const modes=['majority','ballot','ecology'];
const summaries=[],examples={};
for(const mode of modes){
  const group=[0,1].map((_,i)=>({mode,split:i?'confirmation':'discovery',worlds:0,contests:0,
    threeTypes:0,topCycles:0,strictTopTriangles:0,strictWorlds:0}));
  for(let seed=1;seed<=128;seed++){
    const bucket=group[Number(seed>64)],key=mode+'/'+bucket.split;
    bucket.worlds++;
    let found=false;
    const orders=allRulesOrders(graph,{seed});
    const options={seed,orders,arbitration:mode,eligibility:'contest',friendlyFire:true,onContest(event){
      bucket.contests++;
      if(new Set(event.claims.map(c=>c.rule)).size>=3)bucket.threeTypes++;
      if(!event.cycle)return;
      bucket.topCycles++;
      const audit=explainContest(mode,event),round=audit.rounds[0],top=round.top;
      const wins=(i,j)=>round.edges.some(e=>e.winner===i && e.loser===j &&
        (e.for>e.against+e.abstain));
      let witness=null;
      for(const i of top)for(const j of top)for(const k of top){
        const triple=[i,j,k];
        if(new Set(triple.map(a=>event.claims[a].rule)).size===3 &&
          wins(i,j)&&wins(j,k)&&wins(k,i)){witness=triple;break;}
      }
      if(!witness)return;
      found=true;bucket.strictTopTriangles++;
      const distinctOwners=new Set(witness.map(i=>event.claims[i].owner)).size;
      if(!examples[key] || distinctOwners>examples[key].distinctOwners){
        const {gen,site,claims,winner}=event;
        examples[key]={mode,split:bucket.split,seed,gen,site,distinctOwners,witness,claims,winner,rounds:audit.rounds};
      }
    }};
    const {match}=prepareAllRules(graph,options);
    for(let g=0;g<64;g++)match.step();
    if(found)bucket.strictWorlds++;
  }
  summaries.push(...group);
}
writeFileSync(new URL('cycle-audit.json',import.meta.url),JSON.stringify({horizon:64,summaries,examples},null,2)+'\n');
console.log(summaries);
