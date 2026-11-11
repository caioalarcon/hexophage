// One shared budget across all seats. A private tick advances both a real
// mixed-rule purchase and its hold control by one generation in the same disk.
import {atlasCards,rankCards} from './atlas-model.mjs';
import {disk} from '../pilots.mjs';
import {card as shipMotion} from '../duels-fixtures.mjs';
import {patchForStamp} from '../../../src/patterns/spherical-patch.js';
import {createFieldToolPlanner} from './bot-tools.mjs';

const ballots=['support','age','geometry','robustness'];
function targetPose(m,site){
  const slots=[site,...m.graph.adj.subarray(6*site,6*site+m.graph.deg[site])];
  return slots.map(id=>{const c=m.cells.get(id);return c?c.owner+'/'+c.rule+'/'+c.resolver:'';}).join('|');
}
const raidResolvers=['phase','contact','antimatter','phase'];
function random(seed){
  let x=seed>>>0;
  return limit=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return Math.floor(x/4294967296*limit);};
}
const operating=p=>p.income-p.birthSpent-p.eraseSpent-p.friendlyEraseSpent;
function chooseTarget(match,other,pick){
  let candidate,highest=-Infinity,n=0;
  // The sparse world is rebuilt each generation. Bound the scan on dense
  // planets; add independent vertex samples so later regions still qualify.
  function consider(site,c){
    if(!c || c.owner!==other || c.wave || match.graph.deg[site]!==6)return;
    const value=pick(40)+Math.min(c.age,12);
    if(value>highest){highest=value;candidate=site;}
  }
  for(const entry of match.cells){consider(...entry);if(++n>=384)break;}
  for(let i=0;i<48;i++){
    const site=pick(match.graph.n);consider(site,match.cells.get(site));
  }
  return candidate;
}

