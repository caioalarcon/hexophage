import test from 'node:test';
import assert from 'node:assert/strict';
import {installBrowserElements} from '../../tests/support/browser-elements.js';
import {buildSphere} from '../world/sphere.js';
import {cross} from '../world/geometry.js';
import {createTypedWorld} from '../../experiments/typed-world/engine.mjs';
import {footprint} from '../../experiments/typed-world/catalog.mjs';
import {capturePattern,nearestPatternSite} from './field-tools.js';

const controls=['hexlab','mx-tool-stamp','mx-tool-erase','mx-tool-pick','mx-erase-control','mx-erase-radius','mx-erase-value'];
installBrowserElements(Object.fromEntries(controls.map(id=>[id,{dataset:{},setAttribute(){}}])));
globalThis.window=new EventTarget();
const {world}=await import('../browser/world-state.js');
const {atlasCamera,atlasOrientationAt,syncAtlasFromLocal}=await import('../map/atlas/camera.js');
const {createFieldTools}=await import('./tool-controls.js');

test('picking the same region after camera rotation refreshes its screen-oriented shape',()=>{
  const graph=buildSphere(32),center=graph.farthest;
  Object.assign(world,{graph,center,orient:0,side:1,zoom:2,chart:null});
  syncAtlasFromLocal();
  const match=createTypedWorld(graph),ids=footprint(graph,'callahan/glider',center);
  assert(match.stamp(1,'callahan','guard',ids,'age'));
  const tools=createFieldTools({getMatch:()=>match});tools.select('pick');
  const first=tools.preview({id:center}),nearest=nearestPatternSite(match,center),orientation=atlasOrientationAt(nearest);
  assert(first.ready);
  // The atlas frame can rotate while the local orientation scalar is unchanged.
  const right=atlasCamera.right,up=cross(atlasCamera.look,right),angle=Math.PI/3;
  atlasCamera.right=right.map((v,k)=>Math.cos(angle)*v+Math.sin(angle)*up[k]);
  assert.equal(world.orient,0);assert.notEqual(atlasOrientationAt(nearest),orientation);
  const second=tools.preview({id:center});
  assert.notStrictEqual(second,first);
  assert.notDeepEqual(second.result.card.offsets,first.result.card.offsets);
  assert.deepEqual(second.result.card.offsets,capturePattern(match,nearest,{orientation:atlasOrientationAt(nearest)}).card.offsets);
  assert.deepEqual([...second.ids].sort((a,b)=>a-b),[...first.ids].sort((a,b)=>a-b));
});
