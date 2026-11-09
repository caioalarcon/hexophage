// P6 launch follows the paid db-151 → farm-4-12 collision lane from the single-rule study.
// Coordinates stay in the hex face of the real icosphere until the projection reaches a defect.
import {resolveRuleProfile} from '../../src/match/rule-profiles.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {patchForStamp} from '../../src/patterns/spherical-patch.js';

const cache = new Map();
const rotate = ([q,r]) => [-r,q+r];
function oriented(points, rotation) {
  for (let k=0;k<rotation;k++) points=points.map(rotate);
  return points;
}
function shape(rule, name) {
  const key=rule+'/'+name;
  if (!cache.has(key)) {
    const {gameplay}=resolveRuleProfile(rule);
    const card=(gameplay.atlas??gameplay.patterns).find(p=>p.id===name);
    if (!card) throw Error('Missing atlas card '+key);
    const points=decodeRLE(card.rle);
    const mean=[0,1].map(k=>Math.round(points.reduce((sum,p)=>sum+p[k],0)/points.length));
    cache.set(key, points.map(([q,r])=>[q-mean[0],r-mean[1]]));
  }
  return cache.get(key);
}

function remoteCenter(graph, anchor, other) {
  const v=graph.coords, a=3*anchor;
  let best=-1, minimum=Infinity;
  const defectDistance=Math.min(8,graph.distance[anchor]);
  for (let i=0;i<graph.n;i++) {
    if (graph.distance[i]<defectDistance) continue;
    const b=3*i;
    let dot=v[a]*v[b]+v[a+1]*v[b+1]+v[a+2]*v[b+2];
    if(other!=null)dot=Math.max(dot,v[3*other]*v[b]+v[3*other+1]*v[b+1]+v[3*other+2]*v[b+2]);
    if (dot<minimum) {best=i;minimum=dot;}
  }
  return best;
}

export function blastScene(graph, rotation=0, lane=-2) {
  const anchor=graph.farthest, remote=remoteCenter(graph,anchor);
  const patch=(center,points)=>patchForStamp({graph},center,0,points);
  function directed(rule,name,delta,gap) {
    const v=oriented([delta],rotation)[0], side=rotate(v).map(Math.sign);
    return patch(anchor,oriented(shape(rule,name),rotation).map(([q,r])=>
      [q-gap*v[0]+lane*side[0],r-gap*v[1]+lane*side[1]]));
  }
  const launch=gap=>directed('hex-b2s245','db-151',[1,-2],gap);
  const launchAndreen=gap=>directed('andreen','bagley-sym-glider',[2,0],gap);
  const middle=remoteCenter(graph,anchor,remote);
  return {anchor, remote, middle, launch, launchAndreen, middleFarm:patch(middle,shape('hex-b2s245','farm-4-12')), middleBays:patch(middle,shape('bays','poly-3fdc3dd6')), targetBays:patch(anchor, shape('bays','poly-3fdc3dd6')),
    targetFarm:patch(anchor,shape('hex-b2s245','farm-4-12')),
    smallFarm:patch(remote,shape('hex-b2s245','farm-4-12')),largeFarm:patch(remote,shape('hex-b2s245','farm-18-66'))};
}
