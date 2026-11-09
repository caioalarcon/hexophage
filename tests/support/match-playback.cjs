const assert = require('node:assert/strict');

module.exports = async function matchPlayback(page) {
  const play = page.locator('#hl-play');
  const stop = page.getByRole('button', { name: 'Parar e limpar a partida' });
  const reserve = page.locator('#eco-initial');
  await page.evaluate(() => window.__sphereLab.resetGame());
  assert.equal(await stop.isVisible(), false);
  assert.equal(await reserve.isEnabled(), true);
  await reserve.evaluate(input => {
    input.value = input.max;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Pause before even one animation frame. G0 alone cannot distinguish this
  // state from preparation, and resuming must not give another opening.
  const paused = await page.evaluate(() => {
    const lab = window.__sphereLab, button = document.getElementById('hl-play');
    button.click();
    const stamps = lab.game.players[0].stamps;
    button.click();
    return { generation: lab.world.gen, playing: lab.world.playing, stamps };
  });
  assert.equal(paused.generation, 0);
  assert.equal(paused.playing, false);
  assert.match(await play.textContent(), /Retomar/);
  assert.equal(await reserve.isDisabled(), true);
  assert.equal(await stop.isVisible(), true);
  await play.click();
  await page.waitForFunction(() => window.__sphereLab.world.gen > 0);
  assert.equal(await page.evaluate(() => window.__sphereLab.game.players[0].stamps), paused.stamps);
  await play.click();
  await stop.click();
  async function assertCleared() {
    assert.deepEqual(await page.evaluate(() => {
      const {game,world} = window.__sphereLab;
      return [world.playing, world.gen, world.activeCount,
        game.players.every(p => p.stamps === 0 && p.reserve === game.init && !p.out)];
    }), [false, 0, 0, true]);
    assert.equal(await stop.isVisible(), false);
    assert.match(await play.textContent(), /Iniciar/);
    assert.equal(await reserve.isEnabled(), true);
  }
  await assertCleared();

  // A new opening budget after Stop must apply to every player.
  const changed = await reserve.evaluate(input => {
    const before = window.__sphereLab.game.init, originalValue = input.value;
    input.value = Number(input.value) === Number(input.max) ? input.min : input.max;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const game = window.__sphereLab.game;
    const applied = before !== game.init && game.players.every(p => p.reserve === game.init);
    input.value = originalValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return applied;
  });
  assert.equal(changed, true);
  await play.click();
  await page.waitForFunction(() => window.__sphereLab.world.gen > 0);
  await stop.click();
  await assertCleared();
};
