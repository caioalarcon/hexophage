import { DX } from '../local/hex-metrics.js';

// At unit zoom, one spherical radian spans this many screen pixels.
export function mapUnit(frequency) {
  return (DX * frequency) / 1.205;
}

export function minimumAtlasScale({ width, height }) {
  return Math.max(1, Math.min(width / (2 * Math.PI), height / Math.PI));
}
