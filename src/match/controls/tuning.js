import { game } from '../../browser/game.js';
import { $ } from '../../layout/elements.js';
import { updateGamePanel } from '../hud/ranking.js';
import { clamp } from '../../world/geometry.js';

// UI uses permille (‰); the engine keeps the actual coefficient k.
function syncTuning() {
  $('br-tax-slider').value = Math.min(2, game.tax * 1000);
  $('br-tax-slider').setAttribute(
    'aria-valuetext',
    (game.tax * 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) + ' por mil',
  );
  $('br-difficulty').value = 120 - 40 * Math.log10(game.interval);
  $('br-difficulty').setAttribute(
    'aria-valuetext',
    'Um carimbo a cada ' + game.interval + ' gerações por bot',
  );
}
function bindTuning() {
  const rate = $('br-tax'),
    interval = $('br-botturn');
  function updateRate() {
    if (rate.value === '' || !Number.isFinite(rate.valueAsNumber)) return;
    game.tax = clamp(rate.valueAsNumber, 0, 20) / 1000;
    syncTuning();
    updateGamePanel(true);
  }
  rate.oninput = updateRate;
  rate.onchange = () => {
    updateRate();
    rate.value = String(Number((game.tax * 1000).toFixed(4)));
  };
  $('br-tax-slider').oninput = (e) => {
    rate.value = String(Number(e.target.value));
    updateRate();
  };
  function updateBots() {
    if (interval.value === '' || !Number.isFinite(interval.valueAsNumber)) return;
    game.interval = clamp(Math.round(interval.valueAsNumber), 1, 1000);
    syncTuning();
  }
  interval.oninput = updateBots;
  interval.onchange = () => {
    updateBots();
    interval.value = String(game.interval);
  };
  $('br-difficulty').oninput = (e) => {
    interval.value = String(Math.round(10 ** ((120 - Number(e.target.value)) / 40)));
    updateBots();
  };
  syncTuning();
}
function readSettings() {
  game.init = clamp(Math.round(Number($('br-initial').value) || 8000), 20, 200000);
  game.tax = clamp(Number($('br-tax').value) || 0, 0, 20) / 1000;
  game.interval = clamp(Math.round(Number($('br-botturn').value) || 28), 1, 1000);
  syncTuning();
}

export { bindTuning, readSettings };
