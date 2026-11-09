import { applyStamp, game, stampAdditions } from '../../browser/game.js';
import { stampOffsets } from '../editor/stamp-grid.js';
import { stampTargets } from './footprint.js';
import { stampReady } from './readiness.js';

let alternatePlacement;
export function usePlacement(adapter){ alternatePlacement=adapter; }

function placementAt(anchor) {
  if(alternatePlacement)return alternatePlacement.preview(anchor);
  if (!anchor || !stampReady()) return null;
  const ids = stampTargets(anchor, stampOffsets());
  return ids ? stampAdditions(1, ids) : null;
}
function stampAt(anchor) {
  if(alternatePlacement)return alternatePlacement.place(anchor);
  const fresh = placementAt(anchor);
  return fresh ? applyStamp(game.players[0], fresh, true) : false;
}

export { placementAt, stampAt };
