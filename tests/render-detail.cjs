// Browser regression for spatial detail. Run with Playwright available:
// node tests/render-detail.cjs  (optionally set CHROMIUM_PATH).
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const {chromium} = require('playwright');

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH, args: ['--disable-webgl']});
  try {
    const page = await browser.newPage({viewport: {width: 1366, height: 768}});
    await page.goto(pathToFileURL(path.join(__dirname, '..', 'index.html')).href);
    const report = await page.evaluate(async () => {
      const lab = window.__sphereLab, cv = document.getElementById('hl-world');
      lab.newWorld(320);
      lab.resetGame();
      const w = lab.world, g = w.graph, xyz = g.coords, origin = xyz.subarray(w.center * 3, w.center * 3 + 3);
      document.querySelector('[data-pattern="gun"]').click();
      const gun = lab.patchForStamp(w.center, w.orient, lab.stampOffsets());
      const [scout] = lab.patchForStamp(w.center, w.orient, [[26, 5]]);
      if (!lab.commitStamp(1, gun) || !lab.commitStamp(3, [scout])) throw new Error('Invalid test setup');
      const far = [];
      for (let id = 0; id < g.n && far.length + w.activeCount < 205065; id++) {
        const j = id * 3;
        if (xyz[j]*origin[0] + xyz[j+1]*origin[1] + xyz[j+2]*origin[2] < .2) far.push(id);
      }
      lab.game.players[1].reserve = far.length;
      if (!lab.commitStamp(2, far)) throw new Error('Failed to create distant population');
      // Compute the projection independently from the graph and the public zoom API.
      const vector = id => Array.from(xyz.subarray(3*id, 3*id+3));
      const unit = v => v.map(n => n/Math.hypot(...v));
      const cross = ([a,b,c],[x,y,z]) => [b*z-c*y, c*x-a*z, a*y-b*x];
      const look = unit(vector(w.center)), east = unit(vector(g.adj[6*w.center+w.orient]));
      const dot = look.reduce((sum, x, i) => sum + x*east[i], 0);
      const right = unit(east.map((x,i) => x-dot*look[i])), up = cross(look,right);
      const rect = cv.getBoundingClientRect(), dpr = cv.width/rect.width;
      const rows = [];
      for (const pitch of [8.1, 5.5, 3.2, 1]) {
        const scale = pitch*g.f/1.16;
        lab.zoom(scale/(12*Math.sqrt(3)*g.f/1.205)/w.zoom);
        // Exercise atlas rendering even at a pitch where the local chart can fit.
        w.chart = null;
        w.hover = null;
        w.needsDraw = true;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const image = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
        function ownerAt(id, owner) {
          const k = 3*id, dot = v => xyz[k]*v[0] + xyz[k+1]*v[1] + xyz[k+2]*v[2];
          const x = Math.floor(dpr*(rect.width/2 + scale*Math.atan2(dot(right), dot(look))));
          const y = Math.floor(dpr*(rect.height/2 - scale*Math.asin(dot(up))));
          const j = 4*(y*image.width+x), rgb = parseInt(lab.game.colors[owner].slice(1), 16);
          return [16,8,0].every((shift,i) => Math.abs(image.data[j+i] - ((rgb >>> shift)&255)) < 65);
        }
        const around = new Set();
        for (const id of gun) for (let k=0;k<g.deg[id];k++) {
          const nb=g.adj[6*id+k]; if(!w.cells[nb]) around.add(nb);
        }
        rows.push({pitch, gun: gun.filter(id => ownerAt(id,1)).length, scout: ownerAt(scout,3),
          filledGaps: pitch>=3 ? [...around].filter(id => ownerAt(id,1)).length : 0});
      }
      return rows;
    });
    for(const row of report){
      assert.equal(row.gun, 64, 'gun cells at pitch '+row.pitch);
      assert(row.scout, 'isolated faction at pitch '+row.pitch);
      assert.equal(row.filledGaps, 0, 'empty gaps around the gun at pitch '+row.pitch);
    }
    console.log('PASS: whole gun, empty gaps and isolated faction survive off-screen density');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
