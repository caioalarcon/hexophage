// Local hex chart of two measured branches. Render with node duel.mjs.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createHeadlessMatch} from '../../../src/match/headless.js';
import {stepPose} from '../../../src/map/local/oriented-step.js';
import {atlasPatterns} from '../../../src/patterns/atlas-data.js';
import {decodeRLE} from '../../../src/patterns/rle.js';
import {DIR} from '../../../src/world/geometry.js';
import {buildSphere} from '../../../src/world/sphere.js';

const graph=buildSphere(256), origin={id:graph.farthest,ori:0,q:0,r:0,d:0};
const queue=[origin],chart=new Map([[origin.id,origin]]);
for(let i=0;i<queue.length;i++){
  const p=queue[i];if(p.d===145)continue;
  for(let k=0;k<6;k++){
    const n=stepPose(graph,p.id,p.ori,k,1);
    if(!n||chart.has(n.id))continue;
    const item={...n,q:p.q+DIR[k][0],r:p.r+DIR[k][1],d:p.d+1};
    chart.set(n.id,item);queue.push(item);
  }
}
const seed=id=>decodeRLE(atlasPatterns.find(p=>p.id===id).rle);
const branches=[];
for(const [label,rot,dx,dy] of [['Na rota',5,-11,22],['Fora da rota',0,-17,-12]]){
  const idle=new Map([2,3,4,5,6].map(id=>[id,()=>{}]));
  const m=createHeadlessMatch(graph,{init:1e9,economy:{birthEnergy:0,upkeep:0},strategies:idle});
  let ship=seed('glider');for(let i=0;i<rot;i++)ship=ship.map(([q,r])=>[-r,q+r]);
  for(const [o,pts] of [[2,seed('stalk')],[1,ship.map(([q,r])=>[q+dx,r+dy])]]){
    const ids=m.patchForStamp(origin.id,0,pts);
    assert(m.commitStamp(o,ids,false));
    assert.deepEqual(ids.map(id=>[chart.get(id).q,chart.get(id).r]),pts);
  }
  const frames=[];
  for(let t=0;t<=256;t++){
    if(t)m.nextTick();
    if(![0,50,256].includes(t))continue;
    const pixels=[];
    for(const o of [2,7,1])for(const id of m.world.ownerCells[o]){
      const {q,r}=chart.get(id);pixels.push({o,x:q+r/2,y:r*Math.sqrt(3)/2});
    }
    frames.push({t,pixels,live:m.world.ownerCells[2].length});
  }
  branches.push({label,frames});
}
if(process.argv.includes('--bounds')){
 for(const b of branches)for(const f of b.frames){
   const pp=f.pixels.filter(p=>p.o===2);
   console.log(b.label,f.t,f.live, [Math.min(...pp.map(p=>p.x)),Math.max(...pp.map(p=>p.x)),Math.min(...pp.map(p=>p.y)),Math.max(...pp.map(p=>p.y))],f.pixels.filter(p=>p.o!==2).slice(0,1));
 }
}
const width=1100,height=562, left=145, column=308, top=140, row=173, scale=3.62;
const ink='#f0f5fb', muted='#acbdce', border='#384e61', panel='#152433';
const colors={1:'#ff916f',2:'#63dfb4',7:'#c0c6d1'};
const svg=[`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="t d"><title id="t">O percurso do glider muda o destino do crescedor</title><desc id="d">Em duas partidas reais do motor, a trajetória de interceptação deixa 36 células do defensor na geração 256. O disparo fora da rota deixa 228. Os campos usam a mesma escala.</desc><rect width="1100" height="562" rx="9" fill="#0f1b28"/><style>text{font-family:system-ui,-apple-system,sans-serif}</style>`];
function label(x,y,content,size=13,fill=muted,weight=450){
  svg.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">${content}</text>`);
}
label(25,31,'HEXOPHAGE  /  EXPERIMENTO DE COMBATE',12,'#78d8cc',750);
label(25,65,'Um glider pode parar a ponta do crescedor',30,ink,730);
label(26,95,'Esfera f256  ·  200 gerações/s  ·  mesmo crescedor inicial e um glider rival em cada cenário',15);
for(const [i,title] of ['G0  ·  lançamento','G50  ·  0,25 s','G256  ·  1,28 s'].entries())label(left+column*i+7,130,title,15,ink,660);
const hex=(x,y,r)=>{
  const points=Array.from({length:6},(_,n)=>{const a=n*Math.PI/3+Math.PI/6;
    return [(x+r*Math.cos(a)).toFixed(2),(y+r*Math.sin(a)).toFixed(2)].join(',');});
  return points.join(' ');
};
for(const [j,b] of branches.entries()){
  const yy=top+j*row;
  label(24,yy+57,b.label,17,ink,680);
  label(24,yy+80,j?'cresce':'estabiliza',14,j?'#78d8cc':'#ffad90',550);
  for(const [i,f] of b.frames.entries()){
    const xx=left+i*column;
    svg.push(`<rect x="${xx}" y="${yy}" width="300" height="151" rx="6" fill="${panel}" stroke="${border}"/>`);
    let out=0;
    // Rotate the hex chart to put the grower's advancing tip to the right.
    // The same metric and viewport apply to every snapshot.
    for(const p of f.pixels){
      const x=xx+8+scale*(p.y+13), y=yy+8+scale*(p.x+25);
      if(y<yy+2||y>yy+130||x<xx+2||x>xx+298){assert.equal(p.o,1);out++;continue;}
      svg.push(`<polygon points="${hex(x,y,scale/Math.sqrt(3)*0.94)}" fill="${colors[p.o]}"/>`);
    }
    label(xx+10,yy+141,f.live+' células do defensor',12,'#cde3df',600);
    if(out){assert.equal(out,6);label(xx+177,yy+20,'P4 fora do recorte',11,'#ffad90');}
  }
}
svg.push('<circle cx="32" cy="489" r="5" fill="#63dfb4"/><circle cx="208" cy="489" r="5" fill="#ff916f"/>');
label(43,494,'células do defensor');label(219,494,'células do atacante');
label(25,527,'O acerto deixa um oscilador de período 3. Fora da rota, a trilha continua a crescer.',17,ink,620);
label(25,550,'Cada hexágono representa uma célula viva. Todos os quadros usam a mesma escala e orientação.',13);
svg.push('</svg>');
writeFileSync(new URL('./duel.svg',import.meta.url),svg.join(''));
