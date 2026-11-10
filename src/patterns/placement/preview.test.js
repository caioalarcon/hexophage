import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserElements } from '../../../tests/support/browser-elements.js';

installBrowserElements({});
const { placementAt, placementPreview, usePlacement } = await import('./plant.js');

test('a fitted but unaffordable stamp stays visible until its readiness changes', () => {
  const anchor = { id: 17 }, ids = [17, 18, 23];
  let ready = false;
  usePlacement({ preview: at => at === anchor ? { ids, ready } : null });
  assert.deepEqual(placementPreview(anchor), { ids, ready: false });
  assert.equal(placementAt(anchor), null);
  ready = true;
  assert.deepEqual(placementPreview(anchor), { ids, ready: true });
  assert.equal(placementAt(anchor), ids);
  assert.equal(placementPreview(null), null);
  assert.equal(placementAt(null), null);
  usePlacement(null);
});
