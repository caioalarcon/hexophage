import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationState } from './state.js';
import { CALLAHAN, compileHexRule, compileTotalistic } from './rules.js';
import { evaluateCell } from './cell-fate.js';

test('Callahan tables cover every pentagonal and hexagonal neighbourhood', () => {
  for (const degree of [5, 6]) {
    for (let mask = 0; mask < 2 ** degree; mask++) {
      const parents = Array.from({ length: degree }, (_, i) => i).filter((i) => mask & (1 << i));
      const n = parents.length,
        gap = parents[1] - parents[0];
      const distance = Math.min(gap, degree - gap);
      assert.equal(CALLAHAN.tables[degree][0][mask], Number(n === 2 && distance === 1));
      assert.equal(
        CALLAHAN.tables[degree][1][mask],
        Number([3, 4].includes(n) || (n === 2 && distance === 2)),
      );
    }
  }
});

test('custom rules compile to canonical notation, reject invalid input, and support empty sets', () => {
  const rule = compileTotalistic(' b660 / s41 ');
  assert.equal(rule.notation, 'B06/S14');
  assert.equal(compileTotalistic('B27/S9'), null);
  for (const degree of [5,6]) for (let mask = 0; mask < 2 ** degree; mask++) {
    const count = mask.toString(2).replaceAll('0', '').length;
    assert.equal(rule.tables[degree][0][mask], Number(count === 0 || count === 6));
    assert.equal(rule.tables[degree][1][mask], Number(count === 1 || count === 4));
  }
  for (const table of compileTotalistic('B/S').tables[6]) assert(!table.some(Boolean));
});

test('birth ownership follows living parents and survival retains the current owner', () => {
  const world = createSimulationState();
  world.graph = { adj: [1, 2, 3, 4, 5, 6], deg: [6] };
  world.cells = [0, 1, 1, 0, 0, 0, 0];
  world.owners = [0, 1, 2, 0, 0, 0, 0];
  world.physics = CALLAHAN;
  assert.equal(evaluateCell(world)(0), 7);
  world.owners[2] = 1;
  assert.equal(evaluateCell(world)(0), 1);
  world.physics = compileTotalistic('B3/S3');
  world.cells[3] = 1;
  world.owners[3] = 2;
  assert.equal(evaluateCell(world)(0), 1);
  world.owners[2] = 3;
  assert.equal(evaluateCell(world)(0), 7);
  world.cells[0] = 1;
  world.owners[0] = 5;
  assert.equal(evaluateCell(world)(0), 5);
});

test('a custom mixed-parent policy can select a parent while vacuum and single-lineage births agree with the lab', () => {
  const physics = compileHexRule(() => true, counts => counts[4] ? 4 : 3);
  const graph = { adj: [1,2,3,4,5,6], deg: [6] };
  const owners = [0,0,0,0,0,0,0], cells = owners.slice();
  const fate = evaluateCell({ physics, graph, owners, cells });
  assert.equal(fate(0), 7);
  owners[1] = 1; cells[1] = 1;
  assert.equal(fate(0), 1);
  owners[2] = 4; cells[2] = 1;
  assert.equal(fate(0), 4);
  owners[2] = 2;
  assert.equal(fate(0), 7);
});
