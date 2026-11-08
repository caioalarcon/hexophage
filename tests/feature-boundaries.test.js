import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Use the same module resolution as the shipped game, including the worker and Node entry.
const {
  metafile: { inputs },
} = await build({
  entryPoints: ['src/start.js', 'src/world/planet.worker.js', 'src/match/headless.js'],
  bundle: true,
  metafile: true,
  write: false,
  outdir: 'dist',
});

function dependencies(entry) {
  const visited = new Set(),
    active = new Set();
  function visit(file) {
    assert(!active.has(file), 'Circular feature dependency: ' + [...active, file].join(' → '));
    if (visited.has(file)) return;
    active.add(file);
    for (const edge of inputs[file].imports) if (!edge.external) visit(edge.path);
    active.delete(file);
    visited.add(file);
  }
  visit(entry);
  return visited;
}

test('browser, background worker and headless match have acyclic feature imports', () => {
  for (const entry of ['src/start.js', 'src/world/planet.worker.js', 'src/match/headless.js']) {
    dependencies(entry);
  }
});

test('a headless match imports neither the HUD nor the canvas renderers', () => {
  for (const file of dependencies('src/match/headless.js')) {
    assert.doesNotMatch(file, /^src\/(browser|layout|deck|globe|map)\/|\/(editor|hud|controls)\//);
  }
});
