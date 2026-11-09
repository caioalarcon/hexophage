// One headless production learner match. Emit JSON for matches-collect.py.
import assert from 'node:assert/strict';
import { buildSphere } from '../../src/world/sphere.js';
import { createHeadlessMatch } from '../../src/match/headless.js';
import { STABILITY_ECONOMY, ACTIVITY_ECONOMY } from '../../src/match/constructive-economy.js';
import { advancePattern, seedPatternAges, patternOffset } from '../../src/patterns/planar-simulation.js';
import { decodeRLE } from '../../src/patterns/rle.js';

const [rule,conflict='legacy',mode='organic',frequency='24',limit='16384',seed='4751',policy='stability'] = process.argv.slice(2);
const F=Number(frequency), horizon=Number(limit);
assert(['organic','inbound','outbound','hold'].includes(mode));
assert(['lineage','block','legacy'].includes(conflict));
assert(['activity','stability'].includes(policy));
const graph=buildSphere(F);
const m=createHeadlessMatch(graph,{ growth:'classic',rule,conflict,botMode:'learn',brain:{seed:Number(seed)},
  economy:policy==='activity'?ACTIVITY_ECONOMY:STABILITY_ECONOMY});
const {world,game}=m;
if (conflict!=='legacy') assert.equal(game.conflict??world.physics.conflict, conflict, 'Selected conflict policy must be active');
game.players[0].out=true;
const bots=game.players.slice(1);
const radius=([q,r])=>Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r));
const round=n=>Number(n.toFixed(4));
function mean(points){return [0,1].map(k=>points.reduce((sum,p)=>sum+p[k],0)/points.length);}
function pointsOf(pattern){
  const points=decodeRLE(pattern.rle), [q,r]=mean(points).map(Math.round);
  return points.map(([x,y])=>[x-q,y-r]);
}
// Same two paid stamps in each orientation arm. Only rotate the incoming ship
// around its own center by 180 degrees for the outbound control.
function openEncounter(){
  const patterns=game.gameplay.atlas??game.gameplay.patterns;
  const targetId=rule==='hex-b2s245'?'farm-10-36':game.gameplay.opening;
  const target=patterns.find(p=>p.id===targetId);
  const attack=patterns.filter(p=>p.group==='nave').sort((a,b)=>a.cells-b.cells||a.id.localeCompare(b.id))[0];
  assert(target && attack);
  const defender=pointsOf(target), ship=pointsOf(attack);
  let ages=seedPatternAges(attack);
  const start=mean([...ages.keys()].map(patternOffset));
  for(let i=0;i<attack.period;i++) ages=advancePattern(ages,1,world.physics).next;
  const delta=mean([...ages.keys()].map(patternOffset)).map((n,i)=>Math.round(n-start[i]));
  assert(radius(delta)>0,'Moving object required');
  const angle=(Number(seed)%6), anchor=graph.farthest;
  assert(m.commitStamp(2,m.patchForStamp(anchor,angle,defender),false));
  // The closest along-track offset that accepts either rotation with a two-cell
  // minimum gap. Swap headings at exactly the same offset for the matched run.
  for(let k=1;k<=32;k++){
    const translate=([q,r],sign)=>[q*sign-k*delta[0],r*sign-k*delta[1]];
    const headings=[1,-1].map(sign=>ship.map(p=>translate(p,sign)));
    if (headings.some(points=>points.some(([q,r])=>defender.some(([x,y])=>radius([x-q,y-r])<3)))) continue;
    const ids=headings.map(p=>m.patchForStamp(anchor,angle,p));
    if (ids.some(v=>!v || !m.stampAdditions(3,v))) continue;
    if(mode!=='hold') assert(m.commitStamp(3,ids[mode==='inbound'?0:1],false));
    return {defender:target.id,ship:attack.id,offset:k,angle};
  }
  throw Error('No legal paired encounter '+rule);
}
const opening=mode==='organic'?{}:openEncounter();
const seenOwners=new Uint8Array(graph.n);
let sharedSites=0, maxLiving=0, maxGrey=0, maxGreyFraction=0, firstGrey=0, firstTouch=0, firstDamage=0;
let sampleN=0, touchSamples=0, touchLate=0, lateSampleN=0, changes=0, leader=0, firstOut=0, lastTouch=0;
let contactTicks=0, attributedTransfer=0, lateTransfer=0;
const initialPlacements=mode==='organic'?0:mode==='hold'?1:2;
function inspect(){
  sampleN++;
  const late=world.gen>horizon/2;
  if(late) lateSampleN++;
  let touching=false;
  for(const p of bots) for(const id of world.ownerCells[p.id]){
    const prior=seenOwners[id],bit=1<<p.id;
    if(prior && !(prior&(prior-1)) && prior!==bit) sharedSites++;
    seenOwners[id]|=bit;
    if (!touching) for(let k=0;k<graph.deg[id];k++){
      const owner=world.owners[graph.adj[id*6+k]];
      if(owner>=2 && owner<=6 && owner!==p.id){touching=true;break;}
    }
  }
  if(touching){
    firstTouch ||= world.gen;lastTouch=world.gen;touchSamples++;
    if(late) touchLate++;
  }
  const sizes=bots.map(p=>world.ownerCells[p.id].length);
  const max=Math.max(...sizes);
  if(max>=2 && sizes.filter(n=>n===max).length===1){
    const candidate=sizes.indexOf(max)+2;
    if (leader && leader!==candidate) changes++;
    leader=candidate;
  }
}
while(world.gen<horizon && !game.ended){
  m.nextTick();
  const grey=world.ownerCells[7].length;
  if(grey && !firstGrey) firstGrey=world.gen;
  maxGrey=Math.max(maxGrey,grey);maxLiving=Math.max(maxLiving,world.activeCount);
  if(world.activeCount>=20) maxGreyFraction=Math.max(maxGreyFraction,grey/world.activeCount);
  if(!firstOut && bots.some(p=>p.out)) firstOut=world.gen;
  const transfer=bots.reduce((s,p)=>s+p.tributePaid,0);
  if(transfer>attributedTransfer){
    contactTicks++;
    firstDamage ||= world.gen;
    if(world.gen>horizon/2) lateTransfer+=transfer-attributedTransfer;
    attributedTransfer=transfer;
  }
  if(world.gen<=32 || world.gen%32===0 || game.ended) inspect();
}
// For incomplete final interval, inspect once.
if(world.gen>32 && world.gen%32 && !game.ended) inspect();
const metrics=game.brainMetrics;
const players=bots.map(p=>({owner:p.id,field:world.ownerCells[p.id].length,cash:round(p.reserve),
  flow:round(p.flowAverage),out:p.out,tributeIn:round(p.tributeReceived),tributeOut:round(p.tributePaid),eroded:p.eroded}));
console.log(JSON.stringify({rule,conflict,mode,policy,F,sites:graph.n,horizon,seed:Number(seed),gen:world.gen,
  ...opening,initialPlacements,ended:game.ended,winner:game.winner,eliminated:bots.filter(p=>p.out).length,firstOut,
  buys:metrics?.actions??0,aimed:metrics?.tactical??0,studies:metrics?.studies??0,
  tribute:round(attributedTransfer),payingBots:bots.filter(p=>p.tributePaid>0).length,contactTicks,firstDamage,lateTransfer:round(lateTransfer),
  sampledTouch:touchSamples,samples:sampleN,lateTouch:touchLate,lateSamples:lateSampleN,firstTouch,lastTouch,sharedSites,leadChanges:changes,
  peakLive:maxLiving,peakGrey:maxGrey,peakGreyFraction:round(maxGreyFraction),firstGrey,finalGrey:world.ownerCells[7].length,
  finalField:players.reduce((s,p)=>s+p.field,0),eroded:players.reduce((s,p)=>s+p.eroded,0),
  activeBots:players.filter(p=>p.field>0).length,positiveFlow:players.filter(p=>p.flow>0).length,players}));
