const assert = require('node:assert/strict');

module.exports = async function verifyRuleSwitching(page) {
  const rule = page.locator('#hl-rulechoice');
  const economy = page.locator('#br-economy-policy');
  const input = page.locator('#hl-rule');
  const conflict = page.locator('#br-conflict');
  if (await page.locator('#br-panel-toggle').getAttribute('aria-expanded') !== 'true')
    await page.locator('#br-panel-toggle').click();
  const settings = page.locator('details').filter({ has: rule });
  if (!await settings.evaluate(el => el.open)) await settings.locator('summary').click();
  assert(await rule.isVisible() && await economy.isVisible() && await conflict.isVisible());
  assert.equal(await conflict.inputValue(), 'lineage');
  await page.evaluate(() => { window.originalPlanet = __sphereLab.world.graph; });
  const state = () => page.evaluate(() => {
    const { game, world } = __sphereLab;
    return { id: world.rule, key: game.profile.key, policy: game.economy.policy,
      gen: world.gen, samePlanet: world.graph === window.originalPlanet,
      botStamps: game.players.slice(1).map(p => p.stamps),
      cards: [...document.querySelectorAll('.br-stampcard')].map(b => b.dataset.pattern) };
  });
  await rule.selectOption('bays');
  const bays = await state();
  assert.deepEqual(bays.cards.slice(0, 2), ['glider', 'osc2']);
  assert.equal(bays.cards.length, 15);
  assert.equal(bays.policy, 'activity');
  assert.equal(bays.samePlanet, true);
  await page.locator('#br-open-atlas').evaluate(el => el.click());
  assert((await page.locator('#br-atlas-results button').count()) > bays.cards.length);
  await page.locator('#br-atlas-results button').filter({ hasText: 'Oscilador · P2' }).first().click();
  await page.waitForFunction(() => !document.querySelector('#br-cycle-report').hidden);
  await page.locator('#br-atlas-close').click();
  await page.locator('#hl-step').evaluate(el => el.click());
  assert((await state()).botStamps.every(count => count === 1));
  const beforeConflict = await state();
  const balances = () => page.evaluate(() => __sphereLab.game.players.map(p=>p.reserve));
  const beforeCash = await balances();
  await conflict.selectOption('block');
  assert.deepEqual(await state(), beforeConflict);
  assert.deepEqual(await balances(), beforeCash);
  assert.equal(await page.evaluate(()=>__sphereLab.game.conflict), 'block');
  await economy.selectOption('stability');
  assert.equal((await state()).gen, 0);
  assert.equal((await state()).id, 'bays');
  await page.locator('#br-reset').click();
  assert.equal((await state()).policy, 'stability');

  await rule.selectOption('custom');
  assert.equal(await conflict.inputValue(), 'block');
  await input.fill('B/S0');
  await input.press('Tab');
  const custom = await state();
  assert.equal(custom.key, 'custom/B/S0');
  assert(custom.samePlanet && !custom.cards.includes('glider'));
  await page.locator('#hl-step').evaluate(el => el.click());
  const before = await state();
  await input.fill('B7/S');
  await input.press('Tab');
  assert.equal(await input.getAttribute('aria-invalid'), 'true');
  assert.deepEqual(await state(), before);
  await input.fill(' b / s00 ');
  await input.press('Tab');
  assert.equal(await input.inputValue(), 'B/S0');
  assert.deepEqual(await state(), before);
  await input.fill('B3/S23');
  await input.press('Tab');
  assert.equal((await state()).gen, 0);
  assert.equal((await state()).key, 'custom/B3/S23');
  await rule.selectOption('callahan');
  assert.equal((await state()).cards.length, 15);
  await conflict.selectOption('lineage');
  await economy.selectOption('activity');
  await page.locator('#hl-step').evaluate(el => el.click());
  assert((await state()).botStamps.every(count => count === 1));
};
