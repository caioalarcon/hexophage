import { beginLocalTrial } from './local-world.js';
import { placement, recognizes, relocate, selectSpot, signature, stampCatalog, witness } from './proposals.js';

function randomStream(seed) {
  let x = (seed >>> 0) || 1;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function normalized(value, scale) {
  return value / (Math.abs(value) + Math.max(1, scale));
}

function actionKey(kind, stamp, turn, gap) {
  return kind === 'rival' || kind === 'own' ? stamp.id + '@' + turn + '/' + gap : stamp.id;
}

function sampleAction(catalog, player, spot, context, memory, random, price) {
  let best, highest = -Infinity;
  // A fixed-size tournament bounds work independently of the size of the atlas.
  for (let i = 0; i < 12; i++) {
    const stamp = catalog[Math.floor(random() * catalog.length)];
    if (!stamp || stamp.offsets.length * price > player.reserve + 1e-9) continue;
    const turn = Math.floor(random() * 6);
    const gap = 2 + Math.floor(random() * 3);
    const key = actionKey(spot.kind, stamp, turn, gap);
    const broad = memory.lookup(player.id, spot.kind, stamp.id);
    const local = spot.kind === 'empty' ? broad : memory.lookup(player.id, context, key);
    const observed = memory.lookup(player.id, 'field/' + spot.kind, stamp.id);
    const evidence = local.count ? local.mean : broad.mean * 0.65;
    const priority = evidence + 0.22 * observed.mean +
      0.32 / Math.sqrt(1 + broad.count) + random() * 0.50;
    if (priority > highest) {
      highest = priority;
      best = { stamp, turn, gap, key, experience: broad.count };
    }
  }
  return best;
}

// Time value is expressed in CA generations. Production at a consistent local
// site can repay a stamp over match-length horizons. For attacks, require a
// measured change in a rival's money and limit extrapolation more sharply.
export function evaluateTrial(result, brain, kind) {
  // An interrupted moving front can initially SAVE the rival birth costs.
  // Reprice persistent but still immature cohorts using the actual policy.
  // Extend a worsening trend for at most twice its observed horizon, and
  // only when two separate windows agree. A clipped patch cannot justify it.
  const deferred = !result.boundary && result.turns >= 32 && result.rivalDeferredMid < 0 &&
    result.rivalDeferredFlow <= result.rivalDeferredMid && result.rivalDeferredTrend <= 0;
  const projectedRival = result.rivalFlow + (deferred
    ? result.rivalDeferredFlow + Math.min(128, 2 * result.turns) * result.rivalDeferredTrend : 0);
  const rivalEffect = result.rivalCash < -1e-7 || projectedRival < -1e-7;
  const horizon = result.boundary || result.ownUnfunded ? 0 :
    kind === 'rival' ? Math.min(deferred ? 120000 : 12000, brain.payback) : brain.payback;
  const value = result.ownCash - brain.rivalWeight * result.rivalCash +
    horizon * (result.ownFlow - brain.rivalWeight * projectedRival);
  const acceptable = value > 1e-8 && !result.ownUnfunded && (kind !== 'rival' || rivalEffect);
  return { value, acceptable, deferred };
}

export function createThinkingStrategy(world, game, commitStamp, options = {}) {
  const catalog = stampCatalog(game.gameplay.patterns).filter(p => p.radius + 3 <= 20);
  const kit = catalog.filter(p => Object.hasOwn(game.gameplay.kit, p.id));
  const memory = game.brainMemory;
  const seed = options.seed ?? 1;
  const brains = game.players.map(p => {
    const random = randomStream(seed ^ Math.imul(p.id, 0x9e3779b9));
    return { random, payback: 120000 + random() * 240000, rivalWeight: .45 + random(),
      ready: null, field: [], recover: false, scanned: new Set(), pilotSpent: 0, pilotAt: -Infinity };
  });
  const metrics = {
    trials: 0, completed: 0, studies: 0, rescues: 0, work: 0, visits: 0, actions: 0, waits: 0, invalidated: 0, boundary: 0, tactical: 0, deferred: 0, relocations: 0, pilots: 0, observed: 0,
    byBot: Object.fromEntries(game.players.map(p => [p.id,
      { trials: 0, completed: 0, actions: 0, observed: 0, patterns: Object.create(null) }])),
  };
  // Budget both branches together, across the whole match. Even a stationary
  // branch consumes visit credits because its ages and finances still advance.
  const budget = options.budget ?? 96, capacity = Math.max(8192, budget);
  let credits = capacity, last = world.gen - 1, earliest = 0, cursor = 1, pending;

  function propose(player, vacuumOpening = false) {
    const brain = brains[player.id - 1];
    for (let attempt = 0; attempt < 3; attempt++) {
      const recovery = brain.recover && player.flowAverage < 0;
      const spot = recovery
        ? { kind: 'empty', target: player.seed, direction: Math.floor(brain.random() * 6) }
        : selectSpot(world, game, player, brain.random);
      const context = signature(world, player.id, spot);
      const trialNumber = metrics.byBot[player.id].trials;
      const price = game.economy.stampCost;
      // Stratify cold probes by affordable price. The hand and full atlas are
      // sorted by identity before sampling; no slot receives a privileged role.
      const small = !player.stamps && trialNumber < 3;
      const pool = vacuumOpening ? catalog.filter(p => p.radius <= 2) :
        small ? catalog.filter(p => p.offsets.length * price <= player.reserve * .16) :
        kit.length && brain.random() < .55 ? kit : catalog;
      let action;
      if (recovery) {
        // A money-losing opening triggers a search for untested alternatives
        // in the currently equipped hand, then the rest of the valid catalog.
        const eligible = p => !brain.scanned.has(p.id) && p.offsets.length * price < .65 * player.reserve;
        let choices = kit.filter(eligible);
        if (!choices.length) choices = catalog.filter(eligible);
        if (!choices.length) {
          brain.scanned.clear();
          return null;
        }
        const stamp = choices[Math.floor(brain.random() * choices.length)];
        action = { stamp, turn: Math.floor(brain.random() * 6), gap: 3, key: stamp.id, experience: 0 };
      } else action = sampleAction(pool.length ? pool : catalog, player, spot, context, memory, brain.random, price);
      if (!action) continue;
      const { stamp, turn } = action;
      let distance = stamp.radius + action.gap;
      if (recovery) distance = 14 + Math.floor(brain.random() * 9);
      else if (spot.kind === 'empty') distance = player.stamps ? 4 + Math.floor(brain.random() * 14) : 0;
      const position = placement(world, spot, stamp, turn, distance);
      if (!position) continue;
      const radius = vacuumOpening ? 5 : Math.min(20, Math.max(5, stamp.radius + (recovery ? 9 : 5), spot.kind === 'empty' ? 0 : distance + 3));
      const deep = metrics.byBot[player.id].trials % 3 === 2;
      const horizon = recovery ? 18 : vacuumOpening ? 2 : options.horizon ?? (deep ? Math.min(1024, Math.max(96, game.economy.stableAfter + 48)) :
        spot.kind === 'rival' ? 64 : player.stamps ? 24 : 16);
      const job = beginLocalTrial(world, game, player.id, position.center, position.ids, { radius, horizon });
      if (!job) continue;
      if (recovery) {
        brain.scanned.add(stamp.id);
        metrics.studies++;
      }
      metrics.trials++;
      metrics.byBot[player.id].trials++;
      const site = { kind: 'site', target: position.center, direction: turn };
      const saved = spot.kind === 'rival' ? witness(world, position, radius, game.economy.stableAfter, horizon) : null;
      return { player, brain, recovery, spot, context, action, position, distance, site, saved,
        rivalId: world.owners[spot.target], before: signature(world, player.id, site), job };
    }
    return null;
  }

  function finish(trial, result) {
    const { player, brain, spot, context, action } = trial;
    const { value, acceptable, deferred } = evaluateTrial(result, brain, spot.kind);
    const scale = Math.max(result.cost, game.economy.stampCost, 1);
    const utility = normalized(value, scale);
    memory.observe(player.id, spot.kind, action.stamp.id, utility);
    if (spot.kind !== 'empty') memory.observe(player.id, context, action.key, utility);
    metrics.completed++;
    metrics.byBot[player.id].completed++;
    if (result.boundary) metrics.boundary++;
    // A small field experiment can resolve an immature/censored opening. No
    // blind attacks, repeated pilots of known losers or unbounded exploration.
    const immature = result.turns < game.economy.stableAfter;
    const studyDuration = Math.max(128, game.economy.stableAfter + 64);
    const operatingRisk = Math.max(0, -result.ownFlow) * studyDuration;
    const expanding = result.ownCore > 0 && result.ownCells > result.added * 1.2;
    const riskFraction = expanding ? .55 : .20;
    const pilot = !acceptable && spot.kind === 'empty' && !brain.field.length && !result.ownUnfunded &&
      result.ownCore > 0 && (immature || expanding && result.boundary) &&
      (!action.experience || !player.stamps && expanding) && world.gen - brain.pilotAt > studyDuration &&
      brain.pilotSpent + result.cost + operatingRisk <= Math.min(game.init, player.reserve) * riskFraction;
    const productiveRecovery = trial.recovery && !result.boundary && !result.ownUnfunded &&
      expanding && result.ownDeferredMid > 0 && result.ownDeferredTrend > 0 &&
      result.ownFlow + result.ownDeferredFlow + result.ownDeferredTrend * Math.min(1024, 2 * game.economy.stableAfter) > 0;
    const rescue = productiveRecovery && result.cost + operatingRisk <= .65 * player.reserve &&
      result.cost + operatingRisk + brain.pilotSpent <= .67 * game.init;
    if (acceptable || (trial.recovery ? rescue : pilot)) {
      const ready = { ...trial, job: null, pilot: pilot || rescue, rescue, result, deferred, expiry: world.gen + Math.max(game.interval * 2, 48) };
      brain.ready = ready;
    } else metrics.waits++;
  }

  function observeField(player, brain) {
    for (let i = brain.field.length - 1; i >= 0; i--) {
      const field = brain.field[i];
      if (world.gen < field.due) continue;
      // Other actions confound these real observations. Keep them distinct from
      // causal local trials and use them as a modest prior for the next probe.
      const elapsed = world.gen - field.from;
      const excess = (p, start) => p.reserve + p.stampedEnergy - start.wealth - elapsed * start.flow;
      const rival = game.players[field.rivalId - 1];
      const rivalReturn = rival ? excess(rival, field.rival) : 0;
      const relative = excess(player, field.own) - field.cost - brain.rivalWeight * rivalReturn;
      memory.observe(player.id, 'field/' + field.kind, field.stamp, normalized(relative, field.cost));
      metrics.observed++; metrics.byBot[player.id].observed++;
      if (field.late) {
        brain.field.splice(i, 1);
        if (field.kind === 'empty' && player.flowAverage < 0 && excess(player, field.own) < 0) brain.recover = true;
      } else {
        field.late = true;
        field.due = world.gen + Math.max(4096, 4 * game.economy.stableAfter);
      }
    }
  }

  function think() {
    if (world.gen <= last) return;
    credits = Math.min(capacity, credits + (world.gen - last) * budget);
    last = world.gen;
    if (world.gen === 0 && world.physics.birthsFromVacuum) {
      for (const player of game.players.slice(1)) {
        const trial = propose(player, true);
        if (!trial) continue;
        const result = trial.job.step(2);
        const visits = 2 * trial.job.nodes * trial.job.generations;
        credits -= visits;
        metrics.visits += visits;
        metrics.work += trial.job.work;
        finish(trial, result);
      }
      return;
    }
    if (world.gen < earliest) return;
    if (!pending) {
      const player = game.players[cursor];
      cursor = cursor % (game.players.length - 1) + 1;
      earliest = world.gen + (options.spacing ?? 32);
      if (player.out || brains[player.id - 1].ready) return;
      pending = propose(player);
      if (!pending) return;
    }
    const { job } = pending;
    const pair = 2 * job.nodes;
    const slice = Math.min(4, Math.floor(credits / pair), Math.max(1, Math.floor(2300 / pair)));
    if (slice < 1) return;
    const before = job.generations, oldWork = job.work;
    const result = job.step(slice);
    metrics.visits += (job.generations - before) * pair;
    credits -= (job.generations - before) * pair;
    metrics.work += job.work - oldWork;
    if (result) { finish(pending, result); pending = null; }
  }

  function strategy(player) {
    const brain = brains[player.id - 1];
    observeField(player, brain);
    const ready = brain.ready;
    if (!ready) return;
    const { spot, site, context, before, position, result, action, pilot, expiry } = ready;
    if (world.gen > expiry || player.out) { brain.ready = null; metrics.invalidated++; return; }
    let place = position;
    const same = signature(world, player.id, spot) === context && signature(world, player.id, site) === before;
    if (spot.kind === 'rival') {
      if (!same || !recognizes(world, position, ready.saved)) {
        if (world.gen < (ready.retryAt ?? 0)) return;
        ready.retryAt = world.gen + 24;
        place = relocate(world, ready);
        if (!place) return;
      }
    } else if (!same) return;
    brain.ready = null;
    if (!commitStamp(player.id, place.ids, false)) { metrics.invalidated++; return; }
    metrics.actions++;
    if (place !== position) metrics.relocations++;
    if (spot.kind === 'rival') { metrics.tactical++; if (ready.deferred) metrics.deferred++; }
    const stats = metrics.byBot[player.id];
    stats.actions++;
    stats.patterns[action.stamp.id] = (stats.patterns[action.stamp.id] || 0) + 1;
    if (ready.rescue) metrics.rescues++;
    if (pilot) { metrics.pilots++; brain.pilotAt = world.gen; brain.pilotSpent += result.cost; }
    if (brain.field.length < 3) {
      const baseline = p => ({ flow: p.flowAverage, wealth: p.reserve + p.stampedEnergy });
      const rival = spot.kind === 'rival' ? game.players[ready.rivalId - 1] : null;
      brain.field.push({ stamp: action.stamp.id, kind: spot.kind, from: world.gen,
        due: world.gen + Math.min(8192, Math.max(128, game.economy.stableAfter + 64)),
        cost: result.cost, own: baseline(player), rivalId: rival?.id, rival: rival && baseline(rival) });
    }
  }

  strategy.think = think;
  strategy.metrics = metrics;
  strategy.invalidate = () => {
    pending = null;
    for (const brain of brains) {
      brain.ready = null;
      brain.field = [];
      brain.recover = false;
      brain.scanned.clear();
    }
  };
  return strategy;
}
