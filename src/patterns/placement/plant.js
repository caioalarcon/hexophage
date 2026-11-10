import { applyStamp, game, stampAdditions } from '../../browser/game.js';
import { stampOffsets } from '../editor/stamp-grid.js';
import { stampTargets } from './footprint.js';
import { stampReady } from './readiness.js';

let alternatePlacement;
export function usePlacement(adapter){ alternatePlacement=adapter; }

function placementAt(anchor) {
  if (alternatePlacement) {
    const preview = alternatePlacement.preview(anchor);
    return preview?.ready ? preview.ids : null;
  }
  if (!anchor || !stampReady()) return null;
  const ids = stampTargets(anchor, stampOffsets());
  return ids ? stampAdditions(1, ids) : null;
}
function placementPreview(anchor) {
  if (alternatePlacement) return alternatePlacement.preview(anchor);
  const ids = placementAt(anchor);
  return ids ? { ids, ready: true } : null;
}
function stampAt(anchor) {
  if(alternatePlacement)return alternatePlacement.place(anchor);
  const fresh = placementAt(anchor);
  return fresh ? applyStamp(game.players[0], fresh, true) : false;
}

export { placementAt, placementPreview, stampAt };
