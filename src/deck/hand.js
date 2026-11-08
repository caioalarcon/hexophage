import { game } from '../browser/game.js';
import { drawDeckIcon } from './card-icon.js';
import { deckNames, deckPoints } from './cards.js';
import { slotIds, selectedSlot, selectSlot, requestSlotPicker } from './slots.js';
import { $ } from '../layout/elements.js';
import { energyCost } from '../match/constructive-economy.js';
function renderDeck(currentPatternId, loadPattern) {
  const dock=$('br-deck');if(!dock)return;
  const previous=new Map([...dock.children].map(b=>[b.dataset.slot,b]));
  for (let slot=0;slot<slotIds.length;slot++) {
    const id=slotIds[slot], key=String(slot);
    let b=previous.get(key);
    if (!b) {
      b=document.createElement('button');b.type='button';
      b.className='br-stampcard';b.dataset.slot=key;
      b.innerHTML='<canvas width="68" height="38" aria-hidden="true"></canvas><span class="br-stampname"></span><span class="br-stampprice"></span><span class="br-charge"><i></i></span><span class="br-slot-edit" title="Trocar padrão deste slot">⋯</span>';
      b.onclick=e=>{
        if(e.target.closest('.br-slot-edit')){e.stopPropagation();requestSlotPicker(Number(b.dataset.slot));return;}
        selectSlot(Number(b.dataset.slot));loadPattern(b.dataset.pattern);
      };
      b.addEventListener('contextmenu',e=>{e.preventDefault();requestSlotPicker(Number(b.dataset.slot))});
    }
    b.dataset.pattern=id;
    const pts=deckPoints(id),name=deckNames[id]||id;
    const price=energyCost(pts.length,game.economy);
    b.querySelector('.br-stampname').textContent=name;
    b.querySelector('.br-stampprice').textContent=price?'◈'+price:'◈0';
    b.title='Slot '+(slot+1)+' · '+name+' · '+price+' energia. Clique nos três pontos para trocar.';
    drawDeckIcon(b.querySelector('canvas'),pts);
    b.classList.toggle('selected',slot===selectedSlot && id===currentPatternId);
    b.setAttribute('aria-pressed',String(slot===selectedSlot && id===currentPatternId));
    dock.append(b);previous.delete(key);
  }
  for (const item of previous.values()) item.remove();
  updateDeckAvailability();
}
function updateDeckAvailability() {
  const dock=$('br-deck');if(!dock||!game.players.length)return;
  const reserve=game.players[0].reserve;
  for(const b of dock.children) {
    const count=deckPoints(b.dataset.pattern).length;
    const cost=energyCost(count,game.economy);
    const fraction=cost===0?100:Math.min(100,Math.max(0,reserve*100/cost));
    b.classList.toggle('unavailable',count===0||cost>reserve+1e-9||game.ended);
    b.querySelector('.br-charge i').style.width=fraction+'%';
    b.querySelector('.br-stampprice').textContent='◈'+cost;
  }
}
export {renderDeck,updateDeckAvailability};
