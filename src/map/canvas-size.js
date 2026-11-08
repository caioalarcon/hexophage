function measure(c) {
  const rect = c.getBoundingClientRect(),
    dpr = Math.min(devicePixelRatio || 1, 2),
    w = Math.max(1, Math.floor(rect.width * dpr)),
    h = Math.max(1, Math.floor(rect.height * dpr));
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
    return true;
  }
  return false;
}

export { measure };
