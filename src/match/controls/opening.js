import { commitStamp, game } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { toast } from '../../layout/announcements.js';
import { plantFounder } from '../founding.js';

export function prepareOpening() {
  const player = game.players[0];
  if (player?.stamps) return true;
  if (player && plantFounder(world, game, player, commitStamp)) return true;
  toast('Carimbe sua abertura no mapa para começar.');
  return false;
}
