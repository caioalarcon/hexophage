import { game } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { $ } from '../../layout/elements.js';

function syncPlayButton() {
  const button = $('hl-play'),
    heading = $('br-match-heading');
  const result =
    game.winner === 1
      ? 'Você venceu'
      : game.winner
        ? game.names[game.winner] + ' venceu'
        : 'Empate';
  const title = game.ended ? result : '⬡ HEXOPHAGE';
  if (heading.textContent !== title) heading.textContent = title;
  const started = world.matchStarted || world.gen > 0;
  const label = game.ended ? 'Nova partida' : world.playing ? 'Pausar' : started ? 'Retomar' : 'Iniciar';
  button.firstElementChild.textContent = game.ended ? '↻' : world.playing ? '❚❚' : '▶';
  button.lastElementChild.textContent = label;
  button.setAttribute('aria-label', label);
  $('hl-clear').hidden = !started || game.ended;
  button.title = game.ended ? 'Voltar à preparação com os ajustes atuais' : label;
  button.classList.toggle('primary', !world.playing);
}
function setPlay(on) {
  world.playing = !!on && !game.ended;
  world.accum = 0;
  syncPlayButton();
}

export { setPlay, syncPlayButton };
