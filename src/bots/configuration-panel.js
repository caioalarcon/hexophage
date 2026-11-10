import { game } from '../browser/game.js';
import { $ } from '../layout/elements.js';
import { getBotPlans } from '../match/gameplay.js';
export function updateBrainProgress() {
  const status = $('br-brain-progress');
  status.hidden = game.botMode !== 'learn';
  const review = $('br-forecast'), receipt = game.lastForecast;
  review.hidden = status.hidden || !receipt;
  if (status.hidden || !status.closest('details').open) return;
  const trials = game.brainMetrics?.completed ?? 0;
  const actions = game.brainMetrics?.actions ?? 0;
  const learned = game.brainMemory?.stats().priorSamples ?? 0;
  status.textContent = trials + ' testes · ' + actions + ' jogadas · ' +
    (game.brainMetrics?.forecasts ?? 0) + ' previsões conferidas · ' + learned + ' experiências herdadas';
  if (receipt && review.open) {
    const n = value => value.toLocaleString('pt-BR', {maximumFractionDigits:2, signDisplay:'exceptZero'});
    const opponent = receipt.rival ? ' contra ' + game.names[receipt.rival] : '';
    const pattern = game.gameplay.patterns.find(p => p.id === receipt.stamp)?.name ?? receipt.stamp;
    $('br-forecast-result').textContent = game.names[receipt.owner] + opponent + ' · ' + pattern +
      ' · G' + receipt.launched + '–' + receipt.gen + '. Vantagem prevista ' + n(receipt.relativeCalibrated) +
      ', observada ' + n(receipt.relativeObserved) + '. Fluxo próprio observado ' + n(receipt.own.observedFlow) +
      (receipt.target ? ', do alvo ' + n(receipt.target.observedFlow) : '') + '.';
  }
}

export function bindBotSelectors() {
  $('br-forecast').ontoggle = updateBrainProgress;
  const bots=$('br-bots');bots.replaceChildren();
  updateBrainProgress();
  bots.hidden = game.botMode === 'learn';
  $('br-brain-rate-label').hidden = !bots.hidden;
  if (bots.hidden) return;
  const { choices } = getBotPlans(game.gameplay, game.economy);
  for(let id=2;id<=6;id++) {
    const label=document.createElement('label');label.className='br-botlabel';
    label.textContent=game.symbols[id]+' '+game.names[id];
    const select=document.createElement('select');select.id='br-bot-'+id;
    for(const [value,name] of choices) {
      const o=document.createElement('option');o.value=value;o.textContent=name;select.append(o);
    }
    select.value=game.bots[id-2];
    select.onchange=()=>{
      game.bots[id-2]=select.value;
      if(game.players[id-1]) game.players[id-1].pattern=select.value;
    };
    label.append(select);bots.append(label);
  }
}
