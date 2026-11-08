import { initialEnergy } from '../match/constructive-economy.js';
import { $ } from '../layout/elements.js';
import { analyzePatternCycles } from './cycle-economy.js';

const format = new Intl.NumberFormat('pt-BR');
const fmt = n => format.format(n);
const signed = n => n > 0 ? '+' + fmt(n) : fmt(n);
let pending;

function plot(rows, unit) {
  const svg = $('br-cycle-plot');
  svg.replaceChildren();
  const add = (name, attrs, label) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (label !== undefined) node.textContent = label;
    svg.append(node);
  };
  const max = Math.max(1, ...rows.map(row => Math.max(row.income, row.upkeep)));
  const left = 54, right = 561, top = 12, bottom = 71;
  const x = i => left + (right - left) * i / Math.max(1, rows.length - 1);
  const y = value => bottom - (bottom - top) * value / max;
  const text = { fill: '#acc4d2', 'font-size': 10 };
  for (const value of [0, max]) {
    add('line', { x1: left, x2: right, y1: y(value), y2: y(value), stroke: '#365167' });
    add('text', { ...text, x: left - 6, y: y(value) + 3, 'text-anchor': 'end' }, fmt(value));
  }
  add('text', { ...text, x: left, y: 87 }, unit + ' 1');
  add('text', { ...text, x: right, y: 87, 'text-anchor': 'end' }, unit + ' ' + rows.length);
  for (const [key, color] of [['income', '#77e3c5'], ['upkeep', '#ffc483']]) {
    const points = rows.map((row, i) => x(i) + ',' + y(row[key])).join(' ');
    add('polyline', { points, fill: 'none', stroke: color, 'stroke-width': 2,
      'stroke-dasharray': key === 'upkeep' ? '5 3' : 'none' });
  }
}

function fillTable(rows) {
  const body = document.createDocumentFragment();
  for (const r of rows) {
    const tr = document.createElement('tr');
    const values = [fmt(r.cycle), fmt(r.from) + '–' + fmt(r.to), fmt(r.births), fmt(r.income),
      fmt(r.upkeep), fmt(r.fixedUpkeep) + ' (' + fmt(r.fixedCore) + ' cél.)', signed(r.net), signed(r.cumulative)];
    for (const [i, value] of values.entries()) {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = value;
      tr.append(cell);
    }
    body.append(tr);
  }
  $('br-cycle-rows').replaceChildren(body);
}

function render(report, economy, pattern) {
  const { rows, kind, cycleLength, generations, initialCost, workingCapital, firstErosionGeneration } = report;
  const first = rows[0], last = rows.at(-1);
  const unit = kind === 'window' ? 'Janela' : 'Ciclo';
  const interval = unit.toLowerCase();
  const frame = kind === 'emission' ? 'Ciclo nominal do emissor' :
    kind === 'window' ? 'Janela de observação' : 'Período do padrão';
  $('br-cycle-heading').textContent = (kind === 'window' ? 'Economia por janela' : 'Economia por ciclo') + ' · ' + pattern.name;
  $('br-cycle-scope').textContent = frame + ' de ' + fmt(cycleLength) + ' gerações · ' +
    fmt(rows.length) + ' ' + unit.toLowerCase() + 's · ' + fmt(generations) + ' gerações simuladas. ' +
    'Estrutura isolada em malha plana, com reserva suficiente para evitar erosão.' +
    (kind === 'emission' ? ' A conta inclui as naves emitidas.' : '');
  $('br-cycle-stamp').textContent = fmt(initialCost);
  $('br-cycle-capital').textContent = fmt(workingCapital);
  $('br-cycle-positive').textContent = report.firstPositiveCycle === null ? 'Nenhum no intervalo' :
    unit + ' ' + fmt(report.firstPositiveCycle);
  $('br-cycle-payback').textContent = report.paybackGeneration === null ? 'Sem retorno no intervalo' :
    'Geração ' + fmt(report.paybackGeneration);

  const charge = rows.every(row => row.upkeep === first.upkeep)
    ? 'A manutenção custou ' + fmt(first.upkeep) + ' de energia por ' + interval + '.'
    : 'A manutenção custou ' + fmt(first.upkeep) + ' no primeiro intervalo e ' + fmt(last.upkeep) + ' no último.';
  const core = rows.every(row => row.fixedUpkeep === first.fixedUpkeep)
    ? ' A parcela do núcleo ficou em ' + fmt(first.fixedUpkeep) + ' por ' + interval + '.'
    : ' A parcela do núcleo passou de ' + fmt(first.fixedUpkeep) + ' para ' + fmt(last.fixedUpkeep) + '.';
  const positive = report.profitableFromCycle;
  const streak = positive === null ? '' : positive === 1 ? ' Todos os intervalos deram saldo positivo.' :
    positive === last.cycle ? ' O último intervalo deu saldo positivo.' :
    ' O saldo ficou positivo do ' + positive + 'º ao ' + last.cycle + 'º intervalo.';
  $('br-cycle-trend').textContent = charge + core + streak;
  $('br-cycle-unit').textContent = unit.toLowerCase();
  $('br-cycle-column').textContent = unit;
  plot(rows, unit);
  const reserve = initialEnergy(economy);
  const outcome = firstErosionGeneration === 0 ? 'faltam ' + fmt(initialCost - reserve) + ' para carimbar.' :
    firstErosionGeneration === null ? 'o padrão atravessa todo o intervalo sem erosão.' :
    'a erosão começaria na geração ' + fmt(firstErosionGeneration) + '.';
  $('br-cycle-solvency').textContent = 'Para manter a estrutura intacta até G' + fmt(generations) +
    ' são necessárias ' + fmt(initialCost + workingCapital) + ' unidades antes do carimbo. Com a reserva inicial de ' +
    fmt(reserve) + ', ' + outcome;
  fillTable(rows);
  $('br-cycle-report').hidden = false;
}

export function cancelCycleAnalysis() {
  pending?.abort();
}

export async function showCycleAnalysis(pattern, economy) {
  cancelCycleAnalysis();
  const controller = new AbortController();
  pending = controller;
  $('br-cycle-panel').setAttribute('aria-busy', 'true');
  $('br-cycle-scope').textContent = 'Calculando a evolução de ' + pattern.name + '…';
  $('br-cycle-heading').textContent = 'Economia · ' + pattern.name;
  $('br-cycle-report').hidden = true;
  const settings = { ...economy };
  try {
    const report = await analyzePatternCycles(pattern, settings, { signal: controller.signal });
    if (!controller.signal.aborted) {
      render(report, settings, pattern);
      if (document.activeElement === $('br-cycle-heading')) $('br-cycle-heading').scrollIntoView({ block: 'start' });
    }
  } catch (error) {
    if (!controller.signal.aborted) {
      $('br-cycle-scope').textContent = 'Não foi possível calcular a economia deste padrão.';
      console.error(error);
    }
  } finally {
    if (pending === controller) {
      $('br-cycle-panel').setAttribute('aria-busy', 'false');
      pending = null;
    }
  }
}
