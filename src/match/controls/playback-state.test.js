import test from 'node:test';
import assert from 'node:assert/strict';
import {playbackState} from './playback-state.js';

test('preparation exposes start, running exposes pause/stop, paused exposes resume/step/stop',()=>{
  assert.deepEqual(playbackState(),{state:'ready',label:'Iniciar',icon:'▶',canStep:false,canStop:false,canRun:true});
  const running=playbackState({started:true,playing:true});
  assert.equal(running.label,'Pausar');assert(running.canStop);assert(!running.canStep);
  const paused=playbackState({started:true});
  assert.equal(paused.label,'Retomar');assert(paused.canStep&&paused.canStop);
});
test('stopping, defeat and global completion expose a new match without step/pause',()=>{
  for(const reason of ['stopped','eliminated','ended']){
    const s=playbackState({started:true,playing:true,[reason]:true});
    assert.equal(s.label,'Nova partida');assert.equal(s.icon,'↻');
    assert(!s.canStep&&!s.canStop&&!s.canRun);
  }
});
