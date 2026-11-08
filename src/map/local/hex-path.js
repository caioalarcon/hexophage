import { HEX_X, HEX_Y } from './hex-metrics.js';

function hexPath(c, x, y, r) {
  for (let i = 0; i < 6; i++) {
    const a = x + r * HEX_X[i],
      b = y + r * HEX_Y[i];
    if (i === 0) c.moveTo(a, b);
    else c.lineTo(a, b);
  }
  c.closePath();
}

export { hexPath };
