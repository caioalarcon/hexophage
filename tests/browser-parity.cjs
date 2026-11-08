// Compare the development page to the last single-file release, in the same Chromium.
// Run with Playwright installed and full Git history: node tests/browser-parity.cjs
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
const baseline = '18baed7db19924ae2363f2702c33862ad86303f9';
const original = execFileSync('git', ['show', baseline + ':index.html'], {cwd: root});
const mime = {'.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.html': 'text/html'};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/baseline/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(original);
  }
  const name = path.resolve(root, '.' + url.pathname.replace(/^\/dev\//, '/'));
  const target = name === root ? path.join(root, 'index.html') : name;
  if (!url.pathname.startsWith('/dev/') || !target.startsWith(root + path.sep) || !fs.statSync(target, {throwIfNoEntry: false})?.isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader('Content-Type', (mime[path.extname(target)] || 'application/octet-stream') + '; charset=utf-8');
  fs.createReadStream(target).pipe(res);
});

// Drive the animation explicitly. Browser-native layout/ResizeObserver can still settle.
function installClock(blockWorker) {
  const NativeWorker = window.Worker;
  window.sphereWorkers = {started: 0, completed: 0};
  window.Worker = class extends NativeWorker {
    constructor(...args) {
      if (blockWorker) throw new Error('Worker unavailable in this test');
      super(...args);
      window.sphereWorkers.started++;
      this.addEventListener('message', ({data}) => {
        if (data.g) window.sphereWorkers.completed++;
      });
    }
  };
  const raf = requestAnimationFrame.bind(window);
  let time = 0, pending = [], random = 13579;
  window.requestAnimationFrame = callback => pending.push(callback);
  Math.random = () => (random = (Math.imul(1664525, random) + 1013904223) >>> 0) / 4294967296;
  window.paintGame = async () => {
    await new Promise(resolve => raf(() => raf(resolve)));
    const batch = pending;
    pending = [];
    time += 400;
    for (const callback of batch) callback(time);
  };
}

// Hash every occupied cell in its actual traversal order and every pixel of the
// two canvases. Restrict UI state to user-visible contents, geometry and controls.
async function snapshot() {
  await window.paintGame();
  const lab = window.__sphereLab, w = lab.world, g = lab.game;
  const el = id => document.getElementById(id);
  const digest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    x => x.toString(16).padStart(2, '0')).join('');
  const pixels = async id => {
    const c = el(id);
    return [c.width, c.height, await digest(c.getContext('2d').getImageData(0, 0, c.width, c.height).data)];
  };
  const gl = lab.gpu.gl;
  let framebuffer = null;
  if (gl) {
    const bytes = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    framebuffer = [gl.drawingBufferWidth, gl.drawingBufferHeight, await digest(bytes)];
  }
  const active = w.active.subarray(0, w.activeCount);
  const geometry = id => {
    const r = el(id).getBoundingClientRect();
    return [r.left, r.top, r.width, r.height];
  };
  return {
    workers: {...window.sphereWorkers}, framebuffer,
    field: {generation: w.gen, evaluated: w.evaluated, frequency: w.graph.f, size: w.graph.n, rule: w.rule,
      population: w.activeCount, active: await digest(active), owners: await digest(w.owners),
      byOwner: w.ownerCells.map(items => items.length)},
    match: {tax: g.tax, interval: g.interval, ended: g.ended, winner: g.winner, rng: g.rngState,
      history: g.humanHistory, players: g.players.map(({id, seed, pattern, out, stamps, reserve, received, paid, eroded, debtCarry}) =>
        ({id, seed, pattern, out, stamps, reserve, received, paid, eroded, debtCarry}))},
    stamp: lab.stampOffsets(), pose: [w.center, w.orient, w.side, w.zoom, w.globeZoom, !!w.chart],
    controls: {disabled: el('hl-frequency').disabled, tuning: el('br-tuning-toggle').ariaExpanded,
      panel: el('br-panel-toggle').ariaExpanded, globe: !el('br-globe-overlay').hidden,
      ledger: el('br-ledger').open, speed: w.speed, play: el('hl-play').textContent,
      deck: el('br-deck').textContent, podium: el('br-podium').textContent, rows: el('br-ranking').textContent,
      status: el('br-gamestatus').textContent},
    layout: ['hl-world', 'br-deck', 'br-rail', 'br-globe-target', 'br-sidepanel'].map(geometry),
    map: await pixels('hl-world'), globe: await pixels('br-mini-fallback'),
  };
}

