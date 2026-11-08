import test from 'node:test';
import assert from 'node:assert/strict';
import {installBrowserElements} from '../../tests/support/browser-elements.js';
function card(pattern){
  const meter={style:{}},price={textContent:''};
  const state={dataset:{pattern},meter,price,unavailable:false,
    classList:{toggle:(name,value)=>{if(name==='unavailable')state.unavailable=value;}},
    querySelector:sel=>sel==='.br-charge i'?meter:price,
  };
  return state;
}
const dock={children:[]};
installBrowserElements({'br-deck':dock});
const {game}=await import('../browser/game.js');
const {deckPoints}=await import('./cards.js');
const {slotIds}=await import('./slots.js');
const {updateDeckAvailability}=await import('./hand.js');
test('slot zero is 3-cell flipper; all fifteen slots have real patterns',()=>{
  assert.equal(slotIds.length,15);
  assert.equal(slotIds[0],'p2');
  assert.equal(deckPoints('p2').length,3);
  for(const id of slotIds)assert(deckPoints(id).length>0,id);
});
test('card prices and availability react to stamp-cost slider and game end',()=>{
  const flipper=card('p2'),gun=card('gun42');
  dock.children=[flipper,gun];
  game.economy.stampCost=10;game.players=[{reserve:30}];game.ended=false;
  updateDeckAvailability();
  assert.deepEqual([flipper.unavailable,flipper.price.textContent,flipper.meter.style.width],[false,'◈30','100%']);
  assert.equal(gun.unavailable,true);
  game.economy.stampCost=0;updateDeckAvailability();
  assert.equal(gun.unavailable,false);
  game.ended=true;updateDeckAvailability();assert.equal(flipper.unavailable,true);
  game.economy.stampCost=10;game.ended=false;
});
