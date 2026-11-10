// Full-width globe inspection and an unpaid stamp's persistent map footprint.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--disable-webgl'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1907, height: 1085 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
    await page.goto(url);
    await page.waitForFunction(() => window.__hexophageMixed?.session);
    await page.locator('#mx-hand button').filter({ hasText: 'Fly' }).first().click();
    await page.evaluate(() => {
      const context = document.getElementById('hl-world').getContext('2d');
      const stroke = context.stroke;
      window.__previewStrokeColors = [];
      context.stroke = function (...args) {
        window.__previewStrokeColors.push(this.strokeStyle);
        return stroke.apply(this, args);
      };
    });
    for (const surface of ['atlas', 'local']) {
      if (surface === 'atlas') await page.click('#hl-overview');
      else {
        for (let attempt = 0; attempt < 20; attempt++) {
          if (await page.evaluate(() => !!__hexophageMixed.world.chart)) break;
          await page.click('#hl-zplus');
        }
      }
      assert.equal(await page.evaluate(() => !!__hexophageMixed.world.chart), surface === 'local');
      await page.evaluate(() => {
        __hexophageMixed.session.match.players[1].reserve = 0;
        __previewStrokeColors.length = 0;
        __hexophageMixed.world.needsDraw = true;
      });
      const rect = await page.locator('#hl-world').boundingBox();
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
      await page.mouse.move(x, y);
      await page.waitForFunction(() => __previewStrokeColors.includes('#ff8d78'));
      const before = await page.evaluate(() => __hexophageMixed.session.match.cells.size);
      await page.mouse.click(x, y);
      assert.equal(await page.evaluate(() => __hexophageMixed.session.match.cells.size), before);
      await page.evaluate(() => {
        __hexophageMixed.session.match.players[1].reserve = 10000;
        __previewStrokeColors.length = 0;
        __hexophageMixed.world.needsDraw = true;
      });
      // Funding changes the preview without another pointer event.
      await page.waitForFunction(() => __previewStrokeColors.includes('#ffd078'));
      await page.mouse.move(12, 12);
      await page.evaluate(() => {
        __previewStrokeColors.length = 0;
        __hexophageMixed.world.needsDraw = true;
      });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert(await page.evaluate(() => __hexophageMixed.world.hover === null));
      assert(await page.evaluate(() => !__previewStrokeColors.includes('#ffd078') && !__previewStrokeColors.includes('#ff8d78')));
    }

    for (const mode of ['mixed', 'callahan']) {
      if (mode === 'callahan') {
        await page.goto(url + '?rule=callahan');
        await page.waitForFunction(() => window.__sphereLab?.world);
      }
      await page.locator('#br-mini-max').click();
      for (const viewport of [{ width: 1907, height: 1085 }, { width: 1280, height: 800 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport);
        const [overlay, target] = await Promise.all(['#br-globe-overlay', '#br-globe-target'].map(selector => page.locator(selector).boundingBox()));
        assert(Math.abs(overlay.width - target.width) < 1);
        assert(Math.abs(overlay.height - target.height) < 1);
        assert(Math.abs(overlay.x - target.x) < 1 && Math.abs(overlay.y - target.y) < 1);
        await page.waitForFunction(() => {
          const canvas = document.getElementById('br-mini-fallback');
          const rect = document.getElementById('br-globe-target').getBoundingClientRect();
          const dpr = Math.min(devicePixelRatio || 1, 2);
          return canvas.width === Math.round(rect.width * dpr) && canvas.height === Math.round(rect.height * dpr);
        });
        await page.click('#br-globe-zoom-in');
        assert(await page.evaluate(() => (window.__hexophageMixed?.world ?? window.__sphereLab.world).globeZoom > 1));
      }
      const look = await page.evaluate(() => [...(window.__hexophageMixed?.world ?? window.__sphereLab.world).globeLook]);
      const target = await page.locator('#br-globe-target').boundingBox();
      await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2);
      await page.mouse.down();
      await page.mouse.move(target.x + target.width / 2 + 40, target.y + target.height / 2 + 25, { steps: 5 });
      await page.mouse.up();
      assert.notDeepEqual(await page.evaluate(() => [...(window.__hexophageMixed?.world ?? window.__sphereLab.world).globeLook]), look);
      await page.click('#br-globe-close');
      assert.equal(await page.locator('#br-globe-target').evaluate(node => node.parentElement.id), 'br-mini-slot');
      await page.setViewportSize({ width: 1907, height: 1085 });
    }
    assert.deepEqual(errors, []);
    console.log('PASS: full-viewport globe, paused resize, zoom and drag, persistent unpaid footprints on both map projections, refill without moving and pointer leave');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
