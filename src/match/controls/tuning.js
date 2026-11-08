import { game } from '../../browser/game.js';
import { $ } from '../../layout/elements.js';
import { clamp } from '../../world/geometry.js';
import { initialEnergy } from '../constructive-economy.js';

function bindTuning() {
  const interval = $('br-botturn');
  const difficulty = $('br-difficulty');
  const sync = () => {
    difficulty.value = 120 - 40 * Math.log10(game.interval);
    difficulty.setAttribute('aria-valuetext','Um carimbo a cada '+game.interval+' gerações por bot');
  };
  interval.oninput = () => {
    if (interval.value === '' || !Number.isFinite(interval.valueAsNumber)) return;
    game.interval = clamp(Math.round(interval.valueAsNumber), 1, 1000);
    sync();
  };
  interval.onchange = () => { interval.oninput(); interval.value = String(game.interval); };
  difficulty.oninput = e => {
    interval.value = String(Math.round(10 ** ((120 - Number(e.target.value)) / 40)));
    interval.oninput();
  };
  sync();
}
function readSettings() {
  game.init = initialEnergy(game.economy);
  game.tax = 0;
  game.interval = clamp(Math.round(Number($('br-botturn').value) || 10), 1, 1000);
}
export { bindTuning, readSettings };
