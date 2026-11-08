import { game } from '../../browser/game.js';
import { visitGlobePopulation } from '../population/visible-cells.js';

function drawGlobePopulation2D(c, v, dpr) {
  const paths = Array.from({ length: 8 }, () => new Path2D()),
    counts = new Uint16Array(8);
  const flush = (o) => {
    if (counts[o]) {
      c.fillStyle = game.colors[o];
      c.fill(paths[o]);
      paths[o] = new Path2D();
      counts[o] = 0;
    }
  };
  const added = (o) => {
      if (++counts[o] === 256) flush(o);
    },
    pw = v.w / c.canvas.width,
    ph = v.h / c.canvas.height;
  visitGlobePopulation(
    v,
    dpr,
    (o, x, y, n) => {
      const p = paths[o];
      p.moveTo(x[0], y[0]);
      for (let k = 1; k < n; k++) p.lineTo(x[k], y[k]);
      p.closePath();
      added(o);
    },
    (o, x, y) => {
      paths[o].rect(x - pw / 2, y - ph / 2, pw, ph);
      added(o);
    },
  );
  for (let o = 1; o <= 7; o++) flush(o);
}

export { drawGlobePopulation2D };
