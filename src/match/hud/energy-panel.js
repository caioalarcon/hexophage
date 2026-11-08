import { game } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { availableCells, initialEnergy, parameterValue } from '../constructive-economy.js';
import { bindSliderLimits } from './slider-limits.js';
import { $ } from '../../layout/elements.js';

const compact = n => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + compact(Math.abs(n));
const controls = {stableEnergy:'eco-stable-energy',birthCost:'eco-birth-cost',stampCost:'eco-stamp',stableAfter:'eco-age',initialCells:'eco-initial'};
function beforeMatch() {
  return world.gen === 0 && game.players.every(p => p.stamps === 0);
}
export function bindEnergyPanel() {
  bindSliderLimits(Object.values(controls).map(id => $(id)));
  for (const [key,id] of Object.entries(controls)) {
    const slider = $(id);
    slider.value = String(game.economy[key]);
    slider.addEventListener('input', () => {
      if (key === 'initialCells' && !beforeMatch()) return;
      const value = parameterValue(slider.value, Number(slider.max));
      game.economy[key] = value;
      $(id+'-val').textContent = String(value);
      if (beforeMatch() && (key === 'initialCells' || key === 'stampCost')) {
        game.init = initialEnergy(game.economy);
        for (const player of game.players) player.reserve = game.init;
      }
      updateEnergyPanel();
    });
  }
  updateEnergyPanel();
}
export function updateEnergyPanel() {
  const human=game.players[0];
  if (!human) return;
  for (const [key,id] of Object.entries(controls)) {
    const slider=$(id);
    if (slider.value !== String(game.economy[key])) slider.value=String(game.economy[key]);
    $(id+'-val').textContent=String(game.economy[key]);
  }
  $('eco-initial').disabled = !beforeMatch();
  const e=game.economy;
  let stable=0;
  for (const id of world.ownerCells[1]) if ((world.cellAges?.[id] || 0) >= e.stableAfter) stable++;
  const fields={
    'eco-reserve':compact(human.reserve),
    'eco-can-stamp':e.stampCost===0?'∞':compact(availableCells(human.reserve,e)),
    'eco-generation':compact(world.gen),
    'eco-live':compact(world.ownerCells[1].length),
    'eco-stable':compact(stable),
    'eco-eroded':compact(human.eroded),
    'eco-births':compact(human.lastBirths),
    'eco-births-total':compact(human.totalBirths),
    'eco-deaths-total':compact(human.totalDeaths),
    'eco-income':signed(human.lastIncome),
    'eco-income-total':compact(human.received),
    'eco-maintenance':'−'+compact(human.lastUpkeep),
    'eco-maintenance-total':compact(human.paid),
    'eco-stamped-total':compact(human.stampedEnergy),
    'eco-flow':signed(human.lastFlow),
    'eco-rate':signed((human.flowAverage || 0)*(world.actual || world.speed))+'/s',
    'eco-eroded-last':compact(human.lastEroded),
  };
  for (const [id,value] of Object.entries(fields)) $(id).textContent=value;
  for (const id of ['eco-flow','eco-rate']) {
    $(id).classList.toggle('negative',(human.flowAverage||0)<0 || (id==='eco-flow' && human.lastFlow<0));
    $(id).classList.toggle('positive',(id==='eco-flow'?human.lastFlow:human.flowAverage)>0);
  }
}
