// Reproduce both unusual seats of the original F48 / seed 991 stress case.
// The paid/hold continuations are invisible to all real planning decisions.
import {createGameMatch} from './match.mjs';
import {createGameBots} from './bots.mjs';
import {atlasCards,rankCards} from './atlas-model.mjs';
import {disk} from '../pilots.mjs';
import {patchForStamp} from '../../../src/patterns/spherical-patch.js';

const treatment=process.argv[2]??'off';
const seed=991,g=createGameMatch({F:48,seed}),m=g.match,choices=[],orders=[];
let holdRaid,paidRaid,missed,closures;
const b=createGameBots(m,{seed,recoveryOwners:treatment==='off'?[]:treatment==='seat2'?[2]:[2,3,4,5,6],onDecision:o=>{if([2,5].includes(o.owner)){
    const {ids,...trial}=o,occupied=ids.filter(v=>m.cells.has(v)).length;let hostileNeighbors=0;
    for(const v of ids)for(let d=0;d<m.graph.deg[v];d++){
      const c=m.cells.get(m.graph.adj[6*v+d]);if(c && c.owner!==o.owner)hostileNeighbors++;
    }
    choices.push({...trial,occupied,hostileNeighbors,reserve:m.players[o.owner].reserve});
  }},
  beforeOrder:o=>{if(o.gen===63&&o.owner===6&&o.target===5)holdRaid=m.fork();},
  onOrder:o=>{orders.push({owner:o.owner,gen:o.gen,key:o.key,role:o.role,target:o.target});if(holdRaid&&!paidRaid)paidRaid=m.fork();}
});
const net=p=>p.income-p.birthSpent-p.eraseSpent-p.friendlyEraseSpent;
function alternatives(owner){
  const p=m.players[owner],all=rankCards(atlasCards,m.economy,{reserve:p.reserve,mature:p.mature});
  const pool=all.filter(q=>q.feasible&&q.flow>0).sort((a,b)=>a.payback-b.payback).slice(0,16);
  let center;
  for(let k=0;k<m.graph.n;k++){
    const id=(m.graph.farthest+k)%m.graph.n;
    if(m.graph.deg[id]===6&&m.graph.distance[id]>=4&&![...disk(m.graph,id).sites].some(x=>m.cells.has(x))){center=id;break;}
  }
  if(center===undefined)throw Error('No empty control disk');
  const base=m.fork(disk(m.graph,center).sites), scans=[];
  for(const {card} of pool){
    const ids=patchForStamp({graph:m.graph},center,0,card.offsets),wait=base.fork(),plant=base.fork();
    if(!ids||!plant.stamp(owner,card.rule,'contact',ids))continue;
    let from;
    for(let n=0;n<16;n++){if(n===12)from=net(plant.players[owner])-net(wait.players[owner]);plant.step();wait.step();}
    const flow=(net(plant.players[owner])-net(wait.players[owner])-from)/4;
    const cash=plant.players[owner].reserve-wait.players[owner].reserve;
    const h=Math.max(48,Math.min(192,plant.players[owner].reserve/8));
    scans.push({card,ids,cash,flow,pay:cash+h*flow,risky:plant.players[owner].refused>wait.players[owner].refused});
  }
  scans.sort((a,b)=>b.pay-a.pay);
  const best=scans.find(s=>!s.risky), action=m.fork(), hold=m.fork();
  if(!action.stamp(owner,best.card.rule,'contact',best.ids))throw Error('Invalid replay');
  for(let n=0;n<128;n++){action.step();hold.step();}
  return {gen:m.gen,reserve:p.reserve,mature:p.mature,conventional:p.conventional,site:center,
    evaluated:scans.length,positive:scans.filter(s=>s.pay>0&&!s.risky).length,
    best:best.card.key,predicted:best.pay,observedCash128:action.players[owner].reserve-hold.players[owner].reserve,
    observedField128:action.players[owner].conventional-hold.players[owner].conventional};
}
while(m.gen<512&&g.outcome===null){
  g.step();if(g.outcome===null)b.turn();
  if(m.gen===256)missed=alternatives(2);
  if(m.gen===75&&holdRaid&&paidRaid){
    while(holdRaid.gen<75){holdRaid.step();paidRaid.step();}
    closures={gen:75,victim:5,paid:paidRaid.players[5].conventional,hold:holdRaid.players[5].conventional};
  }
}
console.log(JSON.stringify({choices,orders,closures,missed,
  seats:[2,5].map(id=>({id,eliminatedAt:g.eliminatedAt[id],cash:m.players[id].reserve,field:m.players[id].conventional,
    ...b.stats[id],studied:[...b.stats[id].studied],bought:[...b.stats[id].bought]}))},null,2));
