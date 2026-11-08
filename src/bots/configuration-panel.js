import { game } from '../browser/game.js';
import { $ } from '../layout/elements.js';
const plans=[
 ['farmer','Expandir colmeias rentáveis e atacar'],
 ['cycler','Incursões com glider P4'],
 ['core','Guardar para uma colmeia de reserva'],
 ['slow','Poupar para cerco · Gun P42'],
 ['diverse','Poupar para cerco · Gun P20'],
];
export function bindBotSelectors() {
  const bots=$('br-bots');bots.replaceChildren();
  for(let id=2;id<=6;id++) {
    const label=document.createElement('label');label.className='br-botlabel';
    label.textContent=game.symbols[id]+' '+game.names[id];
    const select=document.createElement('select');select.id='br-bot-'+id;
    for(const [value,name] of plans) {
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
