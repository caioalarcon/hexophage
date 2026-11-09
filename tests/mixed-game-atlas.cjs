const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--disable-webgl']});
  try{
    const page=await browser.newPage({viewport:{width:1160,height:850}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href+'?rule=mixed');
    const open=()=>page.locator('#mx-atlas').click();
    const ui=id=>page.locator('#mx-atlas-host [data-ui="'+id+'"]');
    const hand=page.locator('#mx-hand [data-key]');
    assert(await hand.count()>=54);await open();
    assert.equal(await ui('count').textContent(),'409 padrões');
    await ui('family').selectOption('ashley15');assert.equal(await ui('count').textContent(),'8 padrões');
    await ui('search').fill('rotor');assert.equal(await ui('count').textContent(),'1 padrão');
    await page.locator('#mx-atlas-host [data-card="ashley15/rotor126"]').click();
    await ui('one').click();assert.equal(await ui('tick').textContent(),'G1');
    await ui('many').click();assert.equal(await ui('tick').textContent(),'G17');
    await ui('edit').click();await ui('physics').selectOption('bays');await ui('name').fill('Cópia QA');
    assert.equal(await ui('draft').locator('select').count(),1); // Physical rule only; interaction lives on the game bar.
    await ui('use').click();
    assert.match(await page.locator('#mx-selected').innerText(),/Cópia QA/);
    const savedKey=await hand.first().getAttribute('data-key');
    assert(savedKey.startsWith('custom/'));
    await page.reload();assert.equal(await hand.first().getAttribute('data-key'),savedKey);
    await open();await ui('new').click();await ui('name').fill('Dois sítios');
    const box=await ui('canvas').boundingBox();
    for(const dx of [0,30])await page.mouse.click(box.x+box.width/2+dx,box.y+box.height/2);
    await ui('use').click();assert.match(await page.locator('#mx-selected').innerText(),/Dois sítios/);
    const key=await hand.first().getAttribute('data-key');
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem('hexophage.mixed.atlas.v1')).custom.find(c=>c.key===k).offsets.length,key),2);
    await open();await ui('edit').click();await ui('name').fill('Três sítios');
    const edited=await ui('canvas').boundingBox();await page.mouse.click(edited.x+edited.width/2,edited.y+edited.height/2+54);
    await ui('use').click();assert.equal(await hand.first().getAttribute('data-key'),key);
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem('hexophage.mixed.atlas.v1')).custom.find(c=>c.key===k).offsets.length,key),3);
    await page.setViewportSize({width:390,height:810});await open();
    assert(await page.locator('#mx-atlas-host dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    assert.deepEqual(errors,[]);
    console.log('PASS: the game atlas finds 409 native cards, previews and edits another physics, and retains custom shapes in the bar after reload.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
