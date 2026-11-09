import { game } from '../browser/game.js';
import { $ } from '../layout/elements.js';
import { getBotPlans } from '../match/gameplay.js';
export function bindBotSelectors() {
  const { choices } = getBotPlans(game.gameplay, game.economy);
  const bots=$('br-bots');bots.replaceChildren();
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
