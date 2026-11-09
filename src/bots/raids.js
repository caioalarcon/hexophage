import { energyCost, generationEnergy } from '../match/constructive-economy.js';
import { advancePattern, patternOffset, seedPatternAges } from '../patterns/planar-simulation.js';
import { decodeRLE } from '../patterns/rle.js';
import { patchForStamp } from '../patterns/spherical-patch.js';

const weaponCache = new WeakMap();
// Place the target in the measured firing lane. The P4 travels along +q.
// The two emitters fire along −r at different offsets from their RLE origins.
const aim = {glider: [-8, -2], gun20: [-3, 16], gun42: [-13, 16]};

function weapon(id, world, game) {
  let weapons = weaponCache.get(world.physics);
  if (!weapons) weaponCache.set(world.physics, weapons = new WeakMap());
  const pattern = game.gameplay.patterns.find(p => p.id === id);
  if (weapons.has(pattern)) return weapons.get(pattern);
  const [dq, dr] = aim[id];
  const offsets = decodeRLE(pattern.rle).map(([q,r]) => [q+dq,r+dr]);
  const period = id === 'glider' ? 4 : Number(id.slice(3));
  let ages = seedPatternAges(pattern), births = 0, firstCycleBirths = 0;
  const trajectories = new Map();
  const earliest = id === 'glider' ? 6 : id === 'gun20' ? 24 : 50;
  const latest = id === 'glider' ? 30 : id === 'gun20' ? 100 : 140;
  // Finance the first 256 generations even when the first shots miss.
  for (let g = 0; g < 256; g++) {
    const turn = advancePattern(ages, 2, world.physics);
    births += turn.births;
    if (g < period) firstCycleBirths += turn.births;
    ages = turn.next;
    if (g + 1 >= earliest && g + 1 <= latest) {
      for (const pos of ages.keys()) {
        const [q,r] = patternOffset(pos), x=q+dq, y=r+dr;
        if (Math.max(Math.abs(x),Math.abs(y),Math.abs(x+y)) > 5) continue;
        const key=x+','+y;
        if (!trajectories.has(key)) trajectories.set(key,{offset:[x,y],generation:g+1});
      }
    }
  }
  const profile = {offsets, births, period, firstCycleBirths, trace:[...trajectories.values()]};
  weapons.set(pattern, profile);
  return profile;
}

export function raidBudget(game, world, id) {
  const economy = game.economy;
  const w = weapon(id, world, game);
  return energyCost(w.offsets.length, economy) + generationEnergy(w.births, 0, economy).upkeep;
}

// A firing lane aimed 16 hexes from the target has roughly 32 generations
// of travel. Every launched P4 consumes five births per generation in flight.
export function expectedGunExpense(game, world, id) {
  const economy = game.economy;
  const {period, firstCycleBirths} = weapon(id, world, game);
  return generationEnergy((firstCycleBirths + 32 * 5) / period, 0, economy).upkeep;
}

// Project the weapon's actual Callahan flight path onto the spherical mesh.
// Only a corridor containing rival cells qualifies as a possible strike.
export function projectedRaidScore(world, rival, attacker, target, dir, trace, maturity) {
  const predicted=patchForStamp(world,target,dir,trace.map(v=>v.offset),false);
  if (!predicted) return -Infinity;
  let score=0, earliest=Infinity;
  for (let i=0; i<predicted.length; i++) {
    const owner=world.owners[predicted[i]], age=world.cellAges[predicted[i]];
    if (owner===rival.id) {
      score+=age===1 ? 6 : age>=maturity ? 2 : 1;
      earliest=Math.min(earliest,trace[i].generation);
    } else if(owner===attacker.id) score-=4;
  }
  return earliest===Infinity ? -Infinity : score/(1+earliest/100);
}
export function raidMatureCore(world, game, player, commitStamp, id='glider') {
  const rivals=game.players.filter(p=>p!==player&&!p.out&&p.stable)
    .sort((a,b)=>b.stable-a.stable).slice(0,2);
  const {offsets,trace}=weapon(id, world, game);
  let best=null;
  for (const rival of rivals) {
    const cells=world.ownerCells[rival.id], targetIds=[];
    for (const cell of cells) {
      if (world.cellAges[cell]===1) targetIds.push(cell);
      if (targetIds.length===4) break;
    }
    const stride=Math.max(1,Math.ceil(cells.length/4));
    for(let i=world.gen%stride;i<cells.length;i+=stride)
      if(world.cellAges[cells[i]]>=game.economy.stableAfter)targetIds.push(cells[i]);
    for (const target of targetIds) for (let dir=0;dir<6;dir++) {
      const score=projectedRaidScore(world,rival,player,target,dir,trace,game.economy.stableAfter);
      if (score<=0 || best && score<=best.score) continue;
      const ids=patchForStamp(world,target,dir,offsets,true);
      if (ids && ids.every(site=>!world.cells[site]))best={score,ids};
    }
  }
  return best ? commitStamp(player.id,best.ids,false) : false;
}
