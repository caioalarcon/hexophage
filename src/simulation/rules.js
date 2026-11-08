export function initRuleTables(world) {
  for (const degree of [5, 6])
    for (let bits = 0; bits < 1 << degree; bits++) {
      let n = 0;
      for (let b = bits; b; b &= b - 1) n++;
      let adjacent = false,
        meta = false;
      if (n === 2)
        for (let k = 0; k < degree; k++) {
          if (bits === ((1 << k) | (1 << (k + 1) % degree))) adjacent = true;
          if (bits === ((1 << k) | (1 << (k + 2) % degree))) meta = true;
        }
      const birth = degree === 6 ? world.callBirth6 : world.callBirth5;
      const survive = degree === 6 ? world.callSurv6 : world.callSurv5;
      birth[bits] = n === 2 && adjacent ? 1 : 0;
      survive[bits] = n === 3 || n === 4 || (n === 2 && meta) ? 1 : 0;
    }
}
export function parseRule(world, value) {
  const m = /^B([0-6]*)\s*\/\s*S([0-6]*)$/i.exec(value.trim());
  if (!m) return false;
  world.birth.fill(0);
  world.survival.fill(0);
  for (const c of m[1]) world.birth[+c] = 1;
  for (const c of m[2]) world.survival[+c] = 1;
  return true;
}
