// Accounting identity for mature-cell rewards measured by maturation.mjs.
// Prices here are the live linear p=10, solely to compare seed and credit scales.
import {readFile,writeFile} from 'node:fs/promises';
const load=path=>readFile(new URL(path,import.meta.url),'utf8').then(JSON.parse);
const {patterns}=await load('./maturation.json');
const stalk=patterns.find(p=>p.id==='stalk');
const p20=patterns.find(p=>p.id==='gun20');
const w=p20.window, [c0,c1]=p20.blocks;
const slope=(c1.births-c0.births)/w**2;
const baseBirthRate=c0.births/w;
const results=[];
for(const reward of [8,12,32,129,384]){
  const incomePerGeneration=reward*stalk.lateCreditsPerG-stalk.lateBirthsPerG;
  const positive=patterns.filter(p=>reward*p.lateCreditsPerG-p.lateBirthsPerG>0).map(p=>p.id);
  const gunSupport=[1,5,6,60,600].map(seconds=>{
    const gunBirths=baseBirthRate+200*seconds*slope;
    return {seconds,gunBirths,requiredGrowingFronts:Math.ceil(gunBirths/incomePerGeneration)};
  });
  results.push({reward,incomePerGeneration,positive,gunSupport});
}
await writeFile(new URL('./front-runway.json',import.meta.url),JSON.stringify({p20FirstCycleMeanBirths:baseBirthRate,birthSlope:slope,results},null,2)+'\n');
