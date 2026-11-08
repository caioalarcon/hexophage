import { addLive, game, nextTick } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { $ } from '../../layout/elements.js';
import { resetGame } from './new-match.js';
import { setPlay } from './playback.js';
import { updateStats } from '../hud/status.js';

function bindTurnControls() {
  $('hl-play').onclick = () => {
    if (game.ended) resetGame();
    else setPlay(!world.playing);
  };
  $('hl-step').onclick = () => {
    setPlay(false);
    nextTick();
    updateStats();
  };
  $('hl-clear').onclick = resetGame;
  $('hl-seed').onclick = () => {
    const size = world.graph.n,
      nSeeds = Math.max(12, Math.floor(size / 2400));
    for (let k = 0; k < nSeeds; k++) {
      let id = Math.floor(Math.random() * size);
      for (let a = 0; a < 16; a++) {
        addLive(id);
        const d = world.graph.deg[id];
        id = world.graph.adj[id * 6 + Math.floor(Math.random() * d)];
      }
    }
    updateStats();
    world.needsDraw = true;
  };
  $('hl-speed').oninput = (e) => {
    world.speed = Number(e.target.value);
    $('hl-speed-val').textContent = world.speed + '/s';
    $('br-mobile-speed').textContent = world.speed + '/s';
  };
}

export { bindTurnControls };
