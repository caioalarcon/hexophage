// One player, no overlap, 200 generations/second; births, maturity and the
// simultaneous faction income are charged each generation. After 60 seconds
// the native founder has returned to a proven orbit in both selected sites.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {atlasPatterns} from '../../src/patterns/atlas-data.js';
import {buildSphere} from '../../src/world/sphere.js';
import {sphereSpawns} from '../../src/match/spawns.js';
import {cycleWindow} from '../../src/patterns/cycle-economy.js';
import {generationEnergy,DEFAULT_ECONOMY as settings} from '../../src/match/constructive-economy.js';
import {catalogTrace} from './catalog.mjs';
import {trace,thresholds} from './founders.mjs';
const RATE=200,HORIZON=RATE*60*120;
const grid=buildSphere(320),spawns=sphereSpawns(grid);
const ships=catalogTrace(atlasPatterns.find(p=>p.id==='glider'),4,settings.stableAfter);
const emitters={};
for(const id of ['gun20','gun42','gun200']){
  const pattern=atlasPatterns.find(p=>p.id===id),w=cycleWindow(pattern).length;
  const series=catalogTrace(pattern,Math.ceil((settings.stableAfter+4*w)/w)*w,settings.stableAfter);
  const increment=Array.from({length:w},(_,i)=>series[w+i][0]-series[i][0]);
  for(let g=w;g<series.length;g++)assert.equal(series[g][0],series[g%w][0]+Math.floor(g/w)*increment[g%w]);
  emitters[id]={series,w,increment,cells:pattern.cells};
}
function play(site,kind,flight){
  const startup=(settings.initialCells-36)*settings.stampCost;
  let cash=startup,orders=0,first=null,loss=null,shipEscrow=0,shipsAlive=0,founderPayback=null;
  const arrivals=new Int32Array(HORIZON+flight+1);
  const gun=emitters[kind],price=(gun?.cells??6)*settings.stampCost;
  const shots=[0,0,0,0],signed=Array.from({length:4},()=>new Int32Array(HORIZON+flight+1));
  const watch={};
  const matureIndex=thresholds.indexOf(settings.stableAfter)+1;assert(matureIndex>0);
  for(let t=1;t<=HORIZON;t++){
    let row=t<=site.rows.length?site.rows[t-1]:site.rows[site.rows.length-site.tailPeriod+(t-site.rows.length-1)%site.tailPeriod];
    let b=row[0],m=row[matureIndex],shipBurn=0;
    for(let j=0;j<4;j++){
      shots[j]-=signed[j][t];
      shipBurn+=shots[j]*ships[(t-1-j+4)%4][0];
    }
    b+=shipBurn;shipEscrow-=shipBurn;shipsAlive-=arrivals[t];
    if(gun && first!==null){
      const age=t-first,offset=(age-1)%gun.w;
      const active=Math.floor((age-1)/gun.w)-Math.max(0,Math.floor((age-1-flight)/gun.w));
      b+=gun.series[offset][0]+active*gun.increment[offset];
      m+=(age<=gun.series.length?gun.series[age-1]:gun.series[gun.series.length-gun.w+offset])[1];
    }
    const f=generationEnergy(b,m,settings);cash+=f.income-f.upkeep;
    if(cash< -1e-7){loss=t;break;}
    if(kind==='save' && cash-startup>=36*settings.stampCost)founderPayback??=t;
    if(kind==='glider'){
      while(cash>=price+shipEscrow+5*flight){
        first??=t;orders++;cash-=price;shipEscrow+=5*flight;shipsAlive++;
        shots[t%4]++;signed[t%4][t+flight+1]++;arrivals[t+flight+1]++;
      }
    }else if(gun && !orders && cash>=price+6*settings.stampCost){
      first=t;cash-=price;orders=1;
    }
    if([12000,120000,360000,720000,HORIZON].includes(t))watch[t]={cash:Math.round(cash),orders,liveP4:shipsAlive};
  }
  return {kind,flight,fee:price,first,founderPayback,orders,firstDeficit:loss,closingCash:Math.round(cash),watch};
}
const results=[];
for(const [spawn,angle] of [[0,0],[1,0]]){
 const site=trace(grid,spawns[spawn],angle);assert(site?.tailPeriod);
 const cases=[play(site,'save',1000)];
 for(const kind of ['glider','gun20','gun42','gun200'])for(const flight of [1000,12000])cases.push(play(site,kind,flight));
 results.push({spawn,angle,period:site.tailPeriod,finalSize:site.rows.at(-1).at(-1),cases});
}
writeFileSync(new URL('./portfolios.json',import.meta.url),JSON.stringify({rate:RATE,horizon:HORIZON,settings,results},null,2)+'\n');
