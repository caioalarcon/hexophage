import { game } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { updateDeckAvailability } from '../../deck/hand.js';
import { $ } from '../../layout/elements.js';

function stampReady() {
  const p = game.players[0];
  return !!p && !p.out && !game.ended && world.stampCount > 0 && p.reserve >= world.stampCount;
}

function updateStampReadiness() {
  const tag = $('hl-stampcount'),
    p = game.players[0],
    size = world.stampCount;
  const missing = Math.max(0, size - (p?.reserve || 0));
  const msg = game.ended
    ? 'Partida encerrada'
    : !size
      ? 'Vazio'
      : p?.out
        ? 'Eliminado'
        : size + ' de biomassa' + (missing ? ' · faltam ' + missing : ' · pronto');
  if (tag.textContent !== msg) tag.textContent = msg;
  tag.style.color = missing ? '#ffb99b' : '';
  const button = $('hl-mode');
  button.disabled = !stampReady();
  $('hl-demo').disabled = button.disabled;
  updateDeckAvailability();
}

export { stampReady, updateStampReadiness };
