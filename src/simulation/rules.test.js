import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationState } from './state.js';
import { initRuleTables, parseRule } from './rules.js';
import { evaluateCell } from './cell-fate.js';

test('Callahan tables cover every pentagonal and hexagonal neighbourhood', () => {
  const world = createSimulationState();
  initRuleTables(world);
  for (const degree of [5, 6]) {
    for (let mask = 0; mask < 2 ** degree; mask++) {
      const parents = Array.from({ length: degree }, (_, i) => i).filter((i) => mask & (1 << i));
      const n = parents.length,
        gap = parents[1] - parents[0];
      const distance = Math.min(gap, degree - gap);
      assert.equal(world['callBirth' + degree][mask], Number(n === 2 && distance === 1));
      assert.equal(
        world['callSurv' + degree][mask],
        Number([3, 4].includes(n) || (n === 2 && distance === 2)),
      );
    }
  }
});

test('invalid custom rules preserve the entire last valid rule', () => {
  const world = createSimulationState();
  assert(parseRule(world, ' b06 / s14 '));
  assert.equal(parseRule(world, 'B27/S9'), false);
  assert.deepEqual([...world.birth], [1, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual([...world.survival], [0, 1, 0, 0, 1, 0, 0]);
  assert(parseRule(world, 'B/S'));
  assert(!world.birth.some(Boolean) && !world.survival.some(Boolean));
});

test('birth ownership follows living parents and survival retains the current owner', () => {
  const world = createSimulationState();
  world.graph = { adj: [1, 2, 3, 4, 5, 6], deg: [6] };
  world.cells = [0, 1, 1, 0, 0, 0, 0];
  world.owners = [0, 1, 2, 0, 0, 0, 0];
  initRuleTables(world);
  world.rule = 'callahan';
  assert.equal(evaluateCell(world)(0), 7);
  world.owners[2] = 1;
  assert.equal(evaluateCell(world)(0), 1);
  world.rule = 'custom';
  parseRule(world, 'B3/S3');
  world.cells[3] = 1;
  world.owners[3] = 2;
  assert.equal(evaluateCell(world)(0), 1);
  world.owners[2] = 3;
  assert.equal(evaluateCell(world)(0), 7);
  world.cells[0] = 1;
  world.owners[0] = 5;
  assert.equal(evaluateCell(world)(0), 5);
});
