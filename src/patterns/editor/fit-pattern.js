const stampSizes = [7, 11, 15, 19, 25, 29, 33, 41, 51, 61, 81, 101, 121];

// Select the smallest editor size that leaves one empty cell on all four sides.
export function fitStampPoints(points) {
  if (!points.length) return { n: 11, positions: [] };
  const rows = points.map((p) => p[1]),
    minR = Math.min(...rows),
    maxR = Math.max(...rows);
  for (const n of stampSizes) {
    const mid = Math.floor(n / 2),
      rShift = mid - Math.round((minR + maxR) / 2);
    const temp = points.map(([q, r]) => ({ r: r + rShift, c: q + Math.floor((r + rShift) / 2) }));
    const cols = temp.map((p) => p.c),
      cShift = Math.round(mid - (Math.min(...cols) + Math.max(...cols)) / 2);
    if (temp.every((p) => p.r >= 1 && p.r < n - 1 && p.c + cShift >= 1 && p.c + cShift < n - 1)) {
      return { n, positions: temp.map((p) => [p.c + cShift, p.r]) };
    }
  }
  return null;
}
