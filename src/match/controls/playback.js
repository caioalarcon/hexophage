import { game } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { $ } from '../../layout/elements.js';
import { playbackState } from './playback-state.js';

function syncPlayButton() {
  const button = $('hl-play'),
    heading = $('br-match-heading');
  const result =
    game.winner === 1
      ? 'Você venceu'
      : game.winner
        ? game.names[game.winner] + ' venceu'
        : 'Empate';
  const mixed=world.rule==='mixed';
  const title = game.ended ? result : mixed&&game.humanEliminated ? 'Você foi eliminado' : mixed&&game.stopped ? 'Partida interrompida' : '⬡ HEXOPHAGE';
  if (heading.textContent !== title) heading.textContent = title;
  const started = world.matchStarted || world.gen > 0;
  const controls=playbackState({started,playing:world.playing,ended:game.ended,
    eliminated:mixed&&game.humanEliminated,stopped:mixed&&game.stopped});
  const {label}=controls;
  button.firstElementChild.textContent = controls.icon;
  button.lastElementChild.textContent = label;
  button.setAttribute('aria-label', label);
  $('hl-clear').hidden = !controls.canStop;
  if(mixed){
    $('hl-step').hidden=!controls.canStep;
    $('hl-step').disabled=!controls.canStep;
    $('mx-actions').dataset.state=controls.state;
  }
  button.title = controls.canRun ? label : 'Voltar à preparação com os ajustes atuais';
  button.classList.toggle('primary', !world.playing);
}
function setPlay(on) {
  world.playing = !!on && !game.ended && !(world.rule==='mixed'&&(game.stopped||game.humanEliminated));
  world.accum = 0;
  syncPlayButton();
}

export { setPlay, syncPlayButton };
