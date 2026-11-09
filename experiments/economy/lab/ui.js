import { rules, policies } from '../scenarios.js';
import { HORIZON, RATE, simulate } from '../simulator.js';

const el = id => document.getElementById(id);
const profiles = new Map(CALIBRATED_PROFILES.map(p => [p.id,p]));
const num = new Intl.NumberFormat('pt-BR',{ maximumFractionDigits:2 });
const compact = new Intl.NumberFormat('pt-BR',{ notation:'compact',maximumFractionDigits:2 });
const shown = n => Number.isFinite(n) ? num.format(n) : '∞';
const short = n => n >= 1000000 ? compact.format(n) : shown(n);
const when = g => {
  const s = g/RATE;
  return s < 60 ? shown(s)+' s' : shown(s/60)+' min';
};
const variable = {
  price:['Preço base · energia/célula',0.001],
  fieldDoubling:['População própria para dobrar o preço marginal · células',0.01],
  sizeDoubling:['Tamanho adicional para dobrar o preço marginal · células',0.01],
  manaInterval:['Intervalo de produção de mana · gerações',1],
  orderDoubling:['Compras para dobrar o preço em mana',0.01],
  halfLife:['Meia-vida das reservas · gerações',1],
  energyHalfLife:['Meia-vida da energia · gerações',1],
  energyOrderDoubling:['Compras para dobrar o preço em energia',0.01],
  pressureHalfLife:['Meia-vida do plantio recente · gerações',1],
  fixedTaxScale:['Divisor do custo extra do núcleo · células',0.01],
  battery:['Energia por unidade de log₂(1 + núcleo)',0.01],
};
const phases = {investing:'Reinvestimento',saving:'Poupança escolhida','order-limit':'Limite da medição',
  'parked-after-limit':'Poupança após limite','first-deficit':'Primeiro déficit'};
let result, activeRule;
function fill(select,items) {
  select.replaceChildren(...items.map(([key,title]) => new Option(title,key)));
}
fill(el('rule'),rules.map(r=>[r.id,r.name]));
fill(el('policy'),[...policies.map(p=>[p.id,p.name]),['custom','Montar minha sequência']]);
const patterns = [...profiles.values()].map(p=>[p.id,p.name+' · '+p.cells+' células']);
fill(el('pattern'),patterns);
fill(el('second'),[['','Nenhum'],...patterns]);
el('pattern').value='glider';
el('policy').value='mixed';
el('rule').value=rules.some(r=>r.id==='battery')?'battery':rules[0].id;

function preset() { return rules.find(r=>r.id===el('rule').value); }
function renderInputs() {
  const r = preset();
  const statements = [];
  if (r.pressureHalfLife) statements.push('O preço sobe com as células plantadas pelo dono e volta a cair conforme esse plantio envelhece.');
  else if (r.fieldDoubling) statements.push('O preço acompanha a população viva do dono.');
  if (r.sizeDoubling) statements.push('O preço marginal cresce a cada célula do mesmo carimbo.');
  if (r.manaStorage === 'core') statements.push('O núcleo produz e armazena mana com retorno decrescente.');
  else if (r.manaInterval) statements.push('O núcleo imóvel produz mana.');
  if (r.orderDoubling) statements.push('Cada compra encarece as seguintes em mana.');
  if (r.energyOrderDoubling) statements.push('O preço em energia aumenta com cada carimbada já paga.');
  if (r.fixedTaxScale) statements.push('O núcleo paga manutenção extra proporcional a C × (C − 1), sendo C a quantidade de células fixas.');
  if (r.battery) statements.push('A reserva de energia também tem um teto que cresce com o núcleo. A produção que excede esse teto se perde.');
  if (r.halfLife || r.energyHalfLife) statements.push('Há perda de reservas ao longo do tempo.');
  el('formula').textContent=statements.join(' ') || 'Cada célula carimbada custa o mesmo valor em energia.';
  el('params').replaceChildren();
  for (const [key,[label,min]] of Object.entries(variable)) {
    if (r[key] == null) continue;
    const field=document.createElement('label'), input=document.createElement('input');
    field.append(key === 'fieldDoubling' && r.pressureHalfLife ? 'Plantio recente para dobrar o preço marginal · células' : label,input);
    Object.assign(input,{type:'number',step:'any',min:String(min),max:'1000000000000',value:r[key],required:true});
    input.dataset.key=key;
    el('params').append(field);
  }
}
function showPolicy() {
  const custom=el('policy').value==='custom';
  el('custom').hidden=!custom;
  el('seeds').disabled=!custom;
  const indexes=[el('pattern').value,el('second').value].filter(Boolean);
  el('profile-note').textContent=indexes.map(id=>{
    const p=profiles.get(id);
    return p.name+' · saldo médio da primeira janela '+shown(p.net+p.netSlope*(p.window-1)/2)+' energia/geração'+
      (p.emitter?' · capital de giro '+shown(p.runway):'');
  }).join(' / ');
}
function selectedPolicy() {
  const id=el('policy').value;
  if (id!=='custom') return policies.find(p=>p.id===id);
  const repeat=[el('pattern').value,el('second').value].filter(Boolean);
  const seeds=Number(el('seeds').value);
  return {id,name:seeds+' flipper(s) P2 → '+repeat.map(id=>profiles.get(id).name).join(' + '),
    start:Array(seeds).fill('p2'),repeat,fundGun:el('fund').checked};
}

