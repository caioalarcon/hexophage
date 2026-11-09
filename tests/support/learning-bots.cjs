const assert = require('node:assert/strict');

module.exports = async function verifyLearningReload(page) {
  const url = new URL(page.url());
  url.searchParams.delete('bots');
  const ready = () => page.waitForFunction(() => window.__sphereLab?.game.players.length === 6);
  await page.goto(url.href);
  await ready();
  const first = await page.evaluate(() => {
    const { game, chooseRule, nextTick } = __sphereLab;
    chooseRule('bays');
    for (let i = 0; i < 4000; i++) nextTick();
    return { mode: game.botMode, completed: game.brainMetrics.completed, memory: game.brainMemory.stats() };
  });
  assert.equal(first.mode, 'learn');
  const changed = await page.evaluate(() => {
    const { game, world, nextTick } = __sphereLab;
    const prior = game.brainMemory, g = world.gen, select = document.querySelector('#br-brain-rate');
    const defaultRate = game.brainRate;
    select.value = '1';
    select.dispatchEvent(new Event('change', {bubbles:true}));
    const before = game.brainMetrics.visits;
    for (let i = 0; i < 2000; i++) nextTick();
    return { defaultRate, rate: game.brainRate, sameMemory: game.brainMemory === prior,
      elapsed: world.gen - g, visits: game.brainMetrics.visits - before,
      enabled: !document.querySelector('#br-brain-rate-label').hidden };
  });
  assert.deepEqual([changed.defaultRate,changed.rate,changed.sameMemory,changed.elapsed,changed.enabled],
    [8,1,true,2000,true]);
  assert(changed.visits <= 8192 + 96 * 2000);
  assert(first.completed > 0 && first.memory.observations > 0);
  await page.reload();
  await ready();
  const resumed = await page.evaluate(() => {
    const { game, chooseRule, nextTick } = __sphereLab;
    nextTick();
    const unrelated = game.brainMemory.stats().priorSamples;
    chooseRule('bays');
    nextTick();
    return { unrelated, prior: game.brainMemory.stats().priorSamples, privateSamples: game.brainMemory.stats().privateSamples };
  });
  assert.equal(resumed.unrelated, 0);
  assert(resumed.prior > 0);
  assert.equal(resumed.privateSamples, 0);
  const slider = page.locator('#eco-birth-cost');
  await slider.evaluate(el => { el.value = '2'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.equal(await page.evaluate(() => __sphereLab.game.brainMemory.stats().priorSamples), 0);
  await page.locator('#br-bot-mode').evaluate(el => {
    el.value = 'profile'; el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  assert.equal(await page.evaluate(() => __sphereLab.game.botMode), 'profile');
  console.log('PASS: learner preview, real reload, private memory, tariff and mode switches');
};
