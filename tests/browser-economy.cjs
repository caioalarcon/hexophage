// Integration smoke for the intentional gameplay redesign. It replaces old-release parity.
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({
    executablePath:process.env.CHROMIUM_PATH,
    args:['--disable-webgl','--disable-partial-raster']
  });
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'..','index.html')).href);
    await page.waitForFunction(()=>window.__sphereLab?.world?.graph && window.__sphereLab.game.players.length===6,{timeout:90000});
    assert.equal(await page.locator('.br-stampcard').count(),15,'15 hotbar slots');
    assert.equal(await page.locator('.br-stampcard').first().getAttribute('data-pattern'),'p2');
    const grower=page.locator('.br-stampcard[data-pattern="stalk"]');
    assert.equal(await grower.locator('.br-stampprice').textContent(),'◈1080');
    assert(await grower.evaluate(card => card.classList.contains('unavailable')));
    for(const id of ['eco-birth-cost','eco-stamp','eco-stable-energy','eco-age','eco-initial']){
      const slider=page.locator('#'+id);
      assert.equal(await slider.getAttribute('min'),'0');
      assert.equal(await slider.getAttribute('max'),'100');
    }
    await require('./support/slider-limits.cjs')(page);
    assert.equal(await page.locator('#eco-reserve').textContent(),'120');
    assert.equal(await page.locator('#eco-can-stamp').textContent(),'4');
    const sample=await page.evaluate(()=>{
      const lab=window.__sphereLab,p=lab.game.players[0],world=lab.world;
      const ids=lab.patchForStamp(p.seed,world.orient,lab.stampOffsets(),true);
      const okay=lab.commitStamp(1,ids,true);
      for(let i=0;i<20;i++)lab.nextTick();
      return {okay,cells:ids?.length,reserve:p.reserve,births:p.totalBirths,eroded:p.eroded,
        stable:p.stable,gen:world.gen};
    });
    assert.deepEqual(sample,{okay:true,cells:3,reserve:8,births:40,eroded:0,stable:1,gen:20});
    assert.equal(await page.locator('#eco-initial').isDisabled(),true,'initial reserve locked');
    await page.locator('#eco-birth-cost').evaluate(el=>{
      el.value='2';el.dispatchEvent(new Event('input',{bubbles:true}));
    });
    const changed=await page.evaluate(()=>{
      __sphereLab.nextTick();
      const p=__sphereLab.game.players[0];
      return {reserve:p.reserve,income:p.lastIncome,upkeep:p.lastUpkeep};
    });
    assert.deepEqual(changed,{reserve:7,income:3,upkeep:4});
    await page.waitForFunction(() => document.getElementById('eco-reserve')?.textContent === '7');
    assert.equal(await page.locator('#eco-reserve').textContent(),'7');
    await page.locator('.br-slot-edit').first().click();
    assert.equal(await page.locator('#br-atlas-dialog').evaluate(d=>d.open),true);
    assert.equal(await page.locator('#br-atlas-results button').count(),160);
    await page.locator('#br-atlas-query').fill('Flipper P4');
    assert(await page.locator('#br-atlas-results button').count()>=1);
    await page.locator('#br-atlas-results button').first().click();
    await page.locator('#br-atlas-choose').click();
    assert.equal(await page.locator('.br-stampcard').first().getAttribute('data-pattern'),'p4f');
    assert.equal(await page.locator('#br-atlas-dialog').evaluate(d=>d.open),false);
    await require('./support/slot-labels.cjs')(page);
    await require('./support/atlas-cycle-ledger.cjs')(page);
    assert.deepEqual(errors,[]);
    console.log('PASS: 15 live slots, 160 atlas patterns, 5 sliders, flipper +1/g, live update and atlas swap');
    await page.close();
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
