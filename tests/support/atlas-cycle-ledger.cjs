const assert = require('node:assert/strict');

module.exports = async function checkAtlasCycleLedger(page) {
  const dialog = page.locator('#br-atlas-dialog');
  const close = page.locator('#br-atlas-close');
  const slot = page.locator('.br-stampcard[data-pattern="gun20"] .br-slot-edit');
  const stampCost = page.locator('#eco-stamp');
  const report = page.locator('#br-cycle-report');
  const payback = page.locator('#br-cycle-payback');
  const state = () => page.evaluate(() => {
    const { world, game } = window.__sphereLab;
    return [world.gen, world.activeCount, game.players[0].reserve, game.players[0].eroded];
  });
  const setSlider = (slider, value) => slider.evaluate((input, v) => {
    input.value = String(v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  const before = await state();
  await setSlider(page.locator('#eco-birth'), 1);
  await slot.click();
  await report.waitFor();
  assert.match(await payback.textContent(), /219/);
  assert.match(await page.locator('#br-cycle-capital').textContent(), /829/);
  assert.match(await page.locator('#br-cycle-positive').textContent(), /6/);
  const cells = await page.locator('#br-cycle-rows tr').first().locator('th,td').allTextContents();
  assert(cells.some(value => value.includes('721')), 'first emission upkeep');
  assert(cells.some(value => value.includes('540')), 'fixed-core share of upkeep');
  await page.locator('#br-atlas-cycle').click();
  await page.locator('#br-atlas-gen').filter({ hasText: /^Geração 20$/ }).waitFor();
  await close.click();

  await setSlider(stampCost, 0);
  await slot.click();
  await report.waitFor();
  assert.doesNotMatch(await payback.textContent(), /219/, 'reopening reprices the same gun');
  assert.match(await page.locator('#br-cycle-stamp').textContent(), /0/);
  await setSlider(stampCost, 10);
  const query = dialog.locator('#br-atlas-query');
  await query.fill('Gun P840');
  await dialog.locator('#br-atlas-results button').first().click();
  await query.fill('Crescedor de colmeia');
  await dialog.locator('#br-atlas-results button').first().click();
  await report.waitFor();
  const firstWindows = await page.locator('#br-cycle-rows tr').evaluateAll(rows =>
    rows.slice(0, 2).map(row => row.textContent));
  assert.match(firstWindows[0], /793/);
  assert.match(firstWindows[1], /1[.\s]?092/);
  await close.click();
  assert.deepEqual(await state(), before, 'atlas observations leave the match untouched');
};
