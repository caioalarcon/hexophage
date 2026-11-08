function drawDeckIcon(canvas, points) {
  const c = canvas.getContext('2d'),
    w = canvas.width,
    h = canvas.height;
  c.clearRect(0, 0, w, h);
  if (!points.length) {
    c.strokeStyle = '#6a8497';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(w / 2 - 8, h / 2);
    c.lineTo(w / 2 + 8, h / 2);
    c.moveTo(w / 2, h / 2 - 8);
    c.lineTo(w / 2, h / 2 + 8);
    c.stroke();
    return;
  }
  const xy = points.map(([q, r]) => [Math.sqrt(3) * (q + r / 2), 1.5 * r]);
  const minX = Math.min(...xy.map((p) => p[0])),
    maxX = Math.max(...xy.map((p) => p[0]));
  const minY = Math.min(...xy.map((p) => p[1])),
    maxY = Math.max(...xy.map((p) => p[1]));
  const scale = Math.min((w - 8) / (maxX - minX + 1.7), (h - 6) / (maxY - minY + 2));
  const cx = (minX + maxX) / 2,
    cy = (minY + maxY) / 2,
    r = Math.min(scale * 0.56, 5);
  c.fillStyle = '#5ce8c0';
  c.strokeStyle = '#b2ffe5';
  c.lineWidth = 0.5;
  for (const [x, y] of xy) {
    c.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = ((k * 60 - 30) * Math.PI) / 180,
        xx = w / 2 + (x - cx) * scale + r * Math.cos(a),
        yy = h / 2 + (y - cy) * scale + r * Math.sin(a);
      if (k) c.lineTo(xx, yy);
      else c.moveTo(xx, yy);
    }
    c.closePath();
    c.fill();
    if (r > 1.9) c.stroke();
  }
}

export { drawDeckIcon };
