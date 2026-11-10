const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--disable-webgl']});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await page.waitForFunction(()=>window.__hexophageMixed?.session?.graph?.f===128,{timeout:120000});
    assert.equal(await page.evaluate(()=>__hexophageMixed.session.graph.n),163842);
    assert.equal(await page.locator('#mx-hand button').count(),54);
    const field=await page.locator('#mx-tools').count().catch(()=>0);
    assert.equal(await page.locator('#mx-resolver').evaluate(n=>n.tagName),'SELECT');
    assert.deepEqual(await page.locator('#mx-resolver option').evaluateAll(ns=>ns.map(n=>n.value)),['contact','guard','phase','antimatter']);
    const positions=await page.evaluate(()=>{
      const a=document.querySelector('.mx-orientation').getBoundingClientRect();
      const p=document.querySelector('#mx-preview').getBoundingClientRect();
      const t=document.querySelector('#mx-transform').getBoundingClientRect();
      const b=document.querySelector('.mx-policies').getBoundingClientRect();
      const r=document.querySelector('#mx-resolver').getBoundingClientRect();
      const v=document.querySelector('#mx-ballot').getBoundingClientRect();
      const bar=document.querySelector('.mx-card-energy').getBoundingClientRect();
      const card=document.querySelector('.mx-card').getBoundingClientRect();
      return {a:{left:a.left,right:a.right},p:{right:p.right},t:{left:t.left},b:{left:b.left},
        r:{left:r.left,right:r.right,bottom:r.bottom},v:{left:v.left,right:v.right,top:v.top},
        bar:bar.height,card:card.height};
    });
    assert(positions.p.right < positions.t.left+2,'rotate controls next to preview');
    assert(positions.a.right <= positions.b.left+1,'preview and rotation on left');
    assert(positions.r.left >= positions.b.left && positions.v.left >= positions.b.left);
    assert(positions.v.top >= positions.r.bottom-1,'vote selector below interaction selector');
    assert(positions.bar>1 && positions.bar<=2,'thin progress strip');
    assert(positions.card<=50,'cards shrink by the progress strip difference');
    const player=page.locator('#mx-score [data-player="2"]');
    const jump=player.locator('.mx-player-jump'),toggle=player.locator('.mx-player-toggle');
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    await jump.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    const center=await page.evaluate(()=>__hexophageMixed.world.center);
    await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    assert.equal(await page.evaluate(()=>__hexophageMixed.world.center),center);
    await page.selectOption('#mx-resolver','phase');
    assert.equal(await page.evaluate(()=>__hexophageMixed.selection.resolver),'phase');
    await page.selectOption('#mx-resolver','guard');
    assert.equal(await page.evaluate(()=>__hexophageMixed.selection.resolver),'guard');
    await page.setViewportSize({width:390,height:844});
    const portrait=await page.evaluate(()=>{
      const p=document.querySelector('.mx-orientation').getBoundingClientRect();
      const v=document.querySelector('.mx-policies').getBoundingClientRect();
      return {right:p.right,left:v.left,scroll:document.documentElement.scrollWidth,screen:innerWidth};
    });
    assert(portrait.right<=portrait.left+1);
    assert(portrait.scroll<=portrait.screen);
    assert.deepEqual(errors,[]);
    console.log('PASS: f128 default async build, two independent ranking actions, compact energy and side-by-side stamp controls');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
