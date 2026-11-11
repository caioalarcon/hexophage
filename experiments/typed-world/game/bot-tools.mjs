// Field tools use the same command and wallet as the human. A unit of work is
// either one paired world tick or one isolated tick of an observed pattern.
import {capturePattern,circularSites} from '../../../src/mixed/field-tools.js';
import {advanceFrame,rankCards,seedFrame} from './atlas-model.mjs';
import {transformOffsets} from '../../../src/patterns/editor/axial-transform.js';

const operating=p=>p.income-p.birthSpent-p.eraseSpent-p.friendlyEraseSpent;
const matureIncome=(n,e)=>e.stableEnergy*(e.productionScale?n/(1+n/e.productionScale):n);
const EPS=1e-8;

export function observedPatternKey(card){
  let shape=card.offsets,canonical;
  for(let flipped=0;flipped<2;flipped++){
    for(let angle=0;angle<6;angle++){
      const [q,r]=shape.reduce(([q,r],[x,y])=>[Math.min(q,x),Math.min(r,y)],[Infinity,Infinity]);
      const signature=shape.map(([x,y])=>[x-q,y-r]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(p=>p.join(',')).join(';');
      if(canonical===undefined||signature<canonical)canonical=signature;
      shape=transformOffsets(shape,'cw');
    }
    shape=transformOffsets(shape,'flip');
  }
  return [card.rule,card.resolver,card.ballot,card.sense,canonical].join('/');
}

// A cheap spatial cue proposes experiments; the paired simulation decides.
// Young cells are weighted by the real tariff and mature production by its
// marginal contribution under the owner's current global saturation.
export function regionEconomy(match,owner,center,radius){
  const ids=match.erasePreview(owner,center,radius),e=match.economy;
  let young=0,mature=0,newborn=0,conventional=0;
  for(const id of ids){
    const c=match.cells.get(id);if(!c)continue;
    if(!c.wave)conventional++;
    if(c.age>=e.stableAfter)mature++;
    else young+=(c.wave?e.blastBirthCost:e.birthCost)/Math.max(1,c.age);
    if(c.age===1)newborn++;
  }
  const all=match.players[owner].mature;
  const income=matureIncome(all,e)-matureIncome(Math.max(0,all-mature),e);
  return {center,radius,ids,young,mature,newborn,conventional,income,drain:young-income};
}

function sampleSites(match,state,owner,limit=384){
  // Retain the iterator across scans so a large early colony cannot hide all
  // later regions. Read each sampled site from the current generation.
  state.scan??=match.cells.keys();
  const young=[],old=[],seen=new Set();
  for(let n=0;n<limit;n++){
    let next=state.scan.next();
    if(next.done){state.scan=match.cells.keys();next=state.scan.next();if(next.done)break;}
    const id=next.value;if(seen.has(id))break;seen.add(id);
    const c=match.cells.get(id);if(!c)continue;
    if(c.owner===owner&&c.age<match.economy.stableAfter)young.push(id);
    if(!c.wave&&c.age>=match.economy.stableAfter)old.push(id);
  }
  return {young,old};
}

function bestRegion(match,owner,sites,maximum){
  if(!sites.length)return null;
  const radii=[...new Set([maximum,Math.max(1,Math.ceil(maximum/2)),Math.min(maximum,2)])];
  // Spread the few candidate centres through the sample, rather than only
  // scanning the first cells on the leading edge of a moving cloud.
  const candidates=[...new Set(Array.from({length:Math.min(5,sites.length)},(_,i)=>sites[Math.floor(i*(sites.length-1)/Math.max(1,Math.min(5,sites.length)-1))]))];
  let best;
  for(const center of candidates)for(const radius of radii){
    const p=regionEconomy(match,owner,center,radius);
    if(!p.ids.length||!p.young||p.conventional>=match.players[owner].conventional)continue;
    if(!best||p.drain>best.drain+EPS||Math.abs(p.drain-best.drain)<EPS&&p.ids.length<best.ids.length)best=p;
  }
  return best?.drain>EPS?best:null;
}

function localFork(match,center,radius,horizon){
  // Small positions retain the complete state, including all competing
  // expenses. Larger positions retain a causal halo and frozen remote income.
  return match.cells.size<=2048?match.fork():match.fork(new Set(circularSites(match.graph,center,radius+horizon+2)));
}
function nearbyActivity(match,owner,center,radius){
  return circularSites(match.graph,center,radius).filter(id=>{
    const c=match.cells.get(id);return c?.owner===owner&&c.age<match.economy.stableAfter;
  });
}

export function createFieldToolPlanner(match,{stats,horizon,lookahead,cadence=1,onDecision,beforeOrder,onOrder,onLearn,onMutation}={}){
  const states=new Map();
  function stateFor(bot){
    if(!states.has(bot.owner))states.set(bot.owner,{task:null,follow:null,nextErase:0,nextCapture:48,scan:null,track:null,seen:new Set(),learned:[],captureSerial:0,
      lastGen:match.gen,lastIncome:match.players[bot.owner].income,lastSpent:match.players[bot.owner].birthSpent+match.players[bot.owner].eraseSpent+match.players[bot.owner].friendlyEraseSpent,
      income:0,spend:0});
    return states.get(bot.owner);
  }
  function strain(bot,state){
    const p=match.players[bot.owner],spent=p.birthSpent+p.eraseSpent+p.friendlyEraseSpent;
    if(match.gen>state.lastGen){
      const dt=match.gen-state.lastGen;
      state.income=(p.income-state.lastIncome)/dt;state.spend=(spent-state.lastSpent)/dt;
      state.lastGen=match.gen;state.lastIncome=p.income;state.lastSpent=spent;
    }
    const drain=Math.max(0,state.spend-state.income),runway=2*horizon*drain;
    return p.lastBirths>0&&p.reserve<4*match.economy.stampCost+runway;
  }
  function beginErase(bot,state){
    state.nextErase=match.gen+Math.max(2,Math.ceil(horizon/2));
    const sample=sampleSites(match,state,bot.owner),sites=sample.young;
    if(state.track!==null){
      for(const id of circularSites(match.graph,state.track,match.toolSettings.maxEraseRadius*2)){
        const c=match.cells.get(id);if(c?.owner===bot.owner&&c.age<match.economy.stableAfter)sites.push(id);
      }
    }
    const region=bestRegion(match,bot.owner,sites,match.toolSettings.maxEraseRadius);if(!region)return false;
    const hold=localFork(match,region.center,region.radius,horizon),play=hold.fork();
    const removed=play.erase(bot.owner,region.center,region.radius);if(!removed)return false;
    state.task={kind:'erase',owner:bot.owner,hold,play,region,t:0,turns:horizon,stage:'forecast',at:match.gen,
      followCenter:region.center,revision:match.actionRevision};
    stats[bot.owner].eraseTrials++;stats[bot.owner].trials++;
    return true;
  }
  function beginCapture(bot,state){
    state.nextCapture=match.gen+96;
    const {old}=sampleSites(match,state,bot.owner);if(!old.length)return false;
    // Prefer economically persistent material; every accepted copy is still
    // measured and then tested as a paid placement against waiting.
    const pick=old[bot.pick(old.length)],captured=capturePattern(match,pick);
    stats[bot.owner].captureTrials++;
    if(!captured.ok||match.cells.get(pick)?.wave)return false;
    const signature=observedPatternKey(captured.card);if(state.seen.has(signature))return false;
    state.seen.add(signature);
    const card={...captured.card,key:'observed/'+bot.owner+'/'+(++state.captureSerial),source:captured.card.rule,observed:true};
    state.task={kind:'capture',card,signature,frame:seedFrame(card),t:0,turns:Math.max(32,2*horizon),births:0,deaths:0,counts:new Map()};
    return true;
  }
  function advanceCapture(bot,state,j){
    const e=match.economy;
    for(const age of j.frame.values())j.counts.set(age,(j.counts.get(age)??0)+1);
    const step=advanceFrame(j.frame,j.card,e);j.frame=step.next;j.births+=step.births;j.deaths+=step.deaths;j.t++;
    stats[bot.owner].work++;stats[bot.owner].captureWork++;
    if(j.frame.size>Math.max(1024,4*match.toolSettings.maxStampCells)){state.task=null;return;}
    if(j.t<j.turns&&j.frame.size)return;
    state.task=null;
    j.card.sample={births:j.births/j.t,deaths:j.deaths/j.t,bands:[...j.counts].sort((a,b)=>a[0]-b[0]).flatMap(([age,count])=>[age,age,count]),window:j.t,horizon:j.t,finalCells:j.frame.size};
    const q=rankCards([j.card],e,{mature:match.players[bot.owner].mature})[0];
    if(q.flow<=EPS||!j.frame.size)return;
    state.learned.push(j.card);stats[bot.owner].captures++;onLearn?.(bot,j.card);
    onDecision?.({gen:match.gen,owner:bot.owner,key:j.card.key,role:'capture',tool:'eyedropper',ids:[],cost:q.cost,flow:q.flow,rejection:null});
  }
  function rejectErase(bot,state,j,reason){
    state.task=null;state.follow=null;stats[bot.owner].eraseHolds++;stats[bot.owner].holds++;
    onDecision?.({gen:match.gen,owner:bot.owner,key:'tool/eraser',role:'erase',tool:'eraser',ids:j.region.ids,radius:j.region.radius,cost:0,
      pay:j.pay??0,flow:j.flow??0,rejection:reason});
  }
  function revalidate(bot,state,j){
    const {owner}=bot,near=new Set(circularSites(match.graph,j.region.center,2*j.region.radius+horizon));
    const sites=[];
    // Include where the no-action simulation expects the moving activity, then
    // inspect actual material there before choosing the current brush centre.
    // The search halo follows both the current neighbourhood and forecasted
    // travel; remote young farms are independent regions.
    for(const [id,c] of j.hold?.cells??[])if(near.has(id)&&c.owner===owner&&c.age<match.economy.stableAfter)sites.push(id);
    for(const id of near){const c=match.cells.get(id);if(c?.owner===owner&&c.age<match.economy.stableAfter)sites.push(id);}
    const current=bestRegion(match,owner,sites,Math.min(j.region.radius,match.toolSettings.maxEraseRadius));
    if(!current||current.mature>j.region.mature)return rejectErase(bot,state,j,'changed');
    const hold=localFork(match,current.center,current.radius,1),play=hold.fork();
    if(!play.erase(owner,current.center,current.radius))return rejectErase(bot,state,j,'empty');
    hold.step();play.step();stats[owner].work++;stats[owner].eraseWork++;
    if(!play.players[owner].conventional||play.players[owner].out||play.players[owner].reserve+EPS<hold.players[owner].reserve)
      return rejectErase(bot,state,j,'current-return');
    const o={gen:match.gen,forecastAt:j.at,owner,key:'tool/eraser',role:'erase',tool:'eraser',target:0,
      ids:current.ids,site:current.center,radius:current.radius,expected:j.pay,flow:j.flow,revalidated:true};
    beforeOrder?.(o);
    const removed=match.erase(owner,current.center,current.radius);
    state.task=null;if(!removed)return;
    state.track=current.center;state.nextErase=match.gen+cadence;
    stats[owner].eraseOrders++;stats[owner].erasedCells+=removed;
    onMutation?.(bot);
    state.follow={...j,hold:null,play:null,region:current,until:j.until??match.gen+horizon};
    onOrder?.({...o,removed});
  }
  function advanceErase(bot,state,j){
    if(j.stage==='revalidate'){revalidate(bot,state,j);return;}
    const net=()=>operating(j.play.players[bot.owner])-operating(j.hold.players[bot.owner]);
    if(j.t===j.turns-4)j.base=net();
    // Compare waiting with a feasible cleaning policy, including regrowth.
    // The live bot uses this same cadence, with a fresh paired tick per stroke.
    if(j.t>0&&j.t%cadence===0){
      const sites=nearbyActivity(j.play,bot.owner,j.followCenter,2*j.region.radius+horizon);
      const next=bestRegion(j.play,bot.owner,sites,j.region.radius);
      if(next&&next.mature<=j.region.mature){
        j.play.erase(bot.owner,next.center,next.radius);j.followCenter=next.center;
      }
    }
    j.hold.step();j.play.step();j.t++;stats[bot.owner].work++;stats[bot.owner].eraseWork++;
    if(j.t<j.turns)return;
    j.flow=(net()-j.base)/4;
    j.pay=j.play.players[bot.owner].reserve-j.hold.players[bot.owner].reserve+lookahead*j.flow;
    const p=j.play.players[bot.owner];
    if(!p.conventional||p.out)return rejectErase(bot,state,j,'extinction');
    if(j.pay<=EPS)return rejectErase(bot,state,j,'return');
    onDecision?.({gen:match.gen,owner:bot.owner,key:'tool/eraser',role:'erase',tool:'eraser',ids:j.region.ids,
      radius:j.region.radius,cost:0,pay:j.pay,flow:j.flow,rejection:null,policy:'repeat',cadence});
    j.stage='revalidate';
  }
  function work(bot){
    const state=stateFor(bot),urgent=strain(bot,state);
    if(state.follow){
      if(match.gen>state.follow.until)state.follow=null;
      else{
        if(match.gen>=state.nextErase)revalidate(bot,state,state.follow);
        return true;
      }
    }
    if(urgent&&state.task?.kind==='capture'){
      state.seen.delete(state.task.signature);state.task=null;
    }
    if(!state.task){
      if(urgent&&match.gen>=state.nextErase)beginErase(bot,state);
      if(!state.task&&!bot.job&&!bot.ready&&match.gen>=state.nextCapture&&!urgent)beginCapture(bot,state);
    }
    if(!state.task)return false;
    if(state.task.kind==='erase')advanceErase(bot,state,state.task);
    else advanceCapture(bot,state,state.task);
    return true;
  }
  function invalidate(){
    for(const state of states.values()){
      state.follow=null;
      if(state.task?.kind==='erase'){
        state.task=null;state.nextErase=Math.min(state.nextErase,match.gen+1);
      }
    }
  }
  return {work,invalidate,learned:bot=>stateFor(bot).learned};
}
