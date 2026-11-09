import { createSeedScreen, expectedSeedFlow, marginalSeedFlow, quoteEmptySeed } from './seed-screen.js';
import { beginLocalTrial } from './local-world.js';
import { aimAtTarget } from './aim.js';
import { emptyHexPatch, placement, recognizes, relocate, selectSpot, signature, stampCatalog, witness } from './proposals.js';

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
      best = { stamp, turn, gap, key, experience: broad.count, learnedPose: local.count > 0 && local.mean > 0 };
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
  const byId = new Map(catalog.map(stamp => [stamp.id, stamp]));
  const single = catalog.find(s => s.offsets.length === 1)
    ?? { id: 'manual/single', offsets: [[0,0]], radius: 0 };
  const minimum = Math.min(...catalog.map(s => s.offsets.length));
  const memory = game.brainMemory;
  let screen = createSeedScreen(world.physics);
  const seed = options.seed ?? 1;
  const brains = game.players.map(p => {
    const random = randomStream(seed ^ Math.imul(p.id, 0x9e3779b9));
    return { random, payback: 120000 + random() * 240000, rivalWeight: .45 + random(),
      ready: null, field: [], recover: false, surveyed: new Set(), rejected: new Map(), pilotSpent: 0, pilotAt: -Infinity };
  });
  const metrics = {
    trials: 0, completed: 0, studies: 0, screenVisits: 0, inheritedProbes: 0, investments: 0, rescues: 0, work: 0, visits: 0, actions: 0, waits: 0, invalidated: 0, boundary: 0, tactical: 0, deferred: 0, relocations: 0, pilots: 0, observed: 0,
    byBot: Object.fromEntries(game.players.map(p => [p.id,
      { trials: 0, completed: 0, actions: 0, observed: 0, patterns: Object.create(null) }])),
  };
  // Budget both branches together, across the whole match. Even a stationary
  // branch consumes visit credits because its ages and finances still advance.
  const capacity = 8192;
  let credits = capacity, last = world.gen - 1, earliest = 0, cursor = 1, pending, survey;

  function affordable(stamp, player) {
    return stamp.offsets.length * game.economy.stampCost <= player.reserve + 1e-9;
  }

  function realizedFlow(stamp, player) {
    const mature = memory.lookup(player.id, 'yield/mature', stamp.id);
    const births = memory.lookup(player.id, 'yield/births', stamp.id);
    return mature.count && births.count ? marginalSeedFlow(births.mean, mature.mean, player, game.economy) : null;
  }

  function selectInvestment(player, brain) {
    let best, highest = 0;
    const consider = stamp => {
      if (!affordable(stamp, player) || (brain.rejected.get(stamp) ?? 0) > world.gen) return;
      const measure = screen.result(stamp);
      const flow = realizedFlow(stamp, player) ?? expectedSeedFlow(measure, player, game.economy);
      const cost = stamp.offsets.length * game.economy.stampCost;
      const rate = flow / Math.max(1, cost);
      if (rate > Math.max(highest, 1 / brain.payback)) { best = stamp; highest = rate; }
    };
    for (const stamp of kit) if (screen.result(stamp)) consider(stamp);
    for (const stamp of brain.surveyed) if (!Object.hasOwn(game.gameplay.kit, stamp.id)) consider(stamp);
    if (best) return { stamp: best, investment: true };
    // The persisted v1 field signal includes the stamp price, even when a farm
    // subsequently produced revenue. Reassess those shapes ahead of new ones.
    if (!brain.prior) {
      const evidence = [...memory.ranked(player.id, 'yield/empty', 16), ...memory.ranked(player.id, 'field/empty', 16),
        ...memory.ranked(player.id, 'empty').filter(row => row.mean > 0)];
      brain.prior = [...new Set(evidence.map(row => byId.get(row.action)).filter(Boolean))];
    }
    const unseen = stamp => !brain.surveyed.has(stamp) && affordable(stamp, player);
    let next = brain.prior.find(unseen);
    if (next) metrics.inheritedProbes++;
    else {
      let choices = kit.filter(unseen);
      if (!choices.length && (player.stamps || !kit.length)) choices = catalog.filter(unseen);
      if (choices.length) next = choices[Math.floor(brain.random() * choices.length)];
    }
    if (next) {
      survey = { brain, stamp: next };
      return null;
    }
    return { investment: false };
  }

  function propose(player, vacuumOpening = false) {
    const brain = brains[player.id - 1];
    for (let attempt = 0; attempt < 3; attempt++) {
      const recovery = brain.recover && player.flowAverage < 0;
      const restart = !world.ownerCells[player.id].length && player.reserve + 1e-9 < minimum * game.economy.stampCost;
      const economic = !vacuumOpening && !world.physics.birthsFromVacuum &&
        (!player.stamps || recovery || brain.random() < .44);
      const pick = restart ? { stamp: single, investment: true }
        : economic ? selectInvestment(player, brain) : { investment: false };
      if (!pick) return null;
      const spot = pick.investment || recovery ? { kind: 'empty', target: player.seed,
        direction: Math.floor(brain.random() * 6) } : selectSpot(world, game, player, brain.random);
      const context = signature(world, player.id, spot);
      const price = game.economy.stampCost;
      let pool = vacuumOpening ? catalog.filter(p => p.radius <= 2) :
        kit.length && brain.random() < .55 ? kit : catalog;
      if (spot.kind === 'rival' && brain.random() < .35) {
        const mobile = kit.filter(stamp => {
          const drift = screen.result(stamp)?.drift;
          return drift && Math.max(Math.abs(drift[0]), Math.abs(drift[1]), Math.abs(drift[0] + drift[1])) >= 1.5;
        });
        if (mobile.length) pool = mobile;
      }
      const action = pick.stamp ? { stamp: pick.stamp, turn: Math.floor(brain.random() * 6), gap: 3,
        key: pick.stamp.id, experience: memory.lookup(player.id, 'empty', pick.stamp.id).count }
        : sampleAction(pool.length ? pool : catalog, player, spot, context, memory, brain.random, price);
      if (!action) continue;
      const { stamp } = action;
      if (spot.kind === 'rival' && !action.learnedPose && brain.random() < .8) {
        action.turn = aimAtTarget(screen.result(stamp), action.turn);
        action.key = actionKey(spot.kind, stamp, action.turn, action.gap);
      }
      const { turn } = action;
      let distance = stamp.radius + action.gap;
      if ((pick.investment && player.stamps) || recovery) distance = 16 + Math.floor(brain.random() * 28);
      else if (spot.kind === 'empty') distance = player.stamps ? 4 + Math.floor(brain.random() * 14)
        : Math.floor(brain.random() * 9);
      const position = placement(world, spot, stamp, turn, distance);
      if (!position) continue;
      const radius = vacuumOpening ? 5 : Math.min(20, Math.max(5, stamp.radius + (pick.investment ? 9 : 5), spot.kind === 'empty' ? 0 : distance + 3));
      const horizon = vacuumOpening ? 2 : options.horizon ?? (pick.investment ? 18 : spot.kind === 'rival' ? 64 : 24);
      const measure = pick.investment && screen.result(stamp);
      const halo = measure ? Math.max(3, measure.reach + 2) : 0;
      const proofCost = 1 + 3 * halo * (halo + 1) + (measure ? 2 * measure.turns : 0);
      let cached;
      if (measure && halo <= 20 && !options.horizon) {
        if (credits < proofCost) {
          earliest = world.gen + 1;
          return null;
        }
        credits -= proofCost; metrics.visits += proofCost;
        if (emptyHexPatch(world, position, halo)) cached = quoteEmptySeed(measure, player, game.economy);
      }
      const job = cached ? null : beginLocalTrial(world, game, player.id, position.center, position.ids, { radius, horizon });
      if (!cached && !job) continue;
      metrics.trials++;
      metrics.byBot[player.id].trials++;
      const site = { kind: 'site', target: position.center, direction: turn };
      const saved = spot.kind === 'rival' ? witness(world, position, radius, game.economy.stableAfter, horizon) : null;
      return { player, brain, recovery, investment: pick.investment, spot, context, action, position, distance, site, saved,
        rivalId: world.owners[spot.target], before: signature(world, player.id, site), job, cached };
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
    // Price the pending cohorts in *this* patch. Their eventual tariffs only
    // justify commitment if the site is uncropped and can fund its warm-up.
    const ownFuture = result.ownFlow + result.ownDeferredFlow +
      (expanding ? Math.max(0, result.ownDeferredTrend) * Math.min(512, 2 * game.economy.stableAfter) : 0);
    // A short rollout cannot see a colony's eventual size. Reprice the yield
    // actually achieved by this stamp at the current owner's saturation. The
    // new site must still preserve the seed in its independent physical trial.
    const measured = spot.kind === 'empty' ? realizedFlow(action.stamp, player) : null;
    const fundedYield = measured !== null && result.ownCore > 0 && result.ownCells >= result.added
      ? measured : ownFuture;
    const unprofitable = measured !== null && measured * brain.payback <= result.cost + operatingRisk;
    const investment = trial.investment && !result.boundary && !result.ownUnfunded &&
      fundedYield > 0 && fundedYield * brain.payback > result.cost + operatingRisk &&
      result.cost + operatingRisk <= player.reserve;
    if (!investment && trial.investment && !acceptable && !result.boundary) brain.rejected.set(action.stamp, world.gen + 256);
    if (!unprofitable && (acceptable || investment || pilot)) {
      const ready = { ...trial, job: null, pilot, investment, rescue: investment && trial.recovery, result, deferred,
        expiry: world.gen + Math.max(game.interval * 2, 48) };
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
      if (field.kind === 'empty') {
        const marginalFlow = excess(player, field.own) / elapsed;
        const scale = Math.max(1e-4, field.cost / brain.payback);
        if (player.stamps === field.stamps) memory.observe(player.id, 'yield/empty', field.stamp, normalized(marginalFlow, scale));
        // In a single-crop field attribute aggregate operating output across
        // its copies. Mixed portfolios cannot identify this stamp's yield.
        const copies = metrics.byBot[player.id].patterns[field.stamp];
        if (field.late && copies === player.stamps && copies > 0 && elapsed > game.economy.stableAfter) {
          memory.observe(player.id, 'yield/mature', field.stamp, player.stable / copies);
          memory.observe(player.id, 'yield/births', field.stamp, player.totalBirths / (copies * Math.max(1, world.gen - brain.firstStamp)));
        }
        if (player.flowAverage < 0 && marginalFlow < 0) brain.recover = true;
      }
      if (field.late) { brain.field.splice(i, 1); } else {
        field.late = true;
        field.due = world.gen + Math.max(4096, 4 * game.economy.stableAfter);
      }
    }
  }

  function think() {
    const budget = options.budget ?? 96 * (game.brainRate ?? 1);
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
    if (survey) {
      const { brain, stamp } = survey;
      const step = screen.run(stamp, game.economy.stableAfter, Math.min(2400, credits));
      metrics.visits += step.visits; metrics.screenVisits += step.visits;
      credits -= step.visits;
      if (step.done) { brain.surveyed.add(stamp); metrics.studies++; survey = null; }
      return;
    }
    if (world.gen < earliest) return;
    if (!pending) {
      let player = game.players[cursor];
      const starters = game.players.slice(1).some(p => !p.out && !p.stamps && p.reserve >= game.economy.stampCost &&
        metrics.byBot[p.id].trials < 12 && !brains[p.id - 1].ready);
      if (starters && metrics.completed % 4 !== 3) {
        for (let i = 0; i < game.players.length - 1; i++) {
          if (!player.out && !player.stamps && !brains[player.id - 1].ready && metrics.byBot[player.id].trials < 12 &&
              player.reserve >= game.economy.stampCost) break;
          cursor = cursor % (game.players.length - 1) + 1;
          player = game.players[cursor];
        }
      }
      cursor = cursor % (game.players.length - 1) + 1;
      earliest = world.gen + (options.spacing ?? 4);
      if (player.out || player.reserve + 1e-9 < game.economy.stampCost || brains[player.id - 1].ready) return;
      pending = propose(player);
      if (!pending) return;
      if (pending.cached) { finish(pending, pending.cached); pending = null; return; }
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
    options.onPlacement?.({ gen:world.gen, owner:player.id, stamp:action.stamp.id,
      rival:spot.kind === 'rival' ? ready.rivalId : null, ids:place.ids });
    metrics.actions++;
    brain.firstStamp ??= world.gen;
    if (place !== position) metrics.relocations++;
    if (spot.kind === 'rival') { metrics.tactical++; if (ready.deferred) metrics.deferred++; }
    const stats = metrics.byBot[player.id];
    stats.actions++;
    stats.patterns[action.stamp.id] = (stats.patterns[action.stamp.id] || 0) + 1;
    if (ready.investment) metrics.investments++;
    if (ready.rescue) metrics.rescues++;
    if (pilot) { metrics.pilots++; brain.pilotAt = world.gen; brain.pilotSpent += result.cost; }
    if (brain.field.length < 3) {
      const baseline = p => ({ flow: p.flowAverage, wealth: p.reserve + p.stampedEnergy });
      const rival = spot.kind === 'rival' ? game.players[ready.rivalId - 1] : null;
      brain.field.push({ stamp: action.stamp.id, stamps: player.stamps, kind: spot.kind, from: world.gen,
        due: world.gen + Math.min(8192, Math.max(128, game.economy.stableAfter + 64)),
        cost: result.cost, own: baseline(player), rivalId: rival?.id, rival: rival && baseline(rival) });
    }
  }

  strategy.think = think;
  strategy.metrics = metrics;
  strategy.invalidate = () => {
    pending = null; survey = null; screen = createSeedScreen(world.physics);
    for (const brain of brains) {
      brain.ready = null;
      brain.field = [];
      brain.recover = false;
      brain.prior = null; brain.surveyed.clear(); brain.rejected.clear();
    }
  };
  return strategy;
}
