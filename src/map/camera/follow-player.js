import { game } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { toast } from '../../layout/announcements.js';
import { $ } from '../../layout/elements.js';
import { toggleView } from './orientation.js';
import { centerOnPlayer } from './player-sector.js';
import { markRender } from '../../match/hud/status.js';

function bindPlayerFollow() {
  $('br-follow').onchange = (e) => {
    const p = game.players[Number(e.target.value) - 1];
    if (!p) return;
    if (world.view !== 'flat') toggleView();
    centerOnPlayer(p.seed);
    e.target.value = '';
    markRender();
    toast('Mapa centrado em ' + p.symbol + ' ' + p.name + '.');
  };
}

export { bindPlayerFollow };
