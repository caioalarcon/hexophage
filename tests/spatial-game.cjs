const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href+'?experiment=local&f=32');
    await page.waitForFunction(()=>window.__hexophageMixed?.session);
    assert(await page.locator('#mx-frontier').isVisible());
    const boot=await page.evaluate(()=>{
      const {session:s,world}=__hexophageMixed,m=s.match;
      return {base:s.opening[1].ids,field:m.players[1].field,visible:m.visibility(1).visible.size,
        cells:world.activeCount,actual:m.cells.size,rejection:m.stampRejection(1,'hex-b2s245','contact',[s.starts[2]])};
    });
    assert(boot.field>0&&boot.visible>boot.field);
    assert(boot.cells<boot.actual,'enemy cells are removed from all renderer buffers');
    assert.equal(boot.rejection,'darkness');
    const rival=page.locator('#mx-score [data-player="2"]');
    assert.match(await rival.innerText(),/Sem contato/);
    assert(await rival.locator('.mx-player-jump').isDisabled());
    assert(await rival.locator('.mx-player-toggle').isDisabled());
    await page.click('#hl-play');await page.waitForFunction(()=>__hexophageMixed.session.match.gen>=24);await page.click('#hl-play');
    assert(await page.evaluate(()=>__hexophageMixed.session.match.players[1].income>0));
    await page.click('#mx-config');assert.equal(await page.locator('#mx-experiment').inputValue(),'local');
    await page.fill('#mx-vision-radius','8');
    await page.locator('#mx-setup button[type=submit]').click();
    assert.equal(await page.evaluate(()=>__hexophageMixed.session.match.spatial.visionRadius),8);
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.click('#mx-globe');assert(await page.locator('#br-globe-overlay').isVisible());
    await page.click('#br-globe-close');
    assert.deepEqual(errors,[]);
    if(process.env.HEX_SCREENSHOT)await page.screenshot({path:process.env.HEX_SCREENSHOT});
    console.log('PASS: spatial base, production, hidden renderer buffers and scoreboard, settings, mobile and fog globe');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
