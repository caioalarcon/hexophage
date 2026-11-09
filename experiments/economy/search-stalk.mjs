// Finite collision census: one incoming P4 glider, one isolated atlas oscillator.
// Run: node experiments/economy/search-stalk.mjs [first-oscillator-index] [count]
// Directions are represented by rotating/reflecting the target in the axial lattice.
import { atlasPatterns } from '../../src/patterns/atlas-data.js';
import { decodeRLE } from '../../src/patterns/rle.js';
import { DIR } from '../../src/world/geometry.js';
import { CALLAHAN } from '../../src/simulation/rules.js';

const width = 512, origin = 256 * width + 256;
const index = (q,r) => origin + q*width + r;
const offsets = DIR.map(([q,r]) => q*width + r);
const size = width*width;
let owner=new Uint8Array(size), nextOwner=new Uint8Array(size);
let age=new Uint16Array(size), nextAge=new Uint16Array(size);
let live=[], nextLive=[];
const masks=new Uint8Array(size), parents=new Uint8Array(size), candidates=[];
function reset() {
  for(const id of live) owner[id]=0;
  live.length=0;
}
function insert(points, player) {
  for(const [q,r] of points) {
    const i=index(q,r);
    if(owner[i]) throw Error('Overlapping seeds');
    owner[i]=player;age[i]=1;live.push(i);
  }
}
function step() {
  for(const i of live){
    const p=owner[i];
    for(let k=0;k<6;k++){
      const j=i-offsets[k];
      if(!masks[j]) { candidates.push(j);parents[j]=p; }
      else if(parents[j]!==p) parents[j]=7;
      masks[j]|=1<<k;
    }
  }
  for(const j of candidates){
    const p=owner[j],mask=masks[j];masks[j]=0;
    if(!CALLAHAN.tables[6][p ? 1 : 0][mask]) continue;
    nextOwner[j]=p||parents[j];nextAge[j]=p?age[j]+1:1;nextLive.push(j);
  }
  candidates.length=0;
  for(const i of live) owner[i]=0;
  live.length=0;
  [owner,nextOwner]=[nextOwner,owner];[age,nextAge]=[nextAge,age];[live,nextLive]=[nextLive,live];
}
function points() {
  return live.map(i=>[Math.floor(i/width)-256, i%width-256]);
}
function phases(p, period) {
  reset();insert(decodeRLE(p.rle),2);
  const out=[];
  for(let k=0;k<period;k++){out.push(points());step();}
  return out;
}
function transform(ps, rotation, mirror) {
  return ps.map(([q,r])=>{
    if(mirror) [q,r]=[q,-q-r];
    for(let k=0;k<rotation;k++) [q,r]=[-r,q+r];
    return [q,r];
  });
}
function core() {
  const totals=[0,0,0,0,0,0,0,0];
  for(const i of live) if(age[i]>=32)totals[owner[i]]++;
  return totals;
}
const gliderPhases=phases(atlasPatterns.find(p=>p.id==='glider'),4);
const start=Number(process.argv[2]||0),count=Number(process.argv[3]||10);
const patterns=atlasPatterns.filter(p=>p.group==='oscilador').slice(start,start+count);
let total=0;
for(const p of patterns) {
  let n=0, hits=0;
  const variants=new Set();
  for(const [targetPhase,base] of phases(p,p.period).entries()){
    for(let mirror=0;mirror<=1;mirror++) for(let spin=0;spin<6;spin++){
      const rotated=transform(base,spin,mirror);
      const x0=Math.min(...rotated.map(v=>v[0])),y0=Math.min(...rotated.map(v=>v[1]));
      const target=rotated.map(([q,r])=>[q-x0,r-y0]);
      const key=target.map(p=>p.join(',')).sort().join(';');
      if(variants.has(key))continue;
      variants.add(key);
      const ymax=Math.max(...target.map(v=>v[1]));
      // At a fixed glider phase, consecutive period copies are two q positions apart.
      for(let x=-13;x<=-12;x++) for(let y=-7;y<=ymax+3;y++) for(let phase=0;phase<4;phase++) {
        const glider=gliderPhases[phase].map(([q,r])=>[q+x,r+y]);
        reset();insert(target,2);insert(glider,1);n++;
        let a,b;
        for(let g=1;g<=160;g++){
          step();
          if(!live.length)break;
          if(g===80){a=core(); if(a[2]+a[7]+a[1]<8) break;}
          if(g===160)b=core();
        }
        if(b&&[1,2,7].some(team=>b[team]>a[team]+20)) {
          hits++;
          console.log(JSON.stringify({id:p.id,targetPhase,spin,mirror,x,y,phase,target,glider,core80:a,core160:b}));
        }
      }
    }
  }
  total+=n;console.error(p.id,n,'growing candidates',hits,'total',total);
}