function renderChart(rows,key) {
  const svg=el('chart'), ns='http://www.w3.org/2000/svg';
  svg.replaceChildren();
  function append(tag,attrs,label) {
    const node=document.createElementNS(ns,tag);
    for (const [k,v] of Object.entries(attrs)) node.setAttribute(k,v);
    if(label!=null) node.textContent=label;
    svg.append(node);return node;
  }
  const left=51, right=625, top=16, bottom=202;
  const max=Math.max(1,...rows.map(p=>p[key]).filter(Number.isFinite));
  const decades=Math.max(1,Math.ceil(Math.log10(1+max)));
  const domain=Math.max(1, rows.at(-1)?.g ?? HORIZON);
  const x=g=>left+(right-left)*g/domain;
  const y=v=>bottom-(bottom-top)*Math.log10(1+Math.max(0,v))/decades;
  for (let d=0;d<=decades;d+=Math.max(1,Math.ceil(decades/5))) {
    const val=d===0?0:10**d, height=Math.max(top,y(val));
    append('line',{x1:left,x2:right,y1:height,y2:height,class:'grid'});
    append('text',{x:left-8,y:height+4,'text-anchor':'end'},val>=1e7?'10^'+d:short(val));
  }
  for (const fraction of [0,.25,.5,.75,1]) append('text',{x:x(fraction*domain),y:225,'text-anchor':fraction===0?'start':fraction===1?'end':'middle'},when(Math.round(fraction*domain)));
  let previous;
  for (const point of rows) {
    if(!Number.isFinite(point[key])) continue;
    const parked=point.status==='parked-after-limit';
    const color=parked?'#f6c983':'#78edc1';
    if(previous) append('line',{x1:x(previous.g),y1:y(previous[key]),x2:x(point.g),y2:y(point[key]),stroke:color,
      'stroke-width':2,'stroke-dasharray':parked?'5 4':'none'});
    const dot=append('circle',{cx:x(point.g),cy:y(point[key]),r:3.5,fill:color});
    const title=document.createElementNS(ns,'title');
    title.textContent=when(point.g)+' · '+shown(point[key]);dot.append(title);
    previous=point;
  }
}

