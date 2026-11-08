import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationState } from '../../simulation/state.js';
import { initRuleTables, parseRule } from '../../simulation/rules.js';
import { evaluateCell } from '../../simulation/cell-fate.js';
import { recordCombatDeath } from './direct-death.js';

function ring(owners, custom) {
  const w = createSimulationState();
  w.graph = { adj: [1, 2, 3, 4, 5, 6], deg: [owners.length] };
  w.nextOwners = Uint8Array.from([1, ...owners]);
  initRuleTables(w);
  w.rule = custom ? 'custom' : 'callahan';
  if (custom) parseRule(w, custom);
  return w;
}

function survives(w, owners) {
  return evaluateCell({ ...w, owners, cells: owners.map(o => Number(o !== 0)) })(0) !== 0;
}

function claim(w) {
  const claims = [];
  if (!survives(w, w.nextOwners)) recordCombatDeath(w, 0, 1, claims);
  return claims[1] ?? new Float64Array(7);
}

test('direct deaths agree with the physical engine with and without the rival', () => {
  for (const degree of [5, 6]) for (let i = 0; i < 3 ** degree; i++) {
    let code = i;
    const w = ring(Array.from({ length: degree }, () => {
      const owner = code % 3; code = Math.floor(code / 3); return owner;
    }));
    const expected = !survives(w, w.nextOwners) && survives(w, w.nextOwners.map(o => o === 2 ? 0 : o));
    assert.equal(claim(w)[2], Number(expected));
  }
});

test('keep neutral matter, split joint responsibility and exclude a mere bystander', () => {
  assert.deepEqual([...claim(ring([1, 1, 1, 2, 3, 0]))], [0, 0, .5, .5, 0, 0, 0]);
  assert.deepEqual([...claim(ring([1, 1, 1, 2, 2, 3]))], [0, 0, 1, 0, 0, 0, 0]);
  assert.equal(claim(ring([1, 1, 1, 7, 7, 2]))[2], 0);
  assert.equal(claim(ring([1, 1, 7, 7, 2, 0]))[2], 1);
  assert.equal(claim(ring([1, 1, 2, 0, 0], 'B3/S2'))[2], 1);
});
