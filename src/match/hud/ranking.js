import { game } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { $ } from '../../layout/elements.js';
import { syncPregameControls } from '../controls/pregame.js';
import { updateHumanReport } from './human-report.js';
import { updateEnergyPanel } from './energy-panel.js';

// Ranking display: whole numbers without thousands or decimal separators.
const rankingInteger = (value) => String(Math.round(value));
const rankingSignedInteger = (value) => {
  const rounded = Math.round(value);
  return (rounded > 0 ? '+' : '') + String(rounded);
};

function updateGamePanel(force = false) {
  if (!game.players.length) return;
  if (!force && world.gen === game.lastStats) return;
  game.lastStats = world.gen;
  const alive = game.players.filter((p) => !p.out),
    avg = alive.length
      ? alive.reduce((a, p) => a + world.ownerCells[p.id].length, 0) / alive.length
      : 0;
  game.average = avg;
  $('br-mean').textContent = 'μ ' + avg.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  $('br-neutral').textContent = world.ownerCells[7].length.toLocaleString('pt-BR');
  $('hl-step').disabled = game.ended;
  syncPregameControls();
  updateEnergyPanel();
  const status = $('br-gamestatus');
  status.textContent = game.winner
    ? 'Vencedor: ' + game.symbols[game.winner] + ' ' + game.names[game.winner]
    : game.ended
      ? 'Empate · todos eliminados'
      : `${alive.length} em jogo`;
  const ranked = [...game.players].sort(
    (a, b) =>
      Number(a.out) - Number(b.out) ||
      world.ownerCells[b.id].length - world.ownerCells[a.id].length ||
      b.reserve - a.reserve,
  );
  const podium = $('br-podium'),
    body = $('br-ranking'),
    details = $('br-ledger').open;
  const strongestRival = ranked.find((p) => p.id !== 1)?.id;
  updateHumanReport(details);
  if (details) body.replaceChildren();
  for (let i = 0; i < ranked.length; i++) {
    const p = ranked[i],
      pop = world.ownerCells[p.id].length,
      rate = p.out ? 0 : p.lastFlow;
    let card = $('br-player-' + p.id);
    if (!card) {
      card = document.createElement('li');
      card.id = 'br-player-' + p.id;
      card.style.setProperty('--player', game.colors[p.id]);
      card.innerHTML =
        '<div class="br-player"><small></small><span></span></div><dl class="br-scorevals"><div><dt>Campo</dt><dd></dd></div><div><dt>Reserva</dt><dd></dd></div><div><dt>Saldo/g</dt><dd></dd></div></dl>';
    }
    card.classList.toggle('mine', p.id === 1);
    card.classList.toggle('rival', p.id === strongestRival);
    card.classList.toggle('out', p.out);
    const name = card.firstElementChild,
      values = card.lastElementChild;
    name.firstElementChild.textContent = String(i + 1) + 'º';
    name.lastElementChild.textContent = p.symbol + ' ' + p.name + (p.out ? ' ×' : '');
    values.children[0].lastElementChild.textContent = rankingInteger(pop);
    values.children[1].lastElementChild.textContent = rankingInteger(p.reserve);
    const balance = values.children[2].lastElementChild;
    balance.textContent = rankingSignedInteger(rate);
    balance.className = rate > 0 ? 'positive' : rate < 0 ? 'negative' : '';
    card.title =
      `${i + 1}º ${p.symbol} ${p.name} · Campo ${rankingInteger(pop)} · Reserva ${rankingInteger(p.reserve)} · Saldo ${rankingInteger(rate)} por geração` +
      (p.out ? ' · Eliminado' : '');
    if (podium.children[i] !== card) podium.insertBefore(card, podium.children[i] || null);
    if (!details) continue;
    const tr = document.createElement('tr');
    if (p.id === 1) tr.className = 'mine';
    if (p.out) tr.classList.add('out');
    const cell = (txt, klass = '') => {
      const td = document.createElement('td');
      td.textContent = txt;
      if (klass) td.className = klass;
      tr.append(td);
    };
    cell(String(i + 1));
    cell(`${p.symbol} ${p.name}${p.out ? ' · eliminado' : ''}`);
    cell(rankingInteger(pop));
    cell(rankingInteger(p.reserve));
    cell(
      rankingSignedInteger(rate),
      rate > 0 ? 'positive' : rate < 0 ? 'negative' : 'neutral',
    );
    const net = p.received - p.paid;
    cell(
      rankingSignedInteger(net),
      net > 0 ? 'positive' : net < 0 ? 'negative' : 'neutral',
    );
    cell(rankingInteger(p.eroded), p.eroded ? 'negative' : 'neutral');
    cell(rankingInteger(p.stamps));
    body.append(tr);
  }
}

function bindRankingControls() {
  $('br-rank-fold').onclick = () => {
    const p = $('br-rail-ranking'),
      v = p.classList.toggle('expanded');
    $('br-rank-fold').textContent = v ? 'Classificação · Todos' : 'Classificação · Top 3';
    $('br-rank-fold').setAttribute('aria-expanded', String(v));
  };
  $('br-rank-hide').onclick = () => {
    const p = $('br-rail-ranking'),
      hidden = p.classList.toggle('collapsed');
    $('br-rank-hide').textContent = hidden ? '+' : '−';
    $('br-rank-hide').setAttribute('aria-label', hidden ? 'Mostrar ranking' : 'Ocultar ranking');
  };
}

export { bindRankingControls, updateGamePanel };
