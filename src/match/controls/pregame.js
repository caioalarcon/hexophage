import { world } from '../../browser/world-state.js';
import { syncDeckConfig } from '../../deck/configuration.js';
import { $ } from '../../layout/elements.js';

function syncPregameControls() {
  const changing = world.matchStarted || world.gen > 0;
  syncDeckConfig();
  $('hl-frequency').disabled = changing;
  $('hl-rebuild').disabled = changing;
  $('br-world-note').textContent = changing
    ? 'Para trocar o planeta, inicie uma nova partida.'
    : 'Carregar reinicia o mundo e a partida.';
  $('hexlab').classList.toggle('br-in-progress', changing);
}

export { syncPregameControls };