async function replay(browser, url, viewport, gpu) {
  const page = await browser.newPage({viewport});
  const errors = [], checkpoints = {};
  page.on('pageerror', err => errors.push(err.message));
  page.on('response', r => {if (r.status() >= 400) errors.push(r.status() + ' ' + r.url());});
  try {
    const fallback = viewport.width < viewport.height;
    await page.addInitScript(installClock, fallback);
    await page.goto(url);
    assert.deepEqual(errors, [], 'page startup');
    const save = async name => {
      const state = checkpoints[name] = await page.evaluate(snapshot);
      if (['startup', '96 ticks with transfers and bots', 'maximized globe', 'win'].includes(name)) {
        const png = await page.screenshot({animations: 'disabled', caret: 'hide'});
        state.screenshot = createHash('sha256').update(png).digest('hex');
      }
    };
    const click = id => page.evaluate(key => document.getElementById(key).click(), id);
    const change = (id, value, event = 'change') => page.evaluate(([key, v, evt]) => {
      const input = document.getElementById(key);
      input.value = v; input.dispatchEvent(new Event(evt, {bubbles: true}));
    }, [id, value, event]);
    await save('startup');
    assert.equal(checkpoints.startup.field.frequency, 320);
    assert.equal(!!checkpoints.startup.framebuffer, gpu, 'expected renderer');
    await click('br-panel-toggle');
    await click('br-tuning-toggle');
    await change('hl-speed', '75', 'input');
    await save('panel and tuning');
    await click('br-panel-close');
    await change('hl-frequency', '32');
    await click('hl-rebuild');
    await page.waitForFunction(() => __sphereLab.world.graph.f === 32 && !document.getElementById('br-building').open,
      undefined, {polling: 30});
    await save('sphere rebuild');
    assert.deepEqual(checkpoints['sphere rebuild'].workers,
      fallback ? {started:0,completed:0} : {started:1,completed:1}, 'sphere construction path');
    await change('br-botturn', '8');
    await change('br-tax', '20');
    await change('hl-pattern', 'osc42');
    await click('hl-stampcw');
    await click('hl-stampflip');
    await click('hl-demo');
    await click('hl-seed');
    await save('plant, transform and seed');
    assert.equal(checkpoints['plant, transform and seed'].match.players[0].stamps, 1);
    await click('br-menu-step');
    await save('first tick');
    await page.evaluate(() => {for (let i=0; i<95; i++) __sphereLab.nextTick();});
    await click('br-ledger-open');
    await save('96 ticks with transfers and bots');
    const match = checkpoints['96 ticks with transfers and bots'].match;
    assert(match.players.some(p => p.paid > 0) && match.players.slice(1).every(p => p.stamps > 0));
    await page.evaluate(() => document.getElementById('br-ledger').close());
    await click('hl-overview');
    await save('atlas');
    const map = await page.locator('#hl-world').boundingBox();
    const x = map.x + map.width/2, y = map.y + map.height/2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 32, y + 16, {steps: 5});
    await page.mouse.up();
    await page.mouse.wheel(0, -140);
    await save('drag and wheel');
    await click('hl-sideflip');
    await click('hl-rotatecw');
    await click('br-mini-max');
    await click('br-globe-zoom-in');
    await save('maximized globe');
    await click('br-globe-close');
    await click('hl-clear');
    for (const [rule, expression, ticks] of [['bays', '', 20], ['custom', 'B0/S23', 3]]) {
      await page.evaluate(([rule, expression]) => {
        document.getElementById('hl-rule').value = expression;
        __sphereLab.chooseRule(rule);
      }, [rule, expression]);
      await click('hl-seed');
      await page.evaluate(n => { for (let i=0; i<n; i++) __sphereLab.nextTick(); }, ticks);
      await save(rule);
    }
    assert.equal(checkpoints.custom.field.evaluated, checkpoints.custom.field.size);
    await click('hl-clear');
    await page.evaluate(() => { for (const p of __sphereLab.game.players.slice(1)) p.reserve=0; });
    await click('hl-step');
    await save('win');
    assert.equal(checkpoints.win.match.winner, 1);
    await click('hl-play');
    await save('rematch');
    assert.equal(checkpoints.rematch.field.generation, 0);
    // At 3/s one 300ms-clamped frame accrues 0.9 ticks. Two frames advance once.
    await change('hl-speed','3','input');
    await click('hl-play');
    await page.evaluate(() => window.paintGame());
    await save('play');
    assert.equal(checkpoints.play.field.generation, 1);
    await click('hl-play');
    await save('pause');
    assert.equal(checkpoints.pause.field.generation, 1);
    assert.deepEqual(errors, [], 'browser exceptions or missing files');
    return checkpoints;
  } finally { await page.close(); }
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const host = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    for (const [width, height, gpu] of [[1366,768,false],[390,844,false],[1366,768,true]]) {
      const args = gpu ? ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--disable-webgl'];
      // Repaint complete tiles for pixel parity. Chromium's partial raster can round
      // the same antialiased edge differently on two runs of the unchanged page.
      args.push('--disable-partial-raster');
      browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH, args});
      const viewport = {width, height};
      const expected = await replay(browser, host + '/baseline/', viewport, gpu);
      const actual = await replay(browser, host + '/dev/', viewport, gpu);
      for (const key of Object.keys(expected)) assert.deepEqual(actual[key], expected[key], key);
      console.log('PASS: ' + Object.keys(expected).length + ' browser checkpoints at ' + width + '×' + height + ' ' + (gpu?'WebGL':'Canvas'));
      await browser.close();
      browser = null;
    }
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(err => {console.error(err); process.exitCode=1;});
