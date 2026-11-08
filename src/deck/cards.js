import { patterns } from '../patterns/catalog.js';
import { savedPatterns } from '../patterns/editor/saved-patterns.js';
import { decodeRLE } from '../patterns/rle.js';

const deckIds = new Set(['gun', 'glider', 'osc42', 'osc9', 'osc14', 'manual']);
const deckNames = {
  gun: 'Gun P42',
  glider: 'Glider',
  osc42: 'P42',
  osc66: 'P66',
  osc9: 'P9',
  osc14: 'P14',
  osc18: 'P18',
  manual: 'Livre',
};
function deckPoints(id) {
  const saved = savedPatterns.get(id);
  return saved
    ? saved
    : patterns.callahan.find((p) => p.id === id)?.rle
      ? decodeRLE(patterns.callahan.find((p) => p.id === id).rle)
      : [];
}

export { deckIds, deckNames, deckPoints };
