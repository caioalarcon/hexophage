// The editor is an odd-row offset grid. Pattern coordinates are axial, relative to its center.
export function readStampOffsets(cells, size) {
  const mid = Math.floor(size / 2);
  const origin = mid - Math.floor(mid / 2);
  const offsets = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (cells[row * size + col]) offsets.push([col - Math.floor(row / 2) - origin, row - mid]);
    }
  }
  return offsets;
}

export function makeStampGrid(size, offsets = []) {
  const cells = new Uint8Array(size * size);
  const mid = Math.floor(size / 2);
  const origin = mid - Math.floor(mid / 2);
  let clipped = 0;
  for (const [q, r] of offsets) {
    const row = mid + r,
      col = origin + q + Math.floor(row / 2);
    if (row >= 0 && row < size && col >= 0 && col < size) cells[row * size + col] = 1;
    else clipped++;
  }
  return { cells, clipped };
}
