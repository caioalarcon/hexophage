// Replay fixed, funded physical traces; funding the economic experiment itself
// must not preempt the collision we are trying to compare.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chargeStamp,duelClaims,settle} from './payoffs.mjs';
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url)));
const contacts=read('./contacts.json'), traps=read('./recurring-contact.json');
const horizon=200*60*120;
const fees=[.25,1,2.5,5,10,20,60], share=.25, stampCost=10;
const sum=ns=>ns.reduce((a,b)=>a+b,0);
function clearTrace(row,tariff,liquid,mode){
  // Strip away base flow while comparing prices on an identical named trace.
  // The given liquid balance is *after* paying both stamps.
  let book={cash:row.seedCells.map(v=>v*stampCost+liquid),escrow:[0,0]};
  for(let i=0;i<2;i++)book=chargeStamp(book,i,row.seedCells[i]*stampCost,mode==='salvage'?share:0);
  const moved=[0,0], collected=[0,0];
  for(const frame of row.frames){
    const claims=duelClaims(frame.direct);
    if(!claims.length)continue;
    book=settle(book,claims,tariff,mode);
    for(let i=0;i<2;i++){moved[i]+=book.taken[i];collected[i]+=book.received[i];}
  }
  return {delta:book.cash.map(v=>v-liquid),moved,collected,leftInEscrow:book.escrow};
}
const named=contacts.named.map(row=>({
  name:row.name,seedCells:row.seedCells,directVictims:row.direct,directStamped:row.directStamped,
  controls:[0,100].flatMap(openCash=>['bounty','transfer','indemnity','salvage'].map(mode=>({
    openCash,mode,...clearTrace(row,2.5,openCash,mode)
  })))
}));
const terminal=contacts.sweep.map(r=>r.direct),shot=6*stampCost;
const sweep=fees.map(tariff=>{
  const net=terminal.map(([a,d])=>tariff*(d-a)),gross=terminal.map(([,d])=>tariff*d);
  return {tariff,transferPositive:net.filter(v=>v>0).length,recoupShotTransfer:net.filter(v=>v>=shot).length,
    recoupShotMinted:gross.filter(v=>v>=shot).length,maxTransfer:Math.max(...net),maxMinted:Math.max(...gross)};
});
const swept={trajectories:terminal.length,disrupted:contacts.sweep.filter(r=>r.altered!==null).length,
  totalDirectVictims:[0,1].map(i=>sum(terminal.map(x=>x[i]))),
  totalStampedVictims:[0,1].map(i=>sum(contacts.sweep.map(x=>x.directStamped[i]))),
  richestNet:contacts.sweep.reduce((a,b)=>b.direct[1]-b.direct[0]>a.direct[1]-a.direct[0]?b:a)};
function sumPeriods(fight,metric,i) {
  const {frames,start,period}=fight,n=horizon-start;
  const pre=frames.slice(0,start),cycle=frames.slice(start,start+period),extra=cycle.slice(0,n%period);
  const total=ps=>sum(ps.map(f=>f[metric][i]));
  return total(pre)+Math.floor(n/period)*total(cycle)+total(extra);
}
const recurring=traps.map(({fight:f})=>{
  const direct2h=[0,1].map(i=>sumPeriods(f,'direct',i));
  const blocked2h=[0,1].map(i=>sumPeriods(f,'blocked',i));
  const aggregate=direct2h.map((v,i)=>sumPeriods(f,'stable',i)-sumPeriods(f,'births',i));
  assert(f.direct.includes(0));
  const events=f.frames.flatMap(frame=>frame.victimAges.flatMap((ages,i)=>ages.map(age=>({g:frame.g,i,age}))));
  const directStamped=events.filter(e=>e.g===e.age && e.g<=f.start+f.period);
  const s={id:[f.first,f.second],stampEnergy:f.stampCells.map(c=>10*c),period:f.period,prelude:f.start,direct:f.direct,
    victimsAgesInVerifiedCycle:f.frames.slice(f.start+f.period).flatMap(frame=>frame.victimAges.flat()),
    direct2h,jointInverseOperatingEnergy:aggregate,blocked:f.blocked,blocked2h,
    blockingUnderFeeOne:{minted:sum(blocked2h),netPerSecondFirstInSteadyCycle:200*(f.blocked[1]-f.blocked[0])/f.period},
    results:[]};
  for(const tariff of [1,2.5,10]){
    const issued=direct2h.map(n=>n*tariff);
    const escrow=s.stampEnergy.map(v=>v*share);
    // All three measured loops have strictly unidirectional qualifying deaths
    // in their steady phase; store possible mixed opening effects explicitly.
    const cash0=100;let liquid={cash:[cash0,cash0],escrow:[0,0]}, funded={cash:[cash0,cash0],escrow:[0,0]};
    let fromLiquid=[0,0];
    // Compute the exact dues on the opening + two full cycles and check that
    // repeating the steady cycle leaves ample cash to pay all future claims.
    for(const frame of f.frames){
      const claims=duelClaims(frame.direct);
      const liq=settle(liquid,claims,tariff,'transfer');
      for(let i=0;i<2;i++){fromLiquid[i]+=liq.taken[i];}
      liquid=liq;
      const delta=frame.stable.map((v,i)=>v-frame.births[i]);
      funded={cash:funded.cash.map((v,i)=>v+delta[i]),escrow:[0,0]};
      assert(funded.cash.every(v=>v>=0));
      const invRow=settle(funded,claims,tariff,'transfer');
      for(let i=0;i<2;i++){assert(invRow.taken[i]===frame.direct[i]*tariff);}
      funded=invRow;
    }
    assert(f.base.every((net,i)=>-net-tariff*f.direct[i]+tariff*f.direct[1-i]>=0));
    for(let i=0;i<2;i++)if(f.direct[i]){
      const dueAfterObserved=issued[i]-tariff*sum(f.frames.map(frame=>frame.direct[i]));
      fromLiquid[i]+=Math.min(dueAfterObserved,liquid.cash[i]);
    }
    s.results.push({tariff,unitsMinted:sum(issued),paidFromClosed100Wallet:fromLiquid,
      paidWithInverseOperatingFlows:issued,atMostFromPooledStampEscrow:issued.map((v,i)=>Math.min(v,escrow[i])),
      maximumRecoveryFromEachLife:{shippingEconomy:directStamped.length*stampCost*share,
        invertedUnitBirthCost:(sum(direct2h)+(stampCost-1)*directStamped.length)*share}});
  }
  return s;
});
const output={generationRate:200,horizon,liquidReserveForNamed:100,stampCost,escrowShare:share,named,swept,sweep,recurring};
writeFileSync(new URL('./payoff-study.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