function renderResults() {
  const r=result;
  el('show-parked').hidden=r.stop==null;
  const showProjection=el('parked').checked && r.stop!=null;
  const rows=r.checkpoints.filter(point=>showProjection || r.stop==null || point.g<=r.stop);
  const last=rows.at(-1), hasParked=last.g>r.stop && r.stop!=null;
  const status=el('status');
  if(r.stop!=null) {
    status.textContent='10.000 compras em '+when(r.stop)+' (geração '+shown(r.stop)+'). A expansão observada termina aqui.'+
      (showProjection?' Depois dessa marca, as ordens ficam suspensas para projetar a poupança.':' Os saldos abaixo vão até essa marca.')+
      (showProjection && r.firstInsolvent!=null?' A poupança projetada também encontrou déficit em '+when(r.firstInsolvent)+'.':'');
  } else if(r.firstInsolvent!=null) {
    status.textContent='Déficit de '+shown(last.shortfall)+' de energia em '+when(r.firstInsolvent)+' (geração '+shown(r.firstInsolvent)+'). A medição termina antes de a erosão alterar o padrão.';
  } else if(!r.orders) status.textContent='A estratégia não conseguiu plantar sua primeira estrutura com a reserva de abertura. Nenhuma compra em duas horas.';
  else status.textContent='Duas horas completas. A sequência realizou '+shown(r.orders)+' carimbadas.'+
      (r.buyThrough<HORIZON?' A fase de poupança começou após '+when(r.buyThrough)+'.':'');
  if(activeRule.battery && last.overflow>0) status.textContent+=' A bateria descartou '+short(last.overflow)+' de energia até esse instante.';
  if(r.breachedMap!=null && r.breachedMap<=last.g) status.textContent+=' A população projetada atingiu o tamanho do mapa F320 em '+when(r.breachedMap)+'.';
  status.className=r.stop!=null || r.firstInsolvent!=null || !r.orders?'warning':'';
  el('metrics').replaceChildren();
  const metrics=[['Carimbadas',last.orders],['Flippers compráveis',last.burst],['Energia',last.bank],['Mana',activeRule.manaInterval?last.mana:null]];
  for(const [label,value] of metrics) {
    const box=document.createElement('div'), small=document.createElement('small'), strong=document.createElement('strong');
    box.className='metric';small.textContent=label;strong.textContent=value==null?'—':short(value);
    strong.title=(value==null?'Regra sem mana':shown(value))+' · '+when(last.g)+(hasParked?' · poupança projetada':'');
    box.append(small,strong);el('metrics').append(box);
  }
  if(hasParked) el('caption').textContent='Reservas com compras suspensas';
  else el('caption').textContent='Trajetória da economia';
  const key=el('metric').value;
  let plot=rows;
  if(key==='orders') {
    // Milestones are exact purchase counts, including ones before the first minute.
    const extra=Object.entries(r.marks).map(([orders,g])=>({ orders:Number(orders),g }));
    plot=[...extra,...rows].sort((a,b)=>a.g-b.g || a.orders-b.orders);
  }
  renderChart(plot,key);
  el('records').replaceChildren();
  for (const point of rows) {
    const row=document.createElement('tr');
    const cells=[when(point.g),shown(point.orders),shown(point.bank),activeRule.manaInterval?shown(point.mana):'—',shown(point.burst),shown(point.gunBurst),phases[point.status]||point.status];
    for(const text of cells) { const cell=row.insertCell();cell.textContent=text; }
    row.lastChild.className=point.status==='parked-after-limit'?'parked':'';
    el('records').append(row);
  }
}
async function run(event) {
  event?.preventDefault();
  if(!el('settings').reportValidity()) return;
  const rule={...preset()}, policy=selectedPolicy();
  for(const input of el('params').querySelectorAll('input')) rule[input.dataset.key]=Number(input.value);
  const shipLife=Number(el('life').value), buyThrough=Number(el('buy').value)*60*RATE;
  const selected=[el('life').selectedOptions[0].text,el('buy').selectedOptions[0].text];
  el('run').disabled=true;
  el('changes').textContent='Calculando…';
  await new Promise(resolve=>setTimeout(resolve,20));
  try {
    result=simulate(profiles,rule,policy,{shipLife,buyThrough});
    activeRule=rule;
    el('parked').checked=false;
    el('scenario').textContent=[rule.name,policy.name,'Sobrevida de naves — '+selected[0],selected[1]].join(' · ');
    el('changes').textContent='';
    renderResults();
  } catch(error) { el('changes').textContent='Falha ao calcular. '+error.message; }
  finally { el('run').disabled=false; }
}
el('rule').addEventListener('change',renderInputs);
for(const id of ['policy','pattern','second']) el(id).addEventListener('change',showPolicy);
el('settings').addEventListener('input',()=>{el('changes').textContent='Há alterações. Rode a simulação para atualizar os resultados.';});
el('settings').addEventListener('submit',run);
for(const id of ['metric','parked']) el(id).addEventListener('change',()=>{ if(result) renderResults(); });
renderInputs(); showPolicy(); run();
