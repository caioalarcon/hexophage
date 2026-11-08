import { patterns } from '../patterns/catalog.js';
import { savedPatterns } from '../patterns/editor/saved-patterns.js';
import { decodeRLE } from '../patterns/rle.js';
import { slotIds } from './slots.js';
// Backwards compatible read-only set; slot allocation is driven by slotIds.
const deckIds = new Set(slotIds);
const deckNames = Object.fromEntries(patterns.callahan.map(p=>[p.id,p.name]));
deckNames.manual='Livre';
function deckPoints(id) {
  const saved = savedPatterns.get(id);
  if (saved) return saved;
  const pat=patterns.callahan.find(p=>p.id===id);
  return pat?decodeRLE(pat.rle):[];
}
export {deckIds,deckNames,deckPoints};
