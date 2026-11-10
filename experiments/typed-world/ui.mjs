import {setupPanel,contestMeter,ballotNames} from './general/panel.mjs';
import {defaultEconomy} from './engine.mjs';
import {cards,rules,resolverNames,footprint} from './catalog.mjs';
import {prepareArena,sceneNames,defaultsFor,isCrossing} from './arena.mjs';
import {createBoard,ruleColors} from './board.mjs';
import {createPilot} from './pilots.mjs';
import {createTacticalDuel} from './pr10-controller.mjs';

const el=id=>document.getElementById(id), names=['','Jade','Cobre','Cobalto'];
const num=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1});
const options=(id,mapping)=>{for(const [key,text] of Object.entries(mapping))el(id).add(new Option(text,key));};
const params=new URLSearchParams(location.search);
const arbPanel=setupPanel(params);
const querySeed=params.get('seed');
const seed=querySeed!==null && /^\d{1,10}$/.test(querySeed) && Number(querySeed)<=0xffffffff?Number(querySeed):undefined;
const specs={stampCost:'Custo por célula plantada',birthCost:'Custo por nascimento',eraseCost:'Custo por célula apagada',
  stableEnergy:'Renda por célula madura',stableAfter:'Idade de maturação',productionScale:'Escala de saturação',
  blastBirthCost:'Custo por nascimento da onda',salvage:'Crédito por célula liquidada',
  guardMultiplier:'Multiplicador contra guarda',guardStampExtra:'Adicional por célula de guarda',protectedMature:'Células maduras protegidas de liquidação'};
const tips={contact:'A vizinhança material participa da física herdada.',guard:'Com dois apoios, encarece a substituição. Nos vetos originais também bloqueia a travessia.',
  phase:'Voa na sua linhagem e paga pelas substituições aprovadas.',antimatter:'Ao tocar outro tipo aliado ou um inimigo, tenta acender uma onda B2/S245.'};
