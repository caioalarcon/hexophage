// Usage: node experiments/rule-survey/import-bagley.mjs /path/to/life2d.xml
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { atlasPatterns } from '../../src/patterns/atlas-data.js';
import { patterns } from '../../src/patterns/catalog.js';
import { advancePattern, seedPatternAges, patternOffset } from '../../src/patterns/planar-simulation.js';
import { transformOffsets } from '../../src/patterns/editor/axial-transform.js';
import { catalogRules } from '../../src/simulation/catalog-rules.js';
import { BAYS, CALLAHAN } from '../../src/simulation/rules.js';

const source = readFileSync(process.argv[2]);
assert.equal(createHash('sha256').update(source).digest('hex'),
  '80e52bcfe81d4915f7b6420d5d7b66a14ab2704cc3dfc601ffa1321f68a565b2', 'Unexpected Life2D XML snapshot');
const ruleIds = {
  '6B2/S34': 'hex-b2s34', '6B2/S35': 'bays', '6B2o/S2m34': 'callahan',
  '6B2o3o4m/S2om4o': 'andreen', '6B245/S3': 'bays245',
};
const physics = { ...catalogRules, bays: BAYS, callahan: CALLAHAN };
const legacy = {
  bays: patterns.bays.filter(p => ['glider','osc2'].includes(p.id)),
  callahan: [...atlasPatterns, ...patterns.callahan.filter(p => !p.group)],
};
const formIndex = ['rule,life2d_name,registered_id,status'];
const field = (xml, key) => xml.match(new RegExp('<' + key + '>([\\s\\S]*?)</' + key + '>'))[1].trim();
const pointsAt = ages => Array.from(ages.keys(), patternOffset);

function encode(data) {
  // Life2D's skew coordinates have neighbours (1,0),(1,1),(0,1) and negatives.
  // A Hexophage RLE column is q+r, so the raw XML pairs already give (col,row).
  const values = data.match(/-?\d+/g).map(Number);
  const rows = new Map(), xs = [], ys = [];
  for (let i = 0; i < values.length; i += 2) {
    const x = values[i], y = values[i + 1];
    if (!rows.has(y)) rows.set(y, new Set());
    assert(!rows.get(y).has(x), 'Duplicate source cell');
    rows.get(y).add(x);
    xs.push(x); ys.push(y);
  }
  const left = Math.min(...xs), first = Math.min(...ys);
  const lines = [];
  for (let y = first; y <= Math.max(...ys); y++) {
    const line = rows.get(y) ?? new Set();
    let text = '';
    for (let x = left; x <= Math.max(...line); x++) text += line.has(x) ? 'o' : 'b';
    lines.push(text);
  }
  return lines.join('$').replace(/([ob$])\1+/g, s => s.length + s[0]) + '!';
}

function normalized(points) {
  const q0 = Math.min(...points.map(([q]) => q));
  const r0 = Math.min(...points.map(([, r]) => r));
  const key = points.map(([q, r]) => (q - q0) + ',' + (r - r0)).sort().join(';');
  return { key, q0, r0 };
}

// Phase keys include all 12 symmetries. Periods, however, close only under
// translation, so a rotating oscillator is measured through its full period.
function shape(points) {
  const keys = [];
  for (let i = 0; i < 6; i++) {
    keys.push(normalized(points).key, normalized(transformOffsets(points, 'flip')).key);
    points = transformOffsets(points, 'cw');
  }
  return keys.sort()[0];
}

function observe(pattern, rule, max) {
  let ages = seedPatternAges(pattern);
  const start = normalized(pointsAt(ages));
  let births = 0;
  for (let t = 1; t <= max; t++) {
    const step = advancePattern(ages, 1, rule);
    ages = step.next;
    births += step.births;
    if (!ages.size || ages.size > 12000) break;
    if (ages.size !== pattern.cells) continue;
    const current = normalized(pointsAt(ages));
    if (start.key !== current.key) continue;
    const delta = [current.q0 - start.q0, current.r0 - start.r0];
    const moving = delta.some(Boolean);
    return { period: t, birthsCycle: births, deathsCycle: births,
      stableCore: moving ? 0 : [...ages.values()].filter(age => age > t).length,
      ...(moving ? { delta } : {}) };
  }
  return {};
}

function indexPattern(seen, pattern, rule) {
  let ages = seedPatternAges(pattern);
  for (let t = 0; t < (pattern.period || 1); t++) {
    const key = shape(pointsAt(ages));
    if (!seen.has(key)) seen.set(key, pattern.id);
    if (t + 1 < pattern.period) ages = advancePattern(ages, 1, rule).next;
  }
}

