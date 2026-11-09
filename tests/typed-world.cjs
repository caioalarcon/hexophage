const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--disable-webgl']});
  try {
    const page=await browser.newPage({viewport:{width:1100,height:850}});
    const base=pathToFileURL(path.resolve(__dirname,'../experiments/typed-world/index.html')).href;
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'?scene=blank');
    assert.equal(await page.locator('#pattern option').count(),409);
    assert.equal(await page.locator('#rule option').count(),9);
    assert.equal(await page.locator('#resolver option').count(),4);
    await page.selectOption('#pattern','bays/osc2');
    await page.selectOption('#rule','callahan');
    await page.selectOption('#resolver','guard');
    await page.selectOption('#angle','2');
    await page.click('#save');
    await page.reload();
    await page.selectOption('#hand','0');
    assert.deepEqual(await page.evaluate(()=>['pattern','rule','resolver','angle'].map(k=>document.getElementById(k).value)),
      ['bays/osc2','callahan','guard','2']);
    await page.locator('#board').click();
    assert.match(await page.locator('#notice').textContent(),/Jade plantou/);
    await page.selectOption('#scene','cross');await page.click('#reset');
    assert.equal(await page.locator('#precedence').inputValue(),'1');
    await page.click('#step');assert.equal(await page.locator('#gen').textContent(),'G1');
    await page.goto(base+'?scene=engulf&bank=1000000');
    assert.equal(await page.locator('#owner option').count(),3);
    await page.evaluate(()=>{for(let i=0;i<16;i++)document.querySelector('#many').click();});
    assert.match(await page.locator('#coverage').textContent(),/2\.562 \/ 2\.562 locais/);
    assert.match(await page.locator('#coverage').textContent(),/Cobalto · G177/);
    assert.match(await page.locator('#damage').textContent(),/Baixas amigas 62 \/ 0 \/ 0/);
    await page.goto(base+'?scene=recovery');
    await page.evaluate(()=>{for(let i=0;i<12;i++)document.querySelector('#many').click();});
    assert.match(await page.locator('#accounts').textContent(),/3.028,5/);
    assert.match(await page.locator('#damage').textContent(),/Células liquidadas 3 \/ 0/);
    await page.goto(base+'?scene=orbit');
    await page.evaluate(()=>{for(let i=0;i<6;i++)document.querySelector('#many').click();});
    assert.match(await page.locator('#damage').textContent(),/Baixas inimigas diretas 108 \/ 0/);
    await page.goto(base+'?scene=arena&bots=both');
    await page.click('#many');assert.match(await page.locator('#gen').textContent(),/G32/);
    await page.setViewportSize({width:360,height:780});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);
    console.log('PASS: typed stamps, saved composition, paid placement, contested precedence, orbital interface and native full-planet shock.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
