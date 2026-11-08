import { patterns } from './catalog.js';
import { decodeRLE } from './rle.js';
import { cycleWindow } from './cycle-economy.js';
import { cancelCycleAnalysis, showCycleAnalysis } from './atlas-cycle-panel.js';
import { DIR } from '../world/geometry.js';
import { game } from '../browser/game.js';
import { world } from '../browser/world-state.js';
import { $ } from '../layout/elements.js';
import { slotIds, assignSlot, selectSlot, registerSlotPicker } from '../deck/slots.js';
import { loadPattern, currentPatternId } from './editor/selection.js';
import { renderDeck } from '../deck/hand.js';

const catalog=patterns.callahan.filter(p=>p.group);
const map=new Map(catalog.map(p=>[p.id,p]));
let targetSlot=0, current=null, cells=new Set(),previous=new Set(),generation=0,timer=null;
let cycleTimer = null;
const at=(q,r)=>q+','+r;
const coords=s=>s.split(',').map(Number);
const fmt=v=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:2});
const el=id=>$(id);
function step(paint = true) {
  if(cells.size>20000) {stop();return;}
  previous=cells;
  const candidate=new Set(cells);
  for(const pos of cells) {
    const [q,r]=coords(pos);
    for(const [dq,dr] of DIR)candidate.add(at(q+dq,r+dr));
  }
  const next=new Set();
  for(const pos of candidate) {
    const [q,r]=coords(pos);let bits=0;
    for(let k=0;k<6;k++)if(cells.has(at(q+DIR[k][0],r+DIR[k][1])))bits|=1<<k;
    if((cells.has(pos)?world.callSurv6:world.callBirth6)[bits])next.add(pos);
  }
  cells=next;generation++;if(paint)draw();
}
function reset() {
  cells=new Set(decodeRLE(current?.rle||'!').map(([q,r])=>at(q,r)));
  previous=new Set(cells);generation=0;draw();
}
function cycleButton() {
  const { length, kind } = cycleWindow(current || {});
  return (kind === 'window' ? '+1 janela' : '+1 ciclo') + ' (' + length + ' ger.)';
}
function advanceCycle() {
  stop();
  const end = generation + cycleWindow(current).length;
  const run = () => {
    const until = performance.now() + 8;
    while (generation < end && cells.size <= 20000 && performance.now() < until) step(false);
    if (generation === end || cells.size > 20000) {
      stop();draw();return;
    }
    el('br-atlas-cycle').textContent = 'Avançando…';
    cycleTimer = setTimeout(run, 0);
  };
  run();
}
function stop() {
  if(cycleTimer !== null) clearTimeout(cycleTimer);
  cycleTimer = null;
  el('br-atlas-cycle').textContent = cycleButton();
  if(timer!==null)clearInterval(timer);timer=null;
  el('br-atlas-play').textContent='▶ Simular';
}
function play() {
  if(timer!==null){stop();return;}
  stop();
  el('br-atlas-play').textContent='⏸ Pausar';
  timer=setInterval(()=>{step();if(cells.size>20000||!cells.size||generation>1800)stop()},170);
}
function choose(p) {
  current=p;stop();reset();renderList();
  el('br-atlas-name').textContent=p.name;
  el('br-atlas-label').textContent=p.period?'P'+p.period:p.group;
  el('br-atlas-description').textContent=
    p.group+' · '+p.cells+' células iniciais · '+p.origin+
    '. A prévia usa a mesma regra Callahan da partida e não modifica seu mundo.';
  renderProperties(p);
}
function renderProperties(p) {
  const { length, kind } = cycleWindow(p);
  const stats=[
    ['Células iniciais',fmt(p.cells)],
    ['Custo atual',fmt(p.cells*game.economy.stampCost)+' energia'],
    [kind==='emission'?'Período nominal do emissor':kind==='window'?'Janela de observação':'Período',length+' ger.'],
    ...(p.period ? [
      ['Nascimentos / ciclo',fmt(p.birthsCycle)],
      ['Mortes / ciclo',fmt(p.deathsCycle)],
      ['Núcleo sempre vivo',fmt(p.stableCore)],
      ['Nascimentos / geração',fmt(p.birthsCycle/p.period)],
      ['Atividade por célula',fmt(p.birthsCycle/(p.period*p.cells))],
    ] : []),
    ['Classe',p.group],
  ];
  el('br-atlas-metrics').replaceChildren();
  for(const [label,value] of stats) {
    const box=document.createElement('div'),a=document.createElement('small'),b=document.createElement('b');
    a.textContent=label;b.textContent=String(value);box.append(a,b);el('br-atlas-metrics').append(box);
  }
  showCycleAnalysis(p, game.economy);
}
function renderList() {
  const query=el('br-atlas-query').value.trim().toLowerCase(),
    group=el('br-atlas-class').value,sort=el('br-atlas-order').value;
  let found=catalog.filter(p=>(!group||p.group===group)&&
    (p.name.toLowerCase().includes(query)||p.id.toLowerCase().includes(query)||p.group.toLowerCase().includes(query)||('p'+p.period).includes(query)||String(p.cells)===query));
  if(sort==='activity')found.sort((a,b)=>(b.period?b.birthsCycle/(b.period*b.cells):0)-(a.period?a.birthsCycle/(a.period*a.cells):0));
  else if(sort==='core')found.sort((a,b)=>b.stableCore-a.stableCore||a.cells-b.cells);
  else if(sort==='period')found.sort((a,b)=>(a.period||Infinity)-(b.period||Infinity)||a.cells-b.cells);
  else found.sort((a,b)=>a.cells-b.cells||a.name.localeCompare(b.name,'pt'));
  const frag=document.createDocumentFragment();
  for(const p of found){
    const btn=document.createElement('button');btn.type='button';
    btn.setAttribute('aria-selected',String(p.id===current?.id));
    const title=document.createElement('strong');title.textContent=p.name;
    const meta=document.createElement('small');meta.textContent=p.cells+' células · '+p.group+(p.period?' · P'+p.period:'');
    btn.append(title,meta);btn.onclick=()=>choose(p);frag.append(btn);
  }
  el('br-atlas-results').replaceChildren(frag);
}
function draw() {
  const canvas=el('br-atlas-canvas');if(!canvas||!canvas.isConnected)return;
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
  const w=Math.max(300,rect.width||520),h=Math.max(190,rect.height||300);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
  c.fillStyle='#0b1929';c.fillRect(0,0,w,h);
  const visible=new Set([...cells,...previous]);
  if(!visible.size) {c.fillStyle='#accbd4';c.fillText('Sem células vivas',20,24);return;}
  let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  for(const pos of visible) {
    const [q,r]=coords(pos),x=Math.sqrt(3)*(q+r/2),y=1.5*r;
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  const size=Math.min(24,(w-42)/(right-left+3),(h-42)/(bottom-top+3));
  const cx=w/2-(left+right)*size/2,cy=h/2-(top+bottom)*size/2;
  const hex=(x,y,color,stroke)=>{
    const a=coords(x),px=cx+Math.sqrt(3)*(a[0]+a[1]/2)*size,py=cy+1.5*a[1]*size;
    if(px<0||px>w||py<0||py>h)return;
    c.beginPath();
    for(let k=0;k<6;k++) {
      const angle=(30+k*60)*Math.PI/180,xp=px+size*.92*Math.cos(angle),yp=py+size*.92*Math.sin(angle);
      if(k)c.lineTo(xp,yp);else c.moveTo(xp,yp);
    }
    c.closePath();if(color){c.fillStyle=color;c.fill()}
    c.lineWidth=1;c.strokeStyle=stroke||'#2b5765';c.stroke();
  };
  for(const pos of previous)if(!cells.has(pos))hex(pos,null,'#e57869',undefined);
  for(const pos of cells)hex(pos,null,previous.has(pos)?'#9bdc83':'#63e2c7');
  const born=[...cells].filter(p=>!previous.has(p)).length;
  const deaths=[...previous].filter(p=>!cells.has(p)).length;
  c.font='12px system-ui';c.fillStyle='#9db9ca';
  c.fillText('Vivas '+cells.size+'   +'+born+' nascimentos   −'+deaths+' mortes',12,18);
  el('br-atlas-gen').textContent='Geração '+generation;
}
export function openAtlasBrowser(slot=0) {
  targetSlot=slot;
  el('br-atlas-slot-label').textContent='Slot '+(slot+1)+' · trocar padrão';
  if(!current||current.id!==slotIds[slot])choose(map.get(slotIds[slot])||catalog[0]);
  else renderProperties(current);
  renderList();
  const dialog=el('br-atlas-dialog');
  if(!dialog.open)dialog.showModal();
  requestAnimationFrame(draw);
}
export function bindAtlasBrowser() {
  registerSlotPicker(openAtlasBrowser);
  el('br-atlas-close').onclick=()=>el('br-atlas-dialog').close();
  for(const id of ['br-atlas-query','br-atlas-class','br-atlas-order'])el(id).addEventListener('input',renderList);
  el('br-atlas-play').onclick=play;
  el('br-atlas-step').onclick=()=>{stop();step()};
  el('br-atlas-cycle').onclick=advanceCycle;
  el('br-atlas-show-economy').onclick=()=>{
    el('br-cycle-heading').focus({preventScroll:true});
    el('br-cycle-heading').scrollIntoView({block:'start'});
  };
  el('br-energy-sliders').addEventListener('input',()=>{
    if(el('br-atlas-dialog').open && current)renderProperties(current);
  });
  el('br-atlas-reset').onclick=()=>{stop();reset()};
  el('br-atlas-choose').onclick=()=>{
    if(!current||!assignSlot(targetSlot,current.id,catalog))return;
    selectSlot(targetSlot);loadPattern(current.id);renderDeck(currentPatternId,loadPattern);
    el('br-atlas-dialog').close();
  };
  el('br-atlas-dialog').addEventListener('close',()=>{stop();cancelCycleAnalysis()});
}
