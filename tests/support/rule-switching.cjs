const assert = require('node:assert/strict');

module.exports = async function verifyRuleSwitching(page) {
  const rule = page.locator('#hl-rulechoice');
  const economy = page.locator('#br-economy-policy');
  const input = page.locator('#hl-rule');
  const conflict = page.locator('#br-conflict');
  const growth = page.locator('#br-growth'), limit = page.locator('#br-growth-threshold');
  if (await page.locator('#br-panel-toggle').getAttribute('aria-expanded') !== 'true')
    await page.locator('#br-panel-toggle').click();
  const settings = page.locator('details').filter({ has: rule });
  if (!await settings.evaluate(el => el.open)) await settings.locator(':scope > summary').click();
  assert(await rule.isVisible() && await economy.isVisible() && await conflict.isVisible());
  assert.equal(await conflict.inputValue(), 'lineage');
  assert.equal(await growth.inputValue(), 'classic');
  await page.evaluate(() => { window.originalPlanet = __sphereLab.world.graph; });
  const state = () => page.evaluate(() => {
    const { game, world } = __sphereLab;
    return { id: world.rule, key: game.profile.key, policy: game.economy.policy,
      gen: world.gen, samePlanet: world.graph === window.originalPlanet,
      botStamps: game.players.slice(1).map(p => p.stamps),
      cards: [...document.querySelectorAll('.br-stampcard')].map(b => b.dataset.pattern) };
  });
  // Every shipped rule restores its own complete, editable tariff through the same controls.
  for (const id of ['ashley15','hex-b2s245','highhex','bays245','andreen','hex-b2s34','ashley','bays','callahan']) {
    await rule.selectOption(id);
    const check = () => page.evaluate(() => {
      const {game, world} = __sphereLab, rates = game.profile.economy;
      return world.gen === 0 && Object.entries(rates).every(([key,value])=>game.economy[key]===value) &&
        [...document.querySelectorAll('[data-energy]')].every(el=>+el.value===rates[el.dataset.energy]) &&
        game.players.every(p=>p.reserve===rates.initialCells*rates.stampCost);
    });
    assert(await check(),id);
    if(id !== 'hex-b2s245') continue;
    const funding=page.locator('#br-birth-funding');
    assert.equal(await funding.inputValue(),'funded');
    await funding.selectOption('erosion');
    await page.locator('#br-empty-field').selectOption('free');
    assert.equal(await page.evaluate(()=>__sphereLab.game.economy.emptyFieldUpkeep),false);
    await page.locator('#eco-age').evaluate(el=>{
      el.value='100'; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change'));
    });
    assert.equal(await page.evaluate(()=>__sphereLab.game.economy.stableAfter),100);
    assert.equal(await page.evaluate(()=>__sphereLab.game.economy.fundBirths),false);
    await page.locator('#br-use-suggested').click();
    assert(await check());
    assert.equal(await page.locator('#br-empty-field').inputValue(),'charge');
    assert.equal(await funding.inputValue(),'funded');
  }
  await rule.selectOption('bays');
  const bays = await state();
  assert(bays.cards.includes('glider') && bays.cards.includes('osc2'),
    'Bays keeps its original patterns while economic ordering changes their position');
  assert.equal(bays.cards.length, 15);
  assert.equal(bays.policy, await page.evaluate(()=>__sphereLab.game.profile.economy.policy));
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
  await growth.selectOption('classic');
  assert.equal(await limit.isVisible(), false);
  await growth.selectOption('contained');
  await limit.fill('192');
  await limit.press('Tab');
  assert.equal(await page.evaluate(()=>__sphereLab.world.physics.growthThreshold), 192);
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
  await input.fill('B0/S23');
  await input.press('Tab');
  assert.equal(await growth.isDisabled(), true);
  assert.equal(await growth.inputValue(), 'classic');
  await rule.selectOption('callahan');
  assert.equal(await limit.inputValue(), '192');
  assert.equal(await growth.isEnabled(), true);
  assert.equal((await state()).cards.length, 15);
  await conflict.selectOption('lineage');
  await economy.selectOption('activity');
  await page.locator('#hl-step').evaluate(el => el.click());
  assert((await state()).botStamps.every(count => count === 1));
};
