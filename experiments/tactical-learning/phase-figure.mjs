import { writeFileSync } from 'node:fs';
import { patchForStamp } from '../../src/patterns/spherical-patch.js';

// Only the audit imports this module. Read the two full-sphere branches, then
// draw the same oriented local graph in every frame without extrapolating it.
export function createPhaseFigure(world, order, path, seed) {
  const offsets = [];
  const radius = Math.max(6, order.gap + 3);
  for (let q = -radius; q <= radius; q++)
    for (let r = Math.max(-radius,-q-radius); r <= Math.min(radius,-q+radius); r++)
      offsets.push([q, r]);
  const ids = patchForStamp(world, order.center, order.heading, offsets);
  if (!ids || !ids.includes(order.target)) throw Error('A figura precisa do alvo no disco hexagonal regular.');
  const frames = [];
  const colors = { own:'#168477', rival:'#d36432', other:'#687486', empty:'#edf1f2' };
  const role = id => id === order.owner ? 'own' : id === order.rival ? 'rival' : id ? 'other' : 'empty';
  const xy = offsets.map(([q,r]) => [q+r/2,Math.sqrt(3)*r/2]);
  const number = n => n.toLocaleString('pt-BR');
  const signed = n => (n > 0 ? '+' : '') + number(n);
  function capture(t, immediate, delayed) {
    if (![0,order.phaseOffset,4096].includes(t)) return;
    const pair = [immediate, delayed].map(({world,game}) => ({
      cells:ids.map(id => role(world.owners[id])),
      own:game.players[order.owner-1].reserve, rival:game.players[order.rival-1].reserve,
      ownSites:world.ownerCells[order.owner].length, rivalSites:world.ownerCells[order.rival].length,
    }));
    frames.push({t,pair});
    if (t === 4096) draw();
  }
  function draw() {
    const visible = xy.filter((_,i) => frames.some(f => f.pair.some(b => b.cells[i] !== 'empty')));
    const bound = dim => [Math.min(...visible.map(p=>p[dim]))-1,Math.max(...visible.map(p=>p[dim]))+1];
    const [xmin,xmax] = bound(0), [ymin,ymax] = bound(1);
    const scale = Math.min(22,185/(xmax-xmin+1),120/(ymax-ymin+1));
    const poly = Array.from({length:6},(_,i)=>{
      const a = Math.PI*(i/3+1/6), side = scale/Math.sqrt(3)*.94;
      return (side*Math.cos(a)).toFixed(2)+','+(side*Math.sin(a)).toFixed(2);
    }).join(' ');
    const svg = ['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 850 560" width="850" height="560" role="img" aria-labelledby="title desc">',
      '<title id="title">Lançamento imediato e lançamento uma geração depois em Ashley15</title>',
      '<desc id="desc">As três colunas mostram o mesmo trecho da esfera nas duas simulações. Verde identifica o atacante e laranja o alvo. A faixa inferior compara os saldos finais.</desc>',
      '<rect width="850" height="560" fill="#fafbf8"/>',
      '<style>text{font-family:DejaVu Sans,sans-serif;fill:#203139}.tag{font-size:11px;letter-spacing:1.5px;font-weight:bold}.small{font-size:13px}.muted{fill:#536670}.med{font-size:16px}.strong{font-weight:bold}.title{font-weight:bold;font-size:28px}.value{font-weight:bold;font-size:25px}</style>',
      '<defs><polygon id="hex" points="'+poly+'"/></defs>'];
    function label(x,y,content,cls='small',align='start'){
      svg.push('<text x="'+x+'" y="'+y+'" class="'+cls+'" text-anchor="'+align+'">'+content+'</text>');
    }
    label(30,29,'REPLAY CAUSAL  /  ASHLEY15','tag');
    label(30,62,'O mesmo ataque, uma geração depois','title');
    label(30,88,'rotor126  ·  Semente '+seed+'  ·  Tarifa sugerida  ·  Início na geração '+number(order.proposedAt),'small muted');
    for (const [x,key,name] of [[30,'own','Atacante P'+order.owner],[180,'rival','Alvo P'+order.rival]]) {
      svg.push('<circle cx="'+(x+6)+'" cy="113" r="6" fill="'+colors[key]+'"/>');
      label(x+19,118,name);
    }
    const centers = [266,482,698], rows = [235,383];
    frames.forEach(({t,pair},i) => {
      const cx=centers[i];
      label(cx,155,'G + '+number(t),'med strong','middle');
      pair.forEach(({cells},row) => {
        const cy=rows[row];
        svg.push('<rect x="'+(cx-100)+'" y="'+(cy-65)+'" width="200" height="130" rx="5" fill="white" stroke="#d7dfdc"/>');
        xy.forEach(([x,y],j) => {
          if (x<xmin-.1 || x>xmax+.1 || y<ymin-.1 || y>ymax+.1) return;
          const px=cx+(x-(xmin+xmax)/2)*scale, py=cy+(y-(ymin+ymax)/2)*scale;
          svg.push('<use xlink:href="#hex" x="'+px.toFixed(1)+'" y="'+py.toFixed(1)+'" fill="'+colors[cells[j]]+'"/>');
        });
      });
    });
    label(30,231,'Lançar já','med strong');
    label(30,251,'Compra em G + 0','small muted');
    label(30,378,'Esperar','med strong');
    label(30,398,'Compra em G + '+order.phaseOffset,'small muted');
    svg.push('<rect x="30" y="467" width="790" height="71" rx="6" fill="#e4f1eb"/>');
    const [a,b]=frames.at(-1).pair, own=b.own-a.own, rival=b.rival-a.rival;
    label(47,490,'Efeito da espera na geração +4.096','med strong');
    label(47,516,'Reserva do atacante '+signed(own)+'   ·   Reserva do alvo '+signed(rival)+'   ·   Δ células do alvo '+signed(b.rivalSites-a.rivalSites),'small');
    label(797,506,signed(own-rival),'value','end');
    label(797,524,'vantagem relativa','small muted','end');
    svg.push('</svg>');
    writeFileSync(path,svg.join('\n'));
  }
  return capture;
}
