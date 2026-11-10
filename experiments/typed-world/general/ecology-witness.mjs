// Replay and independently count genuine strict ecology-majority wins.
import assert from 'node:assert/strict';
import {buildSphere} from '../../../src/world/sphere.js';
import {explainContest} from '../arbitration.mjs';
import {prepareEcologyWitness} from './ecology-replay.mjs';

const graph=buildSphere(32),live=m=>[...new Set([...m.cells.values()].map(c=>c.rule))].sort();
const {match,orders,anchor}=prepareEcologyWitness(graph);
assert.equal(match.gen,10);assert.equal(live(match).length,9);
let event;
match.step({onContest(e){if(e.site===anchor)event=e;}});
assert.equal(live(match).length,9);
assert(event?.cycle);assert.equal(event.claims.length,3);
const triangle=['bays245','andreen','highhex'];
const audit=explainContest('ecology',event),pairs=[];
for(let i=0;i<3;i++){
  const a=event.claims.find(c=>c.rule===triangle[i]),b=event.claims.find(c=>c.rule===triangle[(i+1)%3]);
  const keys=['support','age','robustness'],forA=keys.filter(k=>a[k]>b[k]),forB=keys.filter(k=>a[k]<b[k]);
  assert.equal(forA.length,2);assert.equal(forB.length,1);
  pairs.push({winner:a.rule,loser:b.rule,for:forA,against:forB});
}
assert.equal(match.cells.get(anchor).rule,event.winner.rule);
console.log(JSON.stringify({F:32,seed:632,bank:16000,liveRulesAtG11:live(match),legalPaidOrders:orders.length,
  scheduledOrders:orders.map(({ids,...o})=>({...o,cells:ids.length})),event,pairs,round:audit.rounds[0],cash:match.players[1].reserve},null,2));
