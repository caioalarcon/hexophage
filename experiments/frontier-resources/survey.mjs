// Same cellular engine and resource layer as the playable experiment.
// node experiments/frontier-resources/survey.mjs > experiments/frontier-resources/survey.json
import {buildSphere} from '../../src/world/sphere.js';
import {patchForStamp} from '../../src/patterns/spherical-patch.js';
import {createTypedWorld} from '../typed-world/engine.mjs';
import {cards} from '../typed-world/catalog.mjs';
import {attachProgression,normalizeProgressionPlan,progressionSpatialTypes} from '../typed-world/game/progression.mjs';

const F=24,horizon=768,seeds=[1,17,73],graph=buildSphere(F);
const specimens=['hex-b2s245/farm-4-12','bays/osc2','callahan/glider','ashley/gun'].map(key=>({key,...cards.get(key)}));
specimens.push({key:'custom/noise',source:'hex-b2s245',offsets:Array.from({length:36},(_,i)=>[i%6-3,Math.floor(i/6)-3])
  .filter(([x,y])=>((x*193+y*311+10000)%7)<4)});
const rows=[];
for(const seed of seeds)for(const specimen of specimens){
  const plan=normalizeProgressionPlan({version:1,base:'sample',nodes:[{id:'sample',parent:null,name:specimen.key,rule:specimen.source,
    offsets:specimen.offsets,resolver:'contact',ballot:'support',sense:'native',weights:[40,20,20,20],vision:6,reach:8,capacity:256}]});
  const match=createTypedWorld(graph,{seed,wallets:[640,640],arbitration:'ballot',eligibility:'contest',existence:'majority',passage:'literal',
    spatial:{enabled:true,types:progressionSpatialTypes(plan)}});
  const p=attachProgression(match,{plan,seed,initialResources:[0,0,0,0],stock:8});
  let ids;
  for(let k=0;k<graph.n;k++){
    const site=(seed*397+k)%graph.n;
    ids=patchForStamp({graph},site,0,specimen.offsets);if(ids&&p.bootstrap(1,'sample',ids))break;
  }
  if(!ids||!p.objective(1).started)throw Error('No usable sample footprint: '+specimen.key);
  const terrain0=p.terrainTotals(),samples=[];
  let peak=match.cells.size;
  for(let generation=1;generation<=horizon;generation++){
    match.step();peak=Math.max(peak,match.cells.size);
    if([64,256,horizon].includes(generation))samples.push({generation,cells:match.cells.size,energy:match.players[1].reserve,
      matureIncome:match.players[1].matureIncome,harvest:p.stats(1).harvested});
  }
  const stats=p.stats(1),terrain1=p.terrainTotals();
  rows.push({seed,specimen:specimen.key,opening:specimen.offsets.length,peak,finalCells:match.cells.size,
    income:match.players[1].income,births:match.players[1].births,birthSpent:match.players[1].birthSpent,
    refused:match.players[1].refused,energy:match.players[1].reserve,harvest:stats.harvested,rootAlive:!p.objective(1).defeated,
    conservationError:Math.max(...terrain0.map((v,k)=>Math.abs(v-terrain1[k]-stats.harvested[k]))),samples});
}
console.log(JSON.stringify({version:1,F,horizon,seeds,notes:[
  'A mesma reserva inicial de energia (640) é distribuída na abertura de cada amostra.',
  'Extração exige sítio e vizinhança estáveis por 12 gerações; limite 0.2/coletora e 0.4/depósito/geração.',
  'Cada tipo de recurso começa acessível perto da abertura; o restante é terreno determinístico finito.',
  'Rótulos de amostra não são lidos pelo motor. Ilhas que se tornam estáveis são medidas como produtoras.',
],rows},null,2));
