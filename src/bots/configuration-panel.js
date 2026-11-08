import { game } from '../browser/game.js';
import { $ } from '../layout/elements.js';
import { patterns } from '../patterns/catalog.js';

function bindBotSelectors() {
  const bots = $('br-bots');
  bots.replaceChildren();
  for (let id = 2; id <= 6; id++) {
    const label = document.createElement('label');
    label.className = 'br-botlabel';
    label.textContent = game.symbols[id] + ' ' + game.names[id];
    const select = document.createElement('select');
    select.id = 'br-bot-' + id;
    for (const p of patterns.callahan.filter((p) => p.id.startsWith('osc'))) {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.name;
      select.append(o);
    }
    select.value = game.bots[id - 2];
    select.onchange = () => {
      game.bots[id - 2] = select.value;
      if (game.players[id - 1]) {
        game.players[id - 1].pattern = select.value;
        game.players[id - 1].cachedOffsets = null;
      }
    };
    label.append(select);
    bots.append(label);
  }
}

export { bindBotSelectors };
