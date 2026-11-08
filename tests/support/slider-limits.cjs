const assert = require('node:assert/strict');

module.exports = async function checkSliderLimits(page) {
  const birth = page.locator('#eco-birth-cost');
  const field = page.locator('#eco-limit');
  const dialog = page.locator('#eco-limit-dialog');
  const apply = dialog.locator('button[type=submit]');
  const settings = () => page.evaluate(() => ({ ...window.__sphereLab.game.economy }));
  const original = await settings();

  for (const id of ['eco-birth-cost','eco-stamp','eco-stable-energy','eco-age','eco-initial']) {
    const control = page.locator('#' + id);
    await control.click({ button: 'right' });
    await field.fill('12000');
    await apply.click();
    assert.equal(await control.getAttribute('max'), '12000');
    assert.deepEqual(await settings(), original, 'changing a limit preserves economy settings');
  }
  await birth.press('End');
  assert.equal((await settings()).birthCost, 12000);

  await birth.press('Shift+F10');
  await field.fill('100');
  await apply.click();
  assert(await dialog.isVisible(), 'a maximum below the active value requires correction');
  await page.keyboard.press('Escape');
  assert.equal(await birth.getAttribute('max'), '12000');

  for (const id of ['eco-birth-cost','eco-stamp','eco-stable-energy','eco-age','eco-initial']) {
    const control = page.locator('#' + id);
    if (id === 'eco-birth-cost') await control.evaluate(el => {
      el.value = '1'; el.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await page.locator('#' + id + '-val').click();
    await field.fill('100');
    await apply.click();
    assert.equal(await control.getAttribute('max'), '100');
  }
  assert.deepEqual(await settings(), original);
};
