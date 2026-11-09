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
    const buttons=await page.locator('.br-transform button').evaluateAll(nodes=>nodes.map(node=>{
      const r=node.getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height};
    }));
    assert.equal(buttons.length,3);
    assert(buttons.every(button=>Math.abs(button.x-buttons[0].x)<2&&button.width<=34),'transform controls form one narrow column');
    assert(buttons[0].y+buttons[0].height<=buttons[1].y+1&&buttons[1].y+buttons[1].height<=buttons[2].y+1,'transform controls are stacked vertically');

    // Formatting is visual only. Restore the exact simulation values afterward.
    const rankingBefore=await page.evaluate(()=>{
      const {game}=window.__sphereLab,p=game.players[0];
      const prior={reserve:p.reserve,lastFlow:p.lastFlow};
      p.reserve=1234.6;
      p.lastFlow=17.8;
      game.lastStats=-1;
      return prior;
    });
    await page.waitForFunction(()=>document.querySelector('#br-player-1 .br-scorevals div:nth-child(2) dd')?.textContent==='1235');
    assert.equal(await page.locator('#br-player-1 .br-scorevals div:nth-child(3) dd').textContent(),'+18');
    await page.evaluate(()=>{
      document.getElementById('br-ledger').showModal();
      window.__sphereLab.game.lastStats=-1;
    });
    await page.waitForFunction(()=>document.querySelector('#br-ranking tr.mine td:nth-child(4)')?.textContent==='1235');
    assert.equal(await page.locator('#br-ranking tr.mine td:nth-child(5)').textContent(),'+18');
    await page.evaluate(prior=>{
      document.getElementById('br-ledger').close();
      const {game}=window.__sphereLab,p=game.players[0];
      p.reserve=prior.reserve;
      p.lastFlow=prior.lastFlow;
      game.lastStats=-1;
    },rankingBefore);
    await page.waitForFunction(()=>document.querySelector('#br-player-1 .br-scorevals div:nth-child(2) dd')?.textContent==='820000');
    // The advanced-slider popover is dismissed by outside clicks, but not by
    // interactions inside it or by an initial press on its own toggle.
    const tuningToggle=page.locator('#br-tuning-toggle');
    await tuningToggle.click();
    assert.equal(await tuningToggle.getAttribute('aria-expanded'),'true');
    await page.locator('#br-advanced-tuning').click({position:{x:12,y:12}});
    assert.equal(await tuningToggle.getAttribute('aria-expanded'),'true');
    await page.locator('.br-rail-header').click();
    assert.equal(await tuningToggle.getAttribute('aria-expanded'),'false');
    await tuningToggle.click();
    await page.keyboard.press('Escape');
    assert.equal(await tuningToggle.getAttribute('aria-expanded'),'false');
    const cards=page.locator('.br-stampcard');
    assert.deepEqual((await cards.evaluateAll(nodes=>nodes.map(n=>n.dataset.pattern))).slice(0,5),['stalk','glider','gun20','gun42','p42']);
    assert.equal(await cards.count(),15);
    assert.equal(await cards.first().getAttribute('aria-pressed'),'true');
    assert.equal(await cards.first().locator('.br-stampprice').textContent(),'◈360000');
    assert(!(await cards.first().evaluate(card=>card.classList.contains('unavailable'))));
    assert.equal(await page.locator('#br-energy-sliders input[type=range]').count(),7);
    // The entire economic tuning panel must be reachable without opening anything.
    for (const id of ['eco-stable-energy','eco-scale','eco-birth-cost','eco-combat-fee','eco-age','eco-stamp','eco-initial']) {
      assert(await page.locator('#'+id).isVisible(),id+' must remain directly visible');
    }
    assert.equal(await page.locator('.br-economy-guide').count(),0,'long rule explanations stay out of the HUD');
    assert.equal(await page.locator('#eco-combat-fee').getAttribute('aria-describedby'),null);
    await require('./support/slider-limits.cjs')(page);
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
    await require('./support/rule-switching.cjs')(page);
    assert.deepEqual(errors,[]);
    console.log('PASS: two-grower opening, fifteen tactical slots, accessible tribute among seven sliders, live economy, atlas and full stop');
    await page.close();
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
