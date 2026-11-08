// Verify the compact production palette across desktop and mobile widths.
// On narrow viewports, horizontal scrolling is intentional: every one of the
// fifteen slots must remain reachable without increasing button widths.
const assert = require('node:assert/strict');

module.exports = async function checkSlotLabels(page) {
  const { patterns } = await import('../../src/patterns/catalog.js');
  const names = patterns.callahan.filter(p => p.group).map(p => p.name);
  const originalViewport = page.viewportSize();
  try {
    for (const viewport of [
      { width: 1902, height: 986 }, { width: 1718, height: 930 },
      { width: 1440, height: 900 }, { width: 1366, height: 768 },
      { width: 1024, height: 768 }, { width: 390, height: 844 },
      { width: 844, height: 390 }
    ]) {
      await page.setViewportSize(viewport);
      const failures = await page.evaluate(names => {
        const dock = document.querySelector('#br-deck');
        const cards = [...dock.querySelectorAll('.br-stampcard')];
        const errors = [];
        if (cards.length !== 15) return ['Expected 15 slots, found ' + cards.length];
        const style = getComputedStyle(dock);
        if (style.display !== 'flex') errors.push('Palette must use the production flex layout');
        if (!['auto', 'scroll'].includes(style.overflowX)) errors.push('Narrow palette must be scrollable');
        const scrollable = dock.scrollWidth > dock.clientWidth + 1;
        if (innerWidth >= 1700 && scrollable) errors.push('Unnecessary horizontal scroll on desktop');
        for (const card of cards) {
          if (card.getBoundingClientRect().width > 86) errors.push('Card too wide: ' + card.dataset.slot);
        }
        const labels = cards.map(card => card.querySelector('.br-stampname'));
        const originalLabels = labels.map(label => label.textContent);
        const scrollLeft = dock.scrollLeft;
        try {
          for (let i = 0; i < names.length; i += labels.length) {
            labels.forEach((label, j) => { label.textContent = names[i + j] || originalLabels[j]; });
            for (const card of cards) {
              // Offscreen cards are expected on small screens, but must be reachable.
              card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              const bounds = dock.getBoundingClientRect();
              const box = card.getBoundingClientRect();
              if (box.left < bounds.left - 1 || box.right > bounds.right + 1)
                errors.push('Inaccessible card: ' + card.dataset.slot);
              const label = card.querySelector('.br-stampname');
              const range = document.createRange();
              range.selectNodeContents(label);
              for (const line of range.getClientRects()) {
                if (line.left < box.left - 1 || line.right > box.right + 1)
                  errors.push('Text exceeds card width: ' + label.textContent);
              }
            }
            const bar = document.querySelector('.br-hotbar').getBoundingClientRect();
            if (bar.bottom > innerHeight + 1) errors.push('Hotbar outside the viewport');
            if (innerHeight > innerWidth &&
                document.querySelector('#br-mini-panel').getBoundingClientRect().bottom > bar.top)
              errors.push('Globe obscures the cards');
          }
        } finally {
          labels.forEach((label, j) => { label.textContent = originalLabels[j]; });
          dock.scrollLeft = scrollLeft;
        }
        return errors;
      }, names);
      assert.deepEqual(failures, [], 'Compact 15-slot palette at ' + viewport.width + 'x' + viewport.height);
    }
  } finally {
    await page.setViewportSize(originalViewport);
  }
};
