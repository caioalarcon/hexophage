import { world } from './world-state.js';
import { navigatorView } from '../globe/navigator/surface.js';
import { toast } from '../layout/announcements.js';
import { bumpPopulationRevision } from '../map/population/tile-index.js';
import { setPlay } from '../match/controls/playback.js';
import { syncPregameControls } from '../match/controls/pregame.js';
import { updateGamePanel } from '../match/hud/ranking.js';
import { markRender, updateStats } from '../match/hud/status.js';
import { updateStampReadiness } from '../patterns/placement/readiness.js';
import { energyCost } from '../match/constructive-economy.js';
import { game } from './game.js';

export const browserMatchEffects = {
  redraw() {
    world.needsDraw = true;
  },
  populationChanged() {
    bumpPopulationRevision();
    navigatorView.dirty = true;
  },
  populationCleared() {
    bumpPopulationRevision();
    markRender();
    updateStats();
  },
  pause() {
    setPlay(false);
  },
  firstGeneration: syncPregameControls,
  stampApplied(player, count) {
    updateGamePanel(true);
    updateStampReadiness();
    toast(`Carimbo aplicado · −${energyCost(count, game.economy)} de energia · ${player.reserve} na reserva.`);
    markRender();
  },
  matchDecided(winner) {
    toast(
      winner
        ? 'Vencedor · ' + winner.symbol + ' ' + winner.name
        : 'Empate · todos os jogadores foram eliminados.',
    );
  },
  showResults() {
    updateGamePanel(true);
  },
};
