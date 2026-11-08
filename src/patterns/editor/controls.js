import { $, cv } from '../../layout/elements.js';
import { hit } from '../../map/hit-test.js';
import { preset } from './presets.js';
import { loadPattern, markEdited, refreshTabs } from './selection.js';
import { newStamp } from './stamp-grid.js';
import { transformStamp } from './transform.js';
import { stampAt } from '../placement/plant.js';

function bindStampControls() {
  $('hl-pattern').onchange = (e) => {
    loadPattern(e.target.value);
    refreshTabs();
  };
  $('hl-demo').onclick = () => {
    const r = cv.getBoundingClientRect();
    stampAt(hit(r.left + r.width / 2, r.top + r.height / 2));
  };
  $('hl-stampsize').onchange = (e) => {
    newStamp(Number(e.target.value), true);
    markEdited();
  };
  $('hl-ring').onclick = () => preset('ring');
  $('hl-line').onclick = () => preset('line');
  $('hl-noise').onclick = () => preset('noise');
  $('hl-stampclear').onclick = () => preset('clear');
  $('hl-stampcw').onclick = () => transformStamp('cw');
  $('hl-stampccw').onclick = () => transformStamp('ccw');
  $('hl-stampflip').onclick = () => transformStamp('flip');
  $('hl-mode').onclick = () => {};
}

export { bindStampControls };
