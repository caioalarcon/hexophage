import { globeContext } from '../camera/view.js';
import { drawGlobePopulation2D } from '../canvas/population.js';
import { fallbackMini, globeTarget } from './surface.js';

function drawMiniBackdrop() {
  const canvas = fallbackMini,
    rect = globeTarget.getBoundingClientRect(),
    dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(rect.width * dpr)),
    h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(w / rect.width, 0, 0, h / rect.height, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const v = globeContext(),
    r = v.radius;
  if (v.inside) {
    ctx.fillStyle = '#152b3c';
    ctx.fillRect(0, 0, rect.width, rect.height);
  } else {
    const gradient = ctx.createRadialGradient(
      v.cx - r * 0.35,
      v.cy - r * 0.35,
      r * 0.07,
      v.cx,
      v.cy,
      r,
    );
    gradient.addColorStop(0, '#294959');
    gradient.addColorStop(0.68, '#1c3648');
    gradient.addColorStop(1, '#0e1b2b');
    ctx.beginPath();
    ctx.arc(v.cx, v.cy, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(v.cx, v.cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#7098ac88';
    ctx.lineWidth = 0.85;
    ctx.stroke();
  }
  return { ctx, v, r };
}
function drawMiniFallback(wire) {
  const { ctx, v, r } = drawMiniBackdrop();
  ctx.save();
  if (!v.inside) {
    ctx.beginPath();
    ctx.arc(v.cx, v.cy, r, 0, Math.PI * 2);
    ctx.clip();
  }
  ctx.strokeStyle = '#638c9a44';
  ctx.lineWidth = 0.65;
  // Even in software fallback, show the actual hexagonal topology at low LOD.
  const lines = wire?.wireLines;
  if (lines) {
    ctx.beginPath();
    const focal = v.inside ? v.focal : v.radius;
    for (let k = 0; k < lines.length; k += 6) {
      const x0 = lines[k] * v.right[0] + lines[k + 1] * v.right[1] + lines[k + 2] * v.right[2],
        y0 = lines[k] * v.up[0] + lines[k + 1] * v.up[1] + lines[k + 2] * v.up[2],
        z0 = lines[k] * v.look[0] + lines[k + 1] * v.look[1] + lines[k + 2] * v.look[2],
        x1 = lines[k + 3] * v.right[0] + lines[k + 4] * v.right[1] + lines[k + 5] * v.right[2],
        y1 = lines[k + 3] * v.up[0] + lines[k + 4] * v.up[1] + lines[k + 5] * v.up[2],
        z1 = lines[k + 3] * v.look[0] + lines[k + 4] * v.look[1] + lines[k + 5] * v.look[2];
      if (z0 < 0.06 || z1 < 0.06) continue;
      const scale0 = v.inside ? focal / z0 : r,
        scale1 = v.inside ? focal / z1 : r;
      ctx.moveTo(v.cx + x0 * scale0, v.cy - y0 * scale0);
      ctx.lineTo(v.cx + x1 * scale1, v.cy - y1 * scale1);
    }
    ctx.stroke();
  }
  drawGlobePopulation2D(ctx, v, Math.min(devicePixelRatio || 1, 2));
  ctx.restore();
  if (v.inside) return;
  ctx.strokeStyle = '#8fb9c6';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(v.cx, v.cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

export { drawMiniBackdrop, drawMiniFallback };
