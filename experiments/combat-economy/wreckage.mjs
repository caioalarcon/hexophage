// One unit has already been paid on entry into the field by every eligible
// cell in this experiment. Half may later be recovered at its death site.
export function wreckage(fraction = 0.5) {
  if (!(fraction >= 0 && fraction <= 1)) throw Error('Recovery fraction must be between zero and one');
  const sites=new Map(), recovered=new Map();
  let deposited=0, claimed=0, returned=0;
  function deposit(id, owner, paid) {
    if (!Number.isFinite(paid) || paid < 0) throw Error('Invalid prepaid cost');
    const amount=fraction*paid;
    if (!amount || owner < 1 || owner > 6) return;
    const amounts=sites.get(id)??new Map();
    amounts.set(owner,(amounts.get(owner)??0)+amount);
    sites.set(id,amounts); deposited+=amount;
  }
  function birth(id, owner) {
    if(owner<1 || owner>6 || !sites.has(id))return 0;
    const amounts=sites.get(id);
    const total=[...amounts.values()].reduce((a,b)=>a+b,0);
    recovered.set(owner,(recovered.get(owner)??0)+total);
    returned+=amounts.get(owner)??0;
    claimed+=total; sites.delete(id);
    return total;
  }
  function report() {
    return {deposited,claimed,returned,looted:claimed-returned,outstanding:deposited-claimed,sites:sites.size,
      byOwner:Object.fromEntries(recovered)};
  }
  return {deposit,birth,report};
}
