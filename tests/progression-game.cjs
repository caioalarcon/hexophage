const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href+'?experiment=resources&f=32');
    await page.waitForFunction(()=>window.__hexophageMixed?.session?.match.progression);
    assert(await page.locator('#mx-settings').isVisible());
    await page.click('#mx-settings-close');
    assert(await page.locator('#mx-materials').isVisible());
    assert.equal(await page.locator('#mx-hand button').count(),3);
    assert(await page.locator('#mx-resolver').isDisabled());
    assert.match(await page.locator('#mx-objective').innerText(),/Base/);
    const first=await page.evaluate(()=>{
      const {session:s,world}=__hexophageMixed,m=s.match,p=m.progression;
      return {stores:p.inventory(1),base:p.objective(1).rootCells,visible:p.visibleDeposits(1).length,
        render:world.resourceDeposits.size,hidden:[...world.resourceDeposits.keys()].some(id=>!m.canSee(1,id))};
    });
    assert(first.base>0&&first.visible>0);assert.equal(first.render,first.visible);assert.equal(first.hidden,false);
    await page.locator('#mx-hand [data-slot="contract/relay"]').click();
    const board=await page.locator('#hl-world').boundingBox();
    let placed=false;
    for(const [x,y] of [[.34,.4],[.65,.4],[.32,.65],[.65,.65],[.25,.5],[.75,.5],[.5,.3],[.5,.7],[.4,.3],[.6,.7]]){
      await page.mouse.click(board.x+board.width*x,board.y+board.height*y);
      if(await page.evaluate(()=>__hexophageMixed.session.match.players[1].stamps>1)){placed=true;break;}
    }
    assert(placed,'a human can construct a paid child with an actual canvas click');
    const paid=await page.evaluate(()=>{
      const m=__hexophageMixed.session.match,p=m.progression,n=p.plan.nodes.find(n=>n.id==='relay');
      return {stores:p.inventory(1),cost:n.cost,hasRelay:[...m.cells.values()].some(c=>c.contract==='relay'&&c.owner===1)};
    });
    assert(paid.hasRelay);assert.deepEqual(paid.stores,first.stores.map((n,k)=>n-paid.cost[k]));
    await page.click('#mx-config');
    assert.equal(await page.locator('#mx-experiment').inputValue(),'resources');
    assert.equal(await page.locator('#mx-plan-rows button').count(),5);
    assert.match(await page.locator('#mx-plan-budget').innerText(),/Preparação: \d+ \/ 64/);
    for(const [i,v] of [100,0,0,0].entries())await page.fill('#mx-plan-weight-'+i,String(v));
    assert.equal(await page.locator('#mx-plan-error').innerText(),'');
    await page.locator('#mx-setup button[type=submit]').click();
    assert.deepEqual(await page.evaluate(()=>__hexophageMixed.session.match.progression.plan.nodes[0].weights),[100,0,0,0]);
    // An explicit user drawing, with no catalogue key, can be the root.
    const originalBaseSize=await page.evaluate(()=>__hexophageMixed.session.match.progression.plan.nodes.find(n=>n.id===__hexophageMixed.session.match.progression.plan.base).size);
    await page.click('#mx-config');
    await page.locator('#mx-plan-json').evaluate(node=>{
      const plan=JSON.parse(node.value),base=plan.nodes.find(n=>n.id===plan.base),shape=base.offsets;
      base.name='Minha composição pesquisada';base.cardKey=null;
      base.offsets=[...shape.map(([q,r])=>[q-4,r]),...shape.map(([q,r])=>[q+4,r])];
      node.value=JSON.stringify(plan);node.closest('details').open=true;
    });
    await page.click('#mx-plan-import');assert.equal(await page.locator('#mx-plan-error').innerText(),'');
    await page.locator('#mx-setup button[type=submit]').click();
    assert(await page.evaluate(expected=>__hexophageMixed.session.opening[1].ids.length===expected&&__hexophageMixed.session.baseTrial.income>0,originalBaseSize*2),'a custom double-root must really replace the opening');
    // Match settlement enforces the chosen base-lineage objective.
    const outcome=await page.evaluate(()=>{
      const s=__hexophageMixed.session,m=s.match,p=m.progression;
      for(const [id,c] of [...m.cells])if(c.owner===2&&c.contract===p.plan.base)m.erase(2,id,0);
      s.step();return {alive:s.alive[2],out:m.players[2].out,defeated:p.objective(2).defeated};
    });
    assert.deepEqual(outcome,{alive:false,out:true,defeated:true});
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(process.env.HEX_SCREENSHOT)await page.screenshot({path:process.env.HEX_SCREENSHOT});
    assert.deepEqual(errors,[]);
    console.log('PASS: finite-resource terrain, real paid child placement, preparation editor, allocation, lineage defeat and portrait');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
