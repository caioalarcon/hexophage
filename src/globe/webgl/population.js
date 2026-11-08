import { game } from '../../browser/game.js';
import { visitGlobePopulation } from '../population/visible-cells.js';
import { gpu } from './context.js';
import { drawGPULayer } from './layer.js';

// Screen-space primitives are streamed in bounded batches, also at full globe zoom.
const globeBatches = Array.from({ length: 8 }, () => new Float32Array(3 * 3072));
function drawGlobePopulationGL(v, dpr) {
  const gl = gpu.gl,
    u = gpu.uni,
    counts = new Uint16Array(8);
  gl.bindBuffer(gl.ARRAY_BUFFER, gpu.liveBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, globeBatches[0].byteLength, gl.STREAM_DRAW);
  gl.uniform3f(u.right, 1, 0, 0);
  gl.uniform3f(u.up, 0, 1, 0);
  gl.uniform3f(u.look, 0, 0, 1);
  gl.uniform1f(u.radius, 1);
  gl.uniform1f(u.inside, 0);
  let mode = gl.TRIANGLES;
  const flush = (owner) => {
    if (!counts[owner]) return;
    const batch = globeBatches[owner],
      used = counts[owner];
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, batch.subarray(0, used));
    drawGPULayer(gpu, gpu.liveBuffer, mode, used / 3, game.glColors[owner], 1, false);
    counts[owner] = 0;
  };
  const vertex = (owner, x, y) => {
    const a = globeBatches[owner],
      i = counts[owner];
    a[i] = x - v.cx;
    a[i + 1] = v.cy - y;
    a[i + 2] = 1;
    counts[owner] += 3;
    if (counts[owner] === a.length) flush(owner);
  };
  visitGlobePopulation(
    v,
    dpr,
    (owner, x, y, n) => {
      for (let k = 1; k < n - 1; k++) {
        vertex(owner, x[0], y[0]);
        vertex(owner, x[k], y[k]);
        vertex(owner, x[k + 1], y[k + 1]);
      }
    },
    (owner, x, y) => {
      if (mode !== gl.POINTS) {
        for (let o = 1; o <= 7; o++) flush(o);
        mode = gl.POINTS;
      }
      vertex(owner, x, y);
    },
  );
  for (let o = 1; o <= 7; o++) flush(o);
  gl.uniform3fv(u.right, v.right);
  gl.uniform3fv(u.up, v.up);
  gl.uniform3fv(u.look, v.look);
  gl.uniform1f(u.radius, v.radius);
  gl.uniform1f(u.inside, v.inside ? 1 : 0);
}

export { drawGlobePopulationGL };
