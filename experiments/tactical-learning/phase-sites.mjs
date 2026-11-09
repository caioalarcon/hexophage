// Freeze the real starting state of a chosen tactical pair, then repeat the
// identical paid stamp at each sampled phase on the full sphere, without
// subsequent orders. All eligible delayed attacks in a run are reported.
import assert from 'node:assert/strict';
import {buildSphere} from '../../src/world/sphere.js';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {ACTIVITY_ECONOMY} from '../../src/match/constructive-economy.js';
import {recognizes, witness} from '../../src/bots/brain/proposals.js';
import {phaseAt} from '../../src/bots/brain/scout.js';
import {resolveRuleProfile} from '../../src/match/rule-profiles.js';
import {createStampCommands} from '../../src/match/stamping.js';
import {createPopulation} from '../../src/simulation/population.js';
import {advanceGeneration} from '../../src/simulation/generation.js';
import {gameEconomyTick} from '../../src/match/biomass.js';
import {finishIfDecided} from '../../src/match/outcome.js';

const [seed='4751',F='40',limit='32768',rule='ashley15',tariff='activity',figureAt,figurePath]=process.argv.slice(2);
const graph=buildSphere(+F), orders=[], choices=[];
const economy=tariff==='suggested'?resolveRuleProfile(rule).economy : ACTIVITY_ECONOMY;
const match=createHeadlessMatch(graph,{rule, botMode:'learn', economy,
  brain:{seed:+seed,onPlacement:o=>orders.push(o),onComparison:c=>choices.push(c)}});
match.game.players[0].out=true;
while(match.world.gen<+limit&&!match.game.ended)match.nextTick();
const raids=orders.filter(o=>o.rival), later=raids.filter(o=>o.phaseOffset>0);
const summary={rule,tariff,F:+F,seed:+seed,gen:match.world.gen,orders:orders.length,raids:raids.length,
  later:later.length,phaseEvaluations:match.game.brainMetrics.phaseTrials,compared:match.game.brainMetrics.comparisons,
  boughtOffSlot:match.game.brainMetrics.offSlotAttacks,visits:match.game.brainMetrics.visits,verified:0,relocated:0};
console.log('tariff,rule,F,seed,proposedGen,paidGen,owner,targetOwner,stamp,center,heading,phaseOffset,immediateApproved,immediateBid,delayedBid,horizon,ownReserveDelta,targetReserveDelta,relativeReserveDelta,targetFieldDelta,immediateBoundary,immediateOwnCash,immediateTargetCash,immediateOwnFlow,immediateTargetFlow,immediateTargetCells,delayedBoundary,delayedOwnCash,delayedTargetCash,delayedOwnFlow,delayedTargetFlow,delayedTargetCells');
const stop=16384;
function fork(base){
  const {graph,physics,...rest}=base.world;
  const world={...structuredClone(rest),graph,physics};
  const game={...base.game,players:structuredClone(base.game.players),recentBirthSites:null};
  const cells=createPopulation(world,{});
  return {world,game,stamp:createStampCommands(world,game,cells.addLive,{}),step(){
    if(!game.ended){advanceGeneration(world);gameEconomyTick(world,game,cells.removeLive,alive=>finishIfDecided(game,alive,{}));}
  }};
}
const events=new Map(), captures=new Map(), proofs=new Map();
for(const order of later){
  const c=choices.find(c=>c.owner===order.owner && c.gen<=order.gen && c.alternatives?.some(a=>
    a.at===order.proposedAt && a.center===order.proposedCenter && a.delay===order.phaseOffset && a.turn===order.turn));
  assert(c);
  const earlier=c.alternatives.find(a=>a.at===order.proposedAt&&a.center===order.proposedCenter&&a.turn===order.turn&&!a.delay&&a.stamp===order.stamp);
  const delayed=c.alternatives.find(a=>a.at===order.proposedAt&&a.center===order.proposedCenter&&a.turn===order.turn&&a.delay===order.phaseOffset&&a.stamp===order.stamp);
  assert(earlier&&delayed);
  const at=order.proposedAt+order.phaseOffset;
  const selected=captures.get(at)??[];
  selected.push(order);captures.set(at,selected);
  // The two phase branches change timing at the original site only.
  if(order.proposedCenter!==order.center || order.proposedHeading!==order.heading){summary.relocated++;continue;}
  // Delay must not contain an unrelated intervention, otherwise this is not a
  // comparison of the same position evolving solely under the automaton.
  if(orders.some(o=>o.gen>=order.proposedAt && o.gen<order.proposedAt+order.phaseOffset))continue;
  const entries=events.get(order.proposedAt)??[];
  entries.push({order,earlier,delayed});events.set(order.proposedAt,entries);
}
const noop=new Map([2,3,4,5,6].map(i=>[i,()=>{}]));
const replay=createHeadlessMatch(graph,{rule,economy,strategies:noop});
replay.game.players[0].out=true;
let cursor=0;
function wallet(m,owner){return m.game.players[owner-1].reserve;}
while(replay.world.gen<+limit&&!replay.game.ended) {
  replay.nextTick();
  for(const o of captures.get(replay.world.gen)??[]){
    const pose={center:o.proposedCenter,heading:(o.proposedHeading-o.turn+6)%6};
    proofs.set(o,witness(replay.world,pose,o.witnessRadius,economy.stableAfter,o.witnessHorizon));
  }
  for(const {order,earlier,delayed} of events.get(replay.world.gen)??[]){
    const now=fork(replay), later=fork(replay);
    const figure = figurePath && +figureAt===order.proposedAt
      ? (await import('./phase-figure.mjs')).createPhaseFigure(replay.world,order,figurePath,seed) : null;
    assert(now.stamp.commitStamp(order.owner,order.ids,false));
    figure?.(0,now,later);
    for(let elapsed=1;elapsed<=stop;elapsed++){
      now.step();later.step();
      if(elapsed===order.phaseOffset)assert(later.stamp.commitStamp(order.owner,order.ids,false));
      figure?.(elapsed,now,later);
      if([64,512,4096,stop].includes(elapsed)){
        const own=wallet(later,order.owner)-wallet(now,order.owner),enemy=wallet(later,order.rival)-wallet(now,order.rival);
        console.log([tariff,rule,F,seed,order.proposedAt,order.gen,order.owner,order.rival,order.stamp,order.center,order.heading,
          order.phaseOffset,earlier.approved?1:0,Math.round(earlier.bid),Math.round(delayed.bid),elapsed,
          own.toFixed(3),enemy.toFixed(3),(own-enemy).toFixed(3),
          later.world.ownerCells[order.rival].length-now.world.ownerCells[order.rival].length,
          ...[earlier,delayed].flatMap(p=>[+p.boundary,p.ownCash.toFixed(2),p.rivalCash.toFixed(2),p.ownFlow.toFixed(2),p.rivalFlow.toFixed(2),p.rivalCells])].join(','));
      }
    }
  }
  while(cursor<orders.length && orders[cursor].gen===replay.world.gen){
    const o=orders[cursor++];
    if(o.phaseOffset){
      assert.equal(phaseAt(replay.world,{target:o.target,direction:o.approach}),o.phase);
      assert(recognizes(replay.world,{center:o.center,heading:(o.heading-o.turn+6)%6},proofs.get(o)));
      summary.verified++;
    }
    assert(replay.commitStamp(o.owner,o.ids,false));
  }
}
assert.deepEqual(replay.world.owners,match.world.owners);
assert.deepEqual(replay.game.players.map(p=>p.reserve),match.game.players.map(p=>p.reserve));
assert.equal(summary.verified,later.length);
console.error(JSON.stringify(summary));
