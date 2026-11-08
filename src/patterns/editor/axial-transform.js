export function transformOffsets(offsets, type) {
  return offsets.map(([q, r]) => {
    if (type === 'cw') return [-r, q + r];
    if (type === 'ccw') return [q + r, -q];
    if (type === 'flip') return [-q - r, r];
    return [q, r];
  });
}
