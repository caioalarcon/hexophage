// Paired cold starts. Import only the old planner for the bot A/B; the sphere,
// public observations, wallet settlement, and placement rules stay identical.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildSphere} from '../../src/world/sphere.js';
import {resolveRuleProfile} from '../../src/match/rule-profiles.js';
import {STABILITY_ECONOMY, ACTIVITY_ECONOMY} from '../../src/match/constructive-economy.js';
import {createHeadlessMatch} from '../../src/match/headless.js';

const [rule, prices='suggested', controller='new', f='32', limit='8192', seed='19271', audit='0']=process.argv.slice(2);
const F=Number(f), graph=buildSphere(F), events=[];
const economy=prices==='suggested'?resolveRuleProfile(rule).economy:rule==='bays'?ACTIVITY_ECONOMY:STABILITY_ECONOMY;
const createStrategy=controller==='old'?(await import(pathToFileURL(resolve(process.env.HEX_OLD_CHECKOUT,'src/bots/brain/strategy.js')))).createThinkingStrategy:undefined;
const match=createHeadlessMatch(graph,{rule,economy,conflict:'lineage',growth:'classic',botMode:'learn',
  brain:{seed:Number(seed),createStrategy,onPlacement:order=>events.push({...order,ids:[...order.ids]})}});
const {world,game}=match;
game.players[0].out=true;
let peak=0, firstLoss=null;
while (world.gen<Number(limit) && !game.ended) {
  match.nextTick();
  peak=Math.max(peak,world.activeCount);
  if(firstLoss===null && game.players.slice(1).some(p=>p.out)) firstLoss=world.gen;
}
const bots=game.players.slice(1), aimed=events.filter(o=>o.rival), metrics=game.brainMetrics??{};
const counts=Object.fromEntries(Object.entries(metrics).filter(([,v])=>typeof v==='number'));
const result={rule,prices,controller,F,seed:+seed,horizon:+limit,gen:world.gen,bought:events.length,aimed:aimed.length,
  firstOrder:events[0]?.gen??null,firstAttack:aimed[0]?.gen??null,buyers:new Set(events.map(o=>o.owner)).size,
  targetOwners:new Set(aimed.map(o=>o.rival)).size,firstLoss,eliminated:bots.filter(p=>p.out).length,
  winner:game.winner,field:world.activeCount,peak,solventEmpty:bots.filter(p=>!p.out&&!world.ownerCells[p.id].length).length,
  tribute:+bots.reduce((s,p)=>s+p.tributePaid,0).toFixed(2),refused:bots.reduce((s,p)=>s+p.unfundedBirths,0),
  budget:game.init,wallets:+bots.reduce((s,p)=>s+p.reserve,0).toFixed(2),metrics:counts};
if(+audit){result.orders=events; result.finalLedger=bots.map(p=>[p.id,p.reserve,p.totalBirths,p.totalDeaths,p.stamps,world.ownerCells[p.id].length]);result.economy=game.economy;}
console.log(JSON.stringify(result));
