// Use the paid placements from the previous conflict study. Both branches begin
// with identical IDs, budgets, owner assignments and warm-up generations.
// Emitted data contains true simultaneous occupancy and cumulative sites visited.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildSphere} from '../../src/world/sphere.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {gameEconomyTick} from '../../src/match/biomass.js';
import {advanceGeneration} from '../../src/simulation/generation.js';
import {STABILITY_ECONOMY} from '../../src/match/constructive-economy.js';
import {resolveRuleProfile,setGrowthPolicy} from '../../src/match/rule-profiles.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {advancePattern, seedPatternAges} from '../../src/patterns/planar-simulation.js';
import {withGrowth} from '../../src/simulation/growth.js';

const [mode,rule,Farg='32',horizonArg='1024',growth='contained',thresholdArg='384',...args]=process.argv.slice(2);
const F=Number(Farg), horizon=Number(horizonArg), threshold=Number(thresholdArg);
const {physics,gameplay}=resolveRuleProfile(rule);
const patterns=gameplay.atlas??gameplay.patterns;
function same(a,b){
  if(a.size!==b.size)return false;
  for(const [k,v] of a)if(b.get(k)!==v)return false;
  return true;
}

if(mode==='atlas'){
  const configured=withGrowth(physics,growth,threshold);
  for(const p of patterns) {
    let raw=seedPatternAges(p), regulated=seedPatternAges(p), firstDiff=0, peak=raw.size, peakBirths=0;
    for(let i=1;i<=horizon;i++) {
      const x=advancePattern(raw,256,physics), y=advancePattern(regulated,256,configured);
      raw=x.next;regulated=y.next;
      if(!firstDiff&&!same(raw,regulated))firstDiff=i;
      peak=Math.max(peak,raw.size);peakBirths=Math.max(peakBirths,x.births);
    }
    console.log(JSON.stringify({rule,pattern:p.id,horizon,threshold,rawPeak:peak,maxBirths:peakBirths,firstDiff,rawFinal:raw.size,final:regulated.size}));
  }
} else {
  const graph=buildSphere(F);
  const source=fileURLToPath(new URL('../conflict-survey/contacts.mjs',import.meta.url));
  const fixtureArgs=mode==='screen'?['fixtures',rule,'lineage',F,'1']:['fixture',rule,'lineage',F,'1',...args.slice(0,5)];
  let fixtures;
  if (mode==='isolated') {
    const p=patterns.find(p=>p.id===args[0]);assert(p,'Unknown seed');
    const temp=createHeadlessMatch(graph,{rule});
    const points=decodeRLE(p.rle),center=[0,1].map(d=>Math.round(points.reduce((v,xy)=>v+xy[d],0)/points.length));
    const ids=temp.patchForStamp(graph.farthest,0,points.map(([q,r])=>[q-center[0],r-center[1]]));assert(ids);
    fixtures=[{rule,F,ship:p.id,target:'',rotation:0,lane:0,warm:0,defendIds:[],shots:ids}];
  } else {
    fixtures=execFileSync(process.execPath,[source,...fixtureArgs.map(String)],{encoding:'utf8',maxBuffer:8e6}).trim().split('\n').map(JSON.parse);
  }
  for(const [index,x] of fixtures.entries()){
    if(mode==='screen' && index%Number(args[1]??1)!==Number(args[0]??0))continue;
    const {ship,target,rotation,lane,warm}=x;
    const startMode=mode==='rescue'?'classic':growth;
    const m=createHeadlessMatch(graph,{rule,conflict:'lineage',economy:STABILITY_ECONOMY,growth:startMode,growthThreshold:threshold});
    const {world,game}=m;
    assert.equal(Boolean(world.physics.growthThreshold),startMode==='contained','Configured policy must be active');
    function tick(){advanceGeneration(world);gameEconomyTick(world,game,m.removeLive,()=>{});}
    if(x.defendIds.length)assert(m.commitStamp(2,x.defendIds,false));
    let remote=[];
    if(mode==='rescue'){
      const a=graph.farthest, xyz=graph.coords;
      let dot=2, opposite=0;
      for(let j=0;j<graph.n;j++){
        if(graph.distance[j]<6) continue;
        const d=xyz[3*a]*xyz[3*j]+xyz[3*a+1]*xyz[3*j+1]+xyz[3*a+2]*xyz[3*j+2];
        if(d<dot){dot=d;opposite=j;}
      }
      const fixed=patterns.find(p=>p.id==='scan-cf5664');assert(fixed);
      remote=m.patchForStamp(opposite,0,decodeRLE(fixed.rle));assert(m.commitStamp(3,remote,false));
    }
    for(let g=0;g<warm;g++)tick();
    assert(m.commitStamp(1,x.shots,false));
    let peak=0, highAt=0,visited=0,first256=0,last256=0,live144=0,peak144=0,coverage144=0,firstEmpty=-1;
    const visitedBits=new Uint8Array(graph.n), samples={};
    for(let g=0;g<=horizon;g++){
      if(mode==='rescue' && g===Number(args[5])+1)setGrowthPolicy(world,game,growth,threshold);
      if(g)tick();
      const alive=world.activeCount;
      if(alive>peak){peak=alive;highAt=g;}
      if(alive>=256){if(!first256)first256=g;last256=g;}
      if(g===144)live144=alive;
      for(let k=0;k<alive;k++){
        const id=world.active[k];if(!visitedBits[id]){visitedBits[id]=1;visited++;}
      }
      if(g<=144){peak144=peak;coverage144=visited;}
      if(mode!=='screen' && [36,100,144,256,512,513,1024,2048,4096].includes(g))samples[g]=[alive,visited];
      if(!alive){firstEmpty=g;break;}
    }
    console.log(JSON.stringify({rule,F,ship,target,rotation,lane,warm,growth,threshold,horizon,peak,highAt,peak144,live144,first256,last256,firstEmpty,coverage144,visited,final:world.activeCount,attacker:world.ownerCells[1].length,defender:world.ownerCells[2].length,...(remote.length?{remoteSurvived:remote.filter(id=>world.owners[id]===3).length,remoteExpected:remote.length}:{}),...(mode==='screen'?{}:{samples})}));
  }
}
