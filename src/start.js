import { bindBotSelectors } from './bots/configuration-panel.js';
import { frame } from './browser/frame.js';
import { browserMatchEffects } from './browser/game-effects.js';
import { attachMatchEffects, initRuleTables, parseRule } from './browser/game.js';
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
import { chooseRule, bindRuleChoice, bindRuleInput } from './match/controls/rule.js';
import { bindTuning } from './match/controls/tuning.js';
import { bindEnergyPanel } from './match/hud/energy-panel.js';
import { bindTurnControls } from './match/controls/turns.js';
import { bindStampControls } from './patterns/editor/controls.js';
import { bindEditorGestures } from './patterns/editor/gestures.js';
import { loadPattern, refreshTabs } from './patterns/editor/selection.js';
import { newStamp } from './patterns/editor/stamp-grid.js';
import { bindPatternTabs } from './patterns/editor/tabs.js';
import { newWorld } from './world/load-planet.js';
import { bindWorldSize } from './world/size-selector.js';
import { exposeSphereLab } from './browser/inspection.js';
import { bindAtlasBrowser } from './patterns/atlas-browser.js';

attachMatchEffects(browserMatchEffects);
initRuleTables();
parseRule('B2/S35');
newStamp(11, false);

bindMapGestures();
bindEditorGestures();
bindTurnControls();
bindMapControls();
bindWorldSize();
bindRuleChoice();
bindStampControls();
bindRuleInput();

observeCanvasSizes();
setupRealLayout();
newWorld(Number($('hl-frequency').value));
chooseRule('callahan');

bindWireBenchmark();
bindLayoutControls();
bindPatternTabs();
bindAtlasBrowser();
buildDeckConfig();
bindBotSelectors();
$('br-reset').onclick = resetGame;
bindTuning();
bindEnergyPanel();

bindPlayerFollow();
$('hl-pattern').addEventListener('change', refreshTabs);

loadPattern('p2');
resetGame();
refreshTabs();
requestAnimationFrame(frame);
exposeSphereLab();
