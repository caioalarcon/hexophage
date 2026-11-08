import { world } from '../../browser/world-state.js';
import { globeContext } from '../camera/view.js';
import { ensureGPU, gpu } from './context.js';
import { drawGPULayer } from './layer.js';
import { rebuildGPUPlanet } from './planet-buffers.js';
import { drawGlobePopulationGL } from './population.js';
import { gpuCanvas } from '../../layout/elements.js';

function drawGlobeGPU(wire) {
  if (!ensureGPU()) return false;
  const gl = gpu.gl,
    started = performance.now();
  rebuildGPUPlanet(wire);
  const v = globeContext(),
    dpr = Math.min(devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(v.w * dpr)),
    height = Math.max(1, Math.round(v.h * dpr));
  if (gpuCanvas.width !== width || gpuCanvas.height !== height) {
    gpuCanvas.width = width;
    gpuCanvas.height = height;
  }
  gl.viewport(0, 0, width, height);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(gpu.program);
  const u = gpu.uni;
  gl.uniform3fv(u.right, v.right);
  gl.uniform3fv(u.up, v.up);
  gl.uniform3fv(u.look, v.look);
  gl.uniform2f(u.size, v.w, v.h);
  gl.uniform1f(u.radius, v.radius);
  gl.uniform1f(u.focal, v.focal);
  gl.uniform1f(u.inside, v.inside ? 1 : 0);
  // The dark world body is drawn in the underlying 2D canvas, while all
  // geometry and live cells are rendered in GPU batches.
  drawGPULayer(
    gpu,
    gpu.staticBuffer,
    gl.LINES,
    gpu.vertexCount,
    v.inside
      ? new Float32Array([0.36, 0.55, 0.68, 0.56])
      : new Float32Array([0.3, 0.43, 0.51, 0.48]),
    1,
    false,
  );
  drawGlobePopulationGL(v, dpr);
  if (world.showFaults)
    drawGPULayer(
      gpu,
      gpu.markerBuffer,
      gl.POINTS,
      gpu.markerCount,
      new Float32Array([1, 0.48, 0.39, 1]),
      (v.inside ? 13 : 11) * dpr,
      true,
    );
  const center = world.graph.coords.subarray(world.center * 3, world.center * 3 + 3);
  gl.bindBuffer(gl.ARRAY_BUFFER, gpu.centerBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, center);
  drawGPULayer(
    gpu,
    gpu.centerBuffer,
    gl.POINTS,
    1,
    new Float32Array([1, 0.89, 0.51, 1]),
    11 * dpr,
    true,
  );
  gpu.lastDrawMs = performance.now() - started;
  return true;
}

export { drawGlobeGPU };
