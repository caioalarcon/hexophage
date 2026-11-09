// List compatible records and check each period and displacement in the game kernel.
// node experiments/rule-survey/ship-db.mjs <R1-C2-NH-gliders.db.txt> B25/S34
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { compileTotalistic } from '../../src/simulation/rules.js';
import { advancePattern, patternSite, seedPatternAges } from '../../src/patterns/planar-simulation.js';

const [, , path, notation] = process.argv;
const rule = notation && compileTotalistic(notation);
if (!path || !rule) throw new Error('Usage: node ship-db.mjs <R1-C2-NH-gliders.db.txt> B25/S34');
const file = readFileSync(path);
assert.equal(createHash('sha256').update(file).digest('hex'),
  '2751f9be2bfdbdb86281e35c9d9ddc2da1597ca8ab4fe6d43919e09d94584400', 'Unexpected database revision');
const digits = rule => rule.match(/^B([0-6]*)\/S([0-6]*)H?$/).slice(1);
const subset = (left, right) => [...left].every(x => right.includes(x));
const target = digits(rule.notation);
if (target[0].includes('0')) throw new Error('The unbounded empty-background replay requires a rule without B0');

const lines = file.toString().trim().split(/\r?\n/);
assert.equal(lines.length, 668);
for (const [i, line] of lines.entries()) {
  const [, author, min, max, cycle, dx, dy, , , rle] = line.split(':');
  const lower = digits(min), upper = digits(max);
  if (!target.every((set, i) => subset(lower[i], set) && subset(set, upper[i]))) continue;
  const period = Number(cycle.split('/')[0]);
  const delta = [Number(dx) + Number(dy), -Number(dy)];
  const start = seedPatternAges({ rle });
  let state = start;
  for (let t = 0; t < period; t++) state = advancePattern(state, 1, rule).next;
  const shift = patternSite(...delta);
  assert.equal(state.size, start.size, 'Population mismatch at record ' + (i + 1));
  assert.ok([...start.keys()].every(k => state.has(k + shift)), 'Wrong displacement at record ' + (i + 1));
  console.log(JSON.stringify({ id: 'db-' + (i + 1), author, period, delta, cells: start.size, rle }));
}
