import assert from 'node:assert/strict';
import test from 'node:test';
import { atlasPatterns } from '../../src/patterns/atlas-data.js';
import { analyzePatternCycles } from '../../src/patterns/cycle-economy.js';
import { studyEconomy } from './study-baseline.js';
import { generateProfiles } from './profiles.js';

const profiles = generateProfiles().then(entries => new Map(entries.map(p => [p.id,p])));
const near = (a,b) => assert.ok(Math.abs(a-b) < 1e-6, `${a} ≠ ${b}`);

test('all original atlas seeds have a measured profile; closed-form flipper and ship rates', async () => {
  const all = await profiles;
  assert.deepEqual([...all.keys()], atlasPatterns.map(p => p.id));
  assert.equal(all.size,160);
  for (const p of all.values()) {
    assert.ok(p.usable, p.id);
    near(p.net, p.births - p.upkeep);
    near(p.live, p.births + p.upkeep);
  }
  near(all.get('p2').net,1);
  near(all.get('p2').core,1);
  near(all.get('glider').net,3.5);
  for (const id of ['p42rot','glider','p15','p48']) near(all.get(id).core,0);
  assert.equal(all.get('gun210').emitter,false);
});

// These cycles occur after every sample used to select and fit the profile.
for (const [id,cycles] of [['gun20',64],['gun42',64],['stalk',132]]) {
  test(`${id} extrapolation reproduces independent late macroscopic totals`,async () => {
    const p = (await profiles).get(id);
    const trajectory = await analyzePatternCycles(atlasPatterns.find(seed => seed.id === id),studyEconomy,{cycles});
    const tail = trajectory.rows.slice(-p.fitBlock);
    const mean = field => tail.reduce((sum,r) => sum+r[field],0)/tail.length;
    const age = mean('from') - 1;
    near(p.births + age*p.birthsSlope,mean('births') / p.window);
    near(p.upkeep + age*p.upkeepSlope,mean('stableCellTurns') / p.window);
    near(p.core + age*p.coreSlope,mean('fixedCore'));
  });
}
