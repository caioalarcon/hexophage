export function decodeRLE(str) {
  const out = [],
    re = /(\d*)([ob$!])/g;
  let r = 0,
    c = 0,
    m;
  while ((m = re.exec(str)) !== null) {
    const n = Number(m[1] || 1);
    if (m[2] === 'o') {
      for (let i = 0; i < n; i++) out.push([c + i - r, r]);
      c += n;
    } else if (m[2] === 'b') c += n;
    else if (m[2] === '$') {
      r += n;
      c = 0;
    } else break;
  }
  return out;
}
