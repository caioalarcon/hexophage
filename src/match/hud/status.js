import { world } from '../../browser/world-state.js';
import { $ } from '../../layout/elements.js';
import { updateStampReadiness } from '../../patterns/placement/readiness.js';

let reportedOutbreak = null;

function updateStats() {
  updateStampReadiness();
  const event = world.lastOutbreak ?? null;
  if (event !== reportedOutbreak) {
    const label = $('br-outbreak-event');
    label.hidden = !event;
    if (event) {
      label.textContent = 'Surto contido · G' + event.gen;
      label.title = event.births + ' nascimentos impedidos · ' + (event.cells - event.births) + ' células sobreviventes removidas';
    }
    reportedOutbreak = event;
  }
  $('hl-gen').textContent = world.gen.toLocaleString('pt-BR');
  $('hl-pop').textContent = world.activeCount.toLocaleString('pt-BR');
  $('hl-eval').textContent = world.evaluated.toLocaleString('pt-BR');
  $('hl-nearest').textContent = world.graph.distance[world.center] + ' arestas';
  $('hl-topstatus').textContent =
    world.view === 'globe' ? 'Inspeção 3D' : world.chart ? 'Janela local' : 'Mapa do planeta';
  $('hl-current').textContent = world.center;
  $('hl-actual').textContent = world.actual.toFixed(0) + '/s';
  $('hl-speed-val').textContent = world.speed + '/s';
}
function markRender() {
  world.needsDraw = true;
  world.needsGrid = true;
  world.needsGlobeBase = true;
  updateStats();
}

export { markRender, updateStats };
