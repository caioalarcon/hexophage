// Real canvas input exercises tool routing, economics, saved deck slots and layout.
// Run after npm run build, with CHROMIUM_PATH set when Chromium is system-installed.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href+'?rule=mixed&f=32';
const captures=process.env.TEST_SCREENSHOTS;
const atlasKey='hexophage.mixed.atlas.v1';
const farmKey='hex-b2s245/farm-4-12';
const sorted=xs=>[...xs].sort((a,b)=>a-b);

async function ready(page){
  await page.waitForFunction(()=>window.__hexophageMixed?.session&&window.__hexophageMixed.tools);
}
async function localView(page){
  for(let n=0;n<14;n++){
    if(await page.evaluate(()=>!!__hexophageMixed.world.chart))return;
    await page.click('#hl-zplus');
  }
  assert.fail('A close view must expose the local chart for pixel-accurate fixture placement.');
}
async function screenshot(page,name){
  if(!captures)return;
  fs.mkdirSync(captures,{recursive:true});
  await page.screenshot({path:path.join(captures,name+'.png')});
}
async function setRadius(page,radius){
  await page.locator('#mx-erase-radius').press('Home');
  for(let n=1;n<radius;n++)await page.locator('#mx-erase-radius').press('ArrowRight');
  assert.equal(await page.evaluate(()=>__hexophageMixed.tools.radius),radius);
  assert.equal((await page.locator('#mx-erase-value').textContent()).trim(),String(radius));
}
async function applyLimits(page,maxEraseRadius,maxStampCells){
  await page.evaluate(()=>{
    const h=__hexophageMixed;
    window.__fieldTestMatch=h.session.match;
    window.__fieldTestState=JSON.stringify({gen:h.session.match.gen,players:h.session.match.players,
      cells:[...h.session.match.cells].map(([id,c])=>[id,c.owner,c.rule,c.age])});
  });
  await page.click('#mx-config');
  await page.locator('#mx-erase-max').fill(String(maxEraseRadius));
  await page.locator('#mx-stamp-max').fill(String(maxStampCells));
  await page.click('#mx-tools-apply');
  const result=await page.evaluate(()=>{
    const h=__hexophageMixed;
    return {same:h.session.match===window.__fieldTestMatch,
      unchanged:window.__fieldTestState===JSON.stringify({gen:h.session.match.gen,players:h.session.match.players,
        cells:[...h.session.match.cells].map(([id,c])=>[id,c.owner,c.rule,c.age])}),
      settings:{...h.session.match.toolSettings}};
  });
  assert(result.same&&result.unchanged,'Applying tool limits must retain this match, its generations, field and accounts.');
  assert.deepEqual(result.settings,{maxEraseRadius,maxStampCells});
  assert.equal(await page.locator('#mx-erase-radius').getAttribute('max'),String(maxEraseRadius));
  await page.click('#mx-settings-close');
}
async function plantFarm(page){
  await localView(page);
  await page.locator('#mx-hand [data-key="'+farmKey+'"]').click();
  await page.selectOption('#mx-resolver','guard');
  await page.selectOption('#mx-ballot','age');
  await page.click('#mx-tool-stamp');
  const point=await page.evaluate(()=>{
    const h=__hexophageMixed,w=h.world,m=h.session.match,r=document.querySelector('#hl-world').getBoundingClientRect();
    const points=[...w.chart.map.values()].map(c=>({...c,
      x:r.left+r.width/2+Math.sqrt(3)*12*(c.q+c.r/2)*w.zoom,
      y:r.top+r.height/2+18*c.r*w.zoom}));
    const p=points.filter(c=>c.x>r.left+70&&c.x<r.right-70&&c.y>r.top+70&&c.y<r.bottom-70)
      .sort((a,b)=>a.q*a.q+a.r*a.r-b.q*b.q-b.r*b.r)
      .find(c=>{
        const ids=h.selection.shape.map(([q,rr])=>w.chart.map.get((q+c.q)+','+(rr+c.r))?.id);
        return ids.every(id=>id!==undefined)&&m.canStamp(1,h.selection.card.rule,h.selection.resolver,ids,h.selection.ballot,h.selection.card.sense??'native');
      });
    if(!p)return null;
    return {...p,balance:m.players[1].reserve,price:m.stampPrice('guard')*h.selection.shape.length};
  });
  assert(point,'A clear site must be available for the isolated source farm.');
  await page.mouse.click(point.x,point.y);
  assert.equal(await page.evaluate(()=>__hexophageMixed.session.match.players[1].reserve),point.balance-point.price);
  await page.click('#hl-step');await page.click('#hl-step');
  const own=await page.evaluate(()=>[...__hexophageMixed.session.match.cells].filter(([,c])=>c.owner===1)
    .map(([id,c])=>({id,rule:c.rule,resolver:c.resolver,ballot:c.ballot,sense:c.sense})));
  assert.equal(own.length,12,'The source farm must reach its complete twelve-cell shape.');
  assert(own.every(c=>c.rule==='hex-b2s245'&&c.resolver==='guard'&&c.ballot==='age'&&c.sense==='native'));
  return point;
}
async function ownPoint(page,{empty=false}={}){
  return page.evaluate(({empty})=>{
    const h=__hexophageMixed,w=h.world,m=h.session.match,r=document.querySelector('#hl-world').getBoundingClientRect();
    const own=[...w.chart.map.values()].filter(c=>m.cells.get(c.id)?.owner===1);
    const cells=[...w.chart.map.values()].filter(c=>empty?!m.cells.has(c.id):m.cells.get(c.id)?.owner===1);
    const score=c=>Math.min(...own.map(o=>Math.max(Math.abs(o.q-c.q),Math.abs(o.r-c.r),Math.abs(o.q+o.r-c.q-c.r))));
    const candidate=cells.map(c=>({...c,score:score(c),
      x:r.left+r.width/2+Math.sqrt(3)*12*(c.q+c.r/2)*w.zoom,
      y:r.top+r.height/2+18*c.r*w.zoom}))
      .filter(c=>c.x>r.left+30&&c.x<r.right-30&&c.y>r.top+30&&c.y<r.bottom-30)
      .sort((a,b)=>a.score-b.score||a.q*a.q+a.r*a.r-b.q*b.q-b.r*b.r)[0];
    return candidate??null;
  },{empty});
}
async function portraitLayout(page){
  await page.click('#mx-tool-erase');
  await page.setViewportSize({width:390,height:844});
  const layout=await page.evaluate(()=>{
    const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    return {width:innerWidth,scroll:document.documentElement.scrollWidth,top:box('#br-rail'),field:box('#hl-world'),bottom:box('.mx-arsenal'),
      buttons:['stamp','erase','pick'].map(id=>box('#mx-tool-'+id)),radius:box('#mx-erase-radius')};
  });
  assert(layout.scroll<=layout.width,'Portrait mode must not overflow horizontally.');
  assert(layout.top.bottom<=layout.field.y+1&&layout.field.bottom<=layout.bottom.y+1&&layout.field.height>200);
  assert(layout.buttons.every(b=>b.width>=24&&b.height>=24&&b.x>=0&&b.right<=layout.width));
  assert(layout.radius.width>25&&layout.radius.right<=layout.width);
  await screenshot(page,'portrait-tools');
  await page.click('#mx-config');
  const dialog=await page.locator('#mx-settings').boundingBox();assert(dialog.x>=0&&dialog.x+dialog.width<=390);
  await page.locator('#mx-tools-apply').scrollIntoViewIfNeeded();await screenshot(page,'portrait-settings');
  await page.click('#mx-settings-close');
}

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--disable-webgl']});
  const errors=[];
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(url);await ready(page);
    assert.equal(await page.locator('#mx-hand button').count(),54);
    for(const [id,label] of [['stamp','Carimbo'],['erase','Borracha'],['pick','Conta-gotas']]){
      assert.equal(await page.locator('#mx-tool-'+id).getAttribute('aria-label'),label);
      assert.equal(await page.locator('#mx-tool-'+id+' svg').count(),1);
    }
    assert.equal(await page.evaluate(()=>__hexophageMixed.tools.mode),'stamp');
    const visibleRows=await page.locator('#mx-hand').evaluate(n=>{
      const bounds=n.getBoundingClientRect();
      return new Set([...n.children].filter(c=>{
        const r=c.getBoundingClientRect();return r.top>=bounds.top-1&&r.bottom<=bounds.bottom+1;
      }).map(c=>c.offsetTop)).size;
    });
    assert(visibleRows>=15,'The desktop arsenal must still show at least fifteen rows.');

    await applyLimits(page,8,64);
    await page.click('#mx-tool-erase');await setRadius(page,8);
    await applyLimits(page,4,64);
    assert.equal(await page.evaluate(()=>__hexophageMixed.tools.radius),4,'Lowering the cap must clamp the active brush.');
    await applyLimits(page,8,64);

    // Sample from an empty neighboring cell, replacing a different existing slot.
    await plantFarm(page);
    const sample=await ownPoint(page,{empty:true});assert(sample&&sample.score===1);
    const deck=await page.locator('#mx-hand button').evaluateAll(ns=>ns.map(n=>({key:n.dataset.key,slot:n.dataset.slot})));
    const replaced=deck.find(c=>c.key!==farmKey);
    await page.locator('#mx-hand [data-slot="'+replaced.slot+'"]').click();
    await page.selectOption('#mx-resolver','phase');await page.selectOption('#mx-ballot','robustness');
    const beforePick=await page.evaluate(()=>({...__hexophageMixed.session.match.players[1]}));
    await page.click('#mx-tool-pick');await page.mouse.move(sample.x,sample.y);
    await screenshot(page,'desktop-eyedropper');
    await page.mouse.click(sample.x,sample.y);
    assert.equal(await page.evaluate(()=>__hexophageMixed.tools.mode),'stamp');
    assert.equal(await page.locator('#mx-hand button').count(),54);
    const afterDeck=await page.locator('#mx-hand button').evaluateAll(ns=>ns.map(n=>({key:n.dataset.key,slot:n.dataset.slot})));
    const captured=afterDeck.find(c=>c.slot===replaced.slot);
    assert(captured&&captured.key!==replaced.key,'The current slot must receive the sampled card.');
    assert.deepEqual(afterDeck.filter(c=>c.slot!==replaced.slot),deck.filter(c=>c.slot!==replaced.slot));
    assert.equal(await page.locator('#mx-resolver').inputValue(),'guard');
    assert.equal(await page.locator('#mx-ballot').inputValue(),'age');
    assert.deepEqual(await page.evaluate(()=>({...__hexophageMixed.session.match.players[1]})),beforePick,'Picking must be free and leave the field account unchanged.');
    const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),atlasKey);
    assert.equal(saved.replacements[replaced.slot],captured.key);
    const custom=saved.custom.find(c=>c.key===captured.key);assert(custom);
    assert.equal(custom.offsets.length,12);
    for(const [key,value] of Object.entries({rule:'hex-b2s245',resolver:'guard',ballot:'age',sense:'native'}))assert.equal(custom[key],value,key);

    // A whole oversized component is refused, never clipped into an unrelated card.
    await applyLimits(page,8,3);await page.click('#mx-tool-pick');
    const storageBefore=await page.evaluate(key=>localStorage.getItem(key),atlasKey);
    await page.mouse.click(sample.x,sample.y);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),atlasKey),storageBefore);
    assert.equal(await page.locator('#mx-hand [data-slot="'+replaced.slot+'"]').getAttribute('data-key'),captured.key);
    await applyLimits(page,8,64);
    await page.reload();await ready(page);await localView(page);
    assert.deepEqual(await page.locator('#mx-hand button').evaluateAll(ns=>ns.map(n=>({key:n.dataset.key,slot:n.dataset.slot}))),afterDeck);
    assert.deepEqual(await page.evaluate(()=>({...__hexophageMixed.session.match.toolSettings})),{maxEraseRadius:8,maxStampCells:64});
    await page.locator('#mx-hand [data-slot="'+replaced.slot+'"]').click();
    assert.equal(await page.locator('#mx-resolver').inputValue(),'guard');
    assert.equal(await page.locator('#mx-ballot').inputValue(),'age');
    assert.equal(await page.evaluate(()=>__hexophageMixed.selection.shape.length),12);
    if(process.env.FIELD_TOOLS_PHASE==='controls'){
      await portraitLayout(page);assert.deepEqual(errors,[]);
      console.log('PASS: live settings, nearest-pattern capture, saved slot and traits, complete size rejection, desktop density and portrait fit');
      return;
    }

    // Arrange a nearby opponent inside the brush and exhaust the human reserve.
    await plantFarm(page);
    const eraseAt=await ownPoint(page);assert(eraseAt);
    const fixture=await page.evaluate(anchor=>{
      const h=__hexophageMixed,m=h.session.match,g=m.graph;
      const angle=(a,b)=>{
        const p=[...g.coords.subarray(3*a,3*a+3)],q=[...g.coords.subarray(3*b,3*b+3)];
        return Math.acos(Math.max(-1,Math.min(1,p.reduce((sum,x,i)=>sum+x*q[i],0)/(Math.hypot(...p)*Math.hypot(...q)))));
      };
      const edge=Array.from({length:g.deg[anchor.id]},(_,k)=>angle(anchor.id,g.adj[6*anchor.id+k]))
        .reduce((sum,x)=>sum+x,0)/g.deg[anchor.id];
      const enemy=[...h.world.chart.map.values()].find(c=>angle(anchor.id,c.id)<6*edge&&m.canStamp(2,'callahan','contact',[c.id]));
      if(!enemy||!m.stamp(2,'callahan','contact',[enemy.id]))return null;
      m.players[1].reserve=0;
      return {enemy:enemy.id,own:[...m.cells].filter(([,c])=>c.owner===1).map(([id])=>id),
        account:{...m.players[1]},others:[...m.cells].filter(([,c])=>c.owner!==1).map(([id,c])=>[id,c.owner,c.rule,c.age])};
    },eraseAt);
    assert(fixture,'An enemy site must be inside the eraser radius and outside planting exclusion.');
    await page.click('#mx-tool-erase');await setRadius(page,8);
    const preview=await page.evaluate(anchor=>__hexophageMixed.tools.preview(anchor),eraseAt);
    assert.deepEqual(sorted(preview.ids),sorted(fixture.own),'The preview must identify the actual owned cells to erase.');
    await page.mouse.move(eraseAt.x,eraseAt.y);
    await screenshot(page,'desktop-zero-reserve-brush');
    await page.mouse.click(eraseAt.x,eraseAt.y);
    const erased=await page.evaluate(()=>{
      const m=__hexophageMixed.session.match;
      return {account:{...m.players[1]},own:[...m.cells].filter(([,c])=>c.owner===1).map(([id])=>id),
        others:[...m.cells].filter(([,c])=>c.owner!==1).map(([id,c])=>[id,c.owner,c.rule,c.age])};
    });
    assert.deepEqual(erased.own,[]);assert.deepEqual(erased.others,fixture.others);
    for(const key of Object.keys(fixture.account)){
      if(['field','conventional','mature','toolErased','eraseActions'].includes(key))continue;
      assert.equal(erased.account[key],fixture.account[key],'Manual erasing must not change '+key);
    }
    assert.equal(erased.account.reserve,0);assert.equal(erased.account.field,0);assert.equal(erased.account.conventional,0);
    assert.equal(erased.account.toolErased-fixture.account.toolErased,fixture.own.length);
    assert.equal(erased.account.eraseActions-fixture.account.eraseActions,1);

    // A single fast mousemove must paint the intervening cells, without panning.
    await setRadius(page,1);
    const line=await page.evaluate(()=>{
      const h=__hexophageMixed,w=h.world,m=h.session.match,r=document.querySelector('#hl-world').getBoundingClientRect();
      m.players[1].reserve=1000;
      for(let row=-8;row<=8;row++)for(let q=-12;q<=3;q++){
        const cells=Array.from({length:9},(_,i)=>w.chart.map.get((q+i)+','+row));
        if(cells.some(c=>!c))continue;
        const points=cells.map(c=>({...c,x:r.left+r.width/2+Math.sqrt(3)*12*(c.q+c.r/2)*w.zoom,y:r.top+r.height/2+18*c.r*w.zoom}));
        if(points.some(c=>c.x<r.left+25||c.x>r.right-25||c.y<r.top+25||c.y>r.bottom-25))continue;
        if(!m.stamp(1,'hex-b2s245','contact',cells.map(c=>c.id)))continue;
        return {points,center:w.center,orient:w.orient,balance:m.players[1].reserve};
      }
      return null;
    });
    assert(line,'A clear visible nine-cell line must fit the local chart.');
    await page.mouse.move(line.points[0].x,line.points[0].y);await page.mouse.down();
    await page.mouse.move(line.points.at(-1).x,line.points.at(-1).y,{steps:1});await page.mouse.up();
    assert(await page.evaluate(ids=>ids.every(id=>!__hexophageMixed.session.match.cells.has(id)),line.points.map(c=>c.id)),'A fast stroke must leave no gaps.');
    assert.deepEqual(await page.evaluate(()=>({center:__hexophageMixed.world.center,orient:__hexophageMixed.world.orient,balance:__hexophageMixed.session.match.players[1].reserve})),
      {center:line.center,orient:line.orient,balance:line.balance});

    // Repeated use at a fixed pointer must follow generations that regrow into it.
    await plantFarm(page);
    const regrowth=await page.evaluate(()=>{
      const h=__hexophageMixed,w=h.world,m=h.session.match,r=document.querySelector('#hl-world').getBoundingClientRect();
      for(const anchor of w.chart.map.values()){
        const ids=m.erasePreview(1,anchor.id,1);
        if(!ids.length||ids.length>=m.players[1].field)continue;
        const fork=m.fork();fork.erase(1,anchor.id,1);fork.step();
        if(!fork.erasePreview(1,anchor.id,1).length)continue;
        return {...anchor,initial:ids.length,toolErased:m.players[1].toolErased,
          x:r.left+r.width/2+Math.sqrt(3)*12*(anchor.q+anchor.r/2)*w.zoom,y:r.top+r.height/2+18*anchor.r*w.zoom};
      }
      return null;
    });
    assert(regrowth,'A partial farm cut must regrow inside the stationary brush in the next generation.');
    await page.click('#mx-tool-erase');await setRadius(page,1);
    await page.locator('#hl-speed').press('Home');
    for(let n=1;n<4;n++)await page.locator('#hl-speed').press('ArrowRight');
    await page.click('#hl-play');
    await page.mouse.move(regrowth.x,regrowth.y);await page.mouse.down();
    await page.waitForFunction(({before,initial})=>__hexophageMixed.session.match.players[1].toolErased>before+initial,
      {before:regrowth.toolErased,initial:regrowth.initial},{timeout:5000});
    await page.mouse.up();await page.click('#hl-play');
    assert(!await page.evaluate(()=>__hexophageMixed.world.playing));

    // The map-navigation escape must remain usable while the eraser is selected.
    const beforePan=await page.evaluate(()=>({center:__hexophageMixed.world.center,orient:__hexophageMixed.world.orient,
      erased:__hexophageMixed.session.match.players[1].toolErased}));
    const board=await page.locator('#hl-world').boundingBox();
    await page.keyboard.down('Shift');
    await page.mouse.move(board.x+board.width*.45,board.y+board.height*.5);await page.mouse.down();
    await page.mouse.move(board.x+board.width*.65,board.y+board.height*.5,{steps:5});await page.mouse.up();await page.keyboard.up('Shift');
    const afterPan=await page.evaluate(()=>({center:__hexophageMixed.world.center,orient:__hexophageMixed.world.orient,
      erased:__hexophageMixed.session.match.players[1].toolErased}));
    assert(afterPan.center!==beforePan.center||afterPan.orient!==beforePan.orient,'Shift-drag must move the map.');
    assert.equal(afterPan.erased,beforePan.erased,'Panning must not erase along the path.');

    await portraitLayout(page);
    assert.deepEqual(errors,[]);
    console.log('PASS: live limits, complete nearest-pattern capture, exact saved slot and traits, cashless own-only erasure, gapless strokes, stationary regrowth cleanup, pan escape, desktop density and portrait fit');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
