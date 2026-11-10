import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareArena} from './arena.mjs';

test('swapping the sponsor and witness farms reverses the last conventional colony in the playable launch',()=>{
  function lastColony(swapFarms){
    const {match}=prepareArena({scene:'engulf',F:16,bank:300000,seed:1,swapFarms});
    for(let g=1;g<=200;g++){
      match.step();
      const owners=new Set();
      for(const c of match.cells.values())if(!c.wave)owners.add(c.owner);
      if(owners.size<=1)return [g,...owners];
    }
    assert.fail('expected a conventional-field verdict');
  }
  assert.deepEqual(lastColony(false),[161,3]);
  assert.deepEqual(lastColony(true),[161,1]);
});
