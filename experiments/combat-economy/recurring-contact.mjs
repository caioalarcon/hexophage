// Two legal opening stamps found by searching nearby pairs of catalog oscillators.
// Match physics certifies recurrence by complete occupied tile AND owner identity.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {atlasPatterns} from '../../src/patterns/atlas-data.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {buildSphere} from '../../src/world/sphere.js';
import {combatDeaths} from './causality.mjs';
import {suppressedBirths} from './birth-denial.mjs';

const sphere=buildSphere(64);
const idle=new Map([2,3,4,5,6].map(id=>[id,()=>{}]));
const patterns=new Map(atlasPatterns.map(p=>[p.id,decodeRLE(p.rle)]));
const noStamp=()=>[];
function certify({first,second,k,q,r},controls=false) {
  const m=createHeadlessMatch(sphere,{init:1e7,economy:{birthEnergy:0,upkeep:0},strategies:idle});
  const points1=patterns.get(first)??noStamp(), seed2=patterns.get(second)??noStamp();
  let points2=seed2;
  for(let i=0;i<k;i++)points2=points2.map(([x,y])=>[-y,x+y]);
  points2=points2.map(([x,y])=>[q+x,r+y]);
  for(const [id,ps] of [[1,points1],[2,points2]]) if(ps.length) {
    assert(m.commitStamp(id,m.patchForStamp(sphere.farthest,0,ps),false));
  }
  const frames=[], states=new Map();
  let repeat=null;
  for(let t=0;t<=256;t++){
    const state=m.world.ownerCells.map(ids=>[...ids].sort((a,b)=>a-b).join(',')).join('|');
    if(!repeat && states.has(state))repeat={start:states.get(state),period:t-states.get(state)};
    if(repeat && t===repeat.start+2*repeat.period){
      const {start,period}=repeat;
      assert.equal(states.get(state),start);
      const cycle=frames.slice(start+period),base=[0,0],direct=[0,0],adjacent=[0,0],blocked=[0,0];
      for(const frame of cycle)for(let i=0;i<2;i++){
        base[i]+=frame.births[i]-frame.stable[i];direct[i]+=frame.direct[i];adjacent[i]+=frame.adjacent[i];blocked[i]+=frame.blocked[i];
      }
      return {first,second,k,q,r,stampCells:[points1.length,points2.length],start,period,base,direct,adjacent,blocked,
              ...(controls?{}:{frames,cellAgesRepeatRequired:false})};
    }
    if(!states.has(state))states.set(state,t);
    const ages=new Map();
    for(const o of [1,2])for(const tile of m.world.ownerCells[o])ages.set(tile,m.world.cellAges?.[tile]||1);
    m.nextTick();
    const direct=[0,0],adjacent=[0,0], victimAges=[[],[]];
    for(const event of combatDeaths(m.world)){
      const i=event.victim-1;
      adjacent[i]++;
      if(event.attackers.length){direct[i]++;victimAges[i].push(ages.get(event.id));}
    }
    const blocked=[0,0];
    for(const event of suppressedBirths(m.world))blocked[event.victim-1]++;
    frames.push({g:t+1,direct,adjacent,victimAges,blocked,births:m.game.players.slice(0,2).map(p=>p.lastBirths),
      stable:m.game.players.slice(0,2).map(p=>p.stable)});
  }
  throw Error('No verified repeat');
}
const cases=[
  {first:'censo-oscillator-9-p6-1',second:'censo-oscillator-10-p2-3',k:4,q:4,r:-2},
  {first:'censo-oscillator-10-p2-6',second:'censo-oscillator-11-p2-14',k:3,q:-1,r:0},
  {first:'censo-oscillator-8-p2-1',second:'censo-oscillator-12-p2-6',k:1,q:5,r:1},
].map(x=>{
  const fight=certify(x),alone1=certify({...x,second:null},true),alone2=certify({...x,first:null},true);
  assert(fight.direct[0]+fight.direct[1]>0);
  assert.deepEqual(alone1.direct,[0,0]);assert.deepEqual(alone2.direct,[0,0]);
  return {fight,alone1,alone2};
});
writeFileSync(new URL('./recurring-contact.json',import.meta.url),JSON.stringify(cases,null,2)+'\n');
