// Browser regression for spatial detail. Run with Playwright available:
// node tests/render-detail.cjs  (optionally set CHROMIUM_PATH).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH, args: ['--disable-webgl']});
  try {
    const page = await browser.newPage({viewport: {width: 1366, height: 768}});
    const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    await page.setContent(source.replace('window.__sphereLab={',
      'window.renderTest={addLive,atlasCamera,atlasState,drawAtlas,cv};window.__sphereLab={'));
    const report = await page.evaluate(() => {
      const lab = window.__sphereLab, {addLive, atlasCamera, atlasState, drawAtlas, cv} = window.renderTest;
      lab.newWorld(320);
      lab.resetGame();
      const w = lab.world, g = w.graph, xyz = g.coords, origin = xyz.subarray(w.center * 3, w.center * 3 + 3);
      document.querySelector('[data-pattern="gun"]').click();
      const gun = lab.patchForStamp(w.center, w.orient, lab.stampOffsets());
      const [scout] = lab.patchForStamp(w.center, w.orient, [[26, 5]]);
      for (const id of gun) addLive(id, 1);
      addLive(scout, 3);
      // Place a population much larger than the old raster budget off-camera.
      for (let id = 0; id < g.n && w.activeCount < 205065; id++) {
        const j = id * 3;
        if (xyz[j]*origin[0] + xyz[j+1]*origin[1] + xyz[j+2]*origin[2] < .2) addLive(id, 2);
      }
      w.chart = null;
      w.hover = null;
      return [8.1, 5.5, 3.2, 1].map(pitch => {
        atlasCamera.scale = pitch*g.f/1.16;
        drawAtlas();
        const a = atlasState(), image = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
        function ownerAt(id, owner) {
          const k = 3*id, dot = v => xyz[k]*v[0] + xyz[k+1]*v[1] + xyz[k+2]*v[2];
          const x = Math.floor(a.dpr*(a.cx + a.s*Math.atan2(dot(a.right), dot(a.look))));
          const y = Math.floor(a.dpr*(a.cy - a.s*Math.asin(dot(a.up))));
          const j = 4*(y*image.width+x), rgb = parseInt(lab.game.colors[owner].slice(1), 16);
          return [16,8,0].every((shift,i) => Math.abs(image.data[j+i] - ((rgb >>> shift)&255)) < 65);
        }
        const around = new Set();
        for (const id of gun) for (let k=0;k<g.deg[id];k++) {
          const nb=g.adj[6*id+k]; if(!w.cells[nb]) around.add(nb);
        }
        return {pitch, gun: gun.filter(id => ownerAt(id,1)).length, scout: ownerAt(scout,3),
          filledGaps: pitch>=3 ? [...around].filter(id => ownerAt(id,1)).length : 0};
      });
    });
    for(const row of report){
      assert.equal(row.gun, 64, 'gun cells at pitch '+row.pitch);
      assert(row.scout, 'isolated faction at pitch '+row.pitch);
      assert.equal(row.filledGaps, 0, 'empty gaps around the gun at pitch '+row.pitch);
    }
    console.log('PASS: whole gun, empty gaps and isolated faction survive off-screen density');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
