import { clearCells, game, resetPlayers } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { toast } from '../../layout/announcements.js';
import { $ } from '../../layout/elements.js';
import { centerOnPlayer } from '../../map/camera/player-sector.js';
import { setPlay, syncPlayButton } from './playback.js';
import { readSettings } from './tuning.js';
import { updateGamePanel } from '../hud/ranking.js';
import { markRender } from '../hud/status.js';

function resetGame() {
  if (!world.graph) return;
  readSettings();
  setPlay(false);
  game.initializing = true;
  game.symbols[1] = ($('br-myemoji').value.trim() || '🦖').slice(0, 12);
  clearCells();
  world.actual = 0;
  world.statCount = 0;
  game.rngState = 0x6d2b79f5;
  world.matchStarted = false;
  game.winner = 0;
  game.ended = false;
  syncPlayButton();

  resetPlayers();
  // Human starts in a free sector. Helpers for jumping to other sectors are part of debug UI.
  centerOnPlayer(game.players[0].seed);
  const current = $('br-follow');
  current.replaceChildren();
  const placeholder = new Option('Escolher jogador…', '', true, true);
  placeholder.disabled = true;
  current.add(placeholder);
  for (const p of game.players) {
    const opt = document.createElement('option');
    opt.value = String(p.id);
    opt.textContent = p.symbol + ' ' + p.name;
    current.add(opt);
  }
  current.value = '';
  for (let i = 2; i <= 6; i++) {
    const select = $('br-bot-' + i);
    if (select) {
      select.value = game.bots[i - 2];
      game.players[i - 1].pattern = select.value;
    }
  }
  game.initializing = false;
  game.average = 0;
  updateGamePanel(true);
  markRender();
  toast('Seis jogadores · ' + game.init + ' de energia inicial cada.');
}

export { resetGame };
