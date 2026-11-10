const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--disable-webgl']});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href+'?f=32');
    await page.waitForFunction(()=>window.__hexophageMixed?.session);
    const playerButton=id=>page.locator(`#mx-score [data-player="${id}"] .mx-player-jump`);
    const statToggle=id=>page.locator(`#mx-score [data-player="${id}"] .mx-player-toggle`);
    const stat=(id,key)=>page.locator(`#mx-stats-${id} [data-stat="${key}"]`);
    const format=value=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(value);
    const signed=value=>(value>0?'+':'')+format(value);
    async function reset(){
      await page.click('#mx-config');
      await page.locator('#mx-setup button[type=submit]').click();
      assert.equal(await page.evaluate(()=>__hexophageMixed.session.match.gen),0);
      assert.equal(await page.locator('#mx-score .mx-player-toggle[aria-expanded=true]').count(),0);
    }

    const opening=await page.evaluate(()=>{
      const {session,world}=__hexophageMixed;
      return {player:session.match.players[1],opening:session.opening[1],alive:session.alive[1],playing:world.playing};
    });
    assert.equal(opening.opening,null);
    assert.equal(opening.player.reserve,640);
    assert.equal(opening.player.conventional,0);
    assert.equal(opening.player.stamps,0);
    assert.equal(opening.player.stampSpent,0);
    assert.equal(opening.alive,true);
    assert.equal(opening.playing,false);
    await playerButton(1).click();
    assert.equal(await statToggle(1).getAttribute('aria-expanded'),'false');
    await statToggle(1).click();
    assert.equal(await statToggle(1).getAttribute('aria-expanded'),'true');
    assert.equal(await stat(1,'reserve').textContent(),'640');
    assert.equal(await stat(1,'stamps').textContent(),'0');
    assert.match(await page.locator('#mx-stats-1 > p').textContent(),/Aguardando/);

    for(let gen=0;gen<4;gen++)await page.click('#hl-step');
    await page.click('#hl-play');
    await page.waitForFunction(()=>__hexophageMixed.session.match.gen>=10);
    await page.click('#hl-play');
    assert(await page.evaluate(()=>!__hexophageMixed.world.playing));
    assert(await page.evaluate(()=>{
      const {session}=__hexophageMixed,p=session.match.players[1];
      return session.alive[1] && session.eliminatedAt[1]===null && !p.out && p.reserve===640 && p.conventional===0;
    }));

    // Choose the opening after time has already advanced and pay through the map.
    await page.locator('#mx-hand [data-key="hex-b2s245/farm-4-12"]').click();
    const board=await page.locator('#hl-world').boundingBox();
    for(const [x,y] of [[.35,.4],[.65,.4],[.4,.65],[.6,.65]]){
      await page.mouse.click(board.x+board.width*x,board.y+board.height*y);
      if(await page.evaluate(()=>__hexophageMixed.session.match.players[1].stamps>0))break;
    }
    assert.equal(await page.evaluate(()=>__hexophageMixed.session.match.players[1].stamps),1);
    assert.equal(await stat(1,'stamps').textContent(),'1');
    assert.equal(await stat(1,'stampedCells').textContent(),'4');
    assert.equal(await stat(1,'stampSpent').textContent(),'32');
    assert.equal(await stat(1,'reserve').textContent(),'608');
    assert.match(await page.locator('#mx-stats-1 > p').textContent(),/Em jogo/);

    for(let gen=0;gen<18;gen++)await page.click('#hl-step');
    const before=await page.evaluate(()=>({...__hexophageMixed.session.match.players[1]}));
    assert(before.conventional>0 && before.mature>0 && before.matureIncome>0);
    await page.click('#hl-step');
    const after=await page.evaluate(()=>({...__hexophageMixed.session.match.players[1]}));
    for(const key of ['reserve','conventional','mature','births','deaths','income','matureIncome','birthSpent','stampSpent','stamps','stampedCells']){
      assert.equal(await stat(1,key).textContent(),format(after[key]),key);
    }
    const generationIncome=after.income-before.income;
    const generationCost=(after.birthSpent+after.eraseSpent+after.friendlyEraseSpent)-(before.birthSpent+before.eraseSpent+before.friendlyEraseSpent);
    assert.equal(await stat(1,'lastIncome').textContent(),format(generationIncome));
    assert.equal(await stat(1,'lastCost').textContent(),format(generationCost));
    assert.equal(await stat(1,'lastFlow').textContent(),signed(generationIncome-generationCost));
    assert.equal(await stat(1,'flow').textContent(),await page.locator('#mx-flow').textContent());

    await statToggle(2).click();
    assert.equal(await statToggle(1).getAttribute('aria-expanded'),'false');
    assert.equal(await page.locator('#mx-stats-1').isVisible(),false);
    assert.equal(await statToggle(2).getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('#mx-score .mx-player-toggle[aria-expanded=true]').count(),1);
    assert(await stat(2,'income').isVisible());
    assert(await page.locator('#mx-stats-2').evaluate(panel=>panel.parentElement.dataset.player==='2' && panel.previousElementSibling.matches('.mx-player-head')));
    await statToggle(2).click();
    assert.equal(await page.locator('#mx-stats-2').isVisible(),false);
    await statToggle(1).click();
    await reset();
    await statToggle(1).click();
    for(const key of ['income','births','deaths','stamps','stampedCells','lastIncome','lastCost','lastFlow','flow']){
      assert.equal(await stat(1,key).textContent(),'0',`reset ${key}`);
    }
    assert.equal(await stat(1,'reserve').textContent(),'640');

    // Paused typed fixtures put a distant component first in insertion order.
    // The visible camera is near the other component, whose center is empty.
    const colonies=await page.evaluate(()=>{
      const {session,world}=__hexophageMixed,{graph,match}=session;
      const point=site=>Array.from(graph.coords.slice(site*3,site*3+3));
      const look=point(world.center),axis=Math.abs(look[1])<.8?[0,1,0]:[1,0,0];
      const dot=(a,b)=>a.reduce((sum,value,index)=>sum+value*b[index],0);
      const tangent=axis.map((value,index)=>value-dot(axis,look)*look[index]);
      const target=look.map((value,index)=>value+.2*tangent[index]);
      let near=0,far=0;
      for(let site=1;site<graph.n;site++){
        if(dot(point(site),target)>dot(point(near),target))near=site;
        if(dot(point(site),look)<dot(point(far),look))far=site;
      }
      const ring=site=>Array.from({length:graph.deg[site]},(_,edge)=>graph.adj[site*6+edge]);
      const cell=[...match.cells.values()].find(value=>value.owner===2);
      for(const [site,value] of match.cells)if(value.owner===2)match.cells.delete(site);
      for(const site of [...ring(far),...ring(near)])match.cells.set(site,cell);
      const center=[0,0,0];
      for(const site of ring(near))for(let index=0;index<3;index++)center[index]+=graph.coords[site*3+index];
      let expected=0;
      for(let site=1;site<graph.n;site++)if(dot(point(site),center)>dot(point(expected),center))expected=site;
      return {expected,near,far,start:session.starts[2],first:[...match.cells].find(([,value])=>value.owner===2)[0]};
    });
    assert.equal(colonies.expected,colonies.near);
    assert.notEqual(colonies.expected,colonies.start);
    assert.notEqual(colonies.expected,colonies.first);
    await playerButton(2).click();
    assert.equal(await page.evaluate(()=>__hexophageMixed.world.center),colonies.expected);
    await playerButton(2).click();
    await page.evaluate(()=>{
      const cells=__hexophageMixed.session.match.cells,entries=[...cells].reverse();
      cells.clear();for(const [site,cell] of entries)cells.set(site,cell);
    });
    await playerButton(2).click();
    assert.equal(await page.evaluate(()=>__hexophageMixed.world.center),colonies.expected);

    // A valid first purchase may still lose its last cell on its first tick.
    await reset();
    assert(await page.evaluate(()=>{
      const {session}=__hexophageMixed;
      return session.match.stamp(1,'callahan','contact',[session.starts[1]]);
    }));
    await page.click('#hl-step');
    assert.equal(await page.evaluate(()=>__hexophageMixed.session.eliminatedAt[1]),1);
    assert.equal(await page.evaluate(()=>__hexophageMixed.session.alive[1]),false);
    await statToggle(1).click();
    assert.match(await page.locator('#mx-stats-1 > p').textContent(),/Eliminado na geração 1/);
    assert.equal(await stat(1,'stamps').textContent(),'1');
    assert.equal(await stat(1,'conventional').textContent(),'0');
    assert.deepEqual(errors,[]);
    console.log('PASS: empty human opening, late canvas purchase, live player statistics, accordion/reset, nearest colony navigation and normal elimination');
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
