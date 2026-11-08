import { world } from '../../browser/world-state.js';
import { gpu } from './context.js';

function rebuildGPUPlanet(wire) {
  const gl = gpu.gl,
    g = world.graph;
  if (!gl) return;
  const started = performance.now();
  if (gpu.wire !== wire || gpu.planet !== g) {
    gl.bindBuffer(gl.ARRAY_BUFFER, gpu.staticBuffer);
    const lines = wire?.wireLines;
    gl.bufferData(gl.ARRAY_BUFFER, lines || 0, gl.STATIC_DRAW);
    gpu.vertexCount = (lines?.length || 0) / 3;
    gpu.wire = wire;
    gpu.wireF = wire?.f || 0;
  }
  if (gpu.planet === g) return;
  const pent = new Float32Array(g.pents.length * 3);
  for (let i = 0; i < g.pents.length; i++) {
    const id = g.pents[i];
    pent.set(g.coords.subarray(id * 3, id * 3 + 3), i * 3);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gpu.markerBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, pent, gl.STATIC_DRAW);
  gpu.markerCount = g.pents.length;
  gl.bindBuffer(gl.ARRAY_BUFFER, gpu.liveBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, 0, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, gpu.centerBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, 12, gl.DYNAMIC_DRAW);
  gpu.planet = g;
  gpu.lastBuildMs = performance.now() - started;
}

export { rebuildGPUPlanet };
