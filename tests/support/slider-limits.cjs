const assert = require('node:assert/strict');

module.exports = async function checkSliderLimits(page) {
  const dialog = page.locator('#eco-limit-dialog'), field = page.locator('#eco-limit');
  const apply = dialog.locator('button[type=submit]');
  const settings = () => page.evaluate(() => ({ ...window.__sphereLab.game.economy }));
  const original = await settings();
  for(const control of await page.locator('#br-energy-sliders input[type=range]').all()){
    const maximum = await control.getAttribute('max');
    await control.click({button:'right'});
    await field.fill(String(Number(maximum)*2));
    await apply.click();
    assert.equal(await control.getAttribute('max'),String(Number(maximum)*2));
    assert.deepEqual(await settings(),original);
    await control.press('Shift+F10');
    await field.fill(maximum); await apply.click();
    assert.equal(await control.getAttribute('max'),maximum);
  }
  const fee=page.locator('#eco-combat-fee');
  await fee.evaluate(el=>{el.value='0.37';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal((await settings()).combatFee,.37);
  await page.locator('#eco-combat-fee-val').click();await field.fill('0.1');await apply.click();
  assert(await dialog.isVisible());await page.keyboard.press('Escape');
  await fee.evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));}, original.combatFee);
  assert.deepEqual(await settings(),original);
};
