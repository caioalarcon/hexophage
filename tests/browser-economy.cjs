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
    const cards=page.locator('.br-stampcard');
    assert.deepEqual((await cards.evaluateAll(nodes=>nodes.map(n=>n.dataset.pattern))).slice(0,5),['stalk','glider','gun20','gun42','p42']);
    assert.equal(await cards.count(),15);
    assert.equal(await cards.first().getAttribute('aria-pressed'),'true');
    assert.equal(await cards.first().locator('.br-stampprice').textContent(),'◈360000');
    assert(!(await cards.first().evaluate(card=>card.classList.contains('unavailable'))));
    assert.equal(await page.locator('#br-energy-sliders input[type=range]').count(),7);
    await page.locator('#br-economy-toggle').click();
    assert(await page.locator('#eco-combat-fee').isVisible(),'combat tribute must be directly accessible');
    assert.equal(await page.locator('.br-economy-guide p').first().isVisible(),false,'help stays collapsed until requested');
    await page.locator('.br-economy-guide summary').click();
    assert.equal(await page.locator('.br-economy-guide p').first().isVisible(),true,'help appears only on demand');
    await require('./support/slider-limits.cjs')(page);
    await page.locator('#br-economy-close').click();
    assert.equal(await page.locator('#eco-tribute-in').isVisible(),false,'secondary statistics stay collapsed');
    await page.locator('.br-stats-more summary').click();
    assert.equal(await page.locator('#eco-tribute-in').isVisible(),true,'secondary statistics available on demand');
    assert.equal(await page.locator('#eco-reserve').textContent(),'820.000');
    assert.equal(await page.locator('#eco-can-stamp').textContent(),'82');
    const placed=await page.evaluate(()=>{
      const lab=__sphereLab,p=lab.game.players[0],w=lab.world;
      const ids=lab.patchForStamp(p.seed,w.orient,lab.stampOffsets(),true);
      const okay=lab.commitStamp(1,ids,true);
      for(let g=0;g<20;g++)lab.nextTick();
      return {okay,n:ids?.length,reserve:p.reserve,births:p.totalBirths,eroded:p.eroded};
    });
    assert.deepEqual(placed,{okay:true,n:36,reserve:459879,births:121,eroded:0});
    await page.waitForFunction(()=>document.getElementById('eco-initial').disabled);
    await page.locator('#eco-birth-cost').evaluate(el=>{
      el.value='2';el.dispatchEvent(new Event('input',{bubbles:true}));
    });
    const changed=await page.evaluate(()=>{
      const p=__sphereLab.game.players[0],before=p.reserve;
      __sphereLab.nextTick();return {cost:p.lastUpkeep,births:p.lastBirths,spent:before-p.reserve};
    });
    assert.equal(changed.cost,2*changed.births);
    assert.equal(changed.spent,changed.cost);
    await page.locator('#eco-birth-cost').evaluate(el=>{el.value='1';el.dispatchEvent(new Event('input',{bubbles:true}));});
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
    await require('./support/match-playback.cjs')(page);
    assert.deepEqual(errors,[]);
    console.log('PASS: two-grower opening, fifteen tactical slots, accessible tribute among seven sliders, live economy, atlas and full stop');
    await page.close();
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
