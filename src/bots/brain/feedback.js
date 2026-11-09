import { generationEnergy } from '../../match/constructive-economy.js';

// The paid game supplies the action observation. Waiting remains a prediction.
// Compare at exactly the same phase and reprice both branches with identical
// outside production so another, remote farm cannot take credit for this order.
function flow(sample, outside, economy) {
  const {income, upkeep} = generationEnergy(outside.outsideBirths + sample.births,
    outside.outsideMature + sample.mature, economy);
  return income - upkeep;
}

function emptyDisk(graph, center, radius) {
  const ids=[center], seen=new Set(ids);
  let start=0;
  for (let ring=0;ring<radius;ring++) {
    const stop=ids.length;
    for (let i=start;i<stop;i++) {
      const site=ids[i];
      for (let j=0;j<graph.deg[site];j++) {
        const next=graph.adj[site*6+j];
        if (!seen.has(next)) { seen.add(next); ids.push(next); }
      }
    }
    start=stop;
  }
  return ids;
}

function keyFor(trial, side) {
  // The field phase/oriented local signature and the actual relative turn
  // are portable between rival identities. Never share a live bot's samples.
  let phase=trial.phase || 0, shape='';
  while(phase){
    const owner=phase%8;
    shape+=owner===0?'0':owner===trial.player.id?'1':owner===trial.rivalId?'2':owner===7?'3':'4';
    phase=Math.floor(phase/8);
  }
  return ['error/'+trial.context+'/'+side,trial.action.key+(shape?'#'+shape:'')];
}

