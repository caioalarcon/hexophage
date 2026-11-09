// An ordered ring is shared by the spherical graph and the axial laboratory.
// Compile once so a generation only reads a byte indexed by occupancy and mask.
export function compileHexRule(transition, mixedOwner = pluralityOwner) {
  const tables = [];
  for (const degree of [5, 6]) {
    tables[degree] = [0, 1].map(alive =>
      Uint8Array.from({ length: 1 << degree }, (_, mask) => Number(!!transition(alive, mask, degree))));
  }
  return { tables, birthOwner: inheritOwner(mixedOwner), birthsFromVacuum: !!(tables[5][0][0] || tables[6][0][0]) };
}

function countBits(mask) {
  let n = 0;
  for (; mask; mask &= mask - 1) n++;
  return n;
}

// A birth with no parents is neutral. One lineage inherits its owner on
// every topology. A rule may choose which of several competing lineages wins.
function inheritOwner(mixedOwner) {
  return (owners, adj, offset, degree, mask, counts) => {
    let first = 0;
    for (let k = 0; k < degree; k++) {
      if (!(mask & (1 << k))) continue;
      const owner = owners[adj[offset + k]];
      if (first && first !== owner) {
        counts.fill(0);
        for (let j = 0; j < degree; j++)
          if (mask & (1 << j)) counts[owners[adj[offset + j]]]++;
        const winner = mixedOwner(counts);
        return counts[winner] ? winner : 7;
      }
      first = owner;
    }
    return first || 7;
  };
}

function pluralityOwner(counts) {
  let best = 0, winner = 7;
  for (let owner = 1; owner <= 7; owner++) {
    if (counts[owner] > best) {
      best = counts[owner];
      winner = owner;
    } else if (counts[owner] === best) winner = 7;
  }
  return winner;
}

export const CALLAHAN = compileHexRule((alive, mask, degree) => {
  const count = countBits(mask);
  if (count !== 2) return alive && (count === 3 || count === 4);
  const distance = alive ? 2 : 1;
  for (let k = 0; k < degree; k++)
    if (mask === ((1 << k) | (1 << ((k + distance) % degree)))) return true;
  return false;
}, () => 7);

export function compileTotalistic(value) {
  const parsed = /^B([0-6]*)\s*\/\s*S([0-6]*)$/i.exec(value.trim());
  if (!parsed) return null;
  const [birth, survival] = parsed.slice(1).map(digits => [...new Set(digits)].sort().join(''));
  const rule = compileHexRule((alive, mask) => (alive ? survival : birth).includes(String(countBits(mask))));
  return { ...rule, notation: 'B' + birth + '/S' + survival };
}

export const BAYS = compileTotalistic('B2/S35');
