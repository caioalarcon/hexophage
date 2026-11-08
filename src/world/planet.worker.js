import { buildSphere } from './sphere.js';
import { sphereSpawns } from '../match/spawns.js';
import { allocateCells } from '../simulation/population.js';

self.onmessage = ({ data: frequency }) => {
  try {
    const g = buildSphere(frequency, (p) => self.postMessage({ p }));
    self.postMessage({ p: 96 });
    g.spawnIds = sphereSpawns(g);
    self.postMessage({ p: 99 });
    const buffers = allocateCells(g.n);
    const arrays = [...Object.values(g), ...Object.values(buffers)].filter(ArrayBuffer.isView);
    self.postMessage({ g, buffers }, [...new Set(arrays.map((array) => array.buffer))]);
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
