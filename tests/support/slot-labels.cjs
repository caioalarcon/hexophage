// Exercise the real slot styles with every selectable name, including the longest ones.
const assert = require('node:assert/strict');

module.exports = async function checkSlotLabels(page) {
  const { patterns } = await import('../../src/patterns/catalog.js');
  const names = patterns.callahan.filter(p => p.group).map(p => p.name);
  const originalViewport = page.viewportSize();
  try {
    for (const viewport of [{ width: 1902, height: 986 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      const failures = await page.evaluate(names => {
        const cards = [...document.querySelectorAll('#br-deck .br-stampcard')];
        if (!cards.length) throw new Error('No pattern slots to verify');
        const labels = cards.map(card => card.querySelector('.br-stampname'));
        const original = labels.map(label => label.textContent);
        const errors = [];
        try {
          for (let i = 0; i < names.length; i += labels.length) {
            labels.forEach((label, j) => { label.textContent = names[i + j] || original[j]; });
            cards.forEach((card, j) => {
              const box = card.getBoundingClientRect(), range = document.createRange();
              range.selectNodeContents(labels[j]);
              const charge = card.querySelector('.br-charge').getBoundingClientRect();
              for (const line of range.getClientRects()) {
                if (line.left < box.left || line.right > box.right || line.bottom > charge.top + 1) {
                  errors.push(labels[j].textContent);
                }
              }
            });
            const bar = document.querySelector('.br-hotbar').getBoundingClientRect();
            if (bar.bottom > innerHeight + 1) errors.push('hotbar outside the viewport');
            if (innerHeight > innerWidth && document.querySelector('#br-mini-panel').getBoundingClientRect().bottom > bar.top) {
              errors.push('globe obscures the cards');
            }
          }
        } finally {
          labels.forEach((label, j) => { label.textContent = original[j]; });
        }
        return errors;
      }, names);
      assert.deepEqual(failures, [], 'Pattern slot layout at ' + viewport.width + '×' + viewport.height);
    }
  } finally {
    await page.setViewportSize(originalViewport);
  }
};
