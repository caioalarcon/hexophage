// Directed, paid ship impacts. See contacts.md for CLI and sampling design.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildSphere } from '../../src/world/sphere.js';
import { createHeadlessMatch } from '../../src/match/headless.js';
import { resolveRuleProfile } from '../../src/match/rule-profiles.js';
import { STABILITY_ECONOMY } from '../../src/match/constructive-economy.js';
import { gameEconomyTick } from '../../src/match/biomass.js';
import { advanceGeneration } from '../../src/simulation/generation.js';
import { decodeRLE } from '../../src/patterns/rle.js';
import { advancePattern, seedPatternAges, patternOffset } from '../../src/patterns/planar-simulation.js';

const targets = {
  'hex-b2s245':['farm-4-12','farm-18-66','farm-10-36','farm-9-30'],
  callahan:['stalk','gun20'], bays:['osc2','bagley-buckyball-p19'],
  'hex-b2s34':['bagley-tree-p5','bagley-oscillator-p48'], bays245:['bagley-blossom-p57','bagley-static-triangle'],
  andreen:['bagley-toggle-pair','bagley-4-glider-gunship-p28'], highhex:['smallpuffer','scan-bfc24a'],
  ashley15:['rotor126','puff30'], ashley:['gun','scan-b1cf68'],
};
const [mode,rule,policy='legacy',frequency='32',end='192',shipId,defenderId,rot,offset,stage,ownerMode='opposed',ledger='on']=process.argv.slice(2);
const F=Number(frequency), horizon=Number(end);
const graph=buildSphere(F), {gameplay,physics}=resolveRuleProfile(rule);
const patterns=gameplay.atlas??gameplay.patterns;
const lookup=new Map(patterns.map(p=>[p.id,p]));
const rotate=([q,r])=>[-r,q+r];
const norm=([q,r])=>Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r));
const shape=(p,phase=0)=> {
  const cells=phase===0 ? decodeRLE(p.rle) :
    [...advancePattern(seedPatternAges(p),256,physics).next.keys()].map(patternOffset);
  const q=Math.round(cells.reduce((s,a)=>s+a[0],0)/cells.length);
  const r=Math.round(cells.reduce((s,a)=>s+a[1],0)/cells.length);
  return cells.map(([x,y])=>[x-q,y-r]);
};
const motion=new Map();
function velocity(ship) {
  if (!motion.has(ship)) {
    let ages=seedPatternAges(ship);
    const min=a=>[0,1].map(axis=>Math.min(...[...a.keys()].map(p=>patternOffset(p)[axis])));
    const start=min(ages);
    for(let i=0;i<ship.period;i++) ages=advancePattern(ages,256,physics).next;
    const delta=min(ages).map((v,i)=>v-start[i]);
    assert(norm(delta)>0,ship.id);
    motion.set(ship,delta);
  }
  return motion.get(ship);
}
function tick(m,funded=true) {
  advanceGeneration(m.world);
  if(funded) gameEconomyTick(m.world,m.game,m.removeLive,()=>{});
}
function trial(defender,ship,rotation,lane,warm,owners='opposed',funded=true,details=false,observer,conflict=policy) {
  const m=createHeadlessMatch(graph,{rule,economy:STABILITY_ECONOMY,conflict,growth:'classic'});
  const shipPhase=warm%2;
  let body=shape(ship,shipPhase), v=velocity(ship);
  for(let i=0;i<rotation;i++){body=body.map(rotate);v=rotate(v);}
  const anchor=graph.farthest;
  const defendIds=m.patchForStamp(anchor,0,shape(defender));
  if(!defendIds || !m.commitStamp(2,defendIds,false)) return;
  for(let i=0;i<warm;i++) tick(m,funded);
  const stagger=rotate(v), side=stagger.map(n=>Math.sign(n));
  let shots;
  for(let gap=Math.ceil(5/norm(v));gap*norm(v)<=28;gap++) {
    const pts=body.map(([q,r])=>[q-v[0]*gap+side[0]*lane,r-v[1]*gap+side[1]*lane]);
    shots=m.patchForStamp(anchor,0,pts);
    if(shots&&m.stampAdditions(1,shots)) break;
    shots=null;
  }
  if(!shots) return;
  if(mode==='fixtures'||mode==='fixture')return {rule,F,ship:ship.id,target:defender.id,rotation,lane,warm,defendIds,shots};
  if(owners==='ship-only') {
    // Keep the graph and launch sites identical. Erase only the defending
    // colony; the ship buyer still has the same reserve as in the paired run.
    m.clearCells();
    m.world.gen=warm;
    m.world.cellAges.fill(0);
  }
  if(owners!=='defender-only') assert(m.commitStamp(owners==='same'?2:1,shots,false));
  let halo=-1, departure=-1, departureDistance=null, shipPopulations=[];
  if(details && owners==='ship-only') {
    let ages=seedPatternAges(ship);
    for(let g=0;g<ship.period;g++) {
      shipPopulations.push(ages.size);
      ages=advancePattern(ages,256,physics).next;
    }
  }
  const samples=[], trace=details?createHash('sha256'):null;
  let maxGray=0,maxLive=m.world.activeCount,first=-1,firstMajor=-1,grayHalf=-1;
  for(let g=0;g<=horizon;g++) {
    if(g) tick(m,funded);
    const {world}=m, split=world.ownerCells,live=world.activeCount,gray=split[7].length;
    if(first<0&&gray)first=g;
    if(firstMajor<0&&gray>=256)firstMajor=g;
    if(grayHalf<0&&gray>=256&&gray>=live/2)grayHalf=g;
    maxGray=Math.max(maxGray,gray);maxLive=Math.max(maxLive,live);
    observer?.(g,m);
    if(details && owners==='ship-only' && (halo<0 || departure<0)) {
      let closest=Infinity;
      for(let k=0;k<live;k++) closest=Math.min(closest,graph.distance[world.active[k]]);
      if(halo<0 && closest<=1) halo=g;
      if(departure<0 && live!==shipPopulations[(g+shipPhase)%ship.period]) {
        departure=g;departureDistance=closest;
      }
    }
    if(details) {
      const head=Buffer.alloc(8);
      head.writeUInt32LE(g);head.writeUInt32LE(live,4);
      trace.update(head);
      // Active ordering is an implementation detail. Hash an unordered
      // occupancy bitset, not the order of the parents or their colours.
      const bits=Buffer.alloc(Math.ceil(world.graph.n/8));
      for(let k=0;k<live;k++) {const id=world.active[k];bits[id>>3]|=1<<(id&7);}
      trace.update(bits);
    }
    if(details && (g<=16 || (g&(g-1))===0 || g===horizon)) {
      const pos=world.active.subarray(0,live).slice().sort();

      const populationHash=createHash('sha256').update(Buffer.from(pos.buffer)).digest('hex').slice(0,20);
      samples.push({generation:g,attacker:split[1].length,defender:split[2].length,neutral:gray,live,populationHash,
        attackerEroded:m.game.players[0].eroded,defenderEroded:m.game.players[1].eroded});
    }
  }
  const a=m.world.ownerCells;
  const row={rule,policy:conflict,F,horizon,ship:ship.id,target:defender.id,rotation,lane,warm,shipPhase,firstNeutral:first,first256:firstMajor,
    firstNeutralMajority256:grayHalf,peakNeutral:maxGray,peakLive:maxLive,finalNeutral:a[7].length,finalAttacker:a[1].length,finalDefender:a[2].length};
  if(details) Object.assign(row,{owners,ledger:funded,stampSites:shots,traceHash:trace.digest('hex'),samples});
  if(details && owners==='ship-only') Object.assign(row,{firstPentagonHalo:halo,firstDifferentShipPopulation:departure,departureDistance});
  return row;
}
if(mode==='screen'||mode==='fixtures') {
  const ships=patterns.filter(p=>p.group==='nave'&&p.cells<=70).sort((a,b)=>a.cells-b.cells);
  // Broader sample of legally affordable attack shapes for the reported rule.
  const selected=ships.slice(0,rule==='hex-b2s245'?6:2);
  let header=false;
  for(const target of targets[rule]) for(const ship of selected)
    for(const rotation of [0,1,2,3,4,5]) for(const lane of [-2,0,2]) for(const warm of [16,17]) {
      const row=trial(lookup.get(target),ship,rotation,lane,warm,shipId??'opposed');
      if(!row)continue;
      if(mode==='fixtures'){console.log(JSON.stringify(row));continue;}
      if(!header) { console.log(Object.keys(row).join(','));header=true; }
      console.log(Object.values(row).join(','));
    }
} else if(mode==='replay') {
  const times=[0,3,6,9,12,18,24,36,48,58,72,96,144,256,512,1024];
  assert.equal(horizon,1024);
  const coords=Buffer.alloc(graph.n*6);
  for(let i=0;i<graph.n*3;i++) coords.writeInt16LE(Math.round(graph.coords[i]*32767),2*i);
  const frames={}, anchor=graph.farthest, local=[];
  const radius=Math.min(18,graph.distance[anchor]-1);
  const m=createHeadlessMatch(graph,{rule});
  const patch=[];
  for(let q=-radius;q<=radius;q++) for(let r=-radius;r<=radius;r++) if(norm([q,r])<=radius) patch.push([q,r]);
  const ids=m.patchForStamp(anchor,0,patch);
  assert(ids);
  for(let i=0;i<patch.length;i++) local.push([ids[i],...patch[i]]);
  for(const conflict of ['legacy','lineage','block']) {
    const series=frames[conflict]=[];
    const observe=(g,m)=>{
      if(!times.includes(g))return;
      const packed=Buffer.alloc(Math.ceil(graph.n/4));
      for(let i=0;i<m.world.activeCount;i++) {
        const id=m.world.active[i], owner=m.world.owners[id];
        packed[id>>2]|=(owner===7?3:owner)<<((id&3)*2);
      }
      const cells=m.world.ownerCells;
      series.push({g,a:cells[1].length,d:cells[2].length,neutral:cells[7].length,
        eroded:m.game.players.slice(0,2).map(p=>p.eroded),owners:packed.toString('base64')});
    };
    trial(lookup.get(defenderId),lookup.get(shipId),Number(rot),Number(offset),Number(stage),'opposed',true,false,observe,conflict);
  }
  console.log('const collisionReplay = '+JSON.stringify({F,n:graph.n,anchor,rule,ship:shipId,target:defenderId,times,coords:coords.toString('base64'),local,frames})+';');
} else if(mode==='fixture') {
  const row=trial(lookup.get(defenderId),lookup.get(shipId),Number(rot),Number(offset),Number(stage));
  assert(row,'Invalid placement');
  console.log(JSON.stringify(row));
} else if(mode==='case') {
  const row=trial(lookup.get(defenderId),lookup.get(shipId),Number(rot),Number(offset),Number(stage),ownerMode,ledger==='on',true);
  assert(row,'Invalid placement');
  console.log(JSON.stringify(row));
} else throw Error('Use screen or case');
