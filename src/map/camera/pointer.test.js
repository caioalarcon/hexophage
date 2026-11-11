import test from 'node:test';
import assert from 'node:assert/strict';
import {installBrowserElements} from '../../../tests/support/browser-elements.js';
import {buildSphere} from '../../world/sphere.js';
import {DX} from '../local/hex-metrics.js';

function surface(){
  const listeners=new Map();
  return {
    style:{},width:500,height:320,clientHeight:320,
    getContext:()=>({}),setAttribute(){},setPointerCapture(){},
    getBoundingClientRect:()=>({left:0,top:0,width:500,height:320}),
    addEventListener(name,callback){const group=listeners.get(name)??[];group.push(callback);listeners.set(name,group);},
    emit(name,values={}){
      const event={pointerId:1,pointerType:'mouse',button:0,clientX:250,clientY:160,shiftKey:false,preventDefault(){},...values};
      for(const callback of listeners.get(name)??[])callback(event);
    },
  };
}
const canvas=surface();
installBrowserElements({'hl-world':canvas});
globalThis.window=surface();
const {world}=await import('../../browser/world-state.js');
const {makeChart}=await import('../local/chart.js');
const {usePlacement,placementGesture}=await import('../../patterns/placement/plant.js');
const {bindMapGestures}=await import('./pointer.js');
const graph=buildSphere(32);
bindMapGestures();
let calls,mode;
function reset(next='paint'){
  window.emit('blur');
  Object.assign(world,{graph,center:graph.farthest,orient:0,side:1,zoom:2,view:'flat',offsetX:0,offsetY:0,showFaults:false});
  world.chart=makeChart(world.center,world.orient);
  assert(world.chart);
  calls=[];mode=next;
  usePlacement({get gesture(){return mode;},preview:()=>({tool:'erase',radius:0,ids:[],ready:true}),place:anchor=>{calls.push(anchor);return true;}});
}

test('paint gestures apply on press and interpolate every crossed cell without moving the camera',()=>{
  reset();assert.equal(placementGesture(),'paint');
  const center=world.center;
  canvas.emit('pointerdown');assert(world.painting);assert.equal(calls.length,1);
  canvas.emit('pointermove',{clientX:250+DX*world.zoom*5});
  assert(world.painting);assert.equal(world.center,center);assert.equal(world.offsetX,0);
  for(let q=0;q<=5;q++)assert(calls.some(at=>at.q===q&&at.r===0),'missing painted cell '+q);
  canvas.emit('pointerup',{clientX:250+DX*world.zoom*5});
  assert.equal(world.painting,false);assert.equal(world.drag,null);
});

test('shift and middle button retain pan gestures and never apply the selected eraser',()=>{
  for(const input of [{shiftKey:true},{button:1}]){
    reset();const center=world.center;
    canvas.emit('pointerdown',input);assert.equal(world.painting,false);
    canvas.emit('pointermove',{...input,clientX:320});
    canvas.emit('pointerup',{...input,clientX:320});
    assert.notEqual(world.center,center);assert.equal(calls.length,0);
  }
});

test('stamp mode preserves click placement and drag navigation',()=>{
  reset('stamp');assert.equal(placementGesture(),'stamp');
  canvas.emit('pointerdown');assert.equal(calls.length,0);assert.equal(world.painting,false);
  canvas.emit('pointerup');assert.equal(calls.length,1);
  calls=[];
  canvas.emit('pointerdown');canvas.emit('pointermove',{clientX:320});canvas.emit('pointerup',{clientX:320});
  assert.equal(calls.length,0);
  usePlacement(null);assert.equal(placementGesture(),'stamp');
});

test('cancel, lost capture, blur and tool changes stop held painting without a release action',()=>{
  for(const event of ['pointercancel','lostpointercapture','blur','hexophage:toolchange']){
    reset();canvas.emit('pointerdown');assert(world.painting);
    if(event==='blur'||event==='hexophage:toolchange')window.emit(event);else canvas.emit(event);
    const count=calls.length;
    assert.equal(world.painting,false);assert.equal(world.drag,null);
    canvas.emit('pointermove',{clientX:300});canvas.emit('pointerup',{clientX:300});
    assert.equal(calls.length,count,event);
  }
});

test('two-finger pinch cancels a pending touch without erasing, while taps and holds paint',async()=>{
  reset();
  canvas.emit('pointerdown',{pointerType:'touch'});
  assert.equal(calls.length,0);assert.equal(world.painting,false);
  canvas.emit('pointerdown',{pointerType:'touch',pointerId:2,clientX:300});
  canvas.emit('pointerup',{pointerType:'touch'});
  canvas.emit('pointerup',{pointerType:'touch',pointerId:2,clientX:300});
  await new Promise(resolve=>setTimeout(resolve,210));
  assert.equal(calls.length,0);assert.equal(world.painting,false);
  canvas.emit('pointerdown',{pointerType:'touch'});canvas.emit('pointerup',{pointerType:'touch'});
  assert.equal(calls.length,1);assert.equal(world.painting,false);
  canvas.emit('pointerdown',{pointerType:'touch'});
  await new Promise(resolve=>setTimeout(resolve,210));
  assert(world.painting);assert.equal(calls.length,2);
  canvas.emit('pointercancel',{pointerType:'touch'});assert.equal(world.painting,false);
});
