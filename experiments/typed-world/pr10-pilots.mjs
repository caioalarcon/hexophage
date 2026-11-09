import {prepareArena} from './arena.mjs';
import {createTacticalDuel,tacticalRules} from './pr10-controller.mjs';

const profiles=['contact','typed'];
const headers='seed F horizon jade copper gen outcome purchasesJ purchasesC raidsJ raidsC nativeRulesJ nativeRulesC phaseJ phaseC guardJ guardC antiJ antiC vetoJ vetoC completed comparisons phaseTrials forecasts memories fieldJ fieldC cashJ cashC killsJ killsC wavesJ wavesC'.split(' ');

function game(seed,F,horizon,a,b,rules){
  const {match:m}=prepareArena({scene:'arena',F,seed,bank:2400});
  const {channels,books,turn}=createTacticalDuel(m,seed,[a,b],{rules});
  let outcome='open';
  while(m.gen<horizon){
    const previous=m.cells, prior=m.players.map(p=>p&&{...p});
    m.step();
    const live=[false,false,false];
    for(const c of m.cells.values())if(!c.wave)live[c.owner]=true;
    if(!live[1]||!live[2]){outcome=live[1]?'jade':live[2]?'copper':'draw';break;}
    turn(previous,prior);
  }
  const both=fn=>[fn(1),fn(2)];
  const metric=k=>channels.reduce((s,c)=>s+c.bot.metrics[k],0);
  return [seed,F,horizon,a,b,m.gen,outcome,...both(id=>books[id].orders-1),...both(id=>books[id].raids),
    ...both(id=>[...books[id].rules].sort().join('+') || '-'),
    ...['phase','guard','antimatter'].flatMap(k=>both(id=>books[id].resolvers[k]??0)),...both(id=>books[id].veto),
    ...['completed','comparisons','phaseTrials','forecasts'].map(metric),channels.reduce((s,c)=>s+c.g.brainMemory.stats().observations,0),
    ...both(id=>m.players[id].field),...both(id=>m.players[id].reserve.toFixed(2)),
    ...both(id=>m.players[id].erased),...both(id=>m.players[id].detonations)].join(',');
}

const [seeds='7,41,109,1549,953,2933,6389,10487,577,1723,4733,8221',freq='16,32',horizon='4096',catalogs='4']=process.argv.slice(2);
console.log(headers.join(','));
for(const F of freq.split(',').map(Number))for(const seed of seeds.split(',').map(Number))for(const a of profiles)
  console.log(game(seed,F,Number(horizon),a,profiles.find(p=>p!==a),tacticalRules.slice(0,Number(catalogs))));
