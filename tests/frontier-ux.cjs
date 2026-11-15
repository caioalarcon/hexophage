const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href+'?experiment=resources&f=32');
    await page.waitForFunction(()=>window.__hexophageMixed?.session?.match.progression && document.querySelector('#mx-config'));
    assert(await page.locator('#mx-settings').isVisible(),'preparation must open before the game starts');
    assert.equal(await page.locator('#mx-plan-free').count(),1);
    assert.equal(await page.locator('#mx-map-full').count(),1);
    await page.click('#mx-settings-close');
    assert(!(await page.locator('#mx-frontier-help').isVisible()),'tutorial paragraphs should not occupy the match HUD');
    assert(await page.locator('#mx-score [data-player="2"] .mx-player-toggle').isEnabled(),'opponent economic statistics stay available');
    assert.match(await page.locator('#mx-score [data-player="2"]').innerText(),/◈/);
    // Compute screen point from the real local camera and a living contract cell.
    async function locationFor(contract,preview=false){
      return page.evaluate(({contract,preview})=>{
        const {session,world,tools}=window.__hexophageMixed,m=session.match;
        if(!world.chart)return {error:'local-chart-unavailable'};
        const rect=document.querySelector('#hl-world').getBoundingClientRect();
        const mapping=[...world.chart.map.values()],find=mapping.find(frame=>{
          const c=m.cells.get(frame.id);
          return preview?tools.preview(frame)?.ready:c?.owner===1&&c?.contract===contract;
        });
        if(!find)return {error:'no-'+(preview?'legal-preview':contract)};
        return {x:rect.left+rect.width/2+world.zoom*Math.sqrt(3)*12*(find.q+find.r/2),
          y:rect.top+rect.height/2+world.zoom*18*find.r,id:find.id,q:find.q,r:find.r};
      },{contract,preview});
    }
    const base=await locationFor('base');
    assert(!base.error,JSON.stringify(base));await page.mouse.click(base.x,base.y);
    assert.match(await page.locator('#mx-factory-name').innerText(),/Centro celular/);
    assert.equal(await page.locator('#mx-hand button').count(),3);
    await page.locator('#mx-hand [data-slot="contract/relay"]').click();
    const relayTarget=await locationFor('relay',true);
    assert(!relayTarget.error,'must expose a legal relay position: '+JSON.stringify(relayTarget));
    await page.mouse.click(relayTarget.x,relayTarget.y);
    assert(await page.evaluate(()=>[...__hexophageMixed.session.match.cells.values()].some(c=>c.owner===1&&c.contract==='relay')),'first workshop built by a real canvas click');
    assert(!await page.evaluate(()=>__hexophageMixed.world.playing),'placing a stamp pauses the match for inspection');
    const relay=await locationFor('relay');
    assert(!relay.error,JSON.stringify(relay));await page.mouse.click(relay.x,relay.y);
    assert.match(await page.locator('#mx-factory-name').innerText(),/Oficina celular/);
    assert.equal(await page.locator('#mx-hand [data-slot="contract/scout"]').count(),1,'the relay unlocks the glider');
    await page.locator('#mx-hand [data-slot="contract/scout"]').click();
    const scoutTarget=await locationFor('scout',true);
    assert(!scoutTarget.error,'glider must really be placeable from the selected factory: '+JSON.stringify(scoutTarget));
    await page.mouse.click(scoutTarget.x,scoutTarget.y);
    assert(await page.evaluate(()=>[...__hexophageMixed.session.match.cells.values()].some(c=>c.owner===1&&c.contract==='scout')),'a real glider stamp succeeds');
    assert(await page.locator('#mx-undo').isVisible());
    await page.click('#mx-undo');
    assert(!await page.evaluate(()=>[...__hexophageMixed.session.match.cells.values()].some(c=>c.owner===1&&c.contract==='scout')),'undo restores the prior match');
    await page.click('#mx-config');
    await page.check('#mx-map-full');
    await page.locator('#mx-setup button[type=submit]').click();
    const map=await page.evaluate(()=>{
      const m=__hexophageMixed.session.match,site=[...Array(m.graph.n).keys()].find(x=>!m.visibility(1).explored.has(x));
      return {full:m.spatial.fullMap,site,seen:m.canSee(1,site),build:m.canBuild(1,site),known:m.visibility(1).explored.size};
    });
    assert(map.full&&map.seen&&!map.build,JSON.stringify(map));
    if(process.env.HEX_SCREENSHOT)await page.screenshot({path:process.env.HEX_SCREENSHOT});
    assert.deepEqual(errors,[]);
    console.log('PASS: real preparation, contextual factory, relay > glider click, safe pause/undo, public ranking, visible-map exploration restriction');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
