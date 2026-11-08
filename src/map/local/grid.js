import { world } from '../../browser/world-state.js';
import { maxGlobeZoom } from '../../globe/camera/zoom.js';
import { $, cv, grid } from '../../layout/elements.js';
import { maximumZoom, minimumZoom } from '../camera/surface.js';
import { aperture } from './hex-layout.js';
import { DX, DY, HEX_X, HEX_Y, R } from './hex-metrics.js';

const gridTile = (() => {
  const lines = [];
  for (let r = -2; r <= 3; r++)
    for (let c = -2; c <= 3; c++) {
      const x = DX * (c + 0.5 * (r & 1)),
        y = DY * r;
      const pts = HEX_X.map(
        (v, i) => `${(x + R * 0.96 * v).toFixed(4)},${(y + R * 0.96 * HEX_Y[i]).toFixed(4)}`,
      );
      lines.push(`<polygon points="${pts.join(' ')}"/>`);
    }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${DX}" height="${2 * DY}" viewBox="0 0 ${DX} ${2 * DY}"><g fill="none" stroke="#34465b" stroke-width="0.75">${lines.join('')}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();
function drawGrid() {
  const flat = world.view === 'flat';
  $('br-bench-show').hidden = flat;
  grid.style.display = flat && world.chart ? 'block' : 'none';
  $('hl-fit').parentElement.style.display = 'flex';
  $('hl-overview').hidden = !flat;
  $('hl-fit').title = $('hl-fit').ariaLabel = flat
    ? 'Voltar ao zoom de construção'
    : 'Enquadrar o globo';
  if (!flat) {
    $('hl-fit').textContent = Math.round(world.globeZoom * 100) + '%';
    $('hl-zminus').disabled = world.globeZoom <= 0.5;
    $('hl-zplus').disabled = world.globeZoom >= maxGlobeZoom();
  }
  if (flat) {
    $('hl-renderstatus').textContent = 'Render: 2D';
    $('hl-fit').textContent = Math.round((world.zoom / world.homeZoom) * 100) + '%';
    const atMin = world.zoom <= minimumZoom() * 1.001;
    $('hl-zminus').disabled = atMin;
    $('hl-overview').disabled = atMin;
    $('hl-zplus').disabled = world.zoom >= maximumZoom() * 0.999;
  }
  if (world.view === 'flat' && world.chart) {
    grid.style.backgroundImage = R * world.zoom > 4.1 ? gridTile : 'none';
    grid.style.backgroundSize = `${DX * world.zoom}px ${2 * DY * world.zoom}px`;
    const rect = cv.getBoundingClientRect();
    const a = aperture(rect.width, rect.height);
    grid.style.backgroundPosition = `${a.cx}px ${a.cy}px`;
  }
  world.needsGrid = false;
}

export { drawGrid };
