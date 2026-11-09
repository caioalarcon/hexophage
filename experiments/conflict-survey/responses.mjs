// Search for one paid defensive stamp after a genuine incoming shot.
// Usage: node experiments/conflict-survey/responses.mjs > responses.json
import assert from 'node:assert/strict';
import {buildSphere} from '../../src/world/sphere.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {STABILITY_ECONOMY} from '../../src/match/constructive-economy.js';
import {advanceGeneration} from '../../src/simulation/generation.js';
import {gameEconomyTick} from '../../src/match/biomass.js';
import {resolveRuleProfile} from '../../src/match/rule-profiles.js';
import {decodeRLE} from '../../src/patterns/rle.js';

// Real ship launches from the directed-contact screen (oriented map vertex IDs).
// In B2/S245 this is the same 9-cell ship/12-cell farm used in contacts-replay.
const fixtures = [
  {rule:'hex-b2s245', target:'farm-4-12', attacker:'db-151', shot:[75,134,162,163,164,190,191,192,217],
    replies:['scan-bfc24a','scan-5051f1','scan-b1cf68','farm-4-12','db-151','scan-39c687'], turn:2},
  // Same line and phase as above, launched two ship periods farther back.
  {rule:'hex-b2s245', target:'farm-4-12', attacker:'db-151', shot:[8,71,101,102,103,131,132,133,160],
    replies:['scan-bfc24a','scan-5051f1','scan-b1cf68','farm-4-12','db-151','scan-39c687'], turn:2},
  {rule:'andreen', target:'bagley-toggle-pair', attacker:'bagley-sym-glider', shot:[173,144,143,113,112],
    replies:['bagley-sym-glider','bagley-toggle-pair','bagley-eater'], turn:2},
  {rule:'ashley15', target:'rotor126', attacker:'scan-acba7e', shot:[292,314,374,291,313,333,288],
    replies:['scan-bfc24a','scan-5051f1','scan-9d2e25'], turn:1},
  {rule:'ashley15', target:'rotor126', attacker:'scan-acba7e', shot:[333,353,2159,332,352,2157,2155],
    replies:['scan-bfc24a','scan-5051f1','scan-9d2e25','scan-acba7e'], turn:1},
];
const graph=buildSphere(32), searchEnd=160, verifyEnd=512, warm=16;
function centered(p) {
  const pts=decodeRLE(p.rle);
  const q=Math.round(pts.reduce((s,v)=>s+v[0],0)/pts.length);
  const r=Math.round(pts.reduce((s,v)=>s+v[1],0)/pts.length);
  return pts.map(([x,y])=>[x-q,y-r]);
}
function tick(m) {
  advanceGeneration(m.world);
  gameEconomyTick(m.world,m.game,m.removeLive,()=>{});
}
const cellKey=([q,r])=>q+','+r;
function examine(f,policy) {
  const {gameplay}=resolveRuleProfile(f.rule);
  const lookup=new Map(gameplay.patterns.map(p=>[p.id,p]));
  const make=()=>createHeadlessMatch(graph,{rule:f.rule,conflict:policy,economy:STABILITY_ECONOMY});
  const ref=make(), anchor=graph.farthest;
  const founding=ref.patchForStamp(anchor,0,centered(lookup.get(f.target)));
  function setup(m,attack) {
    assert(m.commitStamp(2,founding,false));
    for(let i=0;i<warm;i++) tick(m);
    if(attack) assert(m.commitStamp(1,f.shot,false));
  }
  setup(ref,false);
  const phases=[], targetSites=new Set();
  for(let t=0;t<=verifyEnd;t++) {
    const ids=[...ref.world.ownerCells[2]];
    phases.push(ids);
    for(const id of ids) targetSites.add(id);
    if(t<verifyEnd) tick(ref);
  }
  const m=make(), district=[];
  for(let q=-12;q<=12;q++) for(let r=-12;r<=12;r++) if(Math.abs(q+r)<=12) district.push([q,r]);
  const sites=m.patchForStamp(anchor,0,district);
  assert(sites);
  const chart=new Map(district.map((v,i)=>[cellKey(v),sites[i]]));
  const options=[],seen=new Set();
  for(const id of f.replies) {
    let shape=centered(lookup.get(id));
    for(let rot=0;rot<6;rot++) {
      for(let q=-8;q<=8;q++) for(let r=-8;r<=8;r++) {
        if(Math.abs(q+r)>8) continue;
        const ids=shape.map(([x,y])=>chart.get(cellKey([x+q,y+r])));
        if(ids.some(v=>v===undefined||targetSites.has(v))) continue;
        const key=ids.slice().sort((a,b)=>a-b).join(',');
        if(seen.has(key)) continue;
        seen.add(key);options.push({id,q,r,rot,ids});
      }
      shape=shape.map(([x,y])=>[-y,x+y]);
    }
  }
  // Deterministic and neutral across orientations. Confirm cheapest witness;
  // ties favour the one leaving least material on the board.
  const trace=(attack,reply,end,early=false)=>{
    const g=make();setup(g,attack);
    let minFraction=1, firstLoss=null, paid=0, peak=0, finalOverlap=0;
    for(let t=0;t<=end;t++) {
      if(t===f.turn && reply) {
        const before=g.game.players[1].reserve;
        if(!g.commitStamp(2,reply.ids,false)) return null;
        paid=before-g.game.players[1].reserve;
      }
      const expected=phases[t];
      finalOverlap=0;
      for(const id of expected) if(g.world.owners[id]===2) finalOverlap++;
      if(finalOverlap!==expected.length) {
        firstLoss??=t;
        if(early) return {saved:false};
      }
      minFraction=Math.min(minFraction,finalOverlap/Math.max(1,expected.length));
      peak=Math.max(peak,g.world.activeCount);
      if(t<end) tick(g);
    }
    return {saved:firstLoss===null,firstLoss,paid,expected:phases[end].length,finalOverlap,
      minFraction,peak,live:g.world.activeCount,attacker:g.world.ownerCells[1].length,
      defender:g.world.ownerCells[2].length,neutral:g.world.ownerCells[7].length,cash:g.game.players[1].reserve};
  };
  const exposed=trace(true,null,verifyEnd);
  if(exposed.saved)return {rule:f.rule,policy,shot:f.shot,exposed,alreadySafe:true};
  let legal=0,protectedCount=0,best;
  for(const reply of options) {
    const v=trace(true,reply,searchEnd,true);
    if(!v) continue;
    legal++;
    if(!v.saved) continue;
    protectedCount++;
    if(!best || v.paid<best.v.paid || v.paid===best.v.paid && v.live<best.v.live)
      best={reply,v};
  }
  const reply=best?.reply;
  return {rule:f.rule,policy,target:f.target,attacker:f.attacker,shot:f.shot,replyTick:f.turn,
    tested:options.length,legal,fullyProtectedAt160:protectedCount,reply,unopposed:trace(false,null,verifyEnd),
    exposed,protected:reply&&trace(true,reply,verifyEnd),replyAlone:reply&&trace(false,reply,verifyEnd)};
}
const reports=[];
for(const f of fixtures) {
  for(const policy of ['lineage','legacy','block']) {
    const r=examine(f,policy);
    console.error(f.rule,policy,r.legal,r.fullyProtectedAt160,r.protected?.saved,r.reply?.id);
    reports.push(r);
  }
}
console.log(JSON.stringify(reports,null,2));
