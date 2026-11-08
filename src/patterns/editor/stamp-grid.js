import { world } from '../../browser/world-state.js';
import { toast } from '../../layout/announcements.js';
import { $ } from '../../layout/elements.js';
import { markRender } from '../../match/hud/status.js';
import { updateStampReadiness } from '../placement/readiness.js';

import { readStampOffsets, makeStampGrid } from './grid-coordinates.js';
import { fitStampPoints } from './fit-pattern.js';

function stampOffsets() {
  if (world.cachedStampOffsets) return world.cachedStampOffsets;
  world.cachedStampOffsets = readStampOffsets(world.stamp, world.stampN);
  return world.cachedStampOffsets;
}

function stampFromPoints(points) {
  const result = fitStampPoints(points);
  if (!result) {
    toast('Padrão excede o tamanho máximo do editor.');
    return;
  }
  newStamp(result.n, false);
  if (!points.length) return;
  for (const [c, r] of result.positions) world.stamp[r * result.n + c] = 1;
  $('hl-stampsize').value = String(result.n);
  countStamp();
  world.needsEditor = true;
  markRender();
}
function newStamp(n, preserve = true) {
  const previous = preserve && world.stamp ? stampOffsets() : [];
  const { cells, clipped } = makeStampGrid(n, previous);
  world.stampN = n;
  world.stamp = cells;
  world.stampCount = 0;
  if (clipped) toast(`Editor reduzido: ${clipped} células ficaram fora da nova grade.`);
  countStamp();
  world.needsEditor = true;
}
function countStamp() {
  world.cachedStampOffsets = null;
  let count = 0;
  for (const x of world.stamp) count += x;
  world.stampCount = count;
  world.needsDraw = true;
  updateStampReadiness();
}

export { countStamp, newStamp, stampFromPoints, stampOffsets };
