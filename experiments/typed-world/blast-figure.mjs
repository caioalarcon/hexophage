// Draw two-coordinate Hammer projections of the actual sparse spherical state, not an artist's wave.
import {writeFileSync} from 'node:fs';
import {simulateBlast} from './blast.mjs';
import {cross,normal,pointOnSphere,vdot} from '../../src/world/geometry.js';

const times=[8,80,180,512], svg=[], colors=['#5be1eb','#ff8596','#7be3a2','#ffcd59'];
const txt=(x,y,t,cls='note')=>svg.push('<text x="'+x+'" y="'+y+'" class="'+cls+'">'+t+'</text>');
svg.push('<svg xmlns="http://www.w3.org/2000/svg" width="1070" height="552" viewBox="0 0 1070 552" role="img" aria-labelledby="title desc">',
'<title id="title">O alcance da antimatéria depende da reserva</title><desc id="desc">Oito estados medidos da mesma esfera F16, em duas partidas. Com 16 mil créditos a explosão se extingue. Com um milhão visita cada posição, incluindo a base do atacante.</desc>',
'<style>text{font-family:system-ui,sans-serif;fill:#e8f1f5}.title{font-size:24px;font-weight:650}.subtitle{font-size:14px;fill:#bacad6}.label{font-size:13px;font-weight:650}.note{font-size:12px;fill:#b6c7d4}.num{font-size:13px;fill:#f2f6f9}</style>',
'<rect width="1070" height="552" rx="12" fill="#101a24"/>');
txt(25,40,'Antimatéria em uma esfera de 2.562 células','title');
txt(25,66,'A mesma nave P6 encontra um núcleo de Bays. O atacante tem uma fazenda entre esse núcleo e o terceiro jogador.','subtitle');
const legend=['Atacante','Alvo de Bays','Terceira colônia','Onda B2/S245'];
for(let j=0;j<4;j++){const x=28+j*182;svg.push('<circle cx="'+x+'" cy="92" r="4" fill="'+colors[j]+'"/>');txt(x+10,97,legend[j]);}
for(const [r,bank] of [16000,1000000].entries()){
  const rowY=120+r*190;
  const fmt=n=>n.toLocaleString('pt-BR');
  const result=simulateBlast({F:16,treasury:bank,farm:'small',observer:true,horizon:512},(g,m,graph,scene,now)=>{
    const i=times.indexOf(g);if(i<0)return;
    const x=148+i*265,y=rowY+91,W=116,H=58;
    const anchor=pointOnSphere(graph,scene.anchor), middle=pointOnSphere(graph,scene.middle);
    // Rotate an orthonormal basis so the antipodal rival camps straddle the map centre.
    const pole=normal(cross(anchor,middle)), centre=normal(anchor.map((v,k)=>v+middle[k]));
    const east=normal(cross(pole,centre));
    function project(site){
      const p=pointOnSphere(graph,site), lat=Math.asin(Math.max(-1,Math.min(1,vdot(p,pole)))),lon=Math.atan2(vdot(p,east),vdot(p,centre));
      const factor=Math.sqrt(1+Math.cos(lat)*Math.cos(lon/2));
      return [x+W*Math.cos(lat)*Math.sin(lon/2)/factor,y-H*Math.sin(lat)/factor];
    }
    svg.push('<ellipse cx="'+x+'" cy="'+y+'" rx="'+W+'" ry="'+H+'" fill="#1e2c39" stroke="#587080" stroke-width="0.8"/>');
    const paths=['','','',''];
    for(const [id,c] of m.cells){
      const [a,b]=project(id);
      paths[c.wave?3:c.owner-1]+='M'+a.toFixed(1)+' '+b.toFixed(1)+'h.1';
    }
    paths.forEach((d,j)=>{if(d)svg.push('<path d="'+d+'" fill="none" stroke="'+colors[j]+'" stroke-width="3.2" stroke-linecap="round"/>');});
    txt(x-W,y-H-6,'G+'+g,'label');
    txt(x-W,y+H+20,fmt(now.wave)+' vivas na onda','num');
  });
  txt(26,rowY,fmt(bank)+' créditos iniciais · '+fmt(result.everWave)+' posições visitadas pela onda até G+512','label');
}
txt(25,510,'G+0 é o lançamento. Cada ponto representa uma célula viva naquele instante. As posições visitadas somam a trajetória inteira.','note');
txt(25,531,'As três colônias pagaram pelos carimbos. Composição, direção, sementes, preços e saldo dos dois adversários são iguais nas duas partidas.','note');
svg.push('</svg>');writeFileSync(new URL('./blast-map.svg',import.meta.url),svg.join('\n')+'\n');
