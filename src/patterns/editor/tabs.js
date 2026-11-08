import { $ } from '../../layout/elements.js';
import { patterns } from '../catalog.js';
import { loadPattern, refreshTabs } from './selection.js';

function bindPatternTabs() {
  const tab = $('br-tabs');
  tab.replaceChildren();
  const names = {
    osc42: 'P42',
    osc66: 'P66',
    osc9: 'P9',
    osc14: 'P14',
    osc18: 'P18',
    gun: 'Glider gun',
    glider: 'Glider',
  };
  for (const p of patterns.callahan) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = names[p.id] || p.name;
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
