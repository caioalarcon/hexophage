// Add two measured branches to the existing sphere and original ownership trace.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {buildSphere} from '../../src/world/sphere.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {setGrowthPolicy} from '../../src/match/rule-profiles.js';
import {advanceGeneration} from '../../src/simulation/generation.js';
import {gameEconomyTick} from '../../src/match/biomass.js';
import {STABILITY_ECONOMY} from '../../src/match/constructive-economy.js';
import {DEFAULT_GROWTH_THRESHOLD} from '../../src/simulation/growth.js';

const dir=new URL('./',import.meta.url);
const originalData=readFileSync(new URL('../conflict-survey/contacts-replay-data.js',dir),'utf8').trim();
const original=JSON.parse(originalData.slice(originalData.indexOf('=')+1,-1));
const {rule,F,times,ship,target,n}=original, graph=buildSphere(F);
const script=fileURLToPath(new URL('../conflict-survey/contacts.mjs',dir));
const fixture=JSON.parse(execFileSync(process.execPath,[script,'fixture',rule,'lineage',F,'1024',ship,target,'0','-2','16'].map(String),{encoding:'utf8'}));
const frames={};
for(const mode of ['classic','contained','late']){
  const match=createHeadlessMatch(graph,{rule,conflict:'lineage',economy:STABILITY_ECONOMY,growth:mode==='late'?'classic':mode});
  const {world,game}=match;
  function step(){advanceGeneration(world);gameEconomyTick(world,game,match.removeLive,()=>{});}
  assert(match.commitStamp(2,fixture.defendIds,false));
  for(let g=0;g<fixture.warm;g++)step();
  assert(match.commitStamp(1,fixture.shots,false));
  const recorded=[];
  for(let g=0;g<=times.at(-1);g++){
    if(g)step();
    if(times.includes(g)){
      const owners=Buffer.alloc(Math.ceil(n/4));
      for(let j=0;j<world.activeCount;j++){
        const i=world.active[j];
        owners[i>>2]|=(world.owners[i]===7?3:world.owners[i])<<((i%4)*2);
      }
      const [a,d,neutral]=[1,2,7].map(i=>world.ownerCells[i].length);
      const frame={g,a,d,neutral,owners:owners.toString('base64')};
      if(mode==='classic')assert.equal(frame.owners,original.frames.lineage[recorded.length].owners);
      recorded.push(frame);
    }
    if(mode==='late' && g===144)setGrowthPolicy(world,game,'contained');
  }
  if(mode!=='classic')frames[mode]=recorded;
}
writeFileSync(new URL('replay-data.js',dir),
  'const outbreakReplay = '+JSON.stringify({frames,threshold:DEFAULT_GROWTH_THRESHOLD})+';\n');
