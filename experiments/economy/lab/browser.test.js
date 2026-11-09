// node experiments/economy/build-lab.js && node experiments/economy/lab/browser.test.js
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { rules } from '../scenarios.js';
import { HORIZON, simulate } from '../simulator.js';
import { loadMacroProfiles } from '../macro-profiles.js';

const profiles=await loadMacroProfiles();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
try {
  const page=await browser.newPage({viewport:{width:1200,height:870}});
  const errors=[], remote=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url())) remote.push(r.url());});
  await page.goto(new URL('../lab.html',import.meta.url).href);
  const run=async () => {
    await page.locator('#run').click();
    await page.waitForFunction(()=>!document.querySelector('#run').disabled);
    assert.ok(await page.locator('#records tr').count());
  };
  await page.waitForSelector('#records tr');
  assert.equal(await page.locator('#rule option').count(),rules.length);
  assert.equal(await page.locator('#pattern option').count(),profiles.size);
  await page.locator('#rule').selectOption('current');
  await page.locator('#policy').selectOption('flipper');
  await run();
  assert.match(await page.locator('#status').innerText(), /10.000 compras/);
  assert.ok(await page.locator('#show-parked').isVisible());
  assert.doesNotMatch(await page.locator('#records').innerText(),/Poupança após limite/);
  await page.locator('#parked').check();
  assert.match(await page.locator('#records').innerText(),/Poupança após limite/);
  await page.locator('#metric').selectOption('burst');
  assert.ok(await page.locator('#chart circle').count()>1);
  await page.locator('#rule').selectOption('battery');
  await page.locator('#policy').selectOption('custom');
  await page.locator('#pattern').selectOption('p4f');
  await page.locator('#second').selectOption('glider');
  await page.locator('#coefs summary').click();
  await page.locator('[data-key="price"]').fill('100');
  await page.locator('#buy').selectOption('110');
  await run();
  const expected=simulate(profiles,{...rules.find(r=>r.id==='battery'),price:100},
    {id:'custom',start:['p2'],repeat:['p4f','glider'],fundGun:true},{buyThrough:HORIZON-10*60*200});
  assert.equal(await page.locator('#records tr:last-child td:nth-child(2)').innerText(),
    expected.orders.toLocaleString('pt-BR'));
  await page.locator('#rule').selectOption('current');await page.locator('#policy').selectOption('nursery');
  await run();
  assert.match(await page.locator('#status').innerText(),/Déficit/);
  await page.locator('#rule').selectOption('battery');
  await page.locator('#policy').selectOption('custom');await page.locator('#seeds').fill('0');
  await page.locator('#pattern').selectOption('gun840');
  await run();
  assert.match(await page.locator('#status').innerText(),/primeira estrutura/);
  await page.setViewportSize({width:360,height:730});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(remote.length,0,'offline document must be self-contained');
  assert.deepEqual(errors,[]);
  console.log('Lab passed preset, custom path, censor, insolvency, offline and mobile checks.');
} finally { await browser.close(); }
