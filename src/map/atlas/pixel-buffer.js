import { game } from '../../browser/game.js';

// Preserve the physical cell polygons until even their projected diameter is
// below one backing-store pixel. In the overview every live center contributes
// to the pixel it occupies, so a resolvable cluster retains its outline.
const occupancy = {
  canvas: null,
  context: null,
  image: null,
  words: null,
  mask: null,
  palette: null,
};
function beginOccupancy(w, h) {
  const b = occupancy;
  if (!b.canvas) {
    b.canvas = document.createElement('canvas');
    b.context = b.canvas.getContext('2d');
  }
  if (!b.image || b.canvas.width !== w || b.canvas.height !== h) {
    b.w = w;
    b.h = h;
    b.canvas.width = w;
    b.canvas.height = h;
    b.image = b.context.createImageData(w, h);
    b.words = new Uint32Array(b.image.data.buffer);
    b.mask = new Uint8Array(w * h);
  } else {
    b.words.fill(0);
    b.mask.fill(0);
  }
  if (!b.palette) {
    const rgba = new Uint8Array(128 * 4);
    for (let mask = 1; mask < 128; mask++) {
      const sums = [0, 0, 0];
      let count = 0;
      for (let id = 1; id <= 7; id++)
        if (mask & (1 << (id - 1))) {
          const rgb = parseInt(game.colors[id].slice(1), 16);
          sums[0] += rgb >> 16;
          sums[1] += (rgb >> 8) & 255;
          sums[2] += rgb & 255;
          count++;
        }
      for (let k = 0; k < 3; k++) rgba[mask * 4 + k] = Math.round(sums[k] / count);
      rgba[mask * 4 + 3] = 255;
    }
    b.palette = new Uint32Array(rgba.buffer);
  }
  return b;
}

export { beginOccupancy };
