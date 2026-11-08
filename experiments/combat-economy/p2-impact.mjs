// Draw measured positions, including the counterfactual superposition of two solo runs.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createHeadlessMatch} from '../../src/match/headless.js';
import {stepPose} from '../../src/map/local/oriented-step.js';
import {buildSphere} from '../../src/world/sphere.js';
import {DIR} from '../../src/world/geometry.js';
import {atlasPatterns} from '../../src/patterns/atlas-data.js';
import {decodeRLE} from '../../src/patterns/rle.js';
import {combatDeaths} from './causality.mjs';

const graph=buildSphere(256),origin={id:graph.farthest,ori:0,q:0,r:0,d:0};
const queue=[origin],chart=new Map([[origin.id,origin]]);
for(let i=0;i<queue.length;i++){
  const p=queue[i];if(p.d===40)continue;
  for(let k=0;k<6;k++){
    const n=stepPose(graph,p.id,p.ori,k,1);
    if(!n||chart.has(n.id))continue;
    const a={...n,q:p.q+DIR[k][0],r:p.r+DIR[k][1],d:p.d+1};
    chart.set(n.id,a);queue.push(a);
  }
}
const checkpoints=[0,32,36,38];
function run(firing,defending){
  const m=createHeadlessMatch(graph,{init:1e9,economy:{birthEnergy:0,upkeep:0},
    strategies:new Map([2,3,4,5,6].map(o=>[o,()=>{}]))});
  const seed=id=>decodeRLE(atlasPatterns.find(x=>x.id===id).rle);
  for(const [enabled,o,pts] of [[firing,1,seed('glider').map(([q,r])=>[q-17,r-4])],[defending,2,seed('p2')]]){
    if(enabled)assert(m.commitStamp(o,m.patchForStamp(origin.id,0,pts),false));
  }
  const frames=[];
  let credits=0;
  for(let g=0;g<=38;g++){
    if(g){m.nextTick();credits+=combatDeaths(m.world).filter(e=>e.attackers.length>0).length;}
    if(checkpoints.includes(g))frames.push([1,2,7].flatMap(o=>m.world.ownerCells[o].map(id=>({id,o,...chart.get(id)}))));
  }
  assert.equal(credits,0);
  return frames;
}
const real=run(true,true),ship=run(true,false),target=run(false,true);
const control=ship.map((cells,i)=>[...cells,...target[i]]);
assert.equal(real.at(-1).length,0);
const w=1230,h=509,l=153,dx=264,top=130,dy=150,scale=10.6,ink='#e6eff2',muted='#abbcc4';
const out=[`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">Colisão do glider P4 com o flipper P2</title><desc id="desc">Na geração 38 as duas peças desapareceram na simulação conjunta. Isoladas, as duas continuam vivas. Nenhuma morte individual gerou um crédito por interferência direta.</desc><rect width="100%" height="100%" rx="12" fill="#13222c"/><style>text{font-family:system-ui,sans-serif}</style>`];
function text(x,y,s,size=14,color=muted,weight=450){out.push(`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}">${s}</text>`);}
text(23,29,'HEXOPHAGE   /   COLISÃO NA ESFERA F256',11,'#88dec2',700);
text(23,62,'Um disparo elimina as duas peças e registra zero mortes diretas',26,ink,650);
text(23,90,'Mesmas posições iniciais. A linha de cima reúne as duas execuções isoladas. A de baixo mostra o encontro real.',15);
const colors={1:'#ff9675',2:'#72ddb5',7:'#d3cbdc'};
for(let i=0;i<4;i++){
  const xx=l+dx*i, midX=i===0?-9:0, midY=i===0?-1:1;
  text(xx,118,['G0 · lançamento','G32 · primeira diferença','G36 · o flipper se extingue','G38 · 0,19 s'][i],15,ink,630);
  for(let row=0;row<2;row++){
    const yy=top+dy*row, frame=(row?real:control)[i];
    if(i===0){text(21,yy+50,row?'Com colisão':'Isolados',18,ink,630);text(21,yy+74,row?'um campo':'dois campos');}
    out.push(`<rect x="${xx}" y="${yy}" width="253" height="130" rx="7" fill="#1b2d39" stroke="#445a66"/>`);
    const counts={1:0,2:0,7:0};
    const groups=new Map();
    for(const c of frame){
      if(!groups.has(c.id))groups.set(c.id,{x:xx+125+scale*(c.q+c.r/2-midX),y:yy+53+scale*(c.r*Math.sqrt(3)/2-midY),owners:[]});
      groups.get(c.id).owners.push(c.o);counts[c.o]++;
    }
    for(const {x,y,owners} of groups.values()){
      const vertex=n=>{const a=(n+.5)*Math.PI/3;return [(x+scale*.53*Math.cos(a)).toFixed(1),(y+scale*.53*Math.sin(a)).toFixed(1)].join(',');};
      owners.forEach((o,j)=>{
        const vs=owners.length===1?[0,1,2,3,4,5]:(j?[1,2,3,4]:[4,5,0,1]);
        out.push(`<polygon fill="${colors[o]}" points="${vs.map(vertex).join(' ')}"/>`);
      });
    }
    if(!frame.length)text(xx+71,yy+62,'campo vazio',18,'#d7e2e5');
    text(xx+11,yy+118,`${counts[1]} P4   ·   ${counts[2]} P2   ·   ${counts[7]} neutras`,13,muted,550);
  }
}
text(24,449,'● P4 atacante',13,colors[1],600);text(149,449,'● P2 defensor',13,colors[2],600);text(273,449,'● Neutra',13,colors[7],600);text(407,449,'As contagens indicam células vivas.',13,muted,500);
text(24,484,'A sequência de nascimentos e mortes muda a partir do contato. Até a extinção, o teste causal local credita zero aos dois lados.',16,ink,560);
out.push('</svg>');
writeFileSync(new URL('./p2-impact.svg',import.meta.url),out.join(''));
