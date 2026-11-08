import { applyStamp, game, stampAdditions } from '../../browser/game.js';
import { stampOffsets } from '../editor/stamp-grid.js';
import { stampTargets } from './footprint.js';
import { stampReady } from './readiness.js';

function placementAt(anchor) {
  if (!anchor || !stampReady()) return null;
  const ids = stampTargets(anchor, stampOffsets());
  return ids ? stampAdditions(1, ids) : null;
}
function stampAt(anchor) {
  const fresh = placementAt(anchor);
  return fresh ? applyStamp(game.players[0], fresh, true) : false;
}

export { placementAt, stampAt };