const labels=Object.fromEntries(Object.entries(rules).map(([id,r])=>[id,r.label]));
options('rule',labels);options('resolver',resolverNames);options('scene',sceneNames);
for(let i=0;i<6;i++)el('angle').add(new Option(i*60+'°',i));
for(const [source,rule] of Object.entries(rules)){
  const group=document.createElement('optgroup');group.label=rule.label;
  for(const [key,c] of cards)if(c.source===source)group.append(new Option(c.name,key));
  el('pattern').append(group);
}
for(const [key,label] of Object.entries(specs)){
  const tag=document.createElement('label'),input=document.createElement('input');
  tag.textContent=label;input.type='number';input.id=key;input.min='0';input.step=key==='stableAfter'?'1':'any';
  input.value=defaultEconomy[key]??0;tag.append(input);el('tariffs').append(tag);
}
const selector=document.createElement('select');selector.id='frequency';
for(const f of [16,24,32,48,64])selector.add(new Option('F'+f+' · '+num.format(10*f*f+2)+' células',f));
const area=document.createElement('label');area.textContent='Esfera';area.append(selector);el('tariffs').append(area);
selector.value='32';
let meter,tactical,world,view,center,hover=-1,timer=0,pilots=[],finish,drive,armed,verdict='',lastEvent='';
let owners=[],retired=new Set(),touched=new Set(),colonyEnd='',terminalWallet='',launchGen=0;
function chooseStamp(key,resolver){
  el('pattern').value=key;el('rule').value=cards.get(key).source;el('resolver').value=resolver;
}
function stop(){clearInterval(timer);timer=0;el('play').textContent='Simular';}
function owned(){
  const pop=[0,0,0,0],wave=[0,0,0,0];
  for(const c of world.match.cells.values()){pop[c.owner]++;if(c.wave)wave[c.owner]++;}
  return {pop,wave};
}
function clockVictory(){
  const m=world.match,{pop,wave}=owned();
  if(owners.length<2)return;
  if(!armed && owners.every(i=>pop[i]>wave[i]))armed=true;
  if(!armed)return;
  if(finish==='field')for(const i of owners)if(pop[i]===wave[i])retired.add(i);
  const decide=alive=>alive.length>1?'':(alive.length?names[alive[0]]:'Empate')+' · G'+m.gen;
  colonyEnd ||= decide(owners.filter(i=>pop[i]>wave[i]));
  terminalWallet ||= decide(owners.filter(i=>!m.players[i].out));
  verdict=finish==='wallet'?terminalWallet:finish==='field'?colonyEnd:'';
  if(verdict)stop();
}
function generation(){
  if(verdict)return;
  const m=world.match, previous=m.cells, prior=tactical?m.players.map(p=>p&&{...p}):null;
  m.step();
  for(const [site,c] of m.cells)if(c.wave)touched.add(site);
  if(world.restock && el('restock').checked && !retired.has(2))world.restock();
  if(m.lastIgnitions.length)lastEvent='Ignição em G'+m.gen+' · '+names[m.lastIgnitions[0].owner];
  clockVictory();
  if(tactical){
    if(!verdict)tactical.turn(previous,prior);
    return;
  }
  if(verdict || drive==='manual'||m.gen%32)return;
  for(const i of (Math.floor(m.gen/32)%2?owners:[...owners].reverse())){
    if(!pilots[i] || m.players[i].out || retired.has(i) || (drive==='opponent'&&i===1))continue;
    const order=pilots[i](m,i);
    if(order)lastEvent='G'+m.gen+' · '+names[i]+' plantou '+cards.get(order.rule+'/'+order.id).name+' · '+resolverNames[order.resolver];
  }
  clockVictory();
}
function current(){
  const key=el('pattern').value,role=el('resolver').value,owner=Number(el('owner').value);
  const ids=hover<0?[]:footprint(world.graph,key,hover,Number(el('angle').value));
  return {owner,rule:el('rule').value,role,key,ids,valid:world.match.canStamp(owner,el('rule').value,role,ids,el('ballot').value)};
}
function paint(){
  if(!world)return;
  const m=world.match,{owner,role,key,ids,valid}=current();
  const byRule=el('colorby').value==='rule';
  view.draw(m,center,Number(el('zoom').value),ids,valid,touched,byRule,meter?.selected?.site);
  const legend=el('legend');legend.hidden=!byRule;
  if(byRule){
    const active=[...new Set(Array.from(m.cells.values(),c=>c.wave?'wave':c.rule))].sort();
    if(legend.dataset.keys!==active.join(',')){
      legend.dataset.keys=active.join(',');
      legend.replaceChildren(...active.map(rule=>{
        const tag=document.createElement('span');
        tag.style.setProperty('--ink',ruleColors[rule]??'#d67af5');
        tag.textContent=rule==='wave'?'Onda B2/S245':labels[rule].split(' · ')[0];
        return tag;
      }));
    }
  }
  el('gen').textContent='G'+m.gen+(launchGen && world.scene!=='physical'?' · disparo +'+(m.gen-launchGen):'');el('verdict').textContent=verdict;
  el('play').disabled=el('step').disabled=el('many').disabled=!!verdict;
  el('tip').textContent=tips[role];
  el('quote').textContent='Plantio ◈ '+num.format(cards.get(key).offsets.length*(m.economy.stampCost+(role==='guard'?m.economy.guardStampExtra:0)))+' · '+names[owner];
  const {pop,wave}=owned();
  el('accounts').replaceChildren();
  for(const i of owners){
    const p=m.players[i],line=document.createElement('div');line.className='wallet';
    const name=document.createElement('strong');name.className=['','jade','cobre','cobalto'][i];name.textContent=names[i];
    const reserve=document.createElement('span');reserve.textContent='◈ '+num.format(p.reserve);
    const field=document.createElement('small');field.textContent=pop[i]+' células';line.append(name,reserve,field);
    line.title=wave[i]+' células de onda · '+num.format(p.income)+' de renda acumulada';el('accounts').append(line);
  }
  el('damage').textContent='Baixas inimigas diretas '+m.players.slice(1).map(p=>p.erased).join(' / ')+
    ' · Baixas amigas '+m.players.slice(1).map(p=>p.friendlyErased).join(' / ')+
    ' · Células liquidadas '+m.players.slice(1).map(p=>p.eroded).join(' / ');
  el('coverage').textContent='Onda · '+num.format(touched.size)+' / '+num.format(world.graph.n)+' locais'+
    (colonyEnd?' · Última colônia: '+colonyEnd:'')+(terminalWallet?' · Último solvente: '+terminalWallet:'');
  if(isCrossing(world.scene)){
    let ship=0,grower=0;
    for(const c of m.cells.values()){
      if(c.rule==='bays'&&c.resolver==='phase')ship++;
      if(c.rule==='callahan'&&c.resolver==='contact')grower++;
    }
    el('coverage').textContent='Linhagens · Bays em travessia '+ship+' · Callahan em contato '+grower;
  }
  if(el('books').open){
    const items=m.players.slice(1).map((p,j)=>{
      const row=document.createElement('p');row.className='small';
      row.textContent=names[j+1]+' · Renda '+num.format(p.income)+' · Plantio '+num.format(p.stampSpent)+
        ' · Nascimentos '+num.format(p.birthSpent)+' · Cortes '+num.format(p.eraseSpent+p.friendlyEraseSpent)+
        ' · Liquidação '+num.format(p.salvageIncome);return row;
    });
    el('balances').replaceChildren(...items);
  }
  el('brain').hidden=!tactical;
  if(tactical){
    const trials=tactical.channels.reduce((n,c)=>n+c.bot.metrics.completed,0);
    el('brain').textContent='Testes locais '+num.format(trials)+' · Compras Jade / Cobre '+tactical.books.slice(1).map(b=>b.orders-1).join(' / ')+
      ' · '+(params.get('swap')==='1'?'Cobre escolhe resolução, Jade usa contato.':'Jade escolhe resolução, Cobre usa contato.');
  }
  if(meter)meter.show(m.arbitration);
  el('notice').textContent=lastEvent;
  const under=m.cells.get(hover);
  el('inspect').textContent=under?names[under.owner]+' · '+(under.wave?'Onda B2/S245':labels[under.rule]+' · '+resolverNames[under.resolver])+' · Idade '+under.age:'';
}
function start(){
  stop();
  const scene=el('scene').value, tacticalMode=scene==='arena'&&el('drive').value==='tactical', economy=Object.fromEntries(Object.keys(specs).map(k=>[k,el(k).valueAsNumber]));
  economy.phasePriority=+el('precedence').value;
  const settings=arbPanel.settings();
  const trace=['all','coexist','physical'].includes(scene)||settings.arbitration!=='legacy'||settings.eligibility!=='legacy'?contestMeter():null;
  try {const w=prepareArena({scene,...settings,onContest:trace?.observe,seed:tacticalMode?(seed??7):seed,F:+selector.value,bank:el('bank').valueAsNumber,economy,farm:el('farm').checked,swapFarms:el('sponsor').value==='far'});world=w;}
  catch(e){lastEvent=e.message;el('notice').textContent=lastEvent;return;}
  meter=trace;el('contest-monitor').hidden=!meter;
  el('colorby').value=isCrossing(scene)||['portfolio','all','coexist','physical'].includes(scene)?'rule':'owner';
  drive=el('drive').value;finish=el('finish').value;center=world.anchor;hover=-1;verdict='';armed=false;
  owners=world.match.players.slice(1).map((_,j)=>j+1);
  el('owner').replaceChildren(...owners.map(i=>new Option(names[i],i)));
  retired=new Set();touched=new Set();el('many').textContent=world.period?'+1 volta':' +32';colonyEnd='';terminalWallet='';launchGen=world.match.gen;
  view=createBoard(el('board'),el('atlas'),world.graph);pilots=[null,createPilot(617),createPilot(931),createPilot(251)];
  tactical=null;
  if(tacticalMode){
    const policies=params.get('swap')==='1'?['contact','typed']:['typed','contact'];
    tactical=createTacticalDuel(world.match,seed??7,policies,{onPlacement:o=>{
      const card=cards.get(o.rule+'/'+o.stamp);
      lastEvent='G'+o.gen+' · '+names[o.owner]+' plantou '+(card?.name??o.stamp)+' · '+labels[o.rule].split(' · ')[0]+' · '+resolverNames[o.resolver];
    }});
    el('many').textContent='+256';
  }
  el('owner').value='1';
  chooseStamp(isCrossing(scene)?'bays/glider':'hex-b2s245/db-151',isCrossing(scene)?'phase':'antimatter');
  lastEvent=scene==='physical'?'Três linhagens aliadas disputam o sítio 246 em G11.':scene==='coexist'?'Nove autômatos e uma carteira. As fazendas sustentam os ciclos.':scene==='all'?'Cada um dos três jogadores plantou carimbos das nove físicas.':scene==='recovery'?'Duas fazendas de Jade financiam a onda.':scene==='orbit'?'Slider de Ashley em órbita · Quatro fazendas de B2/S245 no percurso.':scene==='engulf'?'Três colônias · '+(el('sponsor').value==='far'?'Jade':'Cobalto')+' ocupa o outro lado do planeta.':scene==='blast'?'P6 lançado contra o núcleo de Bays.':isCrossing(scene)?'Glider de Bays em rota para o crescedor '+(scene==='ally'?'aliado.':'inimigo.'):
    scene==='portfolio'?'Uma carteira paga pela fazenda B2/S245 e pelo oscilador de Bays.':scene==='arena'?'Cada carteira pagou a sua fazenda.':'Escolha um carimbo e clique no campo.';
  clockVictory();paint();
}
const deckKey='hexophage.mixed.deck.v1';
let hand=[];
try {
  const saved=JSON.parse(localStorage.getItem(deckKey)??'[]');
  if(Array.isArray(saved))hand=saved.filter(c=>cards.has(c.key) && Object.hasOwn(rules,c.rule) &&
    Object.hasOwn(resolverNames,c.role) && Number.isInteger(c.angle) && c.angle>=0 && c.angle<6 && (!c.ballot || Object.hasOwn(ballotNames,c.ballot))).map(c=>({...c,ballot:c.ballot??'support'}));
}catch{}
function showHand(){
  el('hand').replaceChildren(new Option('Carimbos guardados',''));
  for(const [i,c] of hand.entries())el('hand').add(new Option(cards.get(c.key).name+' · '+rules[c.rule].label.split(' · ')[0]+' · '+resolverNames[c.role]+(c.ballot!=='support'?' · '+ballotNames[c.ballot]:'')+' · '+c.angle*60+'°',i));
  el('forget').disabled=true;
}
function storeHand(){try{localStorage.setItem(deckKey,JSON.stringify(hand));}catch{}showHand();}
el('save').onclick=()=>{
  const c={key:el('pattern').value,rule:el('rule').value,role:el('resolver').value,angle:+el('angle').value,ballot:el('ballot').value};
  let index=hand.findIndex(h=>h.key===c.key&&h.rule===c.rule&&h.role===c.role&&h.angle===c.angle&&h.ballot===c.ballot);
  if(index<0){index=hand.length;hand.push(c);}storeHand();el('hand').value=index;el('forget').disabled=false;
};
el('hand').onchange=()=>{
  el('forget').disabled=el('hand').value==='';if(el('forget').disabled)return;
  const c=hand[+el('hand').value];el('pattern').value=c.key;el('rule').value=c.rule;el('resolver').value=c.role;el('angle').value=c.angle;el('ballot').value=c.ballot;paint();
};
el('forget').onclick=()=>{if(el('hand').value!==''){hand.splice(+el('hand').value,1);storeHand();}};
showHand();
el('pattern').onchange=()=>{el('rule').value=cards.get(el('pattern').value).source;paint();};
for(const id of ['angle','rule','resolver','owner','zoom','colorby'])el(id).oninput=paint;
el('board').onpointermove=e=>{hover=view.pick(e.offsetX,e.offsetY);paint();};
el('board').onpointerleave=()=>{hover=-1;paint();};
el('board').onclick=e=>{
  if(!world || verdict)return;hover=view.pick(e.offsetX,e.offsetY);
  const {owner,rule,role,key,ids}=current();
  if(retired.has(owner))lastEvent='Este jogador perdeu sua última colônia.';
  else if((drive==='both'||drive==='tactical')||(drive==='opponent'&&owner!==1)){lastEvent='Este jogador está sob controle do bot.';}
  else if(world.match.stamp(owner,rule,role,ids,el('ballot').value)){lastEvent=names[owner]+' plantou '+cards.get(key).name+' · '+resolverNames[role];clockVictory();}
  else lastEvent='Plantio indisponível. Confira a reserva, a ocupação e o espaço ao redor da estrutura.';
  paint();
};
el('atlas').onclick=e=>{center=view.navigate(e.offsetX/el('atlas').clientWidth,e.offsetY/el('atlas').clientHeight);hover=-1;paint();};
el('play').onclick=()=>{if(timer){stop();}else{timer=setInterval(()=>{for(let j=0;j<(tactical?8:1)&&!verdict;j++)generation();paint();},95);el('play').textContent='Pausar';}};
el('step').onclick=()=>{stop();generation();paint();};
el('many').onclick=()=>{stop();for(let i=0;i<(world.period??(tactical?256:32))&&!verdict;i++)generation();paint();};
el('locate-contest').onclick=()=>{if(meter?.selected){center=meter.selected.site;hover=-1;paint();}};
function seekConflict(predicate){
  if(!meter)return;
  stop();meter.search(predicate);
  for(let n=0;n<32 && !meter.selected && !verdict;n++)generation();
  if(meter.selected)center=meter.selected.site;
  else lastEvent='Nenhuma disputa correspondente nesse intervalo.';
  meter.resume();hover=-1;paint();
}
el('next-triple').onclick=()=>seekConflict(e=>e.claims.length>=3);
el('next-cycle').onclick=()=>seekConflict(e=>e.cycle);
el('reset').onclick=start;el('books').ontoggle=el('why-contest').ontoggle=paint;
function presetControls(fromURL=false){
  const scene=el('scene').value;
  arbPanel.preset(['all','coexist','physical'].includes(scene),fromURL,scene==='physical'?'ecology':'ballot');el('arbiters').open=['all','physical'].includes(scene);
  const preset=defaultsFor(scene);
  el('drive').querySelector('[value=tactical]').disabled=scene!=='arena';
  el('sponsor-position').hidden=scene!=='engulf';
  el('protectedMature').value=preset.protectedMature;el('precedence').value=preset.phasePriority;el('frequency').value=preset.F;el('bank').value=preset.bank;
  el('bank-label').textContent=['blast','engulf','orbit','recovery'].includes(scene)?'Reserva do lançador':'Reserva por jogador';
  el('finish').value=preset.finish;el('drive').value=preset.drive;
}
el('scene').onchange=()=>presetControls();
if(Object.hasOwn(sceneNames,params.get('scene')))el('scene').value=params.get('scene');
presetControls(true);
if(el('scene').value==='arena' && params.get('bots')==='tactical'){
  el('drive').value='tactical';el('bank').value='2400';selector.value='16';
}
if(['16','24','32','48','64'].includes(params.get('f')))selector.value=params.get('f');
if(params.has('bank') && Number(params.get('bank'))>=0)el('bank').value=params.get('bank');
if(params.has('erase') && Number.isFinite(+params.get('erase')) && +params.get('erase')>=0)el('eraseCost').value=params.get('erase');
if(params.has('protect') && Number.isInteger(+params.get('protect')) && +params.get('protect')>=0)el('protectedMature').value=params.get('protect');
if(params.get('bots')==='both')el('drive').value='both';
if(['field','wallet','observe'].includes(params.get('finish')))el('finish').value=params.get('finish');
if(params.get('sponsor')==='far')el('sponsor').value='far';
el('farm').checked=params.get('farm')!=='0';
start();
if(meter && params.has('g') && params.has('site')){
  const gen=Number(params.get('g')),site=Number(params.get('site'));
  if(Number.isInteger(gen) && gen>0 && gen<=256 && Number.isInteger(site) && site>=0 && site<world.graph.n){
    meter.search(e=>e.gen===gen && e.site===site);
    while(world.match.gen<gen && !verdict)generation();
    if(meter.selected){center=site;el('why-contest').open=true;}
    meter.resume();paint();
  }
}
window.addEventListener('resize',paint);
