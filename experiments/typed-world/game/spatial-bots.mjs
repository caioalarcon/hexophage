// A bounded, deterministic search over the same observation and commands as a
// human. No opponent treasury or cell outside the current light enters a probe.
import {atlasCards,rankCards} from './atlas-model.mjs';
import {patchForStamp} from '../../../src/patterns/spherical-patch.js';
import {circularSites} from '../../../src/mixed/field-tools.js';

const EPS=1e-8;
const operating=p=>p.income-p.birthSpent-p.eraseSpent-p.friendlyEraseSpent;
const metadata=c=>c.contract?{contract:c.contract}:undefined;
const memoryKey=c=>c.contract?'contract/'+c.contract:c.key;
const sum=a=>a.reduce((n,v)=>n+v,0);
function resourceStock(m,owner){return m.progression?sum(m.progression.inventory(owner)):0;}
function resourceYield(m,owner){return m.progression?sum(m.progression.stats(owner)?.harvested??[]):0;}
function capabilities(m,owner){
  if(!m.progression)return 0;
  const counts=new Map();
  for(const c of m.cells.values())if(c.owner===owner&&!c.wave&&c.contract)counts.set(c.contract,(counts.get(c.contract)??0)+1);
  return m.progression.plan.nodes.reduce((score,node)=>score+((counts.get(node.id)??0)>=node.minimumBuilders?node.childPoints:0),0);
}
function random(seed){
  let x=seed>>>0;
  return n=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return Math.floor(x/4294967296*n);};
}
function makeStats(){
  return {orders:0,raids:0,trials:0,raidTrials:0,raidHolds:0,raidInvalid:0,rescueTrials:0,rescueOrders:0,delayed:0,holds:0,invalidated:0,
    eraseTrials:0,eraseInvalidated:0,eraseHolds:0,eraseOrders:0,erasedCells:0,eraseWork:0,captureTrials:0,captures:0,capturedOrders:0,captureWork:0,
    first:null,last:null,studied:new Set(),bought:new Set(),expected:0,work:0,exploreOrders:0,visibleEnemyTrials:0,unseenActions:0,researchOrders:0,researchSpent:0};
}
function stamp(m,owner,c,ids,commit=false){
  return m[commit?'stamp':'canStamp'](owner,c.rule,c.resolver??'contact',ids,c.ballot??'support',c.sense??'native',metadata(c));
}
function observedSites(view,owner){
  const visible=view.visibility(owner).visible;
  return [...visible].filter(id=>view.graph.deg[id]===6&&!view.cells.has(id));
}
function localCells(view,owner){
  const own=[],enemies=[];
  for(const [site,c] of view.cells){
    if(c.owner===owner)own.push([site,c]);
    else if(view.canSee(owner,site))enemies.push([site,c]);
  }
  return {own,enemies};
}
function sameObservationAction(match,owner,action){
  return !action||action.kind==='settings'||action.owner===owner||action.ids?.some(id=>match.canSee(owner,id));
}

