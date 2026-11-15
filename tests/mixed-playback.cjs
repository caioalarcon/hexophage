const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--disable-webgl']});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href+'?f=32');
    await page.waitForFunction(()=>window.__hexophageMixed?.session);
    const state=()=>page.locator('#mx-actions').getAttribute('data-state');
    const label=()=>page.locator('#hl-play').getAttribute('aria-label');
    const gen=()=>page.evaluate(()=>__hexophageMixed.session.match.gen);
    const frozen=()=>page.evaluate(()=>JSON.stringify({gen:__hexophageMixed.session.match.gen,
      players:__hexophageMixed.session.match.players,cells:[...__hexophageMixed.session.match.cells]}));
    const pauseAtZero=()=>page.evaluate(()=>{
      document.getElementById('hl-play').click();document.getElementById('hl-play').click();
    });
    assert.equal(await state(),'ready');assert.equal(await label(),'Iniciar');
    assert(!await page.locator('#hl-step').isVisible());assert(!await page.locator('#hl-clear').isVisible());
    await page.evaluate(()=>document.getElementById('hl-step').click());assert.equal(await gen(),0);
    await page.click('#hl-play');await page.waitForFunction(()=>__hexophageMixed.session.match.gen>0);
    assert.equal(await state(),'running');assert.equal(await label(),'Pausar');
    assert(await page.locator('#hl-clear').isVisible());assert(!await page.locator('#hl-step').isVisible());
    assert(await page.evaluate(()=>{const g=__hexophageMixed.session.match.gen;
      document.getElementById('hl-step').click();return __hexophageMixed.session.match.gen===g;}));
    await page.click('#hl-play');assert.equal(await state(),'paused');assert.equal(await label(),'Retomar');
    assert(await page.locator('#hl-step').isVisible());const before=await gen();
    await page.click('#hl-step');assert.equal(await gen(),before+1);
    await page.click('#hl-clear');assert.equal(await state(),'stopped');assert.equal(await label(),'Nova partida');
    assert(!await page.locator('#hl-step').isVisible());assert(!await page.locator('#hl-clear').isVisible());
    const stopped=await frozen();await page.waitForTimeout(100);assert.equal(await frozen(),stopped);
    await page.evaluate(()=>document.getElementById('hl-step').click());assert.equal(await frozen(),stopped);
    await page.click('#hl-play');assert.equal(await state(),'ready');assert.equal(await gen(),0);
    assert.equal(await page.evaluate(()=>__hexophageMixed.session.match.players[1].reserve),640);

    // Human defeat is local: restarting does not require the global match to end.
    assert(await page.evaluate(()=>{const s=__hexophageMixed.session;
      return s.match.stamp(1,'callahan','contact',[s.starts[1]]);}));
    await pauseAtZero();await page.click('#hl-step');
    assert.equal(await state(),'eliminated');assert.equal(await label(),'Nova partida');
    assert.equal(await page.evaluate(()=>__hexophageMixed.session.outcome),null);
    assert.equal(await page.evaluate(()=>__hexophageMixed.session.alive[1]),false);
    assert.equal(await page.evaluate(()=>__hexophageMixed.world.playing),false);
    assert(!await page.locator('#hl-step').isVisible());assert(!await page.locator('#hl-clear').isVisible());
    const lost=await frozen();await page.waitForTimeout(100);assert.equal(await frozen(),lost);
    await page.click('#hl-play');assert.equal(await state(),'ready');assert.equal(await gen(),0);
    assert(await page.evaluate(()=>__hexophageMixed.session.alive[1]));

    // Final victory also replaces transport with the same new-match action.
    await page.locator('#mx-hand [data-key="hex-b2s245/farm-4-12"]').click();
    const board=await page.locator('#hl-world').boundingBox();
    for(const [x,y] of [[.35,.4],[.65,.4],[.4,.65],[.6,.65]]){
      await page.mouse.click(board.x+board.width*x,board.y+board.height*y);
      if(await page.evaluate(()=>__hexophageMixed.session.match.players[1].stamps>0))break;
    }
    assert.equal(await page.evaluate(()=>__hexophageMixed.session.match.players[1].stamps),1);
    await pauseAtZero();
    await page.evaluate(()=>{const m=__hexophageMixed.session.match;
      for(const [id,c] of m.cells)if(c.owner!==1)m.cells.delete(id);});
    await page.click('#hl-step');
    assert.equal(await state(),'finished');assert.equal(await label(),'Nova partida');
    assert.equal(await page.evaluate(()=>__hexophageMixed.session.outcome),1);
    assert(!await page.locator('#hl-step').isVisible());
    await page.click('#hl-play');assert.equal(await state(),'ready');

    // Compact view retains the stop action and the active state only exposes valid controls.
    await page.setViewportSize({width:390,height:844});await pauseAtZero();
    assert(await page.locator('#hl-clear').isVisible());assert(await page.locator('#hl-step').isVisible());
    const box=await page.locator('#hl-clear').boundingBox();assert(box.x>=0&&box.x+box.width<=390);
    await page.click('#hl-clear');assert.equal(await label(),'Nova partida');
    await page.click('#hl-play');assert.equal(await gen(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: contextual start/pause/resume/stop/step, stopped field, immediate post-defeat restart, victory and portrait');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
