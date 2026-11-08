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
  await setSlider(page.locator('#eco-birth-cost'), 1);
  await slot.click();
  await report.waitFor();
  assert.equal(await payback.textContent(), 'Geração 48');
  assert.equal(await page.locator('#br-cycle-capital').textContent(), '284');
  assert.equal(await page.locator('#br-cycle-positive').textContent(), 'Ciclo 1');
  const cells = await page.locator('#br-cycle-rows tr').first().locator('th,td').allTextContents();
  assert.deepEqual(cells.slice(2, 7), ['419','498','419','486 (27 cél.)','+79']);
  await page.locator('#br-atlas-cycle').click();
  await page.locator('#br-atlas-gen').filter({ hasText: /^Geração 20$/ }).waitFor();
  await close.click();

  await setSlider(stampCost, 0);
  await slot.click();
  await report.waitFor();
  assert.equal(await payback.textContent(), 'Geração 0', 'reopening reprices the same gun');
  assert.match(await page.locator('#br-cycle-stamp').textContent(), /0/);
  await setSlider(stampCost, 30);
  const query = dialog.locator('#br-atlas-query');
  await query.fill('Gun P840');
  await dialog.locator('#br-atlas-results button').first().click();
  await query.fill('Crescedor de colmeia');
  await dialog.locator('#br-atlas-results button').first().click();
  await report.waitFor();
  const firstWindows = await page.locator('#br-cycle-rows tr').evaluateAll(rows =>
    rows.slice(0, 2).map(row => row.cells[6].textContent));
  assert.deepEqual(firstWindows, ['+488', '+2.478']);
  await close.click();
  assert.deepEqual(await state(), before, 'atlas observations leave the match untouched');
};