export function createGameBots(match,{seed=1,owners=match.players.slice(2).map((_,i)=>i+2),
  onOrder,beforeOrder,onDecision,cards=atlasCards,budget=4,horizon=16,lookahead=48,interval=12,phaseWindow=18,adaptive=true,recoveryOwners=owners,fieldTools=true}={}){
  if(!Number.isSafeInteger(budget)||budget<0||!Number.isSafeInteger(horizon)||horizon<4||
     !Number.isSafeInteger(phaseWindow)||phaseWindow<0||!Number.isFinite(lookahead)||lookahead<0||
     !Number.isSafeInteger(interval)||interval<1)throw RangeError('Invalid bot timing.');
  if(new Set(owners).size!==owners.length||owners.some(owner=>!match.players[owner]))throw RangeError('Invalid bot owners.');
  const ranked=rankCards(cards,match.economy).map(x=>x.card);
  const byRule=new Map();
  for(const card of ranked){
    if(!byRule.has(card.rule))byRule.set(card.rule,[]);
    byRule.get(card.rule).push(card);
  }
  const families=[...byRule.keys()], recoverySeats=new Set(recoveryOwners);
  const captains=owners.map(owner=>({owner,pick:random(seed^Math.imul(owner,0x9e3779b9)),decision:0,learned:[],
    pricedAt:-Infinity,prices:null,recoverySeen:new Set(),family:owner%Math.max(1,families.length),raidFamily:owner%Math.max(1,families.length),raidIndex:0,ready:null,next:1,lastBuy:-Infinity,job:null,memory:new Map()}));
  const stats=Array.from({length:match.players.length},()=>({orders:0,raids:0,trials:0,raidTrials:0,raidHolds:0,raidInvalid:0,rescueTrials:0,rescueOrders:0,delayed:0,holds:0,invalidated:0,
    eraseTrials:0,eraseHolds:0,eraseOrders:0,erasedCells:0,eraseWork:0,captureTrials:0,captures:0,capturedOrders:0,captureWork:0,
    first:null,last:null,studied:new Set(),bought:new Set(),expected:0,work:0}));
  let revision=match.actionRevision;
  function invalidateForecasts(){
    revision=match.actionRevision;
    for(const bot of captains){
      if(bot.ready)stats[bot.owner].invalidated++;
      bot.job=null;bot.ready=null;bot.pricedAt=-Infinity;
    }
    field?.invalidate();
  }
  const field=fieldTools?createFieldToolPlanner(match,{stats,horizon,lookahead,cadence:Math.max(1,Math.ceil(owners.length/Math.max(1,budget))),onDecision,beforeOrder,onOrder,
    onLearn:(bot,card)=>{bot.learned.push(card);bot.pricedAt=-Infinity;},onMutation:invalidateForecasts}):null;
  function investment(bot,cards){
    const p=match.players[bot.owner];
    const possible=cards.filter(c=>c.offsets.length*match.stampPrice(c.resolver)<=p.reserve);
    if(!possible.length)return null;
    // Periodically test an unfamiliar atlas card, otherwise use the priced
    // shortlist and credit the bot's own completed, paired spatial experiments.
    if(bot.decision%7===0)return possible[bot.pick(possible.length)];
    const shortlist=possible.slice(0,4);let best,bid=-Infinity;
    for(let i=0;i<shortlist.length;i++){
      const c=shortlist[i],prior=bot.memory.get(c.key)??0;
      const value=1/(1+i)+prior+.30*bot.pick(100)/100;
      if(value>bid){bid=value;best=c;}
    }
    return best;
  }
  function propose(bot){
    const {owner,pick}=bot;if(match.players[owner].out)return;
    const known=[...ranked,...bot.learned].filter(card=>card.offsets.length<=match.toolSettings.maxStampCells);
    if(!known.length)return;
    const rivals=match.players.map((p,id)=>p&&!p.out&&id!==owner&&p.conventional>0?id:0).filter(Boolean);
    bot.decision++;
    const raid=rivals.length>0&&families.length>0&&bot.decision%3===0, other=rivals.length?rivals[pick(rivals.length)]:owner;
    const rescue=!raid && recoverySeats.has(owner) && match.gen-Math.max(0,bot.lastBuy)>=96;
    let item,center,ids,rotation,resolver,ballot,scoped;
    if(raid){
      const family=families[bot.raidFamily++%families.length];
      const ships=byRule.get(family).filter(c=>c.group==='nave'&&!c.custom && c.rule===c.source)
        .sort((a,b)=>a.offsets.length-b.offsets.length);
      if(!ships.length)return;
      item=ships[pick(Math.min(ships.length,3))];
      center=chooseTarget(match,other,pick);if(center===undefined)return;
      const {delta}=shipMotion(item.rule,item.id);
      const stride=Math.max(Math.abs(delta[0]),Math.abs(delta[1]),Math.abs(delta[0]+delta[1]));
      resolver=raidResolvers[bot.raidIndex++%raidResolvers.length];ballot=ballots[pick(ballots.length)];
      for(let i=0;i<8;i++){
        rotation=pick(6);
        const gap=Math.ceil((3+pick(4))/stride),lane=pick(3)-1;
        const shifted=item.offsets.map(([q,r])=>[q-gap*delta[0]+lane,r-gap*delta[1]]);
        ids=patchForStamp({graph:match.graph},center,rotation,shifted);
        if(ids&&match.canStamp(owner,item.rule,resolver,ids,ballot,item.sense))break;
        ids=null;
      }
    } else {
      const available=[...new Set(known.map(card=>card.rule))],family=available[bot.family++%available.length];
      let pool=bot.decision%4===1?known:known.filter(card=>card.rule===family);
      if(rescue || bot.learned.length || adaptive && stats[owner].orders && match.economy.stableEnergy>0){
        if(match.gen-bot.pricedAt>=48){
          const p=match.players[owner];
          const priced=rankCards(known,match.economy,{reserve:p.reserve,mature:p.mature});
          // Shortest measured payback proposes cheap producers even after
          // saturation has made the once-profitable grower consume cash.
          bot.prices=priced.sort((a,b)=>a.payback===b.payback?0:(a.payback??Infinity)-(b.payback??Infinity));
          bot.pricedAt=match.gen;
        }
        const preferred=bot.prices.filter(q=>q.card.rule===family && q.flow>0);
        if(rescue){
          const profitable=bot.prices.filter(q=>q.flow>0 && q.cost<=match.players[owner].reserve);
          const heads=new Map();
          for(const q of profitable)if(!heads.has(q.card.rule))heads.set(q.card.rule,q);
          const alternatives=[...heads.values(),...profitable];
          item=alternatives.find(q=>!bot.recoverySeen.has(q.card.key))?.card;
          if(!item){bot.recoverySeen.clear();item=alternatives[0]?.card;}
        }else{
          pool=bot.decision%4===1||!preferred.length&&bot.decision%7!==0?bot.prices.map(q=>q.card):
            preferred.length?preferred.map(q=>q.card):pool;
        }
      }
      item??=investment(bot,pool);
      if(!item)return;
      const fortify=!rescue&&!item.custom && stats[owner].orders>0 && bot.decision%4===0;
      resolver=fortify?'guard':item.resolver;ballot=item.custom?item.ballot:ballots[pick(ballots.length)];
      const home=fortify?chooseTarget(match,owner,pick):undefined;
      for(let i=0;i<8;i++){
        center=pick(match.graph.n);rotation=pick(6);
        if(home!==undefined && i<4){
          const near=patchForStamp({graph:match.graph},home,rotation,[[3+pick(4),0]]);
          if(near)center=near[0];
        }
        if(match.graph.deg[center]!==6)continue;
        ids=patchForStamp({graph:match.graph},center,rotation,item.offsets);
        if(ids&&match.canStamp(owner,item.rule,resolver,ids,ballot,item.sense)){
          if(!rescue)break;
          const sites=disk(match.graph,center).sites;
          let occupied=0;for(const v of sites)if(match.cells.has(v))occupied++;
          if(!scoped || occupied<scoped.occupied)scoped={sites,occupied,center,ids,rotation};
          if(!occupied)break;
        }
        ids=null;
      }
      if(scoped)({center,ids,rotation}=scoped);
    }
    if(!ids)return;
    const sites=scoped?.sites??disk(match.graph,center).sites;
    if(ids.some(site=>!sites.has(site)))return;
    const hold=match.fork(sites),play=hold.fork();
    if(!play.stamp(owner,item.rule,resolver,ids,ballot,item.sense))return;
    if(rescue){bot.recoverySeen.add(item.key);stats[owner].rescueTrials++;}
    const turns=raid?Math.max(18,horizon):horizon;
    bot.job={hold,play,turns,owner,other,center,ids,rotation,resolver,ballot,item,raid,rescue,t:0,pose:raid?targetPose(match,center):null};
    stats[owner].studied.add(item.rule);stats[owner].trials++;stats[owner].raidTrials+=Number(raid);
  }
  function advance(bot){
    const j=bot.job;if(!j)return;
    const {owner,other,play,hold,item,raid}=j,stat=stats[owner];
    const net=id=>operating(play.players[id])-operating(hold.players[id]);
    if(j.t===j.turns-4){j.ownBase=net(owner);j.enemyBase=net(other);}
    hold.step();play.step();j.t++;stat.work++;
    if(j.t<j.turns)return;
    bot.job=null;
    const gain=id=>play.players[id].reserve-hold.players[id].reserve;
    const flow=id=>(net(id)-(id===owner?j.ownBase:j.enemyBase))/4;
    const own=play.players[owner], lost=hold.players[other].conventional-play.players[other].conventional;
    const harm=-gain(other)-lookahead*flow(other)+lost*match.economy.stampCost;
    const investmentHorizon=adaptive&&stat.orders&&match.economy.stableEnergy>0&&!raid?Math.max(lookahead,Math.min(4*lookahead,own.reserve/Math.max(1,match.economy.stampCost))):lookahead;
    const pay=gain(owner)+investmentHorizon*flow(owner)+(raid?harm:0);
    const cost=j.ids.length*match.stampPrice(j.resolver);
    const confidence=Math.max(-1,Math.min(1,pay/Math.max(1,cost)));
    bot.memory.set(item.key,.5*(bot.memory.get(item.key)??0)+.5*confidence);
    const rejection=own.out||!own.conventional?'extinction':own.refused>hold.players[owner].refused?'unfunded':
      pay<=1e-8?'return':raid&&harm<=1e-8?'target':null;
    onDecision?.({gen:match.gen,owner,key:item.key,ids:j.ids,role:raid?'raid':'farm',pay,cost,flow:flow(owner),
      modeledCash:gain(owner),rejection});
    if(rejection){stat.holds++;stat.raidHolds+=Number(raid);return;}
    bot.ready={owner,gen:match.gen,key:item.key,rule:item.rule,resolver:j.resolver,ballot:j.ballot,sense:item.sense,tool:'stamp',observed:!!item.observed,
      ids:j.ids,site:j.center,rotation:j.rotation,target:raid?other:0,role:raid?'raid':'farm',expected:pay,recovery:j.rescue,pose:j.pose};
    execute(bot);
  }
  function execute(bot){
    const o=bot.ready,stat=stats[o.owner],raid=!!o.target;
    if(raid){
      const recurrence=phaseWindow?targetPose(match,o.site)===o.pose:match.cells.get(o.site)?.owner===o.target;
      if(!recurrence && match.gen<o.gen+phaseWindow && !match.players[o.target].out)return;
      if(!recurrence){bot.ready=null;stat.invalidated++;stat.raidInvalid++;return;}
    }
    bot.ready=null;
    if(match.gen-bot.lastBuy<interval || !match.canStamp(o.owner,o.rule,o.resolver,o.ids,o.ballot,o.sense)){
      stat.invalidated++;stat.raidInvalid+=Number(raid);return;
    }
    beforeOrder?.(o);
    if(!match.stamp(o.owner,o.rule,o.resolver,o.ids,o.ballot,o.sense))return;
    invalidateForecasts();
    bot.lastBuy=match.gen;bot.recoverySeen.clear();stat.rescueOrders+=Number(o.recovery);stat.first??=match.gen;stat.last=match.gen;
    stat.delayed+=Number(match.gen>o.gen);o.gen=match.gen;
    stat.orders++;stat.raids+=Number(raid);stat.bought.add(o.rule);stat.expected+=o.expected;
    stat.capturedOrders+=Number(o.observed);
    onOrder?.(o);
  }
  let cursor=0,last=-1;
  function turn(){
    if(last===match.gen||!captains.length)return;
    last=match.gen;
    if(match.actionRevision!==revision)invalidateForecasts();
    for(const b of captains)if(b.ready&&!match.players[b.owner].out)execute(b);
    for(let n=0;n<budget;n++){
      const bot=captains[cursor++%captains.length];
      if(match.players[bot.owner].out){bot.job=null;continue;}
      if(field?.work(bot))continue;
      if(bot.ready)continue;
      if(!bot.job && match.gen>=bot.next){
        bot.next=match.gen+Math.max(2,Math.ceil(interval/3));propose(bot);
      }
      if(bot.job)advance(bot);
    }
  }
  return {turn,stats};
}
