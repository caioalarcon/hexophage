import { patterns } from '../patterns/catalog.js';
// Five distinct non-offensive cultivation strategies. Each begins with P2.
// Further policies diversify by selecting structures with different churn/core ratios.
const choices=['p2','p4f','censo-oscillator-5-p2-1','p8f'];
export function growthChoice(player, game) {
  if (player.stamps === 0) return 'p2';
  switch(player.pattern) {
    case 'farmer': return 'p2'; // rapid, repeated cheap flippers
    case 'cycler': return 'p4f'; // save for higher turnover
    case 'core': return 'censo-oscillator-5-p2-1'; // save for larger fixed core
    case 'slow': return 'p8f'; // save for slower oscillator with lower fixed fraction
    default: return choices[player.stamps % choices.length]; // alternate types
  }
}
export function createGrowthStrategy(game, plantOscillator) {
  return player => plantOscillator(player, growthChoice(player, game));
}
