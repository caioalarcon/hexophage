import { game } from '../browser/game.js';
import { savedPatterns } from '../patterns/editor/saved-patterns.js';
import { decodeRLE } from '../patterns/rle.js';

export function deckPoints(id) {
  const saved = savedPatterns.get(id);
  if (saved) return saved;
  const pattern = game.gameplay.patterns.find(p => p.id === id);
  return pattern ? decodeRLE(pattern.rle) : [];
}
