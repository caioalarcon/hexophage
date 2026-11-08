import { game } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { $ } from '../../layout/elements.js';

function updateHumanReport(showDetails) {
  const h = game.humanHistory;
  if (!h) return;
  const e = h.largest,
    fmt = (n) => n.toLocaleString('pt-BR');
  if (!showDetails) return;
  const p = game.players[0],
    peak = h.peak,
    field = world.ownerCells[1].length;
  $('br-diag-peak').textContent =
    peak && peak.field > 0
      ? `Desde o pico de ${fmt(peak.field)} células na geração ${fmt(peak.gen)}, seu campo chegou a ${fmt(field)}. Carimbadas +${fmt(h.placed - peak.placed)}, nascidas +${fmt(h.births - peak.births)}, mortas pelo autômato −${fmt(h.deaths - peak.deaths)}, removidas por dívida −${fmt(p.eroded - peak.eroded)}. Reserva ${fmt(peak.reserve)} → ${fmt(p.reserve)}, com ${fmt(p.received - peak.received)} recebidas, ${fmt(p.paid - peak.paid)} pagas da reserva e ${fmt(p.stampedEnergy - peak.stampedEnergy)} gastas em carimbos.`
      : 'Aguardando o primeiro carimbo.';
  $('br-diag-largest').textContent = e
    ? `Maior queda em uma geração (${fmt(e.gen)}). Campo ${fmt(e.before)} → ${fmt(e.after)}. Nasceram ${fmt(e.births)}, o autômato matou ${fmt(e.deaths)} e a dívida removeu ${fmt(e.erosion)}. Reserva ${fmt(e.reserveBefore)} → ${fmt(e.reserve)}.`
    : '';
  $('br-diag-end').textContent =
    h.eliminated !== null
      ? `Eliminação na geração ${fmt(h.eliminated)}, com zero no campo e zero na reserva.`
      : p.reserve === 0 && field > 0
        ? `Você continua em jogo com ${fmt(field)} células em campo e reserva zero.`
        : '';
}

export { updateHumanReport };
