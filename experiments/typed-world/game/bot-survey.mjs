// Reproduction: node experiments/typed-world/game/bot-survey.mjs holdout
// Each policy/seed has the same arena and paid openings in the no-order control.
// Owner 1 holds in both arms. The other five buy and use field tools in the live arm.
import assert from 'node:assert/strict';
import {buildSphere} from '../../../src/world/sphere.js';
import {createGameMatch,gameEconomies} from './match.mjs';
import {createGameBots} from './bots.mjs';

const [split='holdout',limit='512',frequency='32',work='4',projection='48',forecast='16',window='18',adaptive='1',filter='',variable='',rescue='1']=process.argv.slice(2);
const rates=variable?Object.fromEntries(['stableAfter','stableEnergy','stampCost','birthCost'].map((k,i)=>[k,Number(variable.split(',')[i])])):{};
const seeds={tune:[7,41,109],validation:[577,1723,4733,8221],holdout:[991,1933,3011,4289],endurance:[953,2933],'tariff-holdout':[15013,18181,20047,24763],'tariff-final':[30119,31481,32707,34847]}[split];
assert(seeds);
const graph=buildSphere(+frequency);
const fields='split seed F horizon budget lookahead forecast phaseWindow adaptive rescue policy arm gen winner buyers purchases firstBuy medianFirst medianGap longestGap raids raidTrials raidHolds raidInvalid delayed rescueTrials rescueOrders eraseOrders erasedCells captures capturedOrders participants triedRules boughtRules holds invalidated work liveBots humanOutAt peakWorld meanCash meanIncome meanField matureIncome birthIncome deathIncome births deaths cuts paidFamilies paidResolvers idleCashLead idleFieldLead raidAuditGen raidAuditCashGain raidAuditTargetCells raidAuditCuts'.split(' ');
const median=arr=>arr.length?[...arr].sort((a,b)=>a-b)[Math.floor(arr.length/2)]:null;
const rounded=n=>+n.toFixed(2);
function run(seed,policy,arm,stop=+limit){
  const game=createGameMatch({graph,seed,policy,economy:rates}),m=game.match,events=[];
  let receipt,checked;
  const bots=createGameBots(m,{seed,budget:+work,lookahead:+projection,horizon:+forecast,phaseWindow:+window,adaptive:!!+adaptive,recoveryOwners:+rescue?[2,3,4,5,6]:[],owners:arm==='hold'?[]:[2,3,4,5,6],
    beforeOrder:o=>{if(o.target&&!checked)receipt=m.fork();},
    onOrder:o=>{
      events.push(o);
      if(!receipt)return;
      const paid=m.fork();
      for(let t=0;t<48;t++){paid.step();receipt.step();}
      const delta=(id,k)=>paid.players[id][k]-receipt.players[id][k];
      checked={raidAuditGen:m.gen,raidAuditCashGain:rounded(delta(o.owner,'reserve')-delta(o.target,'reserve')),
        raidAuditTargetCells:delta(o.target,'conventional'),raidAuditCuts:delta(o.owner,'erased')};
      receipt=null;
    }});
  let peak=m.cells.size;
  while(m.gen<stop && game.outcome===null){
    game.step();if(game.outcome===null)bots.turn();peak=Math.max(peak,m.cells.size);
  }
  const stats=bots.stats.slice(2),players=m.players.slice(2),purchases=events.filter(o=>o.tool!=='eraser');
  const sum=(items,fn)=>items.reduce((n,x)=>n+fn(x),0);
  const mean=key=>rounded(sum(players,x=>x[key])/players.length);
  const gaps=[],silent=[];
  for(let owner=2;owner<=6;owner++){
    const orders=purchases.filter(x=>x.owner===owner).map(x=>x.gen);
    for(let i=1;i<orders.length;i++)gaps.push(orders[i]-orders[i-1]);
    const clock=[0,...orders,game.eliminatedAt[owner]??m.gen];
    for(let i=1;i<clock.length;i++)silent.push(clock[i]-clock[i-1]);
  }
  return {split,seed,F:+frequency,horizon:+limit,budget:+work,lookahead:+projection,forecast:+forecast,phaseWindow:+window,adaptive:+adaptive,rescue:+rescue,policy,arm,gen:m.gen,
    winner:game.outcome??'open',buyers:stats.filter(s=>s.orders).length,purchases:purchases.length,firstBuy:purchases[0]?.gen??'',medianFirst:median(stats.map(s=>s.first).filter(x=>x!==null))??'',
    medianGap:median(gaps)??'',longestGap:Math.max(...silent),raids:sum(stats,s=>s.raids),raidTrials:sum(stats,s=>s.raidTrials),raidHolds:sum(stats,s=>s.raidHolds),raidInvalid:sum(stats,s=>s.raidInvalid),delayed:sum(stats,s=>s.delayed),rescueTrials:sum(stats,s=>s.rescueTrials),rescueOrders:sum(stats,s=>s.rescueOrders),participants:stats.filter(s=>s.raids).length,
    eraseOrders:sum(stats,s=>s.eraseOrders),erasedCells:sum(stats,s=>s.erasedCells),captures:sum(stats,s=>s.captures),capturedOrders:sum(stats,s=>s.capturedOrders),
    triedRules:new Set(stats.flatMap(s=>[...s.studied])).size,boughtRules:new Set(purchases.map(o=>o.rule)).size,
    holds:sum(stats,s=>s.holds),invalidated:sum(stats,s=>s.invalidated),work:sum(stats,s=>s.work),
    liveBots:game.alive.slice(2).filter(Boolean).length,humanOutAt:game.eliminatedAt[1]??'',peakWorld:peak,meanCash:mean('reserve'),meanIncome:mean('income'),meanField:mean('conventional'),
    matureIncome:rounded(sum(players,p=>p.matureIncome)),birthIncome:rounded(sum(players,p=>p.birthIncome)),deathIncome:rounded(sum(players,p=>p.deathIncome)),
    paidFamilies:[...new Set(purchases.map(o=>o.rule))].sort().join('+'),paidResolvers:[...new Set(purchases.map(o=>o.resolver))].sort().join('+'),births:sum(players,p=>p.births),deaths:sum(players,p=>p.deaths),cuts:sum(players,p=>p.erased),...checked,cash:players.map(p=>p.reserve),field:players.map(p=>p.conventional)};
}
console.log(fields.join(','));
for(const policy of (filter?[filter]:Object.keys(gameEconomies)))for(const seed of seeds){
  const live=run(seed,policy,'learn'),hold=run(seed,policy,'hold',live.gen);
  for(const row of [hold,live]){
    // Stop the no-order control at the same real generation as its live peer.
    row.idleCashLead=row.gen===hold.gen?row.cash.filter((n,i)=>n>hold.cash[i]+1e-7).length:'';
    row.idleFieldLead=row.gen===hold.gen?row.field.filter((n,i)=>n>hold.field[i]).length:'';
    console.log(fields.map(k=>row[k]).join(','));
  }
}
