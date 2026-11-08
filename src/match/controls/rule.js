import { resetGame } from './new-match.js';
import { clearCells, parseRule } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { $ } from '../../layout/elements.js';
import { patterns } from '../../patterns/catalog.js';
import { loadPattern } from '../../patterns/editor/selection.js';

function chooseRule(rule) {
  world.rule = rule;
  if (rule === 'bays') parseRule('B2/S35');
  if (rule === 'custom') parseRule($('hl-rule').value);
  $('hl-ruleconfig').classList.toggle('show', rule === 'custom');
  $('hl-rulehelp').textContent =
    rule === 'bays'
      ? 'B2/S35: 2 vizinhos para nascer; 3 ou 5 para sobreviver.'
      : rule === 'callahan'
        ? 'B2o/S2m34: considera a posição dos vizinhos. Generalizada nos pentágonos por ciclo de 5 vizinhos.'
        : 'B/S por contagem de 0 a 6 vizinhos.';
  const select = $('hl-pattern');
  select.replaceChildren();
  for (const p of patterns[rule]) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    select.add(opt);
  }
  const custom = document.createElement('option');
  custom.value = 'manual';
  custom.textContent = 'Desenho livre';
  select.add(custom);
  select.value = patterns[rule][0]?.id || 'manual';
  loadPattern(select.value);
  clearCells();
}

export function bindRuleChoice() {
  $('hl-rulechoice').onchange = () => {
    chooseRule('callahan');
    resetGame();
  };
}

export function bindRuleInput() {
  $('hl-rule').onchange = (e) => {
    const ok = parseRule(e.target.value);
    e.target.style.borderColor = ok ? '#3b4d63' : '#ed7676';
    if (ok && world.rule === 'custom') clearCells();
  };
}

export { chooseRule };
