import { game } from '../browser/game.js';
import { $ } from '../layout/elements.js';
import { getBotPlans } from '../match/gameplay.js';
export function updateBrainProgress() {
  const status = $('br-brain-progress');
  status.hidden = game.botMode !== 'learn';
  if (status.hidden || !status.closest('details').open) return;
  const trials = game.brainMetrics?.completed ?? 0;
  const actions = game.brainMetrics?.actions ?? 0;
  const learned = game.brainMemory?.stats().priorSamples ?? 0;
  status.textContent = trials + ' testes · ' + actions + ' jogadas · ' + learned + ' experiências herdadas';
}

export function bindBotSelectors() {
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