export function createForecastFeedback(world, game, memory, metrics, onOutcome) {
  const watches=new Map();
  metrics.forecasts=0; metrics.forecastsCensored=0; metrics.forecastVisits=0;
  metrics.forecastAbsError=0; metrics.forecastLedgers=0; metrics.calibratedForecasts=0;
  function adjustment(t,result,side) {
    const prop=side+'Flow', id=t.player.id, stamp=t.action.stamp.id;
    const broad=memory.lookup(id,'yield/error/'+t.spot.kind+'/'+side,stamp);
    if(!broad.count)return {shadow:0,applied:0};
    let bias=broad.mean*broad.count/(broad.count+6);
    const [context,pose]=keyFor(t,side);
    if(t.spot.kind!=='empty'){
      const local=memory.lookup(id,context,pose);
      bias=(3*bias+local.count*local.mean)/(local.count+3);
    }
    // Validate the *shadow* bias on later orders before it may influence a
    // purchase. A minority of large misses must not skew otherwise exact bids.
    const fit=memory.lookup(id,'fit/'+context,pose);
    const operating=result[side+'Cash']+(side==='own'?result.cost:0);
    const limit=Math.max(Math.abs(result[prop]),Math.abs(operating)/result.turns);
    const shadow=Math.min(limit,Math.max(-limit,bias));
    return {shadow,applied:fit.count>=2 && fit.mean>=.5 ? shadow : 0};
  }
  function store(w, side, observed) {
    const predicted=w.forecast[side], terms=game.economy;
    const tail=w.tail.samples===Math.min(8,w.due-w.from);
    const hold=tail ? predicted.tailHold : flow(predicted.hold,predicted,terms);
    const projected=(tail ? predicted.tailAction : flow(predicted.action,predicted,terms))-hold;
    const actual=(tail ? w.tail[side]/w.tail.samples : flow(observed,predicted,terms))-hold;
    const complete=w.cumulative!==null;
    const projectedOperating=predicted.actionOperating-predicted.holdOperating;
    const actualOperating=complete ? w.cumulative[side]-predicted.holdOperating : null;
    const residual=actual-projected;
    const shadow=w.adjustments[side]?.shadow??0;
    if(shadow){
      const edge=Math.abs(residual)-Math.abs(residual-shadow);
      memory.observe(w.owner,'fit/'+w.keys[side][0],w.keys[side][1],Math.sign(edge));
    }
    memory.observe(w.owner,'yield/error/'+w.kind+'/'+side,w.stamp,residual);
    if (w.kind !== 'empty')
      memory.observe(w.owner,...w.keys[side],residual);
    return {tailSamples:tail?w.tail.samples:1,predictedFlow:projected,observedFlow:actual,residual, predictedOperating:projectedOperating,actualOperating,
      predictedCells:predicted.action.cells-predicted.hold.cells,
      observedCells:observed.cells-predicted.hold.cells};
  }
  function observe(allowance) {
    let visits=0;
    for (const [id,w] of watches) {
      const final=world.gen===w.due;
      if (world.gen<=w.from) continue;
      const player=game.players[id-1], rivalPlayer=game.players[w.rival-1];
      if (world.gen>w.due || [player,rivalPlayer].some(p=>p && (p.out || p.lastUnfundedBirths || p.lastEroded))) {
        watches.delete(id); metrics.forecastsCensored++; continue;
      }
      if (!w.cumulative && !final) continue;
      const ownField=world.ownerCells[id], rivalField=w.rival ? world.ownerCells[w.rival] : [];
      const byOwner=ownField.length+rivalField.length<w.sites.size;
      const cost=byOwner ? ownField.length+rivalField.length : w.sites.size;
      // A small, sparse field can be priced every tick. Near a dense battle
      // keep only the exact end-phase observation. Spend the shared visit budget.
      if (cost>allowance-visits || (!final && cost>128)) {
        w.cumulative=null;
        if (final) { watches.delete(id); metrics.forecastsCensored++; }
        continue;
      }
      const own={births:0,mature:0,cells:0}, rival={births:0,mature:0,cells:0};
      function tally(site) {
        const p=world.owners[site], sample=p===id ? own : w.rival && p===w.rival ? rival : null;
        if (!sample) return;
        const age=world.cellAges[site];
        sample.cells++;
        if (age===1 && !world.next[site]) sample.births++;
        if (age>=game.economy.stableAfter) sample.mature++;
      }
      if (byOwner) {
        for(const site of ownField) if(w.sites.has(site))tally(site);
        for(const site of rivalField) if(w.sites.has(site))tally(site);
      } else for(const site of w.sites)tally(site);
      visits+=cost;
      const ownFlow=flow(own,w.forecast.own,game.economy);
      const rivalFlow=w.rival ? flow(rival,w.forecast.rival,game.economy) : 0;
      if(w.due-world.gen<8){w.tail.own+=ownFlow;w.tail.rival+=rivalFlow;w.tail.samples++;}
      if (w.cumulative) {
        if(world.gen!==w.last+1)w.cumulative=null;
        else {
          w.cumulative.own+=ownFlow;w.cumulative.rival+=rivalFlow;
        }
        w.last=world.gen;
      }
      if (!final) continue;
      watches.delete(id);
      const a=store(w,'own',own), b=w.rival ? store(w,'rival',rival) : null;
      const relative=a.observedFlow-w.weight*(b?.observedFlow??0);
      memory.observe(id,'field/'+w.kind,w.stamp,relative/(Math.abs(relative)+Math.max(.0001,w.cost/w.payback)));
      metrics.forecasts++;
      if(w.cumulative)metrics.forecastLedgers++;
      metrics.forecastAbsError+=Math.abs(a.residual-(b?.residual??0));
      if(w.bias!==0)metrics.calibratedForecasts++;
      onOutcome?.({gen:world.gen,launched:w.from,owner:id,rival:w.rival,stamp:w.stamp,cost:w.cost,
        context:w.context,pose:w.pose,own:a,target:b,relativePredicted:a.predictedFlow-(b?.predictedFlow??0),
        relativeCalibrated:a.predictedFlow-(b?.predictedFlow??0)+w.bias, relativeObserved:a.observedFlow-(b?.observedFlow??0)});
    }
    metrics.forecastVisits+=visits;
    return visits;
  }
  function recordStamp(ids) {
    for (const [id,w] of watches) {
      const {coords,f}=world.graph;
      // At most one edge per step; the sphere mesh has chords <= 2/f.
      // If a new intervention could reach the sampled region before the
      // observation, discard the receipt. Fallback graphs censor conservatively.
      const distance=2*(w.radius+w.due-world.gen+1)/f+1e-6;
      const c=3*w.center;
      if (coords && f && ids.every(site=>{
        const s=3*site, dx=coords[c]-coords[s], dy=coords[c+1]-coords[s+1], dz=coords[c+2]-coords[s+2];
        return dx*dx+dy*dy+dz*dz>distance*distance;
      })) continue;
      watches.delete(id); metrics.forecastsCensored++;
    }
  }
  function watch(player,t,place) {
    const result=t.rawResult??t.result, forecast=result?.forecast;
    if (!forecast || result.boundary || result.ownUnfunded || place.center!==t.position.center ||
        watches.has(player.id)) { metrics.forecastsCensored++; return; }
    const sites=forecast.ids??emptyDisk(world.graph,place.center,forecast.radius);
    const adjustments=t.result.fieldAdjustment??{
      own:adjustment(t,result,'own'),rival:forecast.rival?adjustment(t,result,'rival'):null};
    watches.set(player.id,{owner:player.id,rival:forecast.rival?t.rivalId:null,adjustments,
      from:world.gen,due:world.gen+result.turns,center:place.center,radius:forecast.radius,
      tail:{own:0,rival:0,samples:0},cumulative:{own:0,rival:0}, last:world.gen,weight:t.brain.rivalWeight,payback:t.brain.payback,cost:result.cost,
      bias:(t.result.ownFlow-result.ownFlow)-(t.result.rivalFlow-result.rivalFlow),
      sites:new Set(sites),forecast,kind:t.spot.kind,stamp:t.action.stamp.id,context:t.context,pose:t.action.key,
      keys:{own:keyFor(t,'own'),rival:keyFor(t,'rival')}});
  }
  function correct(t,result) {
    if (!result.forecast || result.ownUnfunded || result.boundary) return result;
    const copy={...result,fieldAdjustment:{}};
    for (const side of ['own','rival']) {
      if (!result.forecast[side]) continue;
      const value=adjustment(t,result,side);
      copy.fieldAdjustment[side]=value;
      copy[side+'Flow']+=value.applied;
    }
    return copy;
  }
  return {observe,recordStamp,watch,correct,clear:()=>watches.clear()};
}
