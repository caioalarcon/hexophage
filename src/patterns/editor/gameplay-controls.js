import { bindBotSelectors } from '../../bots/configuration-panel.js';
import { selectedSlot, slotIds, useSlots } from '../../deck/slots.js';
import { $ } from '../../layout/elements.js';
import { syncAtlasCatalog } from '../atlas-browser.js';
import { useSavedPatterns } from './saved-patterns.js';
import { loadPattern } from './selection.js';
import { bindPatternTabs } from './tabs.js';

export function syncGameplayControls(gameplay, scopeKey) {
  useSlots(gameplay, scopeKey);
  useSavedPatterns(scopeKey);
  syncAtlasCatalog(gameplay);
  const select = $('hl-pattern');
  select.replaceChildren();
  for (const p of gameplay.patterns) select.add(new Option(p.name, p.id));
  select.add(new Option('Desenho livre', 'manual'));
  bindPatternTabs();
  bindBotSelectors();
  loadPattern(slotIds[selectedSlot] ?? 'manual');
}
