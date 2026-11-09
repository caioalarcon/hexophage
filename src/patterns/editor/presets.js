import { world } from '../../browser/world-state.js';
import { markRender } from '../../match/hud/status.js';
import { markEdited } from './selection.js';
import { countStamp } from './stamp-grid.js';
import { DIR } from '../../world/geometry.js';

function preset(type) {
  const n = world.stampN,
    mid = Math.floor(n / 2),
    a = world.stamp;
  a.fill(0);
  if (type === 'ring')
    for (const [q, r] of DIR) {
      const rr = mid + r,
        cc = mid - Math.floor(mid / 2) + q + Math.floor(rr / 2);
      if (rr >= 0 && rr < n && cc >= 0 && cc < n) a[rr * n + cc] = 1;
    }
  if (type === 'line') for (let c = 1; c < n - 1; c++) a[mid * n + c] = 1;
  if (type === 'noise') for (let i = 0; i < a.length; i++) a[i] = Math.random() < 0.27 ? 1 : 0;
  countStamp();
  markEdited();
  world.needsEditor = true;
  markRender();
}

export { preset };
