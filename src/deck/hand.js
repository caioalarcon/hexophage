import { game } from '../browser/game.js';
import { drawDeckIcon } from './card-icon.js';
import { deckIds, deckNames, deckPoints } from './cards.js';
import { $ } from '../layout/elements.js';
import { patterns } from '../patterns/catalog.js';

function renderDeck(currentPatternId, loadPattern) {
  const dock = $('br-deck');
  if (!dock) return;
  // Reuse existing buttons and canvases; don't rebuild on every economy tick.
  const children = new Map(Array.from(dock.children).map((b) => [b.dataset.pattern, b]));
  for (const p of [...patterns.callahan.map((x) => x.id), 'manual']) {
    if (!deckIds.has(p)) continue;
    let b = children.get(p);
    if (!b) {
      b = document.createElement('button');
      b.type = 'button';
      b.className = 'br-stampcard';
      b.dataset.pattern = p;
      b.innerHTML =
        '<canvas width="68" height="38" aria-hidden="true"></canvas><span class="br-stampname"></span><span class="br-stampprice"></span><span class="br-charge"><i></i></span>';
      b.onclick = () => loadPattern(p);
    }
    b.querySelector('.br-stampname').textContent = deckNames[p];
    const points = deckPoints(p),
      price = points.length;
    drawDeckIcon(b.querySelector('canvas'), points);
    b.querySelector('.br-stampprice').textContent = price ? '◈' + price : 'Editar';
    b.title = deckNames[p] + ' · ' + price + ' de biomassa (seleção permitida mesmo sem reserva)';
    b.classList.toggle('selected', p === currentPatternId);
    b.setAttribute('aria-pressed', String(p === currentPatternId));
    dock.append(b);
    children.delete(p);
  }
  for (const el of children.values()) el.remove();
  updateDeckAvailability();
}
function updateDeckAvailability() {
  const dock = $('br-deck');
  if (!dock || !game.players.length) return;
  const reserve = game.players[0].reserve;
  for (const b of dock.children) {
    const cost = deckPoints(b.dataset.pattern).length;
    const fraction = cost ? Math.min(100, (reserve * 100) / cost) : 0;
    b.classList.toggle('unavailable', cost > reserve || !cost || game.ended);
    b.querySelector('.br-charge i').style.width = fraction + '%';
  }
}

export { renderDeck, updateDeckAvailability };
