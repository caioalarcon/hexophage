import { patterns } from '../patterns/catalog.js';
// Five simple competing, non-offensive cultivation policies. All open with
// the affordable 3-cell flipper, then diverge in investment and diversity.
const options = ['p2','p4f','censo-oscillator-5-p2-1','p8f'];
const costs = new Map(patterns.callahan.map(p => [p.id, p.rle.match(/\d*o/g)?.length || 0]));
export function growthChoice(player, game) {
  const price = id => {
    const p = patterns.callahan.find(p => p.id === id);
    return p ? (p.cells ?? 0) * game.economy.stampCost : Infinity;
  };
  const afford = id => player.reserve + 1e-9 >= price(id);
  if (player.id === 2) return 'p2';                         // smallest, frequent farms
  if (player.id === 3) return afford('p4f') ? 'p4f' : 'p2'; // active P4 farms
  if (player.id === 4) return afford(options[2]) ? options[2] : 'p2'; // denser fixed core
  if (player.id === 5) return afford('p8f') ? 'p8f' : 'p2';// slower P8 farms
  const choices = options.filter(afford);
  return choices.length ? choices[player.stamps % choices.length] : 'p2'; // varied farms
}
export function createGrowthStrategy(game, plantOscillator) {
  return player => plantOscillator(player, growthChoice(player, game));
}
