// A research ledger independent of physical evolution. Owners are zero-indexed
// in these arrays. 'units' may be the fractional share of a multi-owner death.
export function chargeStamp(book, owner, price, fractionHeld = 0) {
  if (!(price >= 0 && book.cash[owner] >= price && fractionHeld >= 0 && fractionHeld <= 1)) {
    throw Error('Unfunded stamp or invalid holdback');
  }
  const cash = [...book.cash], escrow = [...book.escrow];
  cash[owner] -= price;
  escrow[owner] += price * fractionHeld;
  return {cash, escrow};
}

export function settle(book, claims, tariff, mode) {
  if (mode === 'indemnity') {
    return settle(book,claims.map(({from,to,units})=>({from:to,to:from,units})),tariff,'transfer');
  }
  if (!['none', 'bounty', 'transfer', 'salvage'].includes(mode)) throw Error('Unknown mode');
  const cash = [...book.cash], escrow = [...book.escrow];
  if (cash.length !== escrow.length || !(tariff >= 0 && Number.isFinite(tariff))
      || [...cash,...escrow].some(x=>x < 0 || !Number.isFinite(x))) throw Error('Invalid opening ledger');
  const weights=cash.map(()=>cash.map(()=>0)), taken=cash.map(()=>0), received=cash.map(()=>0);
  for (const {from,to,units} of claims) {
    if (from === to || !Number.isInteger(from) || !Number.isInteger(to)
      || cash[from] === undefined || cash[to] === undefined || !(units > 0 && Number.isFinite(units))) {
      throw Error('Expected distinct solvent owners and positive causal shares');
    }
    weights[from][to]+=units;
  }
  const budget = mode === 'salvage' ? book.escrow : book.cash;
  for(let from=0;from<cash.length;from++) {
    let unitsLeft=weights[from].reduce((a,b)=>a+b,0);
    const due=tariff*unitsLeft;
    const authorized=mode==='bounty' ? due : mode==='none' ? 0 : Math.min(due,budget[from]);
    if(mode!=='bounty')taken[from]=authorized;
    let left=authorized;
    for(let to=0;to<cash.length;to++){
      const units=weights[from][to];
      if(!units)continue;
      // Settle the residual to the last creditor. Single-destination claims
      // transfer the capped amount itself, even when the ratio is inexact.
      const amount=units>=unitsLeft ? left : left*(units/unitsLeft);
      received[to]+=amount;
      unitsLeft-=units;left-=amount;
    }
  }
  for (let i=0; i<cash.length; i++) {
    cash[i] += received[i] - (mode === 'transfer' ? taken[i] : 0);
    if(mode === 'salvage') escrow[i] -= taken[i];
  }
  return {cash, escrow, received, taken, minted:mode==='bounty' ? received.reduce((a,b)=>a+b,0) : 0};
}

export function duelClaims(direct) {
  return direct.flatMap((units,from)=>units ? [{from,to:1-from,units}] : []);
}
