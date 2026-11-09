// Play the default game through actual controls and canvas input.
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--disable-webgl']});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await page.waitForFunction(()=>window.__hexophageMixed?.session);
    const hand=page.locator('#mx-hand'),cards=hand.locator('button');
    assert.equal(await page.locator('#hl-rulechoice').inputValue(),'mixed');
    assert.equal(await cards.count(),54);
    assert.equal(await cards.evaluateAll(ns=>new Set(ns.map(n=>n.dataset.rule)).size),9);
    assert.equal(await hand.evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),3);
    const [left,board,right]=await Promise.all(['#br-rail','#hl-world','.mx-arsenal'].map(s=>page.locator(s).boundingBox()));
    assert(left.x+left.width<=board.x+1 && board.x+board.width<=right.x+1);
    const visibleRows=await hand.evaluate(n=>{
      const bottom=n.getBoundingClientRect().bottom;
      return new Set([...n.children].filter(c=>c.getBoundingClientRect().bottom<=bottom).map(c=>c.offsetTop)).size;
    });
    assert(visibleRows>=15);
    const firstDeck=await cards.evaluateAll(ns=>ns.map(n=>n.dataset.key));
    await cards.filter({hasText:'Fly'}).first().click();
    const before=await page.evaluate(()=>JSON.stringify(__hexophageMixed.selection.shape));
    await page.click('#hl-stampcw');assert.notEqual(await page.evaluate(()=>JSON.stringify(__hexophageMixed.selection.shape)),before);
    await page.click('#hl-stampccw');assert.equal(await page.evaluate(()=>JSON.stringify(__hexophageMixed.selection.shape)),before);
    await page.click('#hl-stampflip');await page.click('#hl-stampflip');
    assert.equal(await page.evaluate(()=>JSON.stringify(__hexophageMixed.selection.shape)),before);
    await page.click('#mx-resolver [data-mode=phase]');await page.selectOption('#mx-ballot','robustness');
    const starting=await page.evaluate(()=>__hexophageMixed.session.match.players[1].reserve);
    async function plantAt(x,y){
      await page.mouse.click(board.x+board.width*x,board.y+board.height*y);
      return page.evaluate(()=>__hexophageMixed.session.match.players[1].reserve);
    }
    let balance=starting;
    for(const x of [.3,.65,.4,.7]){balance=await plantAt(x,.44);if(balance<starting)break;}
    assert.equal(starting-balance,await page.evaluate(()=>__hexophageMixed.selection.shape.length*__hexophageMixed.session.match.stampPrice('phase')));
    const first=await page.evaluate(()=>[...__hexophageMixed.session.match.cells].filter(([,c])=>c.owner===1&&c.rule==='ashley'&&c.resolver==='phase').map(([i,c])=>[i,c.ballot]));
    assert(first.length>0 && first.every(([,ballot])=>ballot==='robustness'));
    await page.click('#mx-resolver [data-mode=guard]');
    let second=balance;
    for(const x of [.68,.25,.52,.76]){second=await plantAt(x,.7);if(second<balance)break;}
    assert(second<balance);
    assert(await page.evaluate(ids=>ids.every(([i])=>__hexophageMixed.session.match.cells.get(i).resolver==='phase'),first));
    assert.equal(await page.evaluate(()=>__hexophageMixed.session.match.gen),0);
    await page.click('#hl-play');await page.waitForFunction(()=>__hexophageMixed.session.match.gen>=32);
    await page.click('#hl-play');assert(await page.evaluate(()=>!__hexophageMixed.world.playing));
    assert(await page.evaluate(()=>__hexophageMixed.orders.length>0));
    await page.click('#mx-config');await page.selectOption('#mx-economy','death');
    await page.locator('#mx-setup button[type=submit]').click();
    assert.equal(await page.evaluate(()=>__hexophageMixed.session.match.gen),0);
    assert.notDeepEqual(await cards.evaluateAll(ns=>ns.map(n=>n.dataset.key)),firstDeck);
    assert(await page.evaluate(()=>__hexophageMixed.session.match.economy.deathEnergy>0));
    await page.click('#mx-config');await page.selectOption('#mx-identity','matrix');await page.selectOption('#mx-axis','rule');
    assert.equal(await page.locator('#mx-matrix td button').count(),72);
    await page.locator('#mx-matrix').getByRole('button',{name:'Torneio circular'}).click();
    await page.selectOption('#mx-size','64');
    await page.locator('#mx-setup button[type=submit]').click();
    await page.waitForFunction(()=>__hexophageMixed.session.graph.f===64);
    assert.equal(await page.evaluate(()=>__hexophageMixed.session.match.arbitration.matrix),'111100001111000111100111101111111111');
    await page.setViewportSize({width:390,height:844});
    const [top,field,bottom]=await Promise.all(['#br-rail','#hl-world','.mx-arsenal'].map(s=>page.locator(s).boundingBox()));
    assert(top.y+top.height<=field.y+1 && field.y+field.height<=bottom.y+1 && field.height>200);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#mx-globe').click();assert(await page.locator('#br-globe-overlay').isVisible());
    await page.click('#br-globe-close');
    await page.selectOption('#hl-rulechoice','bays');
    await page.waitForFunction(()=>window.__sphereLab?.game.profile.id==='bays');
    assert.equal(await page.locator('#br-deck button').count(),15);
    // The classic settings drawer contains the same selector.
    await page.evaluate(()=>{const s=document.querySelector('#hl-rulechoice');s.value='mixed';s.dispatchEvent(new Event('change'));});
    await page.waitForFunction(()=>window.__hexophageMixed?.session);
    assert.equal(await page.locator('#hl-rulechoice').inputValue(),'mixed');
    assert.deepEqual(errors,[]);
    console.log('PASS: default mixed match, 54 ranked cards, real paid canvas placements, inherited modifiers, active bots, economics, classic return and both orientations');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
