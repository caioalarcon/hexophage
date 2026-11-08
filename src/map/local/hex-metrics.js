const R = 12,
  DX = Math.sqrt(3) * R,
  DY = 18;
const HEX_X = Array.from({ length: 6 }, (_, i) => Math.cos(((60 * i - 30) * Math.PI) / 180));
const HEX_Y = Array.from({ length: 6 }, (_, i) => Math.sin(((60 * i - 30) * Math.PI) / 180));

export { DX, DY, HEX_X, HEX_Y, R };
