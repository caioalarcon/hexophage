const $ = (id) => document.getElementById(id);
const cv = $('hl-world'),
  ctx = cv.getContext('2d');
const ev = $('hl-editor'),
  ectx = ev.getContext('2d');
const gpuCanvas = $('hl-globe-gpu');
const grid = $('hl-grid');

export { $, ctx, cv, ectx, ev, gpuCanvas, grid };
