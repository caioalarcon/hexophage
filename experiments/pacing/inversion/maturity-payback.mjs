// Survival time needed to recoup the posted fee before another front interferes.
import {readFile,writeFile} from 'node:fs/promises';
import {energyQuote,RATE,HORIZON} from '../../economy/simulator.js';
const {traces:{stalk}}=JSON.parse(await readFile(new URL('./physics-traces.json',import.meta.url)));
const rows=[];
for(const reward of [12,32,129,384])for(const r of [{id:'linear',price:10},{id:'slow',price:350,massPressureDoubling:2},{id:'fast',price:1500,massPressureDoubling:3}]){
  const fee=energyQuote(r,0,36), returns={}, times=new Set([5,15,60,300,1200].map(s=>s*RATE));
  let net=0,payback=null;
  for(let age=1;age<=HORIZON;age++){
    const [b,m,s]=stalk[age<=63?age-1:63+(age-64)%24];
    net+=reward*(m-s)-b;
    if(payback===null && net>=fee)payback=age/RATE;
    if(times.has(age)) returns[age/RATE]=net-fee;
  }
  rows.push({reward,tariff:r.id,fee,paybackSeconds:payback,netAfterFeeAtAgeSeconds:returns});
}
await writeFile(new URL('./maturity-payback.json',import.meta.url),JSON.stringify(rows,null,2)+'\n');
