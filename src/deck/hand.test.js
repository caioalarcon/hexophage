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
const {fieldKit}=await import('../patterns/callahan-kit.js');
const {rankEconomicPatterns}=await import('../patterns/economic-ranking.js');
const {updateDeckAvailability}=await import('./hand.js');
test('fifteen unrestricted atlas slots restore the experimental kit',()=>{
  assert.equal(slotIds.length,15);
  const first = [...game.gameplay.patterns].filter(p=>Object.hasOwn(fieldKit,p.id));
  const sorted = rankEconomicPatterns(first, 'callahan', game.economy);
  assert.deepEqual(slotIds,sorted.map(p=>p.id));
  assert.deepEqual(new Set(slotIds), new Set(Object.keys(fieldKit)));
  assert.equal(deckPoints('stalk').length,36);
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

test('identical IDs and edited cards keep their shapes and loadouts in their own rules', async () => {
  const { callahanGameplay, baysGameplay, genericGameplay } = await import('../match/gameplay.js');
  const { useSlots, assignSlot } = await import('./slots.js');
  const saved = await import('../patterns/editor/saved-patterns.js');
  const use = (profile, key) => {
    game.gameplay = profile;
    useSlots(profile, key);
    saved.useSavedPatterns(key);
  };
  try {
    use(callahanGameplay, 'callahan');
    const firstHand = [...slotIds];
    saved.savedPatterns.set('glider', [[9, 9]]);
    use(baysGameplay, 'bays');
    assert.equal(deckPoints('glider').length, 10);
    assert.equal(slotIds[0], 'osc2');
    assert(slotIds.includes('glider'), 'o baralho mantém carimbos ofensivos');
    assert.equal(slotIds.length, 15);
    assert.equal(assignSlot(0, 'stalk', baysGameplay.patterns), false);
    assert(assignSlot(0, 'glider', baysGameplay.patterns));
    use(genericGameplay, 'custom/B2/S35');
    saved.savedPatterns.set('manual', [[1, 1]]);
    use(genericGameplay, 'custom/B3/S2');
    assert.equal(saved.savedPatterns.has('manual'), false);
    use(genericGameplay, 'custom/B2/S35');
    assert.deepEqual(deckPoints('manual'), [[1, 1]]);
    use(baysGameplay, 'bays');
    assert.equal(slotIds[0], 'glider');
    use(callahanGameplay, 'callahan');
    assert.deepEqual(slotIds, firstHand);
    assert.deepEqual(deckPoints('glider'), [[9, 9]]);
  } finally {
    use(callahanGameplay, 'callahan');
    saved.savedPatterns.delete('glider');
  }
});
