// Live bridge for the two-player experimental arena. The upstream planner owns
// every proposed pattern, pose, site, timing and decision to buy.
import {createThinkingStrategy} from '../../src/bots/brain/strategy.js';
import {createBrainArchive,brainNamespace} from '../../src/bots/brain/memory.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {cashForecast,disk} from './pilots.mjs';
import {resolvers} from './engine.mjs';

export const tacticalRules=['callahan','bays','hex-b2s245','ashley'];

export function createTacticalDuel(m,seed,policies,{rules=tacticalRules,onPlacement}={}) {
  const books=m.players.map(p=>p&&({orders:1,spent:p.stampSpent,lastBuy:0,
    rules:new Set(),resolvers:{},raids:0,veto:0}));
  const channels=[];
  function choose(owner,rule,ids) {
    if(!m.canStamp(owner,rule,'contact',ids))return null;
    if(policies[owner-1]==='contact')return 'contact';
    // Reprice the same fixed geometry against waiting (48 generations), using
    // only a radius-12 observation. Off-disk revenue stays at the observed rate.
    const sites=disk(m.graph,ids[0]).sites;
    if(ids.some(site=>!sites.has(site)))return 'contact';
    const local=m.fork(sites), rival=3-owner;
    const hold=cashForecast(local.fork(),owner,rival,true);
    let best=null, score=hold.value;
    for(const resolver of resolvers) {
      const action=local.fork();
      if(!action.stamp(owner,rule,resolver,ids))continue;
      const quote=cashForecast(action,owner,rival,true);
      if(!quote.risky && quote.value>score+1e-8){score=quote.value;best=resolver;}
    }
    if(!best)books[owner].veto++;
    return best;
  }

  for(const rule of rules) {
    const {world:w,game:g}=createHeadlessMatch(m.graph,{rule,conflict:'lineage',growth:'classic',botMode:'learn',
      economy:{...m.economy,policy:'stability',emptyFieldUpkeep:false,fundBirths:true,combatFee:0},init:m.players[1].reserve+m.players[1].stampSpent});
    // Upstream reserves its first seat for a human. The two live colonies
    // occupy private bot seats 2 and 3 in each rule lens.
    g.players=g.players.slice(0,3);g.players[0].out=true;
    for(let id=1;id<=2;id++)g.players[id].seed=[...m.cells].find(([,c])=>c.owner===id)[0];
    w.cellAges=new Uint32Array(m.graph.n);
    g.brainMemory=createBrainArchive().open(brainNamespace(w,g));
    let paidResolver;
    const receipt=(id,ids)=>{
      const owner=id-1, book=books[owner];
      if(m.gen-book.lastBuy<g.interval)return false;
      const resolver=choose(owner,rule,ids);
      if(!resolver || !m.stamp(owner,rule,resolver,ids))return false;
      paidResolver=resolver;book.lastBuy=m.gen;book.spent=m.players[owner].stampSpent;
      book.orders++;book.rules.add(rule);book.resolvers[resolver]=(book.resolvers[resolver]??0)+1;
      for(const ch of channels){
        ch.bot.recordStamp(ids);
        const player=ch.g.players[owner];
        player.reserve=m.players[owner].reserve;player.stamps=book.orders;player.stampedEnergy=book.spent;
        for(const site of ids) {
          ch.w.cells[site]=1;ch.w.owners[site]=id;ch.w.cellAges[site]=1;
          ch.w.ownerCells[id].push(site);ch.w.active[ch.w.activeCount++]=site;
        }
      }
      return true;
    };
    const bot=createThinkingStrategy(w,g,receipt,{seed,budget:Math.floor(768/rules.length),onPlacement:o=>{
      if(o.rival)books[o.owner-1].raids++;
      onPlacement?.({...o,owner:o.owner-1,rule,resolver:paidResolver});
    }});
    channels.push({w,g,bot});
  }
  function observe(ch,previous,prior) {
    const {w,g}=ch;
    w.gen=m.gen;w.cells.fill(0);w.owners.fill(0);w.next.fill(0);w.cellAges.fill(0);
    for(const field of w.ownerCells)field.length=0;
    w.activeCount=0;
    for(const site of previous.keys())w.next[site]=1;
    const recent=[0,0,0];
    for(const [site,c] of m.cells) {
      const native=c.owner+1;
      w.cells[site]=1;w.owners[site]=native;w.cellAges[site]=c.age;
      w.active[w.activeCount++]=site;w.ownerCells[native].push(site);
      if(c.age===1)g.recentBirthSites[native][recent[c.owner]++%8]=site;
    }
    for(let id=1;id<=2;id++){
      const acct=m.players[id], p=g.players[id], b=books[id];
      const flow=acct.reserve-prior[id].reserve-(acct.salvageIncome-prior[id].salvageIncome);
      Object.assign(p,{out:acct.out,reserve:acct.reserve,stamps:b.orders,stampedEnergy:b.spent,
        lastBirths:acct.births-prior[id].births,totalBirths:acct.births,stable:acct.mature,
        lastUnfundedBirths:acct.refused-prior[id].refused,lastEroded:acct.eroded-prior[id].eroded,
        lastFlow:flow,flowAverage:.8*p.flowAverage+.2*flow});
    }
  }
  return {channels,books,turn(previous,prior) {
    for(const ch of channels)observe(ch,previous,prior);
    const turn=m.gen===1 || m.gen%10===0;
    for(const ch of (m.gen%2?channels:[...channels].reverse())){
      ch.bot.think();
      for(const id of [1,2])if(!m.players[id].out){
        if(turn)ch.bot(ch.g.players[id]);else ch.bot.phaseTurn(ch.g.players[id]);
      }
    }
  }};
}
