// Integration regression for five growth-oriented bots on the actual spherical graph.
const assert=require('node:assert/strict');
(async()=>{
  const {createHeadlessMatch}=await import('../src/match/headless.js');
  const {buildSphere}=await import('../src/world/sphere.js');
  const {world,game,nextTick}=createHeadlessMatch(buildSphere(64),{interval:10});
  assert.deepEqual(game.bots,['farmer','cycler','core','slow','diverse']);
  for(let t=1;t<=160;t++)nextTick();
  const bots=game.players.slice(1);
  assert(bots.every(p=>p.stamps>=1),'all bots cultivate');
  assert(bots.every(p=>p.totalBirths>0),'all bots generate births');
  assert(bots.every(p=>p.reserve>=0),'no negative energy balances');
  assert(bots.every(p=>p.eroded===0),'no erosion for default productive farms');
  assert(bots.every(p=>world.ownerCells[p.id].length>0),'farms survive');
  console.log('PASS: five growing bots over 160 generations; stamps: '+bots.map(p=>p.stamps).join(','));
})().catch(e=>{console.error(e);process.exitCode=1});