function predecessor(rle, rule, limit) {
  let ages = seedPatternAges({ rle });
  const seen = new Map();
  for (let t = 0; t <= limit && ages.size && ages.size <= 2000; t++) {
    const key = normalized(pointsAt(ages)).key;
    if (seen.has(key)) return { transient: seen.get(key), remnantPeriod: t - seen.get(key) };
    seen.set(key, t);
    ages = advancePattern(ages, 1, rule).next;
  }
  return {};
}

function group(name, category, result) {
  if (/gun/.test(name)) return 'gerador';
  if (/puffer|^stalk \(p/.test(name)) return 'crescedor';
  if (/collision|eater|reflector|remnant/.test(name)) return 'reação';
  if (result.transient) return 'precursor';
  if (result.delta) return 'nave';
  if (result.period === 1) return 'estável';
  if (result.period) return 'oscilador';
  return category === 'ship' ? 'nave' : 'semente';
}

const output = [`/*!
 * Copyright 1993 - 2022 David A. Bagley. All rights reserved.
 *
 * Permission to use, copy, modify, and distribute this software and its documentation for any purpose and without fee is hereby granted, provided that the above copyright notice appear in all copies and that both that copyright notice and this permission notice appear in supporting documentation, and that the name of the author not be used in advertising or publicity pertaining to distribution of the software without specific, written prior permission.
 *
 * This program is distributed in the hope that it will be “useful”, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * Adapted from Life2D. See experiments/rule-survey/BAGLEY.md.
 */`,
  '// Generated by import-bagley.mjs from the pinned Life2D XML.', 'export const bagleyCatalog = {'];
for (const match of source.toString('utf8').matchAll(/<rule>([\s\S]*?)<\/rule>/g)) {
  const xml = match[1], ruleId = ruleIds[field(xml, 'rulename')];
  if (!ruleId) continue;
  const rule = physics[ruleId], seen = new Map();
  for (const pattern of legacy[ruleId] ?? []) indexPattern(seen, pattern, rule);
  output.push('  ' + JSON.stringify(ruleId) + ': [');
  let added = 0, duplicates = 0;
  for (const entry of xml.matchAll(/<form>([\s\S]*?)<\/form>/g)) {
    const name = field(entry[1], 'name'), category = field(entry[1], 'category');
    const rle = encode(field(entry[1], 'data')), points = pointsAt(seedPatternAges({ rle }));
    const nominal = Number(name.match(/\bp(\d+)/)?.[1] || 0);
    let alias = seen.get(shape(points));
    // Snapshot of a gun before its first emission can be a registered phase.
    if (!alias && nominal && /gun/.test(name)) {
      let ages = seedPatternAges({ rle });
      for (let t = 1; t <= nominal && !alias; t++) {
        ages = advancePattern(ages, 1, rule).next;
        alias = seen.get(shape(pointsAt(ages)));
      }
    }
    const id = alias ?? ('bagley-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''));
    formIndex.push([ruleId, '"' + name + '"', id, alias ? 'alias' : 'added'].join(','));
    if (alias) { duplicates++; continue; }
    const measurement = observe({ rle, cells: points.length }, rule, Math.max(96, nominal));
    if (!measurement.period && (/remnant/.test(name) || category === 'oscillator')) {
      Object.assign(measurement, predecessor(rle, rule, Math.max(96, nominal * 2)));
    }
    let display = name;
    if (nominal && measurement.period && nominal !== measurement.period) {
      display = name.replace(/\bp\d+/, 'P' + measurement.period);
    } else if (measurement.transient && !/remnant/.test(name)) {
      display = name.replace(/\s*\(p\d+\)/, '') + ' · precursor P' + measurement.remnantPeriod;
    }
    const pattern = { id, name: display, group: group(name, category, measurement), cells: points.length, rle,
      origin: 'David Bagley · Life2D', ...measurement };
    if (!measurement.period && nominal && /gun|puffer/.test(name)) pattern.emissionWindow = nominal;
    indexPattern(seen, pattern, rule);
    output.push('    ' + JSON.stringify(pattern) + ',');
    added++;
  }
  output.push('  ],');
  console.log(ruleId, { added, duplicates });
}
output.push('};', '');
writeFileSync(new URL('../../src/patterns/bagley-catalog.js', import.meta.url), output.join('\n'));
writeFileSync(new URL('./bagley-index.csv', import.meta.url), formIndex.join('\n') + '\n');
