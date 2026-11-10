// Browser CPU timing without rendering. Run from the repository root.
import {build} from 'esbuild';
import {chromium} from 'playwright';

const js=await build({stdin:{contents:"export {createGameMatch} from './experiments/typed-world/game/match.mjs';export {createGameBots} from './experiments/typed-world/game/bots.mjs';",resolveDir:process.cwd()},
  bundle:true,format:'iife',globalName:'lab',write:false,minify:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--disable-webgl']});
try{
  const page=await browser.newPage();
  await page.addScriptTag({content:js.outputFiles[0].text});
  const rows=await page.evaluate(()=>{
    const rows=[];
    for(const policy of ['stability','activity']){
      const g=lab.createGameMatch({policy,F:32,seed:991}),b=lab.createGameBots(g.match,{seed:991});
      const world=[],brain=[],total=[];
      while(g.outcome===null&&g.match.gen<512){
        const start=performance.now();g.step();const afterWorld=performance.now();
        if(g.outcome===null)b.turn();
        const end=performance.now();world.push(afterWorld-start);brain.push(end-afterWorld);total.push(end-start);
      }
      const q=(v,level)=>[...v].sort((a,b)=>a-b)[Math.min(v.length-1,Math.floor(v.length*level))].toFixed(1);
      rows.push([policy,g.match.gen,q(world,.95),q(brain,.95),q(total,.95),q(total,.99),q(total,1),total.filter(t=>t>50).length]);
    }
    return rows;
  });
  console.log('policy,generations,p95WorldMs,p95BotMs,p95CombinedMs,p99CombinedMs,maxCombinedMs,ticksOver50Ms');
  for(const row of rows)console.log(row.join(','));
}finally{await browser.close();}
