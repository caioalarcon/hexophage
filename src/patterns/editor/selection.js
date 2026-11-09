import { world } from '../../browser/world-state.js';
import { $ } from '../../layout/elements.js';
import { game } from '../../browser/game.js';
import { newStamp, stampFromPoints, stampOffsets } from './stamp-grid.js';
import { slotIds } from '../../deck/slots.js';
import { renderDeck } from '../../deck/hand.js';
import { savedPatterns } from './saved-patterns.js';
import { decodeRLE } from '../rle.js';

// Pattern selection is independent of simulation state and owner identity.
let currentPatternId = slotIds[0];

function loadPattern(id) {
  currentPatternId = id;
  const pat = game.gameplay.patterns.find((p) => p.id === id);
  const previous = savedPatterns.get(id);
  if (previous?.length) stampFromPoints(previous);
  else if (pat) stampFromPoints(decodeRLE(pat.rle));
  else {
    newStamp(11, false);
    $('hl-stampsize').value = '11';
  }
  $('hl-patternhelp').textContent = pat?.info || 'Padrão desenhado manualmente.';
  $('hl-pattern').value = id;
  refreshTabs();
}
function markEdited() {
  currentPatternId = 'manual';
  savedPatterns.set(
    'manual',
    stampOffsets().map(([q, r]) => [q, r]),
  );
  $('hl-pattern').value = 'manual';
  $('hl-patternhelp').textContent = 'Padrão personalizado.';
  refreshTabs();
}

function refreshTabs() {
  const id = $('hl-pattern').value;
  for (const button of $('br-tabs').children)
    button.classList.toggle('active', button.dataset.pattern === id);
  renderDeck(currentPatternId, loadPattern);
}

export { currentPatternId, loadPattern, markEdited, refreshTabs };
