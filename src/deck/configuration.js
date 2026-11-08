import { world } from '../browser/world-state.js';
import { deckIds, deckNames } from './cards.js';
import { renderDeck } from './hand.js';
import { $ } from '../layout/elements.js';
import { patterns } from '../patterns/catalog.js';
import { currentPatternId, loadPattern } from '../patterns/editor/selection.js';

function buildDeckConfig() {
  const host = $('br-deck-config');
  if (!host) return;
  host.replaceChildren();
  for (const id of [...patterns.callahan.map((p) => p.id), 'manual']) {
    const label = document.createElement('label');
    label.className = 'br-deck-choice';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = deckIds.has(id);
    check.dataset.pattern = id;
    check.onchange = () => {
      if (world.gen > 0) {
        check.checked = deckIds.has(id);
        return;
      }
      if (check.checked) deckIds.add(id);
      else {
        if (deckIds.size === 1) {
          check.checked = true;
          return;
        }
        deckIds.delete(id);
      }
      if (!deckIds.has(currentPatternId)) loadPattern([...deckIds][0]);
      renderDeck(currentPatternId, loadPattern);
    };
    label.append(check, document.createTextNode(' ' + deckNames[id]));
    host.append(label);
  }
}
function syncDeckConfig() {
  const host = $('br-deck-config');
  if (!host) return;
  for (const check of host.querySelectorAll('input')) check.disabled = world.gen > 0;
}

export { buildDeckConfig, syncDeckConfig };
