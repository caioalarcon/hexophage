// Macroeconomic clock. One step is one physical generation; a player may buy
// as many stamps as its balances allow in that step. No cells or map are built.
export const RATE = 200;
export const HORIZON = 2 * 3600 * RATE;
export const MAP_F320 = 10 * 320 ** 2 + 2;
const WATCH = [1, 5, 15, 30, 60, 90, 120].map(m => m * 60 * RATE);
export const ORDER_LIMIT = 10_000; // Measurement endpoint, never a game rule.
const EPS = 1e-8;

export function fieldQuote(field, cells, price, doubling) {
  if (!doubling) return price * cells;
  // Integrate a marginal price to make a split order cost exactly the
  // original quote. Keep the first three seeded cells affordable.
  const freeBand = Math.max(0, Math.min(cells, 3 - field));
  if (freeBand === cells) return price * cells;
  const k = Math.LN2 / doubling;
  return price * (freeBand + Math.exp(k * Math.max(0, field - 3)) *
    Math.expm1(k * (cells - freeBand)) / k);
}

export function energyQuote(rule, field, cells, orders = 0) {
  const price = rule.energyOrderDoubling ? rule.price * 2 ** (orders / rule.energyOrderDoubling) : rule.price;
  if (rule.massPressureScale) {
    const x = cells / 3, h = field, k = rule.massPressureScale, a = rule.massPressurePower;
    // Integral of 1+(h/k)^a, expanded to avoid subtracting two nearly equal
    // treasury-sized values. The founding 3 cells always cost 3*price.
    const poly = a === 1 ? h+x/2 : a === 2 ? h*h+h*x+x*x/3
      : h*h*h+1.5*h*h*x+h*x*x+x*x*x/4;
    return 3*price*x*(1+poly/k**a)/(1+1/((a+1)*k**a));
  }
  if (rule.massPressureDoubling) {
    const k = Math.LN2 / rule.massPressureDoubling;
    return 3 * price * Math.exp(k * field) * Math.expm1(k * cells / 3) / Math.expm1(k);
  }
  if (rule.orderPressureDoubling) {
    return 3 * price * (cells / 3) ** (1 + (rule.sizePower || 0)) * 2 ** (field / rule.orderPressureDoubling);
  }
  if (rule.sizeDoubling) return fieldQuote(0, cells, price, rule.sizeDoubling);
  return fieldQuote(field, cells, price, rule.fieldDoubling);
}

export function manaQuote(rule, orders) {
  if (!rule.manaInterval) return 0;
  return rule.orderDoubling ? 2 ** (orders / rule.orderDoubling) : 1;
}

// Capacity of a saved balance, repricing after EVERY new order, before the
// next generation. The integrated field and geometric mana sums are exact.
export function burst(rule, bank, mana, field, orders, cells = 3) {
  if (bank < 0 || mana < 0) return 0;
  const affordable = n => {
    if (!n) return true;
    let energy = (rule.fieldDoubling || rule.massPressureDoubling || rule.massPressureScale)
      ? energyQuote(rule, field, n * cells, orders)
      : n * energyQuote(rule, field, cells);
    if (rule.energyOrderDoubling || rule.orderPressureDoubling) {
      const k = Math.LN2 / (rule.energyOrderDoubling || rule.orderPressureDoubling);
      energy = energyQuote(rule, field, cells, orders) * Math.expm1(n * k) / Math.expm1(k);
    }
    let magic = manaQuote(rule, orders) * n;
    if (rule.manaInterval && rule.orderDoubling) {
      const k = Math.LN2 / rule.orderDoubling;
      magic = manaQuote(rule, orders) * Math.expm1(n * k) / Math.expm1(k);
    }
    return energy <= bank + EPS && magic <= mana + EPS;
  };
  let lo = 0, hi = 1;
  while (hi < 2 ** 52 && affordable(hi)) { lo = hi; hi *= 2; }
  while (hi - lo > 1) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (affordable(mid)) lo = mid; else hi = mid;
  }
  return lo;
}

