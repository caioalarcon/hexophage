// Two stationary ends of the catalog stalk, joined across a fixed strip.
// Axial coordinates. A longer strip leaves the dynamics of the two ends unchanged.
import assert from 'node:assert/strict';
import { createHeadlessMatch } from '../../../src/match/headless.js';
import { fitStampPoints } from '../../../src/patterns/editor/fit-pattern.js';
import { buildSphere } from '../../../src/world/sphere.js';

export function closedStrip(leftBoundary = -3, rightBoundary = leftBoundary) {
  const rowsByColumn = [
    [2, 4, 5, 7, 8, 10, 11], [2, 3, 5, 6, 8, 9], [0, 1, 3, 4, 6, 7],
    [1, 2, 4, 5], [0, 2, 3], [0, 1],
  ];
  const cap = rowsByColumn.flatMap((rows, i) => rows.map(r => [i - 2, r]));
  function half(boundary) {
    const points = cap.filter(([q]) => q >= boundary);
    for (let q = -3; q >= boundary; q--) {
      for (const offset of [0, 1, 3, 4, 6, 7]) points.push([q, offset - 2 * q]);
    }
    return points;
  }
  const qShift = leftBoundary + rightBoundary - 1;
  return half(leftBoundary).concat(half(rightBoundary).map(([q, r]) => [qShift - q, 7 - 2 * qShift - r]));
}

export function verifyClosedStrips() {
  const sphere = buildSphere(128);
  const passiveBots = new Map([2, 3, 4, 5, 6].map(i => [i, () => {}]));
  return [[-1, 0], [-2, -2], [-3, -3], [-8, -8], [-22, -22]].map(([left, right]) => {
    const points = closedStrip(left, right);
    const settling = left === right ? 0 : 1;
    const match = createHeadlessMatch(sphere, { init: 1e7, strategies: passiveBots });
    const editor = fitStampPoints(points);
    assert.equal(editor.positions.length, points.length);
    assert.ok(match.commitStamp(1, match.patchForStamp(sphere.farthest, 0, points), false));
    const owned = () => match.world.ownerCells[1].slice().sort((a, b) => a - b);
    let start = owned();
    assert.equal(start.length, points.length);
    const opening = [], phases = [];
    for (let t = 1; t <= settling + 6; t++) {
      match.nextTick();
      const p = match.game.players[0];
      const phase = { survivors: p.lastUpkeep, births: p.lastBirths, deaths: p.lastDeaths };
      if (t <= settling) {
        opening.push(phase);
        start = owned();
        continue;
      }
      const elapsed = t - settling;
      if (elapsed <= 3) phases.push(phase);
      else assert.deepEqual(phase, phases[elapsed - 4]);
      if (elapsed % 3 === 0) assert.deepEqual(owned(), start);
      else assert.notDeepEqual(owned(), start);
    }
    return { cells: points.length, editorSize: editor.n, period: 3, opening, phases };
  });
}
