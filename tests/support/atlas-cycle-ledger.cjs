const assert = require('node:assert/strict');

module.exports = async function checkAtlasCycleLedger(page) {
  const dialog = page.locator('#br-atlas-dialog');
  const close = page.locator('#br-atlas-close');
  const slot = page.locator('.br-slot-edit').first();
  const query = dialog.locator('#br-atlas-query');
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
  const fixture = { 'eco-stable-energy': .02, 'eco-age': 256, 'eco-scale': 1500, 'eco-birth-cost': 1, 'eco-stamp': 30 };
  const original = new Map();
  for (const [id, value] of Object.entries(fixture)) {
    const control = page.locator('#'+id);
    original.set(id, await control.inputValue());
    await setSlider(control, value);
  }
  const selectGun = async () => {
    await slot.click();
    await query.fill('Gun P20');
    await dialog.locator('#br-atlas-results button').first().click();
  };
  await selectGun();
  await report.waitFor();
  assert.equal(await payback.textContent(), 'Sem retorno no intervalo');
  assert.equal(await page.locator('#br-cycle-positive').textContent(), 'Nenhum no intervalo');
  const cells = await page.locator('#br-cycle-rows tr').first().locator('th,td').allTextContents();
  assert.deepEqual(cells.slice(2, 7), ['419','0','419','0 (27 cél.)','-419']);
  await page.locator('#br-atlas-cycle').click();
  await page.locator('#br-atlas-gen').filter({ hasText: /^Geração 20$/ }).waitFor();
  await close.click();

  await setSlider(stampCost, 0);
  await selectGun();
  await report.waitFor();
  assert.equal(await payback.textContent(), 'Geração 0', 'reopening reprices the same gun');
  assert.match(await page.locator('#br-cycle-stamp').textContent(), /0/);
  await setSlider(stampCost, 30);
  await query.fill('Gun P840');
  await dialog.locator('#br-atlas-results button').first().click();
  await query.fill('Crescedor de colmeia');
  await dialog.locator('#br-atlas-results button').first().click();
  await report.waitFor();
  const firstWindows = await page.locator('#br-cycle-rows tr').evaluateAll(rows =>
    rows.slice(0, 2).map(row => row.cells[6].textContent));
  assert.deepEqual(firstWindows, ['-121', '-117']);
  assert.match(await page.locator('#br-cycle-trend').textContent(), /positivo/);
  assert.equal(await page.locator('#br-cycle-rows tr').count(), 100);
  await close.click();
  for (const [id, value] of original) await setSlider(page.locator('#'+id), value);
  assert.deepEqual(await state(), before, 'atlas observations leave the match untouched');
};
