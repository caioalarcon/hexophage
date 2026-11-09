// One representative per dihedral orbit of the six neighbours, in ring order.
// At a pentagon, insert the missing (empty) sixth neighbour at each possible
// gap and use the majority of these five completions. No preferred meridian.
import { compileHexRule, compileTotalistic } from './rules.js';

function ringRule(notation, birth, survive) {
  function orbit(representatives) {
    const masks = new Set();
    for (let mask of representatives) {
      for (let i = 0; i < 6; i++) {
        masks.add(mask);
        let reverse = 0;
        for (let k = 0; k < 6; k++) reverse |= ((mask >> k) & 1) << (5 - k);
        masks.add(reverse);
        mask = ((mask << 1) & 63) | (mask >> 5);
      }
    }
    return masks;
  }
  const tables = [orbit(birth), orbit(survive)];
  const rule = compileHexRule((alive, mask, degree) => {
    const accepted = tables[alive];
    if (degree === 6) return accepted.has(mask);
    let votes = 0;
    for (let i = 0; i < 5; i++) {
      const low = (1 << i) - 1;
      if (accepted.has((mask & low) | ((mask & ~low) << 1))) votes++;
    }
    return votes >= 3;
  });
  return { ...rule, notation };
}

export const catalogRules = {
  'hex-b2s34': compileTotalistic('B2/S34'),
  'hex-b2s245': compileTotalistic('B2/S245'),
  bays245: compileTotalistic('B245/S3'),
  highhex: compileTotalistic('B25/S34'),
  andreen: ringRule('B2o3o4m/S2om4o', [3, 7, 63 ^ 5], [3, 5, 15]),
  ashley: ringRule('B2o3m56/S2om4o', [3, 11, 31, 63], [3, 5, 15]),
  ashley15: ringRule('B2/S2op', [3, 5, 9], [3, 9]),
};