export function simulate(profiles, rule, policy, options = {}) {
  const horizon = options.horizon ?? HORIZON;
  const buyThrough = options.buyThrough ?? horizon;
  const shipLife = options.shipLife ?? 12000;
  const limit = options.limit ?? ORDER_LIMIT;
  const schedule = new Map();
  const change = (time, energy, fixed, live, de, df, dl) => {
    const v = schedule.get(time) || [0, 0, 0, 0, 0, 0];
    v[0] += energy; v[1] += fixed; v[2] += live;
    v[3] += de; v[4] += df; v[5] += dl;
    schedule.set(time, v);
  };
  let bank = 3 * rule.price, mana = rule.manaInterval ? 1 : 0;
  let energyFlow = 0, fixed = 0, field = 0, de = 0, df = 0, dl = 0;
  let paidPressure = 0, overflow = 0;
  const pressureDecay = rule.pressureHalfLife ? 2 ** (-1 / rule.pressureHalfLife) : 1;
  const priceBasis = () => rule.pressureHalfLife ? paidPressure : field;
  let orders = 0, stop, breachedMap = null, firstInsolvent = null;
  let largestBatch = 0, recentOrders = 0, atHalf = 0;
  const marks = {}, checkpoints = [], counts = {};
  const decay = rule.halfLife ? 2 ** (-1 / rule.halfLife) : 1;
  const energyDecay = rule.energyHalfLife ? 2 ** (-1 / rule.energyHalfLife) : decay;
  const idAt = n => n < policy.start.length ? policy.start[n] : policy.repeat[(n-policy.start.length) % policy.repeat.length];
  let sequenceStart = 0;
  let target = profiles.get(idAt(orders));
  const byType = {};
  function commission(p, t) {
    bank = Math.max(0, bank - energyQuote(rule, priceBasis(), p.cells, orders));
    mana = Math.max(0, mana - manaQuote(rule, orders));
    if (rule.pressureHalfLife) paidPressure += rule.orderPressureDoubling ? 1 : (rule.massPressureDoubling || rule.massPressureScale) ? p.cells/3 : p.cells;
    energyFlow += p.net; fixed += p.core; field += p.cells;
    de += p.netSlope; df += p.coreSlope; dl += p.liveSlope;
    if (p.meanLive !== p.cells) change(t+1, 0, 0, p.meanLive-p.cells, 0, 0, 0);
    if (Number.isFinite(shipLife) && p.emitter) {
      // Cap the number of earning descendants; after L generations assets are
      // replaced by the next emission. No credit for collisions on removal.
      change(t+shipLife, 0, 0, 0, -p.netSlope, -p.coreSlope, -p.liveSlope);
    }
    if (Number.isFinite(shipLife) && p.mobile) {
      change(t+shipLife, -p.net, -p.core, -p.meanLive, 0, 0, 0);
    }
    byType[p.id] ??= t;
    orders++; counts[p.id] = (counts[p.id] || 0) + 1;
    if ([2, 10, 100, 1000, limit].includes(orders)) marks[orders] = t;
    options.onOrder?.(t, p.id);
    target = profiles.get(idAt(orders - sequenceStart));
  }
  const netAfterUpkeep = () => energyFlow - (rule.fixedTaxScale
    ? Math.max(0, fixed * (fixed - 1) / rule.fixedTaxScale) : 0);
  function sample(g, status) {
    return { g, status, orders, bank: Math.max(0, bank), shortfall: Math.max(0, -bank),
      mana, field, overflow, pressure: priceBasis(), energyFlow:netAfterUpkeep(), fixed, burst: burst(rule, bank, mana, priceBasis(), orders),
      gunBurst: burst(rule, bank, mana, priceBasis(), orders, 52) };
  }
  for (let t = 0; t <= horizon; t++) {
    // Total operating flows integrate the actual calendar before the next
    // purchase. Flipper flow is exact; other assets are phase-averaged.
    if (t > 0) {
      if (rule.pressureHalfLife) paidPressure *= pressureDecay;
      bank = bank * energyDecay + netAfterUpkeep();
      if (rule.manaStorage === 'core') {
        const effectiveCore = Math.log2(1 + Math.max(0, fixed));
        mana = Math.min(1 + effectiveCore, mana * decay + effectiveCore / rule.manaInterval);
        if (rule.battery) {
          const capacity = 3 * rule.price + rule.battery * effectiveCore;
          overflow += Math.max(0, bank - capacity);
          bank = Math.min(bank, capacity);
        }
      } else if (rule.manaInterval) mana = mana * decay + fixed / rule.manaInterval;
      if (bank < -EPS) {
        firstInsolvent = t;
        checkpoints.push(sample(t, 'first-deficit'));
        break; // Further evolution depends on which living cells erode.
      }
      bank = Math.max(0, bank);
      energyFlow += de; fixed += df; field += dl;
      const dt = schedule.get(t);
      if (dt) {
        energyFlow += dt[0]; fixed += dt[1]; field += dt[2];
        de += dt[3]; df += dt[4]; dl += dt[5]; schedule.delete(t);
      }
      field = Math.max(0, field);
      fixed = Math.max(0, fixed);
    }
    // Optional research controls: a one-off loss of all producing assets and
    // periodic opportunities to issue orders. Cash and the posted price history
    // survive a wipe. A rebuilding player retries the original opening.
    if (t === options.wipeAt) {
      energyFlow = fixed = field = de = df = dl = 0;
      schedule.clear();
      sequenceStart = orders;
      target = profiles.get(idAt(0));
    }
    const startOrders = orders;
    if (t <= buyThrough && stop == null && (!options.reviewEvery || t % options.reviewEvery === 0)) {
      for (;;) {
        // Research policies can review the observable ledger and choose to save.
        const p = options.chooseOrder ? profiles.get(options.chooseOrder({
          t, bank, pressure: priceBasis(), orders, energyFlow: netAfterUpkeep()
        })) : target;
        if (!p) break;
        const price = energyQuote(rule, priceBasis(), p.cells, orders);
        // Optionally retain the measured startup deficit before buying a gun.
        if (bank + EPS < price + (policy.fundGun && p.emitter ? p.runway : 0)
            || mana + EPS < manaQuote(rule, orders)) break;
        commission(p, t);
        if (orders >= limit) { stop = t; break; }
      }
    }
    if (t === horizon/2) atHalf = orders;
    if (t > horizon-60*RATE) recentOrders += orders-startOrders;
    largestBatch = Math.max(largestBatch, orders-startOrders);
    if (breachedMap === null && field >= MAP_F320) breachedMap = t;
    if (WATCH.includes(t) || t === horizon || stop === t) {
      const status = stop === t ? 'order-limit' : stop != null ? 'parked-after-limit'
        : t > buyThrough ? 'saving' : 'investing';
      checkpoints.push(sample(t, status));
    }
  }
  return {rule:rule.id,policy:policy.id,shipLife:Number.isFinite(shipLife)?shipLife:'infinite',
    buyThrough,orders,stop:stop ?? null,breachedMap,firstInsolvent,marks,largestBatch,atHalf,
    recentOrders,counts,byType,checkpoints};
}
