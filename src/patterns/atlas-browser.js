import { surveyScores } from './survey-scores.js';
import { decodeRLE } from './rle.js';
import { advancePattern, patternOffset, seedPatternAges } from './planar-simulation.js';
import { cycleWindow } from './cycle-economy.js';
import { cancelCycleAnalysis, showCycleAnalysis } from './atlas-cycle-panel.js';
import { game } from '../browser/game.js';
import { world } from '../browser/world-state.js';
import { $ } from '../layout/elements.js';
import { slotIds, assignSlot, selectSlot, registerSlotPicker } from '../deck/slots.js';
import { loadPattern, currentPatternId } from './editor/selection.js';
import { renderDeck } from '../deck/hand.js';

let catalog = [];
let targetSlot=0, current=null, cells=new Map(),previous=new Map(),generation=0,timer=null;
let cycleTimer = null;
const fmt=v=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:2});
const el=id=>$(id);
function step(paint = true) {
  if(cells.size>20000) {stop();return;}
  previous=cells;
  cells=advancePattern(cells, 1, world.physics).next;generation++;if(paint)draw();
}
function reset() {
  cells=seedPatternAges(current ?? {rle:'!'});
  previous=cells;generation=0;draw();
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
  timer=setInterval(()=>{step();if(cells.size>20000||(!cells.size&&!world.physics.tables[6][0][0])||generation>1800)stop()},170);
}
function choose(p) {
  current=p;stop();reset();renderList();
  el('br-atlas-name').textContent=p.name;
  el('br-atlas-label').textContent=p.period?'P'+p.period:p.group;
  el('br-atlas-description').textContent = [p.group, p.cells+' células iniciais', p.origin,
    world.physics.tables[6][0][0] ? 'Toro finito · cinza = neutras' : '']
    .filter(Boolean).join(' · ');
  renderProperties(p);
}
function renderProperties(p) {
  const { length, kind } = cycleWindow(p);
  const stats=[
    ['Células iniciais',fmt(p.cells)],
    ['Custo atual',fmt(p.cells*game.economy.stampCost)+' energia'],
    [kind==='emission'?'Período nominal do emissor':kind==='window'?'Janela de observação':'Período',length+' ger.'],
    ...(p.period && Number.isFinite(p.birthsCycle) ? [
      ['Nascimentos / ciclo',fmt(p.birthsCycle)],
      ['Mortes / ciclo',fmt(p.deathsCycle)],
      ['Núcleo sempre vivo',fmt(p.stableCore)],
      ['Nascimentos / geração',fmt(p.birthsCycle/p.period)],
      ['Atividade por célula',fmt(p.birthsCycle/(p.period*p.cells))],
    ] : []),
    ...(p.survey ? [
      ['Fluxo/g · estabilidade padrão · G897–1024',p.survey[0] === null ? 'Incompleto' : fmt(p.survey[0])],
      ['Compras · 4 partidas F32 de aprendizes',p.survey[1] ?? 'Fora do raio mental'],
    ] : []),
    ...(p.settledCells ? [['Formação estável','G'+p.transient+' · '+p.settledCells+' células']] : []),
    ['Classe',p.group],
  ];
  el('br-atlas-metrics').replaceChildren();
  for(const [label,value] of stats) {
    const box=document.createElement('div'),a=document.createElement('small'),b=document.createElement('b');
    a.textContent=label;b.textContent=String(value);box.append(a,b);el('br-atlas-metrics').append(box);
  }
  showCycleAnalysis(p, game.economy, world.physics);
}
function renderList() {
  const query=el('br-atlas-query').value.trim().toLowerCase(),
    group=el('br-atlas-class').value,sort=el('br-atlas-order').value;
  let found=catalog.filter(p=>(!group||p.group===group)&&
    (p.name.toLowerCase().includes(query)||p.id.toLowerCase().includes(query)||p.group.toLowerCase().includes(query)||('p'+p.period).includes(query)||String(p.cells)===query));
  if(sort==='survey-flow' || sort==='survey-buys') {
    const i=sort==='survey-flow'?0:1;
    const score=p=>p.survey?.[i] ?? -Infinity;
    found.sort((a,b)=>score(b)-score(a)||a.cells-b.cells);
  } else if(sort==='activity') {
    const activity=p=>p.period && Number.isFinite(p.birthsCycle) ? p.birthsCycle/(p.period*p.cells) : -1;
    found.sort((a,b)=>activity(b)-activity(a)||a.cells-b.cells);
  }
  else if(sort==='core')found.sort((a,b)=>(b.stableCore??-1)-(a.stableCore??-1)||a.cells-b.cells);
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
  el('br-atlas-gen').textContent='Geração '+generation;
  const visible=new Set([...cells.keys(),...previous.keys()]);
  if(!visible.size) {c.fillStyle='#accbd4';c.fillText('Sem células vivas',20,24);return;}
  let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  for(const pos of visible) {
    const [q,r]=patternOffset(pos),x=Math.sqrt(3)*(q+r/2),y=1.5*r;
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  const size=Math.min(24,(w-42)/(right-left+3),(h-42)/(bottom-top+3));
  const cx=w/2-(left+right)*size/2,cy=h/2-(top+bottom)*size/2;
  const hex=(position,color)=>{
    const a=patternOffset(position),px=cx+Math.sqrt(3)*(a[0]+a[1]/2)*size,py=cy+1.5*a[1]*size;
    if(px<0||px>w||py<0||py>h)return;
    c.beginPath();
    for(let k=0;k<6;k++) {
      const angle=(30+k*60)*Math.PI/180,xp=px+size*.92*Math.cos(angle),yp=py+size*.92*Math.sin(angle);
      if(k)c.lineTo(xp,yp);else c.moveTo(xp,yp);
    }
    c.closePath();c.fillStyle=color;c.fill();
    c.lineWidth=1;c.strokeStyle='#2b5765';c.stroke();
  };
  for(const pos of previous.keys())if(!cells.has(pos))hex(pos,'#e57869');
  for(const pos of cells.keys())hex(pos,cells.get(pos)<0?'#758597':previous.has(pos)?'#9bdc83':'#63e2c7');
  const born=[...cells.keys()].filter(p=>!previous.has(p)).length;
  const deaths=[...previous.keys()].filter(p=>!cells.has(p)).length;
  c.font='12px system-ui';c.fillStyle='#9db9ca';
  c.fillText('Vivas '+cells.size+'   +'+born+' nascimentos   −'+deaths+' mortes',12,18);
}
export function syncAtlasCatalog(gameplay) {
  const dialog = el('br-atlas-dialog');
  if (dialog.open) dialog.close();
  stop();
  cancelCycleAnalysis();
  current = null;
  catalog = (gameplay.atlas ?? gameplay.patterns).map(p => ({
    ...p, group: p.group || 'semente', cells: p.cells ?? decodeRLE(p.rle).length,
    survey: surveyScores[game.profile.id]?.[p.id],
  }));
  el('br-atlas-heading').textContent = 'Atlas · ' + game.profile.label + ' · ' + catalog.length + ' estruturas';
  el('br-atlas-query').value = '';
  const order = el('br-atlas-order');
  const hasSurvey = !!surveyScores[game.profile.id];
  for (const option of order.options) if (option.value.startsWith('survey-')) option.disabled = !hasSurvey;
  if (!hasSurvey && order.value.startsWith('survey-')) order.value = 'cost';
  const groups = el('br-atlas-class');
  groups.replaceChildren(new Option('Todos', ''));
  for (const group of new Set(catalog.map(p => p.group))) groups.add(new Option(group, group));
  el('br-open-atlas').disabled = !catalog.length;
}
export function openAtlasBrowser(slot=0) {
  if (!catalog.length) return;
  targetSlot=slot;
  el('br-atlas-slot-label').textContent='Slot '+(slot+1)+' · trocar padrão';
  if(!current||current.id!==slotIds[slot])choose(catalog.find(p => p.id === slotIds[slot]) || catalog[0]);
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
