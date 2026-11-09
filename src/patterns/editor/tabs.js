import { $ } from '../../layout/elements.js';
import { game } from '../../browser/game.js';
import { loadPattern, refreshTabs } from './selection.js';

function bindPatternTabs() {
  const tab = $('br-tabs');
  tab.replaceChildren();
  for (const p of game.gameplay.patterns) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = p.name;
    button.dataset.pattern = p.id;
    button.onclick = () => {
      loadPattern(p.id);
      $('hl-pattern').value = p.id;
      refreshTabs();
    };
    tab.append(button);
  }
  const free = document.createElement('button');
  free.type = 'button';
  free.textContent = 'Livre';
  free.onclick = () => loadPattern('manual');
  tab.append(free);
}
export { bindPatternTabs };