export function createSpatialGameBots(match,{seed=1,owners=match.players.slice(2).map((_,i)=>i+2),cards=atlasCards,
  budget=4,horizon=16,lookahead=48,interval=12,onOrder,beforeOrder,onDecision,fieldTools=true}={}){
  if(!match.spatial?.enabled||typeof match.forkObserved!=='function')throw TypeError('Spatial bots need the observation API.');
  if(!Number.isSafeInteger(budget)||budget<0||!Number.isSafeInteger(horizon)||horizon<4||!Number.isFinite(lookahead)||lookahead<0||
    !Number.isSafeInteger(interval)||interval<1)throw RangeError('Invalid bot timing.');
  if(new Set(owners).size!==owners.length||owners.some(owner=>!match.players[owner]))throw RangeError('Invalid bot owners.');
  const stats=Array.from({length:match.players.length},makeStats);
  const bots=owners.map(owner=>({owner,pick:random(seed^Math.imul(owner,0x9e3779b9)),decision:0,next:1,lastBuy:-Infinity,job:null,memory:new Map(),
    researched:new Set(),researchSpent:0}));
  const unsubscribe=match.subscribeActions(action=>{
    for(const bot of bots)if(bot.job&&sameObservationAction(match,bot.owner,action)){
      stats[bot.owner].invalidated++;bot.job=null;
    }
  });
  // Atlas measurements are proposal priors. The actual cell economy in the
  // paired forecast decides every purchase, including editor-created shapes.
  function candidateCards(view,bot){
    const available=view.progression?.legalCards(bot.owner)??cards;
    const small=available.filter(c=>c.offsets?.length&&c.offsets.length<=view.toolSettings.maxStampCells);
    const priced=rankCards(small,{...view.economy,productionScale:0},{reserve:view.players[bot.owner].reserve});
    const affordable=priced.filter(q=>q.feasible&&view.stampQuote(q.card.rule,q.card.resolver??'contact',q.card.offsets.length,
      metadata(q.card)).total<=view.players[bot.owner].reserve+EPS);
    if(!affordable.length)return [];
    const producers=affordable.filter(q=>q.flow>0).sort((a,b)=>a.card.offsets.length-b.card.offsets.length||
      (a.births??Infinity)-(b.births??Infinity)||b.flow-a.flow);
    const head=affordable.slice(0,12).map(q=>q.card).sort((a,b)=>(bot.memory.get(memoryKey(b))??0)-(bot.memory.get(memoryKey(a))??0));
    const selected=[];
    if(bot.decision%4===0)selected.push(affordable[bot.pick(affordable.length)].card);
    if(view.progression&&bot.decision%2===0){
      const present=new Set([...view.cells.values()].filter(c=>c.owner===bot.owner).map(c=>c.contract));
      const newCapability=affordable.filter(q=>!present.has(q.card.contract)&&!bot.researched.has(q.card.contract)).sort((a,b)=>{
        const node=c=>view.progression.plan.nodes.find(n=>n.id===c.contract);
        return (node(b.card)?.childPoints??0)-(node(a.card)?.childPoints??0)||a.card.offsets.length-b.card.offsets.length;
      });
      if(newCapability.length)selected.push(newCapability[0].card);
    }
    // A cheap measured producer can start a new local budget. Long-window
    // growth estimates alone favour enormous, unaffordable construction plans.
    if(producers.length)selected.push(producers[0].card);
    // Keeping a rotated shortlist prevents a large lucrative seed that cannot
    // fit in the current light from starving cheaper expansion opportunities.
    for(let i=0;i<Math.min(5,head.length);i++)selected.push(head[(i+bot.decision)%head.length]);
    return [...new Set(selected)];
  }
  function placement(view,bot,card,candidates){
    const {owner,pick}=bot,explored=view.visibility(owner).explored;
    const inventory=view.progression?.inventory(owner);
    let best=null;
    for(let n=0;n<Math.min(28,candidates.length);n++){
      const center=candidates[pick(candidates.length)],rotation=pick(6);
      const ids=patchForStamp({graph:view.graph},center,rotation,card.offsets);
      if(!ids||!stamp(view,owner,card,ids))continue;
      let frontier=0,nearEnemy=0,nearOwn=0,resources=0;
      for(const id of circularSites(view.graph,center,Math.min(8,view.spatial.visionRadius??6))){
        if(!explored.has(id))frontier++;
        const c=view.cells.get(id);
        if(c?.owner===owner)nearOwn++;
        else if(c)nearEnemy++;
      }
      if(view.progression)for(const id of new Set(ids.flatMap(site=>circularSites(view.graph,site,1)))){
        const deposit=view.progression.resourceAt(id,owner);
        if(deposit?.remaining>0)resources+=Math.min(8,deposit.remaining)/(1+(inventory[deposit.kind]??0)/16);
      }
      const score=frontier+resources*3+(bot.decision%3===0?nearEnemy*12:0)-nearOwn*.15+pick(10)*.01;
      if(!best||score>best.score)best={card,ids,center,rotation,score,frontier,nearEnemy};
    }
    return best;
  }
  function propose(bot){
    const {owner}=bot;
    // Everything used to select targets, shapes, or a simulation is downstream
    // of this observation. Even candidate ranking sees only own cash.
    const view=match.forkObserved(owner),candidates=observedSites(view,owner);
    if(!candidates.length||view.players[owner].out)return;
    bot.decision++;
    const options=candidateCards(view,bot);
    let proposed;
    for(const card of options){
      const p=placement(view,bot,card,candidates);
      if(p){proposed=p;break;}
    }
    const {own,enemies}=localCells(view,owner);
    const cleaning=fieldTools&&bot.decision%5===0&&own.some(([,c])=>(c.stableAge??c.age)<view.economy.stableAfter);
    if(cleaning){
      const young=own.filter(([,c])=>(c.stableAge??c.age)<view.economy.stableAfter);
      const [center]=young[bot.pick(young.length)],radius=Math.min(2,view.toolSettings.maxEraseRadius);
      const ids=view.erasePreview(owner,center,radius);
      if(ids.length&&ids.length<own.length)proposed={center,ids,radius,tool:'eraser'};
    }
    if(!proposed)return;
    const {center,card}=proposed;
    const extent=Math.max(8,horizon+Math.ceil(Math.sqrt(proposed.ids.length))+2);
    const scope=new Set(circularSites(view.graph,center,extent));
    for(const id of proposed.ids)scope.add(id);
    const hold=view.fork(scope),play=hold.fork();
    if(proposed.tool==='eraser'){
      if(!play.erase(owner,center,proposed.radius))return;
      stats[owner].eraseTrials++;
    }else{
      if(!stamp(play,owner,card,proposed.ids,true))return;
      stats[owner].studied.add(card.rule);
    }
    const foeIds=[...new Set(enemies.map(([,c])=>c.owner))];
    const role=proposed.tool==='eraser'?'erase':proposed.nearEnemy&&bot.decision%3===0?'raid':proposed.frontier?'explore':'farm';
    const stat=stats[owner];stat.trials++;stat.raidTrials+=Number(role==='raid');stat.visibleEnemyTrials+=Number(foeIds.length>0);
    const anchors=own.filter(([site,c])=>scope.has(site)&&(c.stableAge??c.age)>=view.economy.stableAfter).map(([id])=>id);
    const novel=card?.contract&&!bot.researched.has(card.contract)&&![...view.cells.values()].some(c=>c.owner===owner&&c.contract===card.contract);
    bot.job={...proposed,owner,hold,play,scope,role,foeIds,anchors,novel,t:0,at:match.gen,base:0};
  }
  function finish(bot,j){
    const {owner,play,hold,role,card}=j,stat=stats[owner];
    const p=play.players[owner],h=hold.players[owner];
    const flow=((operating(p)-operating(h))-j.base)/4;
    const cash=p.reserve-h.reserve;
    const light=play.visibility(owner).explored,oldLight=hold.visibility(owner).explored;
    let revealed=0;for(const id of light)if(!oldLight.has(id))revealed++;
    // Territorial value is paid only in the search objective. It never mints
    // real energy, and a non-surviving scout cannot justify a placement.
    const scouting=Math.min(96,revealed)*.35;
    let anchorLoss=0;for(const id of j.anchors)if(hold.cells.get(id)?.owner===owner&&play.cells.get(id)?.owner!==owner)anchorLoss++;
    let harm=0;
    for(const id of j.foeIds)harm+=Math.max(0,hold.players[id].reserve-play.players[id].reserve)+
      Math.max(0,hold.players[id].conventional-play.players[id].conventional)*match.economy.stampCost;
    const cost=j.tool==='eraser'?0:j.ids.length*match.stampPrice(card.resolver??'contact');
    const resourceFlow=((resourceYield(play,owner)-resourceYield(hold,owner))-(j.resourceBase??0))/4;
    const resourceValue=2.5*(resourceStock(play,owner)-resourceStock(hold,owner)+lookahead*resourceFlow);
    const unlockValue=6*Math.max(0,capabilities(play,owner)-capabilities(hold,owner));
    const pay=cash+lookahead*flow+scouting+resourceValue+unlockValue+(role==='raid'?harm:0)-anchorLoss*match.economy.stampCost;
    const survived=j.tool==='eraser'||harm>EPS||[...play.cells].some(([id,c])=>{
      const before=hold.cells.get(id);
      return c.owner===owner&&(!before||before.owner!==owner||before.type!==c.type||before.age!==c.age);
    });
    // A finite value-of-information budget permits one field experiment with
    // a newly unlocked recipe. It spends real money through the normal command.
    // The allowance grows only from earned income, and recorded exploratory
    // loss consumes it. This prevents a profit-only planner from never trying
    // scouts, circuits, or an unfamiliar custom machine.
    const researchBudget=Math.max(0,.15*match.players[owner].income-bot.researchSpent);
    const recipe=card?.contract&&match.progression?.plan.nodes.find(n=>n.id===card.contract);
    const allocated=recipe?match.stampQuote(card.rule,card.resolver??'contact',card.offsets.length,metadata(card)).total+2.5*sum(recipe.cost):0;
    const researchCharge=Math.max(0,-pay,allocated);
    const research=!!j.novel&&anchorLoss===0&&survived&&pay<=EPS&&researchCharge<=researchBudget&&
      p.reserve>=Math.max(64,hold.players[owner].reserve*.2);
    const rejection=p.out||!p.conventional||play.progression?.objective(owner).defeated?'extinction':!survived?'ephemeral':pay<=EPS&&!research?'return':null;
    onDecision?.({gen:match.gen,owner,key:card?.key??'tool/eraser',ids:j.ids,tool:j.tool??'stamp',role,pay,cost,flow,modeledCash:cash,revealed,
      ...(match.progression?{contract:card?.contract,resourceValue,unlockValue,research,researchBudget}:{}),rejection});
    if(card){const key=memoryKey(card),confidence=Math.max(-1,Math.min(1,pay/Math.max(1,cost)));bot.memory.set(key,.7*(bot.memory.get(key)??0)+.3*confidence);}
    if(rejection){stat.holds++;stat.raidHolds+=Number(role==='raid');stat.eraseHolds+=Number(j.tool==='eraser');return;}
    if(match.gen-bot.lastBuy<interval||j.ids.some(id=>!match.canSee(owner,id))){stat.invalidated++;return;}
    const o={gen:match.gen,forecastAt:j.at,owner,key:card?.key??'tool/eraser',rule:card?.rule,resolver:card?.resolver??'contact',
      ballot:card?.ballot??'support',sense:card?.sense??'native',contract:card?.contract,tool:j.tool??'stamp',
      ids:j.ids,site:j.center,radius:j.radius,rotation:j.rotation,role,target:role==='raid'?j.foeIds[0]??0:0,expected:pay,revealed,
      ...(match.progression?{research,researchBudget,researchCharge}:{} )};
    if(j.tool!=='eraser'&&!stamp(match,owner,card,j.ids)){stat.invalidated++;return;}
    beforeOrder?.(o);
    if(j.tool==='eraser'){
      const removed=match.erase(owner,j.center,j.radius);if(!removed)return;
      stat.eraseOrders++;stat.erasedCells+=removed;o.removed=removed;
    }else{
      if(!stamp(match,owner,card,j.ids,true))return;
      stat.orders++;stat.raids+=Number(role==='raid');stat.exploreOrders+=Number(role==='explore');stat.bought.add(card.rule);
      if(card.contract)bot.researched.add(card.contract);
      if(research){bot.researchSpent+=researchCharge;stat.researchOrders++;stat.researchSpent+=researchCharge;}
    }
    bot.lastBuy=match.gen;stat.first??=match.gen;stat.last=match.gen;stat.expected+=pay;onOrder?.(o);
  }
  function advance(bot){
    const j=bot.job;if(!j)return;
    if(j.t===horizon-4){
      j.base=operating(j.play.players[bot.owner])-operating(j.hold.players[bot.owner]);
      j.resourceBase=resourceYield(j.play,bot.owner)-resourceYield(j.hold,bot.owner);
    }
    j.hold.step();j.play.step();j.t++;stats[bot.owner].work++;
    if(j.tool==='eraser')stats[bot.owner].eraseWork++;
    if(j.t>=horizon){bot.job=null;finish(bot,j);}
  }
  let cursor=0,last=-1;
  function turn(){
    if(last===match.gen||!bots.length)return;
    last=match.gen;
    for(let n=0;n<budget;n++){
      const bot=bots[cursor++%bots.length];
      if(match.players[bot.owner].out){bot.job=null;continue;}
      if(!bot.job&&match.gen>=bot.next){bot.next=match.gen+Math.max(2,Math.ceil(interval/3));propose(bot);}
      if(bot.job)advance(bot);
    }
  }
  return {turn,stats,destroy:unsubscribe};
}
