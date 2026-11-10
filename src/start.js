import {startMixedGame} from './mixed/game.js';
import {MIXED_MODE} from './match/controls/mode.js';
import { browserBrainArchive } from './browser/brain-archive.js';
import { frame } from './browser/frame.js';
import { browserMatchEffects } from './browser/game-effects.js';
import { attachMatchEffects } from './browser/game.js';
import { buildDeckConfig } from './deck/configuration.js';
import { bindWireBenchmark } from './globe/wireframe/benchmark.js';
import { $ } from './layout/elements.js';
import { observeCanvasSizes } from './layout/resize.js';
import { bindLayoutControls } from './layout/settings-drawer.js';
import { setupRealLayout } from './layout/viewport.js';
import { bindMapControls } from './map/camera/controls.js';
import { bindPlayerFollow } from './map/camera/follow-player.js';
import { bindMapGestures } from './map/camera/pointer.js';
import { resetGame } from './match/controls/new-match.js';
import { bindRuleControls } from './match/controls/rule.js';
import { bindTuning } from './match/controls/tuning.js';
import { bindEnergyPanel } from './match/hud/energy-panel.js';
import { bindTurnControls } from './match/controls/turns.js';
import { bindStampControls } from './patterns/editor/controls.js';
import { bindEditorGestures } from './patterns/editor/gestures.js';
import { newStamp } from './patterns/editor/stamp-grid.js';
import { newWorld } from './world/load-planet.js';
import { bindWorldSize } from './world/size-selector.js';
import { exposeSphereLab } from './browser/inspection.js';
import { bindAtlasBrowser } from './patterns/atlas-browser.js';

function startClassicGame(){
  attachMatchEffects(browserMatchEffects, browserBrainArchive());
  newStamp(11, false);

  bindMapGestures();
  bindEditorGestures();
  bindTurnControls();
  bindMapControls();
  bindWorldSize();
  bindStampControls();

  observeCanvasSizes();
  setupRealLayout();
  newWorld(Number($('hl-frequency').value));

  bindWireBenchmark();
  bindLayoutControls();
  bindAtlasBrowser();
  buildDeckConfig();
  $('br-reset').onclick = resetGame;
  bindTuning();
  bindEnergyPanel();

  bindPlayerFollow();
  bindRuleControls();

  resetGame();
  requestAnimationFrame(frame);
  exposeSphereLab();
}

const requestedMode=new URLSearchParams(location.search).get('rule')??MIXED_MODE;
if(requestedMode===MIXED_MODE)startMixedGame();
else startClassicGame();
