import test from 'node:test';
import assert from 'node:assert/strict';
import { DIR } from '../../world/geometry.js';
import { aimAtTarget } from './aim.js';

test('a measured moving stamp is aimed back along the ray from the opponent', () => {
  for (let d = 0; d < DIR.length; d++) {
    const drift = DIR[d].map(n => 3 * n);
    assert.equal((d + aimAtTarget({ drift }, 4)) % 6, 3);
  }
  assert.equal(aimAtTarget({ drift:[0.4,-0.3] }, 4), 4);
  assert.equal(aimAtTarget(undefined, 2), 2);
});

test('a newly active rival edge can be found from the births recorded by the actual match', async () => {
  const { createHeadlessMatch } = await import('../../match/headless.js');
  const { buildSphere } = await import('../../world/sphere.js');
  const { selectSpot } = await import('./proposals.js');
  const idle = new Map([2,3,4,5,6].map(id => [id, () => {}]));
  const m = createHeadlessMatch(buildSphere(20), {
    rule:'custom', notation:'B1/S', botMode:'learn', strategies:idle,
  });
  const [hunter, rival] = m.game.players;
  assert(m.commitStamp(rival.id, [rival.seed], false));
  m.nextTick();
  hunter.stamps = 1;
  const spot = selectSpot(m.world, m.game, hunter, () => 0);
  assert.equal(spot.kind, 'rival');
  assert(m.game.recentBirthSites[rival.id].includes(spot.target));
  assert.equal(m.world.cellAges[spot.target], 1);
  const ahead = m.world.graph.adj[6 * spot.target + spot.direction];
  assert.equal(m.world.cells[ahead], 0);
});
